import { landUseClassificationService } from './landUseClassificationService';

interface GISLayer {
  id: string;
  name: string;
  type: 'vector' | 'raster';
  geometry?: any;
  properties?: any;
  style?: any;
}

interface LandUseGISResult {
  geoJSON: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Polygon' | 'Point';
        coordinates: any;
      };
      properties: {
        landUseClass: string;
        confidence: number;
        percentage: number;
        area?: number;
        sensor: string;
        date: string;
      };
    }>;
  };
  metadata: {
    totalArea: number;
    processingTime: number;
    resolution: number;
    classifications: {
      agriculture: { area: number; percentage: number };
      forest: { area: number; percentage: number };
      water: { area: number; percentage: number };
      builtUp: { area: number; percentage: number };
    };
  };
}

export class GISIntegrationService {
  
  /**
   * Convert land-use classification results to GeoJSON format
   */
  async generateLandUseGeoJSON(
    bounds: { north: number; south: number; east: number; west: number },
    options: {
      gridResolution?: number;
      highResolution?: boolean;
      apiKey?: string;
      includeMetadata?: boolean;
    } = {}
  ): Promise<LandUseGISResult> {
    const startTime = Date.now();
    const { gridResolution = 10, highResolution = false, apiKey } = options;
    
    try {
      // Generate grid points within bounds
      const gridPoints = this.generateGridPoints(bounds, gridResolution);
      
      // Batch classify all points
      const classifications = await landUseClassificationService.batchClassifyLandUse(
        gridPoints,
        { highResolution, apiKey }
      );
      
      // Convert to GeoJSON features
      const features = await this.createGeoJSONFeatures(classifications, bounds, gridResolution);
      
      // Calculate regional statistics
      const regionStats = await this.calculateRegionStatistics(classifications, bounds);
      
      const processingTime = Date.now() - startTime;
      
      return {
        geoJSON: {
          type: 'FeatureCollection',
          features
        },
        metadata: {
          totalArea: regionStats.totalArea,
          processingTime,
          resolution: classifications[0]?.resolution || 250,
          classifications: regionStats.classifications
        }
      };
    } catch (error) {
      console.error('Error generating land-use GeoJSON:', error);
      throw new Error('Failed to generate land-use GeoJSON');
    }
  }

  /**
   * Align classification results with existing GIS layers (post-processing)
   */
  async alignWithGISLayers(
    landUseResults: any[],
    existingLayers: GISLayer[]
  ): Promise<any[]> {
    const alignedResults = [];
    
    for (const result of landUseResults) {
      const alignedResult = { ...result };
      
      // Check alignment with administrative boundaries
      const adminLayer = existingLayers.find(layer => layer.type === 'vector' && layer.name.includes('admin'));
      if (adminLayer && adminLayer.geometry) {
        alignedResult.administrativeUnit = this.getAdministrativeUnit(result.coordinates, adminLayer);
      }
      
      // Check alignment with protected areas
      const protectedLayer = existingLayers.find(layer => layer.name.includes('protected'));
      if (protectedLayer) {
        alignedResult.protectedArea = this.checkProtectedArea(result.coordinates, protectedLayer);
      }
      
      // Adjust classifications based on known land-use policies
      alignedResult.classifications = this.adjustForLandUsePolicies(
        result.classifications, 
        alignedResult.administrativeUnit
      );
      
      alignedResults.push(alignedResult);
    }
    
    return alignedResults;
  }

  /**
   * Generate classification heatmap for WebGIS display
   */
  async generateClassificationHeatmap(
    bounds: { north: number; south: number; east: number; west: number },
    classType: 'agriculture' | 'forest' | 'water' | 'builtUp',
    resolution: number = 20
  ): Promise<{
    heatmapData: Array<{ lat: number; lng: number; intensity: number }>;
    legend: { min: number; max: number; unit: string };
  }> {
    try {
      const gridPoints = this.generateGridPoints(bounds, resolution);
      const classifications = await landUseClassificationService.batchClassifyLandUse(gridPoints);
      
      const heatmapData = classifications.map(result => ({
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
        intensity: result.classifications[classType]
      }));
      
      const intensities = heatmapData.map(point => point.intensity);
      const min = Math.min(...intensities);
      const max = Math.max(...intensities);
      
      return {
        heatmapData,
        legend: { min, max, unit: '%' }
      };
    } catch (error) {
      console.error('Error generating classification heatmap:', error);
      throw new Error('Failed to generate classification heatmap');
    }
  }

  /**
   * Export classification results in various GIS formats
   */
  async exportClassificationData(
    classifications: any[],
    format: 'geojson' | 'shapefile' | 'kml' | 'csv'
  ): Promise<{ data: any; mimeType: string; filename: string }> {
    try {
      switch (format) {
        case 'geojson':
          return {
            data: this.toGeoJSON(classifications),
            mimeType: 'application/geo+json',
            filename: `land_use_classification_${Date.now()}.geojson`
          };
        
        case 'csv':
          return {
            data: this.toCSV(classifications),
            mimeType: 'text/csv',
            filename: `land_use_classification_${Date.now()}.csv`
          };
        
        case 'kml':
          return {
            data: this.toKML(classifications),
            mimeType: 'application/vnd.google-earth.kml+xml',
            filename: `land_use_classification_${Date.now()}.kml`
          };
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting classification data:', error);
      throw new Error('Failed to export classification data');
    }
  }

  private generateGridPoints(
    bounds: { north: number; south: number; east: number; west: number },
    resolution: number
  ): Array<{ lat: number; lng: number }> {
    const { north, south, east, west } = bounds;
    const latStep = (north - south) / resolution;
    const lngStep = (east - west) / resolution;
    
    const points: Array<{ lat: number; lng: number }> = [];
    
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        points.push({
          lat: south + i * latStep,
          lng: west + j * lngStep
        });
      }
    }
    
