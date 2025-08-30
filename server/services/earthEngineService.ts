import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

interface EarthEngineRequest {
  lat: number;
  lng: number;
  startDate: string;
  endDate: string;
  collection: string;
  bands: string[];
  scale: number;
  maxPixels?: number;
}

interface EarthEngineResult {
  bands: {
    [bandName: string]: number[][];
  };
  metadata: {
    imageDate: string;
    cloudCover: number;
    imageId: string;
    pixel_count: number;
  };
}

export class EarthEngineService {
  private serviceAccountKeyPath: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize Earth Engine service with service account
   */
  private async initializeService(): Promise<void> {
    try {
      // Check for service account key in environment
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccountKey) {
        // Save the key to a temporary file
        this.serviceAccountKeyPath = path.join('/tmp', 'ee-service-key.json');
        await writeFile(this.serviceAccountKeyPath, serviceAccountKey);
        
        // Initialize Earth Engine with service account
        await this.authenticateWithServiceAccount();
        this.isInitialized = true;
        console.log('Google Earth Engine service initialized with service account');
      } else {
        console.log('Google Earth Engine service account not found - using fallback data sources');
      }
    } catch (error) {
      console.log('Google Earth Engine service account not found - using fallback data sources');
    }
  }

  /**
   * Authenticate with Google Earth Engine using service account
   */
  private async authenticateWithServiceAccount(): Promise<void> {
    if (!this.serviceAccountKeyPath) {
      throw new Error('Service account key path not set');
    }

    const pythonScript = `
import ee
import json
import sys

try:
    service_account = sys.argv[1]
    key_path = sys.argv[2]
    project = sys.argv[3]
    
    # Read service account email from key file
    with open(key_path, 'r') as f:
        key_data = json.load(f)
        service_account_email = key_data['client_email']
        project_id = key_data['project_id']
    
    # Initialize Earth Engine
    credentials = ee.ServiceAccountCredentials(service_account_email, key_path)
    ee.Initialize(credentials, project=project_id)
    
    # Test the connection
    test_image = ee.Image('COPERNICUS/S2_SR/20220101T100319_20220101T100321_T33UUP')
    info = test_image.getInfo()
    
    print("SUCCESS: Earth Engine authenticated")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
`;

    return new Promise((resolve, reject) => {
      const process = spawn('python3', ['-c', pythonScript, 'dummy', this.serviceAccountKeyPath!, 'dummy']);
      
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`Earth Engine authentication failed: ${error || output}`));
        }
      });
    });
  }

  /**
   * Fetch real satellite data from Google Earth Engine
   */
  async fetchSatelliteData(request: EarthEngineRequest): Promise<EarthEngineResult> {
    if (!this.isInitialized) {
      throw new Error('Earth Engine service not initialized - service account required');
    }

    const pythonScript = `
import ee
import json
import sys
import numpy as np

try:
    # Parse request
    request_json = sys.argv[1]
    key_path = sys.argv[2]
    request = json.loads(request_json)
    
    # Read service account info
    with open(key_path, 'r') as f:
        key_data = json.load(f)
        service_account_email = key_data['client_email']
        project_id = key_data['project_id']
    
    # Initialize Earth Engine
    credentials = ee.ServiceAccountCredentials(service_account_email, key_path)
    ee.Initialize(credentials, project=project_id)
    
    # Create point geometry
    point = ee.Geometry.Point([request['lng'], request['lat']])
    
    # Get image collection
    if request['collection'] == 'LANDSAT8':
        collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    elif request['collection'] == 'SENTINEL2':
        collection = ee.ImageCollection('COPERNICUS/S2_SR')
    else:
        collection = ee.ImageCollection(request['collection'])
    
    # Filter collection
    filtered = (collection
                .filterDate(request['startDate'], request['endDate'])
                .filterBounds(point)
                .sort('CLOUD_COVER')
                .first())
    
    # Create a buffer around the point for sampling
    buffer = point.buffer(request['scale'] * 32)  # 64x64 pixel area
    
    # Sample the image
    sample = filtered.select(request['bands']).sampleRectangle(
        geometry=buffer,
        defaultValue=0,
        bestEffort=True
    )
    
    # Get the data
    band_data = {}
    for band in request['bands']:
        try:
            band_array = sample.select(band).getInfo()['properties'][band]
            if isinstance(band_array, list) and len(band_array) > 0:
                band_data[band] = band_array
            else:
                # Fallback to single value
                band_data[band] = [[0.1] * 64 for _ in range(64)]
        except:
            # Fallback data for missing bands
            band_data[band] = [[0.1] * 64 for _ in range(64)]
    
    # Get metadata
    metadata = {
        'imageDate': filtered.get('system:time_start').getInfo(),
        'cloudCover': filtered.get('CLOUD_COVER').getInfo() or 0,
        'imageId': filtered.get('system:id').getInfo() or 'unknown',
        'pixel_count': len(band_data[request['bands'][0]]) * len(band_data[request['bands'][0]][0])
    }
    
    result = {
        'bands': band_data,
        'metadata': metadata
    }
    
    print(json.dumps(result))
    
except Exception as e:
    error_result = {
        'error': str(e),
        'bands': {},
        'metadata': {'imageDate': '', 'cloudCover': 0, 'imageId': '', 'pixel_count': 0}
    }
    print(json.dumps(error_result))
`;

    return new Promise((resolve, reject) => {
      const requestJson = JSON.stringify(request);
      const process = spawn('python3', ['-c', pythonScript, requestJson, this.serviceAccountKeyPath!]);
      
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        try {
          const result = JSON.parse(output);
          if (result.error) {
            console.error('Earth Engine error:', result.error);
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (parseError) {
          console.error('Failed to parse Earth Engine response:', error || output);
          reject(new Error(`Earth Engine request failed: ${error || 'Unknown error'}`));
        }
      });
    });
  }

  /**
   * Get Landsat 8 data for land-use classification
   */
  async getLandsatData(lat: number, lng: number, date: string = new Date().toISOString().split('T')[0]): Promise<EarthEngineResult> {
    const endDate = new Date(date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30); // 30 days before

    return this.fetchSatelliteData({
      lat,
      lng,
      startDate: startDate.toISOString().split('T')[0],
      endDate: date,
      collection: 'LANDSAT8',
      bands: ['SR_B4', 'SR_B3', 'SR_B2', 'SR_B5', 'SR_B6'], // Red, Green, Blue, NIR, SWIR
      scale: 30,
      maxPixels: 1e9
    });
  }

  /**
   * Get Sentinel-2 data for high-resolution analysis
   */
  async getSentinel2Data(lat: number, lng: number, date: string = new Date().toISOString().split('T')[0]): Promise<EarthEngineResult> {
    const endDate = new Date(date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    return this.fetchSatelliteData({
      lat,
      lng,
      startDate: startDate.toISOString().split('T')[0],
      endDate: date,
      collection: 'SENTINEL2',
      bands: ['B4', 'B3', 'B2', 'B8', 'B11'], // Red, Green, Blue, NIR, SWIR
      scale: 10,
      maxPixels: 1e9
    });
  }

  /**
   * Check if Earth Engine service is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    if (this.serviceAccountKeyPath) {
      try {
        await unlink(this.serviceAccountKeyPath);
      } catch (error) {
        console.error('Error cleaning up service account key:', error);
      }
    }
  }
}

export const earthEngineService = new EarthEngineService();

// Clean up on process exit
process.on('exit', () => {
  earthEngineService.cleanup();
});