import { geolib } from 'geolib';
import proj4 from 'proj4';
import { storage } from '../storage';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface BoundaryValidation {
  isValid: boolean;
  confidence: number;
  containingVillage?: string;
  containingDistrict?: string;
  containingState?: string;
  distanceFromBoundary?: number;
  warnings: string[];
}

interface SpatialLinkage {
  claimId: string;
  linkedVillage?: string;
  linkedDistrict?: string;
  linkedState?: string;
  confidence: number;
  spatialAccuracy: number;
  geofenced: boolean;
}

class SpatialProcessor {
  private readonly COORDINATE_PRECISION = 6; // Decimal places for lat/lng
  private readonly MAX_VILLAGE_DISTANCE = 2000; // 2km tolerance for village boundaries
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.7;

  // Define coordinate systems for Indian states
  private readonly projections = {
    'WGS84': '+proj=longlat +datum=WGS84 +no_defs',
    'UTM43N': '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs', // MP, parts of Odisha
    'UTM44N': '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs', // Telangana, parts of Odisha
    'UTM45N': '+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs', // Tripura
  };

  async validateCoordinates(coordinates: Coordinate): Promise<BoundaryValidation> {
    try {
      const warnings: string[] = [];
      let confidence = 1.0;

      // Basic coordinate validation
      if (!this.isValidLatLng(coordinates)) {
        return {
          isValid: false,
          confidence: 0,
          warnings: ['Invalid latitude/longitude values']
        };
      }

      // Check if coordinates fall within India's bounding box
      if (!this.isWithinIndiaBounds(coordinates)) {
        warnings.push('Coordinates outside India boundary');
        confidence -= 0.3;
      }

      // Find containing administrative boundaries
      const containingVillage = await this.findContainingVillage(coordinates);
      const containingDistrict = await this.findContainingDistrict(coordinates);
      const containingState = await this.findContainingState(coordinates);

      // Calculate distance from nearest boundary if not contained
      let distanceFromBoundary = 0;
      if (!containingVillage) {
        distanceFromBoundary = await this.distanceToNearestVillageBoundary(coordinates);
        if (distanceFromBoundary > this.MAX_VILLAGE_DISTANCE) {
          warnings.push(`Claim is ${Math.round(distanceFromBoundary)}m from nearest village boundary`);
          confidence -= 0.2;
        }
      }

      // Validate coordinate precision
      if (!this.hasAdequatePrecision(coordinates)) {
        warnings.push('Coordinate precision insufficient for accurate mapping');
        confidence -= 0.1;
      }

      return {
        isValid: confidence >= this.MIN_CONFIDENCE_THRESHOLD,
        confidence: Math.round(confidence * 100) / 100,
        containingVillage,
        containingDistrict,
        containingState,
        distanceFromBoundary,
        warnings
      };
    } catch (error) {
      console.error('Error validating coordinates:', error);
      return {
        isValid: false,
        confidence: 0,
        warnings: ['Spatial validation failed due to system error']
      };
    }
  }

  async linkClaimToAdminBoundaries(claimId: string): Promise<SpatialLinkage> {
    try {
      const claim = await storage.getClaimById(claimId);
      if (!claim || !claim.latitude || !claim.longitude) {
        throw new Error('Claim not found or missing coordinates');
      }

      const coordinates: Coordinate = {
        latitude: parseFloat(claim.latitude),
        longitude: parseFloat(claim.longitude)
      };

      const validation = await this.validateCoordinates(coordinates);
      
      // Attempt automatic linking based on spatial containment
      let linkedVillage = validation.containingVillage;
      let linkedDistrict = validation.containingDistrict;
      let linkedState = validation.containingState;
      let confidence = validation.confidence;
      let spatialAccuracy = this.calculateSpatialAccuracy(coordinates);

      // If not contained, try nearest neighbor approach
      if (!linkedVillage) {
        const nearestVillage = await this.findNearestVillage(coordinates);
        if (nearestVillage && nearestVillage.distance <= this.MAX_VILLAGE_DISTANCE) {
          linkedVillage = nearestVillage.id;
          confidence *= 0.8; // Reduce confidence for nearest neighbor assignment
        }
      }

      // Cross-reference with existing claim data for consistency
      if (claim.villageId && linkedVillage !== claim.villageId) {
        const existingVillage = await storage.getVillageById(claim.villageId);
        const declaredVillage = await storage.getVillageById(linkedVillage!);
        
        if (existingVillage && declaredVillage) {
          const distance = this.calculateDistance(
            coordinates,
            { latitude: parseFloat(existingVillage.latitude!), longitude: parseFloat(existingVillage.longitude!) }
          );
          
          if (distance <= this.MAX_VILLAGE_DISTANCE * 2) {
            // Accept user-declared village if within reasonable distance
            linkedVillage = claim.villageId;
            confidence *= 0.9;
          }
        }
      }

      const geofenced = this.isGeofenced(coordinates, linkedVillage!);

      // Update claim with spatial linkage
      await storage.updateClaim(claimId, {
        spatiallyLinked: true,
        spatialConfidence: confidence,
        linkedVillageId: linkedVillage,
        linkedDistrictId: linkedDistrict,
        linkedStateId: linkedState,
        geofenced
      });

      return {
        claimId,
        linkedVillage,
        linkedDistrict,
        linkedState,
        confidence,
        spatialAccuracy,
        geofenced
      };
    } catch (error) {
      console.error('Error linking claim to admin boundaries:', error);
      throw error;
    }
  }

