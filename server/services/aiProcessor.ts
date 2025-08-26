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
      // Simulate satellite imagery analysis
      // In production, this would integrate with actual satellite imagery APIs
      // and computer vision models for land-use classification
      
      const village = await storage.getVillageById(villageId);
      if (!village) {
        throw new Error('Village not found');
      }

      // Mock asset detection results
      const mockAssets: AssetDetectionResult[] = [
        {
          type: 'pond',
          confidence: 87.5,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(village.longitude || '0') + 0.001, parseFloat(village.latitude || '0') + 0.001]
          },
          area: 0.5
        },
        {
          type: 'farm',
          confidence: 92.3,
          coordinates: {
            type: 'Polygon',
            coordinates: [[
              [parseFloat(village.longitude || '0'), parseFloat(village.latitude || '0')],
              [parseFloat(village.longitude || '0') + 0.002, parseFloat(village.latitude || '0')],
              [parseFloat(village.longitude || '0') + 0.002, parseFloat(village.latitude || '0') + 0.002],
              [parseFloat(village.longitude || '0'), parseFloat(village.latitude || '0') + 0.002],
              [parseFloat(village.longitude || '0'), parseFloat(village.latitude || '0')]
            ]]
          },
          area: 2.3
        },
        {
          type: 'homestead',
          confidence: 95.1,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(village.longitude || '0') - 0.001, parseFloat(village.latitude || '0') - 0.001]
          }
        }
      ];

      // Save detected assets to database
      for (const asset of mockAssets) {
        await storage.createAsset({
          villageId,
          assetType: asset.type as any,
          coordinates: asset.coordinates,
          area: asset.area,
          confidence: asset.confidence,
          detectedAt: new Date(),
        });
      }

      return mockAssets;
    } catch (error) {
      console.error('Error detecting assets for village:', error);
      throw error;
    }
  }

  async classifyLandUse(imageData: Buffer): Promise<{
    agriculture: number;
    forest: number;
    water: number;
    builtUp: number;
    confidence: number;
  }> {
    try {
      // Simulate land-use classification
      // In production, this would use TensorFlow.js or similar ML framework
      
      return {
        agriculture: 45.2,
        forest: 32.8,
        water: 8.5,
        builtUp: 13.5,
        confidence: 89.3
      };
    } catch (error) {
      console.error('Error classifying land use:', error);
      throw error;
    }
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
