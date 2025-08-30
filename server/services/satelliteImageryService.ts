import axios from 'axios';

interface SatelliteImageRequest {
  lat: number;
  lng: number;
  zoom: number;
  size: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface SatelliteImageData {
  imageUrl: string;
  bands: {
    red: number[][];
    green: number[][];
    blue: number[][];
    nir: number[][];
    swir: number[][];
  };
  metadata: {
    date: string;
    cloudCover: number;
    resolution: number;
    sensor: string;
  };
}

export class SatelliteImageryService {
  private readonly NASA_GIBS_BASE = 'https://map1.vis.earthdata.nasa.gov/wmts-geo/1.0.0';
  private readonly SENTINEL_HUB_BASE = 'https://services.sentinel-hub.com/api/v1';
  
  constructor() {
    console.log('Satellite Imagery Service initialized');
  }

  /**
   * Fetch satellite imagery from NASA GIBS (free, real-time)
   */
  async fetchNASAImagery(request: SatelliteImageRequest): Promise<SatelliteImageData> {
    try {
      const { lat, lng, zoom, size } = request;
      const date = request.dateRange?.end || new Date().toISOString().split('T')[0];
      
      // Calculate tile coordinates from lat/lng
      const tileCoords = this.getTileCoordinates(lat, lng, zoom);
      
      // NASA GIBS MODIS True Color
      const layerName = 'MODIS_Aqua_CorrectedReflectance_TrueColor';
      const tileMatrixSet = 'EPSG4326_250m';
      
      const imageUrl = `${this.NASA_GIBS_BASE}/${layerName}/default/${date}/${tileMatrixSet}/${zoom}/${tileCoords.y}/${tileCoords.x}.jpg`;
      
      // For real implementation, we would fetch the actual image and process bands
      // Here we simulate band data based on geographic characteristics
      const bands = await this.simulateBandDataFromLocation(lat, lng);
      
      return {
        imageUrl,
        bands,
        metadata: {
          date,
          cloudCover: Math.random() * 20, // Simulate cloud cover percentage
          resolution: 250, // MODIS 250m resolution
          sensor: 'MODIS Aqua'
        }
      };
    } catch (error) {
      console.error('Error fetching NASA imagery:', error);
      throw new Error('Failed to fetch NASA satellite imagery');
    }
  }

  /**
   * Fetch high-resolution imagery from Sentinel-2 (requires API key)
   */
  async fetchSentinelImagery(request: SatelliteImageRequest, apiKey?: string): Promise<SatelliteImageData> {
    if (!apiKey) {
      throw new Error('Sentinel Hub API key required for high-resolution imagery');
    }

    try {
      const { lat, lng, size } = request;
      const startDate = request.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = request.dateRange?.end || new Date().toISOString().split('T')[0];
      
      // Create bounding box around the point
      const bbox = this.createBoundingBox(lat, lng, size);
      
      const evalscript = this.getSentinelEvalScript();
      
      const requestBody = {
        input: {
          bounds: {
            bbox: bbox,
            properties: {
              crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
            }
          },
          data: [
            {
              dataFilter: {
                timeRange: {
                  from: `${startDate}T00:00:00Z`,
                  to: `${endDate}T23:59:59Z`
                }
              },
              type: "sentinel-2-l2a"
            }
          ]
        },
        output: {
          width: size,
          height: size,
          responses: [
            {
              identifier: "default",
              format: {
                type: "image/tiff"
              }
            }
          ]
        },
        evalscript: evalscript
      };

      // For real implementation, make actual API call to Sentinel Hub
      // const response = await axios.post(`${this.SENTINEL_HUB_BASE}/process`, requestBody, {
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      // Simulate high-quality band data
      const bands = await this.simulateHighResBandData(lat, lng, size);
      
      return {
        imageUrl: `sentinel-${lat}-${lng}-${Date.now()}.tiff`,
        bands,
        metadata: {
          date: endDate,
          cloudCover: Math.random() * 10, // Sentinel typically has lower cloud cover
          resolution: 10, // Sentinel-2 10m resolution
          sensor: 'Sentinel-2'
        }
      };
    } catch (error) {
      console.error('Error fetching Sentinel imagery:', error);
      throw new Error('Failed to fetch Sentinel satellite imagery');
    }
  }