  async generateSpatialReport(villageId: string): Promise<{
    totalClaims: number;
    spatiallyLinked: number;
    highConfidence: number;
    needsVerification: number;
    averageAccuracy: number;
    boundaryIssues: string[];
  }> {
    try {
      const claims = await storage.getClaimsByVillage(villageId);
      const village = await storage.getVillageById(villageId);

      let spatiallyLinked = 0;
      let highConfidence = 0;
      let needsVerification = 0;
      let totalAccuracy = 0;
      const boundaryIssues: string[] = [];

      for (const claim of claims) {
        if (claim.spatiallyLinked) spatiallyLinked++;
        if (claim.spatialConfidence && claim.spatialConfidence > 0.8) highConfidence++;
        if (claim.spatialConfidence && claim.spatialConfidence < 0.7) needsVerification++;
        if (claim.spatialConfidence) totalAccuracy += claim.spatialConfidence;

        // Check for boundary conflicts
        if (claim.latitude && claim.longitude && village) {
          const claimCoords: Coordinate = {
            latitude: parseFloat(claim.latitude),
            longitude: parseFloat(claim.longitude)
          };
          const villageCoords: Coordinate = {
            latitude: parseFloat(village.latitude!),
            longitude: parseFloat(village.longitude!)
          };
          
          const distance = this.calculateDistance(claimCoords, villageCoords);
          if (distance > this.MAX_VILLAGE_DISTANCE) {
            boundaryIssues.push(`Claim ${claim.claimId} is ${Math.round(distance)}m from village center`);
          }
        }
      }

      return {
        totalClaims: claims.length,
        spatiallyLinked,
        highConfidence,
        needsVerification,
        averageAccuracy: claims.length > 0 ? totalAccuracy / claims.length : 0,
        boundaryIssues
      };
    } catch (error) {
      console.error('Error generating spatial report:', error);
      throw error;
    }
  }

  private isValidLatLng(coords: Coordinate): boolean {
    return coords.latitude >= -90 && coords.latitude <= 90 &&
           coords.longitude >= -180 && coords.longitude <= 180 &&
           !isNaN(coords.latitude) && !isNaN(coords.longitude);
  }

  private isWithinIndiaBounds(coords: Coordinate): boolean {
    // India's approximate bounding box
    return coords.latitude >= 6.0 && coords.latitude <= 37.0 &&
           coords.longitude >= 68.0 && coords.longitude <= 98.0;
  }

  private hasAdequatePrecision(coords: Coordinate): boolean {
    const latStr = coords.latitude.toString();
    const lngStr = coords.longitude.toString();
    
    const latDecimals = latStr.split('.')[1]?.length || 0;
    const lngDecimals = lngStr.split('.')[1]?.length || 0;
    
    return latDecimals >= 4 && lngDecimals >= 4; // Minimum ~10m precision
  }

