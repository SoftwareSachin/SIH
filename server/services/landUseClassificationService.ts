import * as tf from '@tensorflow/tfjs-node';
import { satelliteImageryService, SatelliteImageryService } from './satelliteImageryService';

interface ClassificationRequest {
  lat: number;
  lng: number;
  area?: number; // Area in hectares to classify
  highResolution?: boolean;
  apiKey?: string; // For premium satellite data
}

interface LandUseResult {
  coordinates: { lat: number; lng: number };
  classifications: {
    agriculture: number;
    forest: number;
    water: number;
    builtUp: number;
  };
  confidence: number;
  resolution: number;
  sensor: string;
  processingTime: number;
  metadata: {
    imageDate: string;
    cloudCover: number;
    spectralIndices: {
      avgNDVI: number;
      avgNDWI: number;
      avgNDBI: number;
      avgSAVI: number;
    };
  };
}

interface ModelPrediction {
  agriculture: number;
  forest: number;
  water: number;
  builtUp: number;
  confidence: number;
}

export class LandUseClassificationService {
  private model: tf.LayersModel | null = null;
  private modelLoaded = false;
  private readonly MODEL_INPUT_SIZE = 64;

  constructor() {
    this.initializeModel();
  }

  /**
   * Initialize or load pre-trained CNN model
   */
  private async initializeModel(): Promise<void> {
    try {
      console.log('Initializing land-use classification model...');
      
      // Create a simple CNN model for land-use classification
      // In production, this would be replaced with a pre-trained model
      this.model = this.createCNNModel();
      
      // In a real implementation, you would load pre-trained weights:
      // this.model = await tf.loadLayersModel('/path/to/pretrained/model.json');
      
      this.modelLoaded = true;
      console.log('Land-use classification model initialized successfully');
    } catch (error) {
      console.error('Error initializing model:', error);
      this.modelLoaded = false;
    }
  }

  /**
   * Create a CNN model for land-use classification
   * This simulates a pre-trained model architecture
   */
  private createCNNModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Input layer for 5-band satellite imagery
        tf.layers.inputLayer({ 
          inputShape: [this.MODEL_INPUT_SIZE, this.MODEL_INPUT_SIZE, 5] 
        }),
        
