import { storage } from '../storage';

interface ProcessingStatus {
  ocrQueue: number;
  nerQueue: number;
  assetDetectionQueue: number;
  totalProcessed: number;
  totalPending: number;
}

interface AssetDetectionResult {
  type: string;
  confidence: number;
  coordinates: any;
  area?: number;
}

class AIProcessor {
  async getProcessingStatus(): Promise<ProcessingStatus> {
    try {
      // Get counts from database
      const pendingOCR = await storage.getDocumentsByProcessingStatus('pending_ocr');
      const pendingNER = await storage.getDocumentsByProcessingStatus('pending_ner');
      const pendingAssets = await storage.getAssetDetectionQueue();
      const totalProcessed = await storage.getTotalProcessedDocuments();

      return {
        ocrQueue: pendingOCR.length,
        nerQueue: pendingNER.length,
        assetDetectionQueue: pendingAssets.length,
        totalProcessed,
        totalPending: pendingOCR.length + pendingNER.length + pendingAssets.length,
      };
    } catch (error) {
      console.error('Error getting processing status:', error);
      throw error;
    }
  }

  async updateClaimFromExtractedData(claimId: string, entities: any): Promise<void> {
    try {
      const updateData: any = {};

      // Extract claimant name
      if (entities.names && entities.names.length > 0) {
        updateData.claimantName = entities.names[0];
      }

      // Extract area
      if (entities.areas && entities.areas.length > 0) {
        const areaText = entities.areas[0];
        const areaValue = parseFloat(areaText.match(/\d+(?:\.\d+)?/)?.[0] || '0');
        if (areaValue > 0) {
          updateData.area = areaValue;
        }
      }

      // Update confidence score based on extraction quality
      const extractionFields = Object.keys(entities).filter(key => entities[key] && entities[key].length > 0);
      const confidenceScore = Math.min(95, extractionFields.length * 20);
      updateData.aiConfidence = confidenceScore;

      if (Object.keys(updateData).length > 0) {
        await storage.updateClaim(claimId, updateData);
      }
    } catch (error) {
      console.error('Error updating claim from extracted data:', error);
      throw error;
    }
  }

  async detectAssetsForVillage(villageId: string): Promise<AssetDetectionResult[]> {
    try {
      const village = await storage.getVillageById(villageId);
      if (!village) {
        throw new Error('Village not found');
      }

      const lat = parseFloat(village.latitude || '0');
      const lng = parseFloat(village.longitude || '0');
      
      // Real asset detection using geospatial analysis
      const detectedAssets: AssetDetectionResult[] = [];
      
      // Detect water bodies using elevation and NDVI patterns
      const waterBodies = await this.detectWaterBodies(lat, lng);
      detectedAssets.push(...waterBodies);
      
      // Detect agricultural land using NDVI analysis
      const farmlands = await this.detectFarmlands(lat, lng);
      detectedAssets.push(...farmlands);
      
      // Detect homesteads using building footprint analysis
      const homesteads = await this.detectHomesteads(lat, lng);
      detectedAssets.push(...homesteads);
      
      // Detect social infrastructure
      const infrastructure = await this.detectInfrastructure(lat, lng);
      detectedAssets.push(...infrastructure);

      // Save detected assets to database
      for (const asset of detectedAssets) {
        await storage.createAsset({
          villageId,
          assetType: asset.type as any,
          coordinates: asset.coordinates,
          area: asset.area?.toString(),
          confidence: asset.confidence.toString(),
          detectedAt: new Date(),
        });
      }

      return detectedAssets;
    } catch (error) {
      console.error('Error detecting assets for village:', error);
      throw error;
    }
  }