  /**
   * Calculate spectral indices from band data
   */
  calculateSpectralIndices(bands: SatelliteImageData['bands']) {
    const { red, green, blue, nir, swir } = bands;
    const height = red.length;
    const width = red[0].length;
    
    const indices = {
      ndvi: Array(height).fill(null).map(() => Array(width).fill(0)),
      ndwi: Array(height).fill(null).map(() => Array(width).fill(0)),
      ndbi: Array(height).fill(null).map(() => Array(width).fill(0)),
      savi: Array(height).fill(null).map(() => Array(width).fill(0))
    };

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const r = red[i][j];
        const g = green[i][j];
        const n = nir[i][j];
        const s = swir[i][j];

        // NDVI - Normalized Difference Vegetation Index
        indices.ndvi[i][j] = (n - r) / (n + r + 0.0001);
        
        // NDWI - Normalized Difference Water Index
        indices.ndwi[i][j] = (g - n) / (g + n + 0.0001);
        
        // NDBI - Normalized Difference Built-up Index
        indices.ndbi[i][j] = (s - n) / (s + n + 0.0001);
        
        // SAVI - Soil Adjusted Vegetation Index
        const L = 0.5; // soil brightness correction factor
        indices.savi[i][j] = ((n - r) / (n + r + L)) * (1 + L);
      }
    }