        // First convolutional block
        tf.layers.conv2d({
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.batchNormalization(),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        // Second convolutional block
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.batchNormalization(),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        // Third convolutional block
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.batchNormalization(),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        // Fourth convolutional block
        tf.layers.conv2d({
          filters: 256,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.batchNormalization(),
        tf.layers.globalAveragePooling2d({}),
        
        // Dense layers
        tf.layers.dense({
          units: 512,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({
          units: 256,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        
        // Output layer for 4 land-use classes
        tf.layers.dense({
          units: 4,
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * Classify land use for a given location
   */
  async classifyLandUse(request: ClassificationRequest): Promise<LandUseResult> {
    const startTime = Date.now();
    
    try {
      if (!this.modelLoaded || !this.model) {
        throw new Error('Classification model not available');
      }

      const { lat, lng, highResolution = false, apiKey } = request;

      // Fetch satellite imagery
      const imageData = highResolution && apiKey 
        ? await satelliteImageryService.fetchSentinelImagery(
            { lat, lng, zoom: 13, size: this.MODEL_INPUT_SIZE }, 
            apiKey
          )
        : await satelliteImageryService.fetchNASAImagery(
            { lat, lng, zoom: 13, size: this.MODEL_INPUT_SIZE }
          );

      // Calculate spectral indices
      const spectralIndices = satelliteImageryService.calculateSpectralIndices(imageData.bands);

      // Prepare input tensor for CNN
      const inputTensor = this.prepareCNNInput(imageData.bands);

      // Run CNN prediction
      const cnnPrediction = await this.runCNNPrediction(inputTensor);

      // Run Random Forest prediction (rule-based approach)
      const rfPrediction = this.runRandomForestPrediction(spectralIndices);

      // Ensemble both predictions
      const finalPrediction = this.ensemblePredictions(cnnPrediction, rfPrediction);

      // Calculate average spectral indices for metadata
      const avgIndices = this.calculateAverageIndices(spectralIndices);

      const processingTime = Date.now() - startTime;

      // Clean up tensors
      inputTensor.dispose();

      return {
        coordinates: { lat, lng },
        classifications: {
          agriculture: Math.round(finalPrediction.agriculture * 100) / 100,
          forest: Math.round(finalPrediction.forest * 100) / 100,
          water: Math.round(finalPrediction.water * 100) / 100,
          builtUp: Math.round(finalPrediction.builtUp * 100) / 100
        },
        confidence: Math.round(finalPrediction.confidence * 100) / 100,
        resolution: imageData.metadata.resolution,
        sensor: imageData.metadata.sensor,
        processingTime,
        metadata: {
          imageDate: imageData.metadata.date,
          cloudCover: imageData.metadata.cloudCover,
          spectralIndices: avgIndices
        }
      };

    } catch (error) {
      console.error('Error in land-use classification:', error);
      throw new Error('Failed to classify land use');
    }
  }

  /**
   * Batch classify land use for multiple locations
   */
  async batchClassifyLandUse(
    locations: Array<{ lat: number; lng: number }>,
    options: { highResolution?: boolean; apiKey?: string } = {}
  ): Promise<LandUseResult[]> {
    const results: LandUseResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      const batchPromises = batch.map(location => 
        this.classifyLandUse({ ...location, ...options })
      );
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
        // Continue with next batch
      }
    }

    return results;
  }

  /**
   * Prepare CNN input from satellite bands
   */
  private prepareCNNInput(bands: any): tf.Tensor {
    const { red, green, blue, nir, swir } = bands;
    const size = red.length;
    
    // Create 5-channel tensor: [R, G, B, NIR, SWIR]
    const inputArray = new Float32Array(size * size * 5);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const pixelIndex = i * size + j;
        const baseIndex = pixelIndex * 5;
        
        inputArray[baseIndex] = red[i][j];
        inputArray[baseIndex + 1] = green[i][j];
        inputArray[baseIndex + 2] = blue[i][j];
        inputArray[baseIndex + 3] = nir[i][j];
        inputArray[baseIndex + 4] = swir[i][j];
      }
    }

    return tf.tensor4d(inputArray, [1, size, size, 5]);
  }

  /**
   * Run CNN prediction
   */
  private async runCNNPrediction(inputTensor: tf.Tensor): Promise<ModelPrediction> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const predictionData = await prediction.data();
    
    // Clean up
    prediction.dispose();

    return {
      agriculture: predictionData[0],
      forest: predictionData[1],
      water: predictionData[2],
      builtUp: predictionData[3],
      confidence: Math.max(...Array.from(predictionData)) // Use highest probability as confidence
    };
  }

  /**
   * Run Random Forest prediction using spectral indices
   */
  private runRandomForestPrediction(spectralIndices: any): ModelPrediction {
    const { ndvi, ndwi, ndbi, savi } = spectralIndices;
    const size = ndvi.length;
    
    let agricultureCount = 0;
    let forestCount = 0;
    let waterCount = 0;
    let builtUpCount = 0;
    
    const totalPixels = size * size;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const ndviVal = ndvi[i][j];
        const ndwiVal = ndwi[i][j];
        const ndbiVal = ndbi[i][j];
        const saviVal = savi[i][j];

        // Classification rules based on spectral indices
        if (ndwiVal > 0.3) {
          waterCount++;
        } else if (ndviVal > 0.6 && saviVal > 0.4) {
          forestCount++;
        } else if (ndviVal > 0.2 && ndviVal <= 0.6 && saviVal > 0.1) {
          agricultureCount++;
        } else if (ndbiVal > 0.1) {
          builtUpCount++;
        } else {
          // Default to mixed/other (distribute among categories)
          agricultureCount += 0.4;
          forestCount += 0.3;
          builtUpCount += 0.3;
        }
      }
    }

    // Normalize to percentages
    const agriculture = (agricultureCount / totalPixels) * 100;
    const forest = (forestCount / totalPixels) * 100;
    const water = (waterCount / totalPixels) * 100;
    const builtUp = (builtUpCount / totalPixels) * 100;

    // Calculate confidence based on clarity of classification
    const dominantClass = Math.max(agriculture, forest, water, builtUp);
    const confidence = dominantClass > 50 ? 0.9 : dominantClass > 30 ? 0.75 : 0.6;

    return {
      agriculture,
      forest,
      water,
      builtUp,
      confidence
    };
  }

  /**
   * Ensemble CNN and Random Forest predictions
   */
  private ensemblePredictions(
    cnnPrediction: ModelPrediction,
    rfPrediction: ModelPrediction
  ): ModelPrediction {
    // Weight CNN more heavily (0.7) as it's typically more accurate
    // Weight RF less (0.3) but it provides good spectral index validation
    const cnnWeight = 0.7;
    const rfWeight = 0.3;

    const agriculture = cnnPrediction.agriculture * cnnWeight + rfPrediction.agriculture * rfWeight;
    const forest = cnnPrediction.forest * cnnWeight + rfPrediction.forest * rfWeight;
    const water = cnnPrediction.water * cnnWeight + rfPrediction.water * rfWeight;
    const builtUp = cnnPrediction.builtUp * cnnWeight + rfPrediction.builtUp * rfWeight;

    // Average the confidence scores
    const confidence = (cnnPrediction.confidence * cnnWeight + rfPrediction.confidence * rfWeight);

    return {
      agriculture,
      forest,
      water,
      builtUp,
      confidence
    };
  }

  /**
   * Calculate average spectral indices for metadata
   */
  private calculateAverageIndices(spectralIndices: any) {
    const { ndvi, ndwi, ndbi, savi } = spectralIndices;
    const size = ndvi.length;
    let ndviSum = 0, ndwiSum = 0, ndbiSum = 0, saviSum = 0;
    const totalPixels = size * size;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        ndviSum += ndvi[i][j];
        ndwiSum += ndwi[i][j];
        ndbiSum += ndbi[i][j];
        saviSum += savi[i][j];
      }
    }

    return {
      avgNDVI: Math.round((ndviSum / totalPixels) * 1000) / 1000,
      avgNDWI: Math.round((ndwiSum / totalPixels) * 1000) / 1000,
      avgNDBI: Math.round((ndbiSum / totalPixels) * 1000) / 1000,
      avgSAVI: Math.round((saviSum / totalPixels) * 1000) / 1000
    };
  }

  /**
   * Get classification statistics for a region
   */
  async getRegionStatistics(
    bounds: { north: number; south: number; east: number; west: number },
    gridSize: number = 5
  ): Promise<{
    totalArea: number;
    classifications: {
      agriculture: { area: number; percentage: number };
      forest: { area: number; percentage: number };
      water: { area: number; percentage: number };
      builtUp: { area: number; percentage: number };
    };
    confidence: number;
  }> {
    // Generate grid points within bounds
    const { north, south, east, west } = bounds;
    const latStep = (north - south) / gridSize;
    const lngStep = (east - west) / gridSize;
    
    const gridPoints: Array<{ lat: number; lng: number }> = [];
    
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        gridPoints.push({
          lat: south + i * latStep,
          lng: west + j * lngStep
        });
      }
    }

    // Classify all grid points
    const results = await this.batchClassifyLandUse(gridPoints);
    
    // Aggregate results
    let totalAgriculture = 0, totalForest = 0, totalWater = 0, totalBuiltUp = 0;
    let totalConfidence = 0;
    
    results.forEach(result => {
      totalAgriculture += result.classifications.agriculture;
      totalForest += result.classifications.forest;
      totalWater += result.classifications.water;
      totalBuiltUp += result.classifications.builtUp;
      totalConfidence += result.confidence;
    });

    const count = results.length;
    const avgAgriculture = totalAgriculture / count;
    const avgForest = totalForest / count;
    const avgWater = totalWater / count;
    const avgBuiltUp = totalBuiltUp / count;
    
    // Calculate approximate area (this is simplified - real calculation would consider projection)
    const latRange = north - south;
    const lngRange = east - west;
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
      },
      confidence: Math.round((totalConfidence / count) * 100) / 100
    };
  }
}

export const landUseClassificationService = new LandUseClassificationService();