    return points;
  }

  private async createGeoJSONFeatures(
    classifications: any[],
    bounds: { north: number; south: number; east: number; west: number },
    gridResolution: number
  ): Promise<any[]> {
    const features = [];
    const { north, south, east, west } = bounds;
    const latStep = (north - south) / gridResolution;
    const lngStep = (east - west) / gridResolution;
    
    for (const result of classifications) {
      const { lat, lng } = result.coordinates;
      
      // Create polygon for each grid cell
      const cellBounds = [
        [lng - lngStep/2, lat - latStep/2],
        [lng + lngStep/2, lat - latStep/2],
        [lng + lngStep/2, lat + latStep/2],
        [lng - lngStep/2, lat + latStep/2],
        [lng - lngStep/2, lat - latStep/2]
      ];
      
      // Determine dominant land use class
      const classifications = result.classifications;
      const dominantClass = Object.keys(classifications).reduce((a, b) => 
        classifications[a] > classifications[b] ? a : b
      );
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [cellBounds]
        },
        properties: {
          landUseClass: dominantClass,
          confidence: result.confidence,
          percentage: classifications[dominantClass],
          agriculture: classifications.agriculture,
          forest: classifications.forest,
          water: classifications.water,
          builtUp: classifications.builtUp,
          sensor: result.sensor,
          date: result.metadata.imageDate,
          resolution: result.resolution
        }
      });
    }
    
    return features;
  }

  private async calculateRegionStatistics(
    classifications: any[],
    bounds: { north: number; south: number; east: number; west: number }
  ) {
    let totalAgriculture = 0, totalForest = 0, totalWater = 0, totalBuiltUp = 0;
    
    classifications.forEach(result => {
      totalAgriculture += result.classifications.agriculture;
      totalForest += result.classifications.forest;
      totalWater += result.classifications.water;
      totalBuiltUp += result.classifications.builtUp;
    });

    const count = classifications.length;
    const avgAgriculture = totalAgriculture / count;
    const avgForest = totalForest / count;
    const avgWater = totalWater / count;
    const avgBuiltUp = totalBuiltUp / count;
    
    // Calculate approximate area (simplified)
    const latRange = bounds.north - bounds.south;
    const lngRange = bounds.east - bounds.west;
    const approximateArea = latRange * lngRange * 111 * 111; // Rough conversion to km²

    return {
      totalArea: approximateArea,
      classifications: {
        agriculture: {
          area: (avgAgriculture / 100) * approximateArea,
          percentage: Math.round(avgAgriculture * 100) / 100
        },
        forest: {
          area: (avgForest / 100) * approximateArea,
          percentage: Math.round(avgForest * 100) / 100
        },
        water: {
          area: (avgWater / 100) * approximateArea,
          percentage: Math.round(avgWater * 100) / 100
        },
        builtUp: {
          area: (avgBuiltUp / 100) * approximateArea,
          percentage: Math.round(avgBuiltUp * 100) / 100
        }
      }
    };
  }

  private getAdministrativeUnit(coordinates: { lat: number; lng: number }, adminLayer: GISLayer): string {
    // In a real implementation, this would perform spatial intersection
    // For now, return a simulated administrative unit
    return `District_${Math.floor(Math.abs(coordinates.lat + coordinates.lng))}`; 
  }

  private checkProtectedArea(coordinates: { lat: number; lng: number }, protectedLayer: GISLayer): boolean {
    // In a real implementation, this would check spatial intersection with protected areas
    return Math.random() > 0.8; // 20% chance of being in a protected area
  }

  private adjustForLandUsePolicies(classifications: any, adminUnit?: string): any {
    // Apply land-use policy adjustments based on administrative unit
    const adjusted = { ...classifications };
    
    if (adminUnit && adminUnit.includes('Forest')) {
      // Increase forest confidence in forest districts
      adjusted.forest = Math.min(100, adjusted.forest * 1.1);
    }
    
    return adjusted;
  }

  private toGeoJSON(classifications: any[]): any {
    return {
      type: 'FeatureCollection',
      features: classifications.map(result => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [result.coordinates.lng, result.coordinates.lat]
        },
        properties: {
          ...result.classifications,
          confidence: result.confidence,
          sensor: result.sensor,
          date: result.metadata?.imageDate
        }
      }))
    };
  }

  private toCSV(classifications: any[]): string {
    const headers = ['latitude', 'longitude', 'agriculture', 'forest', 'water', 'builtUp', 'confidence', 'sensor', 'date'];
    const rows = classifications.map(result => [
      result.coordinates.lat,
      result.coordinates.lng,
      result.classifications.agriculture,
      result.classifications.forest,
      result.classifications.water,
      result.classifications.builtUp,
      result.confidence,
      result.sensor,
      result.metadata?.imageDate || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private toKML(classifications: any[]): string {
    const placemarks = classifications.map(result => `
      <Placemark>
        <name>Land Use: ${Object.keys(result.classifications).reduce((a, b) => 
          result.classifications[a] > result.classifications[b] ? a : b
        )}</name>
        <description>
          Agriculture: ${result.classifications.agriculture}%
          Forest: ${result.classifications.forest}%
          Water: ${result.classifications.water}%
          Built-up: ${result.classifications.builtUp}%
          Confidence: ${result.confidence}%
        </description>
        <Point>
          <coordinates>${result.coordinates.lng},${result.coordinates.lat},0</coordinates>
        </Point>
      </Placemark>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <name>Land Use Classification</name>
          ${placemarks}
        </Document>
      </kml>`;
  }
}

export const gisIntegrationService = new GISIntegrationService();