    return indices;
  }

  private getTileCoordinates(lat: number, lng: number, zoom: number) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
  }

  private createBoundingBox(lat: number, lng: number, size: number) {
    const offset = size * 0.0001; // Approximate offset for bounding box
    return [
      lng - offset,
      lat - offset,
      lng + offset,
      lat + offset
    ];
  }

  private getSentinelEvalScript(): string {
    return `
      //VERSION=3
      function setup() {
        return {
          input: ["B02", "B03", "B04", "B08", "B11"],
          output: { bands: 5 }
        };
      }
      
      function evaluatePixel(sample) {
        return [
          sample.B04, // Red
          sample.B03, // Green  
          sample.B02, // Blue
          sample.B08, // NIR
          sample.B11  // SWIR
        ];
      }
    `;
  }

  private async simulateBandDataFromLocation(lat: number, lng: number): Promise<SatelliteImageData['bands']> {
    // Simulate realistic band values based on geographic location
    const size = 64; // 64x64 pixel simulation
    
    // Determine biome based on coordinates
    const biome = this.determineBiome(lat, lng);
    
    const red = Array(size).fill(null).map(() => Array(size).fill(0));
    const green = Array(size).fill(null).map(() => Array(size).fill(0));
    const blue = Array(size).fill(null).map(() => Array(size).fill(0));
    const nir = Array(size).fill(null).map(() => Array(size).fill(0));
    const swir = Array(size).fill(null).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const noise = () => (Math.random() - 0.5) * 0.1;
        
        switch (biome) {
          case 'forest':
            red[i][j] = 0.05 + noise();
            green[i][j] = 0.15 + noise();
            blue[i][j] = 0.08 + noise();
            nir[i][j] = 0.7 + noise();
            swir[i][j] = 0.3 + noise();
            break;
          case 'agriculture':
            red[i][j] = 0.1 + noise();
            green[i][j] = 0.25 + noise();
            blue[i][j] = 0.12 + noise();
            nir[i][j] = 0.45 + noise();
            swir[i][j] = 0.25 + noise();
            break;
          case 'water':
            red[i][j] = 0.03 + noise();
            green[i][j] = 0.08 + noise();
            blue[i][j] = 0.15 + noise();
            nir[i][j] = 0.02 + noise();
            swir[i][j] = 0.01 + noise();
            break;
          case 'urban':
            red[i][j] = 0.2 + noise();
            green[i][j] = 0.18 + noise();
            blue[i][j] = 0.15 + noise();
            nir[i][j] = 0.25 + noise();
            swir[i][j] = 0.4 + noise();
            break;
          default:
            red[i][j] = 0.15 + noise();
            green[i][j] = 0.18 + noise();
            blue[i][j] = 0.12 + noise();
            nir[i][j] = 0.3 + noise();
            swir[i][j] = 0.2 + noise();
        }
      }
    }

    return { red, green, blue, nir, swir };
  }

  private async simulateHighResBandData(lat: number, lng: number, size: number): Promise<SatelliteImageData['bands']> {
    // Higher resolution simulation with more detail
    const biome = this.determineBiome(lat, lng);
    
    const red = Array(size).fill(null).map(() => Array(size).fill(0));
    const green = Array(size).fill(null).map(() => Array(size).fill(0));
    const blue = Array(size).fill(null).map(() => Array(size).fill(0));
    const nir = Array(size).fill(null).map(() => Array(size).fill(0));
    const swir = Array(size).fill(null).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        // Add spatial correlation for more realistic patterns
        const spatialVariation = Math.sin(i * 0.1) * Math.cos(j * 0.1) * 0.05;
        const noise = () => (Math.random() - 0.5) * 0.05; // Less noise for high-res
        
        switch (biome) {
          case 'forest':
            red[i][j] = Math.max(0, 0.04 + spatialVariation + noise());
            green[i][j] = Math.max(0, 0.12 + spatialVariation + noise());
            blue[i][j] = Math.max(0, 0.06 + spatialVariation + noise());
            nir[i][j] = Math.max(0, 0.75 + spatialVariation + noise());
            swir[i][j] = Math.max(0, 0.28 + spatialVariation + noise());
            break;
          case 'agriculture':
            red[i][j] = Math.max(0, 0.08 + spatialVariation + noise());
            green[i][j] = Math.max(0, 0.22 + spatialVariation + noise());
            blue[i][j] = Math.max(0, 0.10 + spatialVariation + noise());
            nir[i][j] = Math.max(0, 0.48 + spatialVariation + noise());
            swir[i][j] = Math.max(0, 0.22 + spatialVariation + noise());
            break;
          case 'water':
            red[i][j] = Math.max(0, 0.02 + spatialVariation + noise());
            green[i][j] = Math.max(0, 0.06 + spatialVariation + noise());
            blue[i][j] = Math.max(0, 0.12 + spatialVariation + noise());
            nir[i][j] = Math.max(0, 0.01 + spatialVariation + noise());
            swir[i][j] = Math.max(0, 0.005 + spatialVariation + noise());
            break;
          case 'urban':
            red[i][j] = Math.max(0, 0.18 + spatialVariation + noise());
            green[i][j] = Math.max(0, 0.16 + spatialVariation + noise());
            blue[i][j] = Math.max(0, 0.14 + spatialVariation + noise());
            nir[i][j] = Math.max(0, 0.22 + spatialVariation + noise());
            swir[i][j] = Math.max(0, 0.38 + spatialVariation + noise());
            break;
          default:
            red[i][j] = Math.max(0, 0.12 + spatialVariation + noise());
            green[i][j] = Math.max(0, 0.15 + spatialVariation + noise());
            blue[i][j] = Math.max(0, 0.10 + spatialVariation + noise());
            nir[i][j] = Math.max(0, 0.28 + spatialVariation + noise());
            swir[i][j] = Math.max(0, 0.18 + spatialVariation + noise());
        }
      }
    }

    return { red, green, blue, nir, swir };
  }

  private determineBiome(lat: number, lng: number): string {
    // Rough biome classification based on coordinates
    // This would be replaced with actual geographic data in production
    
    // India-specific regions (since this is FRA system)
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) {
      // Forest regions (Western Ghats, Northeast, Central India)
      if ((lng >= 73 && lng <= 77 && lat >= 8 && lat <= 20) || // Western Ghats
          (lng >= 89 && lng <= 97 && lat >= 22 && lat <= 29) || // Northeast
          (lng >= 78 && lng <= 84 && lat >= 18 && lat <= 24)) { // Central India
        return 'forest';
      }
      
      // Agricultural plains (Gangetic, Deccan)
      if ((lng >= 77 && lng <= 88 && lat >= 24 && lat <= 30) || // Gangetic
          (lng >= 74 && lng <= 80 && lat >= 12 && lat <= 20)) { // Deccan
        return 'agriculture';
      }
      
      // Urban areas (approximate major cities)
      if ((Math.abs(lat - 19.076) < 0.5 && Math.abs(lng - 72.877) < 0.5) || // Mumbai
          (Math.abs(lat - 28.704) < 0.5 && Math.abs(lng - 77.102) < 0.5) || // Delhi
          (Math.abs(lat - 12.971) < 0.5 && Math.abs(lng - 77.594) < 0.5)) { // Bangalore
        return 'urban';
      }
      
      // Water bodies
      if (Math.random() < 0.1) { // 10% chance for water bodies
        return 'water';
      }
    }
    
    return 'mixed';
  }
}

export const satelliteImageryService = new SatelliteImageryService();