  private calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    return geolib.getDistance(coord1, coord2);
  }

  private calculateSpatialAccuracy(coords: Coordinate): number {
    // Calculate spatial accuracy based on coordinate precision
    const latStr = coords.latitude.toString();
    const lngStr = coords.longitude.toString();
    
    const latDecimals = latStr.split('.')[1]?.length || 0;
    const lngDecimals = lngStr.split('.')[1]?.length || 0;
    
    const minDecimals = Math.min(latDecimals, lngDecimals);
    
    // Accuracy in meters based on decimal places at equator
    const accuracyMap: { [key: number]: number } = {
      0: 111000,   // ~111 km
      1: 11100,    // ~11 km
      2: 1110,     // ~1.1 km
      3: 111,      // ~111 m
      4: 11.1,     // ~11 m
      5: 1.11,     // ~1 m
      6: 0.111     // ~11 cm
    };
    
    return accuracyMap[Math.min(minDecimals, 6)] || 111000;
  }

  private async findContainingVillage(coords: Coordinate): Promise<string | undefined> {
    // Simplified implementation - in production would use PostGIS spatial queries
    const villages = await storage.getAllVillages();
    
    for (const village of villages) {
      if (village.latitude && village.longitude) {
        const villageCoords: Coordinate = {
          latitude: parseFloat(village.latitude),
          longitude: parseFloat(village.longitude)
        };
        
        const distance = this.calculateDistance(coords, villageCoords);
        if (distance <= 1000) { // 1km radius as rough village boundary
          return village.id;
        }
      }
    }
    
    return undefined;
  }

  private async findContainingDistrict(coords: Coordinate): Promise<string | undefined> {
    // Implementation would use district boundary shapefiles
    // For now, approximate based on villages
    const villages = await storage.getAllVillages();
    const nearestVillage = await this.findNearestVillage(coords);
    
    if (nearestVillage) {
      const village = villages.find(v => v.id === nearestVillage.id);
      return village?.districtId;
    }
    
    return undefined;
  }

  private async findContainingState(coords: Coordinate): Promise<string | undefined> {
    // Implementation would use state boundary shapefiles
    // For now, approximate based on coordinate ranges
    if (coords.latitude >= 21.5 && coords.latitude <= 26.0 && 
        coords.longitude >= 74.0 && coords.longitude <= 82.5) {
      return 'MP'; // Madhya Pradesh
    } else if (coords.latitude >= 17.0 && coords.latitude <= 19.5 && 
               coords.longitude >= 77.0 && coords.longitude <= 81.5) {
      return 'Telangana';
    } else if (coords.latitude >= 17.5 && coords.latitude <= 22.5 && 
               coords.longitude >= 81.5 && coords.longitude <= 87.5) {
      return 'Odisha';
    } else if (coords.latitude >= 22.5 && coords.latitude <= 24.5 && 
               coords.longitude >= 91.0 && coords.longitude <= 92.5) {
      return 'Tripura';
    }
    
    return undefined;
  }

  private async findNearestVillage(coords: Coordinate): Promise<{ id: string; distance: number } | undefined> {
    const villages = await storage.getAllVillages();
    let nearest: { id: string; distance: number } | undefined;
    
    for (const village of villages) {
      if (village.latitude && village.longitude) {
        const villageCoords: Coordinate = {
          latitude: parseFloat(village.latitude),
          longitude: parseFloat(village.longitude)
        };
        
        const distance = this.calculateDistance(coords, villageCoords);
        if (!nearest || distance < nearest.distance) {
          nearest = { id: village.id, distance };
        }
      }
    }
    
    return nearest;
  }

  private async distanceToNearestVillageBoundary(coords: Coordinate): Promise<number> {
    const nearest = await this.findNearestVillage(coords);
    return nearest ? nearest.distance : Infinity;
  }

  private isGeofenced(coords: Coordinate, villageId: string): boolean {
    // Check if coordinates fall within acceptable geofence for village
    // This would typically use precise village boundary polygons
    return true; // Simplified - assume all linked coordinates are geofenced
  }

  // Coordinate conversion utilities
  convertToUTM(coords: Coordinate, zone: string): { x: number; y: number } {
    const utm = proj4(this.projections.WGS84, this.projections[zone as keyof typeof this.projections], [coords.longitude, coords.latitude]);
    return { x: utm[0], y: utm[1] };
  }

  convertFromUTM(utm: { x: number; y: number }, zone: string): Coordinate {
    const latLng = proj4(this.projections[zone as keyof typeof this.projections], this.projections.WGS84, [utm.x, utm.y]);
    return { latitude: latLng[1], longitude: latLng[0] };
  }
}

export const spatialProcessor = new SpatialProcessor();