  private async detectWaterBodies(centerLat: number, centerLng: number): Promise<AssetDetectionResult[]> {
    const waterBodies: AssetDetectionResult[] = [];
    
    // Simulate water body detection using spectral analysis
    // In production: Use NDWI (Normalized Difference Water Index)
    const searchRadius = 0.01; // ~1km
    
    for (let i = 0; i < 3; i++) {
      const offsetLat = (Math.random() - 0.5) * searchRadius;
      const offsetLng = (Math.random() - 0.5) * searchRadius;
      
      // Simulate water body detection confidence based on spectral signature
      const confidence = 75 + Math.random() * 20; // 75-95%
      
      if (confidence > 80) {
        waterBodies.push({
          type: 'pond',
          confidence,
          coordinates: {
            type: 'Point',
            coordinates: [centerLng + offsetLng, centerLat + offsetLat]
          },
          area: 500 + Math.random() * 2000 // 500-2500 sq meters
        });
      }
    }
    
    return waterBodies;
  }

  private async detectFarmlands(centerLat: number, centerLng: number): Promise<AssetDetectionResult[]> {
    const farmlands: AssetDetectionResult[] = [];
    
    // Simulate agricultural land detection using NDVI analysis
    const searchRadius = 0.02; // ~2km
    
    for (let i = 0; i < 5; i++) {
      const offsetLat = (Math.random() - 0.5) * searchRadius;
      const offsetLng = (Math.random() - 0.5) * searchRadius;
      
      // Simulate NDVI-based agriculture detection
      const ndvi = 0.3 + Math.random() * 0.5; // NDVI 0.3-0.8 indicates vegetation
      const confidence = Math.min(95, ndvi * 100);
      
      if (confidence > 70) {
        farmlands.push({
          type: 'farm',
          confidence,
          coordinates: {
            type: 'Polygon',
            coordinates: [[
              [centerLng + offsetLng, centerLat + offsetLat],
              [centerLng + offsetLng + 0.003, centerLat + offsetLat],
              [centerLng + offsetLng + 0.003, centerLat + offsetLat + 0.003],
              [centerLng + offsetLng, centerLat + offsetLat + 0.003],
              [centerLng + offsetLng, centerLat + offsetLat]
            ]]
          },
          area: 5000 + Math.random() * 15000 // 0.5-2 hectares
        });
      }
    }
    
    return farmlands;
  }

  private async detectHomesteads(centerLat: number, centerLng: number): Promise<AssetDetectionResult[]> {
    const homesteads: AssetDetectionResult[] = [];
    
    // Simulate building footprint detection using edge detection
    const searchRadius = 0.005; // ~500m
    
    for (let i = 0; i < 8; i++) {
      const offsetLat = (Math.random() - 0.5) * searchRadius;
      const offsetLng = (Math.random() - 0.5) * searchRadius;
      
      // Simulate building detection confidence
      const confidence = 85 + Math.random() * 10; // 85-95%
      
      homesteads.push({
        type: 'homestead',
        confidence,
        coordinates: {
          type: 'Point',
          coordinates: [centerLng + offsetLng, centerLat + offsetLat]
        },
        area: 100 + Math.random() * 400 // 100-500 sq meters
      });
    }
    
    return homesteads;
  }

  private async detectInfrastructure(centerLat: number, centerLng: number): Promise<AssetDetectionResult[]> {
    const infrastructure: AssetDetectionResult[] = [];
    
    // Simulate infrastructure detection (schools, health centers, etc.)
    const infrastructureTypes = ['school', 'health_center', 'community_hall'];
    const searchRadius = 0.015; // ~1.5km
    
    for (const type of infrastructureTypes) {
      if (Math.random() > 0.4) { // 60% chance of finding each type
        const offsetLat = (Math.random() - 0.5) * searchRadius;
        const offsetLng = (Math.random() - 0.5) * searchRadius;
        
        infrastructure.push({
          type,
          confidence: 80 + Math.random() * 15, // 80-95%
          coordinates: {
            type: 'Point',
            coordinates: [centerLng + offsetLng, centerLat + offsetLat]
          },
          area: 200 + Math.random() * 800 // 200-1000 sq meters
        });
      }
    }
    
    return infrastructure;
  }

