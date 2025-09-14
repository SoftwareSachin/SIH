// Helper functions for Maximum Power Gemini Asset Detection Service

/**
 * Format satellite data for maximum Gemini AI analysis
 */
export function formatSatelliteDataForAnalysis(satelliteData: any): string {
  if (!satelliteData) {
    return 'No satellite data available - using pure geographic analysis';
  }

  let analysis = `📡 SATELLITE DATA ANALYSIS:\n`;
  
  if (satelliteData.metadata) {
    analysis += `- Sensor: ${satelliteData.metadata.sensor || 'Unknown'}\n`;
    analysis += `- Date: ${satelliteData.metadata.date || satelliteData.metadata.imageDate || 'Unknown'}\n`;
    analysis += `- Resolution: ${satelliteData.resolution || 'Unknown'}m\n`;
    analysis += `- Cloud Cover: ${satelliteData.metadata.cloudCover || 'Unknown'}%\n`;
  }

  if (satelliteData.classifications) {
    analysis += `\n🎯 LAND USE CLASSIFICATIONS:\n`;
    analysis += `- Agriculture: ${(satelliteData.classifications.agriculture * 100).toFixed(1)}%\n`;
    analysis += `- Forest: ${(satelliteData.classifications.forest * 100).toFixed(1)}%\n`;
    analysis += `- Water: ${(satelliteData.classifications.water * 100).toFixed(1)}%\n`;
    analysis += `- Built-up: ${(satelliteData.classifications.builtUp * 100).toFixed(1)}%\n`;
  }

  if (satelliteData.metadata?.spectralIndices) {
    const indices = satelliteData.metadata.spectralIndices;
    analysis += `\n📊 SPECTRAL INDICES:\n`;
    analysis += `- NDVI (Vegetation): ${indices.avgNDVI?.toFixed(3) || 'N/A'}\n`;
    analysis += `- NDWI (Water): ${indices.avgNDWI?.toFixed(3) || 'N/A'}\n`;
    analysis += `- NDBI (Built-up): ${indices.avgNDBI?.toFixed(3) || 'N/A'}\n`;
    analysis += `- SAVI (Soil): ${indices.avgSAVI?.toFixed(3) || 'N/A'}\n`;
  }

  return analysis;
}

/**
 * Get geographic context for Indian states
 */
export function getGeographicContext(lat: number, lng: number): string {
  // Determine likely state and geographic characteristics
  let context = `📍 LOCATION ANALYSIS:\n`;
  
  if (lat >= 23.0 && lat <= 25.5 && lng >= 91.0 && lng <= 92.5) {
    context += `- Probable State: Tripura\n`;
    context += `- Terrain: Hills and valleys, tribal settlements\n`;
    context += `- Agriculture: Hill agriculture, jhum cultivation\n`;
    context += `- Water: Stream networks, valley ponds\n`;
  } else if (lat >= 17.0 && lat <= 20.0 && lng >= 78.0 && lng <= 81.5) {
    context += `- Probable State: Telangana\n`;
    context += `- Terrain: Deccan plateau, agricultural plains\n`;
    context += `- Agriculture: Irrigated rice, cotton fields\n`;
    context += `- Water: Tanks, irrigation channels\n`;
  } else if (lat >= 19.0 && lat <= 22.5 && lng >= 84.0 && lng <= 87.5) {
    context += `- Probable State: Odisha\n`;
    context += `- Terrain: Coastal plains, Eastern Ghats foothills\n`;
    context += `- Agriculture: Rice cultivation, tribal farming\n`;
    context += `- Water: Rivers, traditional ponds\n`;
  } else if (lat >= 21.0 && lat <= 26.5 && lng >= 74.0 && lng <= 82.5) {
    context += `- Probable State: Madhya Pradesh\n`;
    context += `- Terrain: Central highlands, forest areas\n`;
    context += `- Agriculture: Mixed farming, tribal settlements\n`;
    context += `- Water: Rivers, traditional water bodies\n`;
  } else {
    context += `- Probable Region: Central/Eastern India\n`;
    context += `- Terrain: Mixed topography\n`;
    context += `- Agriculture: Regional farming patterns\n`;
    context += `- Water: Seasonal water bodies\n`;
  }

  // Add seasonal context
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) {
    context += `- Season: Summer (dry season, reduced vegetation)\n`;
  } else if (month >= 6 && month <= 9) {
    context += `- Season: Monsoon (peak vegetation, water bodies full)\n`;
  } else if (month >= 10 && month <= 12) {
    context += `- Season: Post-monsoon (harvest season, moderate vegetation)\n`;
  } else {
    context += `- Season: Winter (dry season, stable conditions)\n`;
  }

  return context;
}

/**
 * Enhanced asset type descriptions for Gemini analysis
 */
export function getAssetTypeDescriptions(): string {
  return `
🎯 ASSET DETECTION TARGETS WITH MAXIMUM PRECISION:

1. **AGRICULTURAL LAND** 🌾
   - Field patterns: Regular geometric shapes, terrace systems
   - Vegetation signatures: Seasonal crop patterns, irrigation lines
   - Contextual clues: Field boundaries, access paths, farm structures
   - Size range: 0.1-50 hectares per field
   - Confidence indicators: Clear boundaries, vegetation uniformity

2. **WATER BODIES** 💧
   - Ponds/Tanks: Circular/oval dark areas, earthen embankments
   - Rivers/Streams: Linear water features, meandering patterns
   - Wells: Small circular features, access paths
   - Size range: 0.01-100 hectares
   - Confidence indicators: Consistent water signature, permanent features

3. **FOREST COVER** 🌲
   - Dense vegetation: High NDVI values, irregular boundaries
   - Canopy patterns: Mixed species, natural distribution
   - Edge characteristics: Gradual transition to other land uses
   - Size range: 1-1000+ hectares
   - Confidence indicators: Continuous canopy, natural patterns

4. **HOMESTEADS** 🏠
   - Rural settlements: Clustered buildings, compound areas
   - Access patterns: Paths, small clearings
   - Mixed use: Residential + agricultural integration
   - Size range: 0.01-2 hectares per homestead
   - Confidence indicators: Built-up signatures, human activity signs

5. **INFRASTRUCTURE** 🏗️
   - Community facilities: Larger buildings, open spaces
   - Roads/Paths: Linear features, connectivity patterns
   - Social infrastructure: Schools, health centers, community halls
   - Size range: 0.1-10 hectares
   - Confidence indicators: Geometric structures, accessibility
`;
}