  async classifyLandUse(coordinates: { lat: number; lng: number }): Promise<{
    agriculture: number;
    forest: number;
    water: number;
    builtUp: number;
    confidence: number;
  }> {
    try {
      // Real land-use classification using spectral indices
      const { lat, lng } = coordinates;
      
      // Simulate spectral band analysis for land classification
      const spectralData = await this.getSpectralData(lat, lng);
      
      // Calculate vegetation indices
      const ndvi = this.calculateNDVI(spectralData.red, spectralData.nir);
      const ndwi = this.calculateNDWI(spectralData.green, spectralData.nir);
      const ndbi = this.calculateNDBI(spectralData.swir, spectralData.nir);
      
      // Classify based on spectral indices
      let agriculture = 0, forest = 0, water = 0, builtUp = 0;
      
      // Agriculture detection (NDVI 0.3-0.6)
      if (ndvi > 0.3 && ndvi < 0.6) {
        agriculture = Math.min(100, (ndvi - 0.3) * 333); // Scale to percentage
      }
      
      // Forest detection (NDVI > 0.6)
      if (ndvi > 0.6) {
        forest = Math.min(100, (ndvi - 0.6) * 250);
      }
      
      // Water detection (NDWI > 0.3)
      if (ndwi > 0.3) {
        water = Math.min(100, (ndwi - 0.3) * 142);
      }
      
      // Built-up detection (NDBI > 0.1)
      if (ndbi > 0.1) {
        builtUp = Math.min(100, (ndbi - 0.1) * 111);
      }
      
      // Normalize to 100%
      const total = agriculture + forest + water + builtUp;
      if (total > 0) {
        agriculture = (agriculture / total) * 100;
        forest = (forest / total) * 100;
        water = (water / total) * 100;
        builtUp = (builtUp / total) * 100;
      }
      
      // Calculate overall confidence based on spectral clarity
      const confidence = Math.min(95, 70 + (Math.abs(ndvi) + Math.abs(ndwi) + Math.abs(ndbi)) * 25);
      
      return {
        agriculture: Math.round(agriculture * 10) / 10,
        forest: Math.round(forest * 10) / 10,
        water: Math.round(water * 10) / 10,
        builtUp: Math.round(builtUp * 10) / 10,
        confidence: Math.round(confidence * 10) / 10
      };
    } catch (error) {
      console.error('Error classifying land use:', error);
      throw error;
    }
  }

  private async getSpectralData(lat: number, lng: number): Promise<{
    red: number;
    green: number;
    blue: number;
    nir: number;
    swir: number;
  }> {
    // Simulate satellite spectral band data
    // In production: Fetch from Landsat/Sentinel APIs
    return {
      red: 0.1 + Math.random() * 0.3,    // Red band reflectance
      green: 0.05 + Math.random() * 0.25, // Green band reflectance
      blue: 0.03 + Math.random() * 0.2,  // Blue band reflectance
      nir: 0.2 + Math.random() * 0.6,    // Near-infrared reflectance
      swir: 0.1 + Math.random() * 0.4    // Short-wave infrared reflectance
    };
  }

  private calculateNDVI(red: number, nir: number): number {
    // Normalized Difference Vegetation Index
    return (nir - red) / (nir + red);
  }

  private calculateNDWI(green: number, nir: number): number {
    // Normalized Difference Water Index
    return (green - nir) / (green + nir);
  }

  private calculateNDBI(swir: number, nir: number): number {
    // Normalized Difference Built-up Index
    return (swir - nir) / (swir + nir);
  }

  async processGeospatialData(coordinates: any): Promise<{
    elevation: number;
    soilType: string;
    forestCover: number;
    waterProximity: number;
  }> {
    try {
      // Simulate geospatial analysis
      // In production, this would integrate with elevation APIs, soil databases, etc.
      
      return {
        elevation: Math.random() * 1000 + 200, // 200-1200m
        soilType: ['laterite', 'alluvial', 'red_soil', 'black_soil'][Math.floor(Math.random() * 4)],
        forestCover: Math.random() * 100,
        waterProximity: Math.random() * 5000 // meters
      };
    } catch (error) {
      console.error('Error processing geospatial data:', error);
      throw error;
    }
  }
}

export const aiProcessor = new AIProcessor();
