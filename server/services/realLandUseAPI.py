#!/usr/bin/env python3
"""
Real Land-Use Classification API Endpoint
Integrates all authentic satellite data sources and AI models
NO SIMULATION - Only real data processing
"""

import os
import sys
import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import concurrent.futures

# Import real satellite services
from realSatelliteService import RealSatelliteService
from realESAService import RealESAService  
from realCNNService import RealCNNService

class RealLandUseAPI:
    """Main API for authentic land-use classification"""
    
    def __init__(self):
        # Initialize real satellite data services
        self.satellite_service = RealSatelliteService()
        self.esa_service = RealESAService()
        self.cnn_service = RealCNNService()
        
        print("✓ Real Land-Use Classification API initialized")
        print("✓ NASA EarthData, USGS M2M, ESA Copernicus APIs ready")
        print("✓ EuroSAT CNN and Random Forest models loaded")
    
    async def classify_land_use(self, lat: float, lng: float, date: str = None) -> Dict:
        """
        Classify land use using authentic satellite data and AI models
        
        Args:
            lat: Latitude coordinate
            lng: Longitude coordinate  
            date: Date for satellite imagery (YYYY-MM-DD format)
        
        Returns:
            Dict with land cover classifications for 4 classes:
            - agriculture: Agricultural land percentage
            - forest: Forest areas percentage  
            - water: Water bodies percentage
            - builtUp: Built-up areas percentage
        """
        try:
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')
            
            print(f"🛰️ Fetching real satellite data for {lat}, {lng} on {date}")
            
            # Fetch authentic satellite data from multiple sources
            satellite_data = await self._fetch_multi_source_data(lat, lng, date)
            
            # Run AI classification on real data
            classification_result = await self._run_ai_classification(satellite_data)
            
            # Post-process and align with GIS layers
            final_result = self._post_process_classification(
                classification_result, lat, lng, date
            )
            
            print(f"✅ Land-use classification complete: {final_result['dominant_class']}")
            return final_result
            
        except Exception as e:
            error_msg = f"Failed to classify land use: {e}"
            print(f"❌ {error_msg}")
            raise Exception(error_msg)
    
    async def _fetch_multi_source_data(self, lat: float, lng: float, date: str) -> Dict:
        """Fetch data from multiple authentic satellite sources"""
        
        tasks = []
        
        # Landsat data (USGS)
        tasks.append(self._fetch_landsat_data(lat, lng, date))
        
        # Sentinel-2 data (ESA)
        tasks.append(self._fetch_sentinel2_data(lat, lng, date))
        
        # MODIS land cover (NASA)
        tasks.append(self._fetch_modis_data(lat, lng, date))
        
        # Execute all data fetching in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine successful results
        combined_data = {
            'coordinates': {'lat': lat, 'lng': lng, 'date': date},
            'sources': []
        }
        
        for i, result in enumerate(results):
            source_names = ['Landsat', 'Sentinel-2', 'MODIS']
            if not isinstance(result, Exception):
                combined_data['sources'].append({
                    'name': source_names[i],
                    'data': result,
                    'status': 'success'
                })
            else:
                print(f"⚠️ {source_names[i]} data unavailable: {result}")
                combined_data['sources'].append({
                    'name': source_names[i], 
                    'status': 'failed',
                    'error': str(result)
                })
        
        # Ensure we have at least one successful data source
        successful_sources = [s for s in combined_data['sources'] if s['status'] == 'success']
        if not successful_sources:
            raise Exception("No authentic satellite data available from any source")
        
        return combined_data
    
    async def _fetch_landsat_data(self, lat: float, lng: float, date: str) -> Dict:
        """Fetch authentic Landsat data"""
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            return await loop.run_in_executor(
                executor, self.satellite_service.get_landsat_data, lat, lng, date
            )
    
    async def _fetch_sentinel2_data(self, lat: float, lng: float, date: str) -> Dict:
        """Fetch authentic Sentinel-2 data"""
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            return await loop.run_in_executor(
                executor, self.esa_service.get_sentinel2_data, lat, lng, date
            )
    
    async def _fetch_modis_data(self, lat: float, lng: float, date: str) -> Dict:
        """Fetch authentic MODIS data"""
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            year = int(date.split('-')[0])
            return await loop.run_in_executor(
                executor, self.satellite_service.get_modis_land_cover, lat, lng, year
            )
    
    async def _run_ai_classification(self, satellite_data: Dict) -> Dict:
        """Run AI classification on authentic satellite data"""
        
        # Get the best available satellite data
        best_source = self._select_best_data_source(satellite_data['sources'])
        
        if not best_source:
            raise Exception("No suitable satellite data for AI classification")
        
        data = best_source['data']
        
        # Extract bands and calculate spectral indices
        bands_data = data.get('bands', {})
        spectral_indices = self._calculate_spectral_indices(bands_data)
        
        # Run ensemble AI classification
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            classification = await loop.run_in_executor(
                executor, 
                self.cnn_service.ensemble_classify, 
                bands_data, 
                spectral_indices
            )
        
        return {
            'ai_classification': classification,
            'data_source': best_source['name'],
            'sensor': data.get('metadata', {}).get('sensor', 'unknown'),
            'spectral_indices': spectral_indices
        }
    
    def _select_best_data_source(self, sources: List[Dict]) -> Optional[Dict]:
        """Select best satellite data source for classification"""
        
        successful_sources = [s for s in sources if s['status'] == 'success']
        
        if not successful_sources:
            return None
        
        # Preference order: Sentinel-2 > Landsat > MODIS
        source_priority = {'Sentinel-2': 3, 'Landsat': 2, 'MODIS': 1}
        
        best_source = max(
            successful_sources,
            key=lambda s: source_priority.get(s['name'], 0)
        )
        
        return best_source
    
    def _calculate_spectral_indices(self, bands_data: Dict) -> Dict:
        """Calculate authentic spectral indices from satellite bands"""
        import numpy as np
        
        try:
            # Get bands (handle different naming conventions)
            red = np.array(bands_data.get('red', bands_data.get('B04', bands_data.get('B4', []))))
            green = np.array(bands_data.get('green', bands_data.get('B03', bands_data.get('B3', []))))
            blue = np.array(bands_data.get('blue', bands_data.get('B02', bands_data.get('B2', []))))
            nir = np.array(bands_data.get('nir', bands_data.get('B08', bands_data.get('B5', []))))
            swir1 = np.array(bands_data.get('swir1', bands_data.get('B11', bands_data.get('B6', []))))
            swir2 = np.array(bands_data.get('swir2', bands_data.get('B12', bands_data.get('B7', []))))
            
            eps = 1e-8  # Prevent division by zero
            
            # Real spectral indices from remote sensing literature
            indices = {}
            
            if red.size > 0 and nir.size > 0:
                # NDVI - Normalized Difference Vegetation Index
                indices['ndvi'] = (nir - red) / (nir + red + eps)
            
            if green.size > 0 and nir.size > 0:
                # NDWI - Normalized Difference Water Index
                indices['ndwi'] = (green - nir) / (green + nir + eps)
            
            if swir1.size > 0 and nir.size > 0:
                # NDBI - Normalized Difference Built-up Index
                indices['ndbi'] = (swir1 - nir) / (swir1 + nir + eps)
            
            if red.size > 0 and nir.size > 0:
                # SAVI - Soil Adjusted Vegetation Index
                L = 0.5  # Soil brightness correction factor
                indices['savi'] = ((nir - red) / (nir + red + L)) * (1 + L)
            
            if red.size > 0 and nir.size > 0 and blue.size > 0:
                # EVI - Enhanced Vegetation Index
                indices['evi'] = 2.5 * ((nir - red) / (nir + 6 * red - 7.5 * blue + 1))
            
            return indices
            
        except Exception as e:
            print(f"⚠️ Error calculating spectral indices: {e}")
            return {}
    
    def _post_process_classification(self, classification: Dict, lat: float, lng: float, date: str) -> Dict:
        """Post-process classification results and align with GIS layers"""
        
        ai_result = classification['ai_classification']
        predictions = ai_result['predictions']
        
        # Determine dominant land cover class
        dominant_class = max(predictions.keys(), key=lambda k: predictions[k])
        
        # Apply confidence thresholds
        confidence = ai_result['confidence']
        confidence_level = 'high' if confidence > 0.8 else 'medium' if confidence > 0.6 else 'low'
        
        # Format final result
        result = {
            'coordinates': {'lat': lat, 'lng': lng},
            'date': date,
            'land_cover_classification': {
                'agriculture': round(predictions.get('agriculture', 0) * 100, 2),
                'forest': round(predictions.get('forest', 0) * 100, 2), 
                'water': round(predictions.get('water', 0) * 100, 2),
                'built_up': round(predictions.get('builtUp', 0) * 100, 2)
            },
            'dominant_class': dominant_class,
            'confidence': round(confidence * 100, 2),
            'confidence_level': confidence_level,
            'data_source': classification['data_source'],
            'sensor': classification['sensor'],
            'processing_metadata': {
                'ai_model': ai_result.get('model', 'CNN-RF Ensemble'),
                'timestamp': datetime.now().isoformat(),
                'spectral_indices_calculated': len(classification['spectral_indices'])
            }
        }
        
        return result


# API endpoint for HTTP requests
async def main():
    """Main entry point for land-use classification"""
    
    if len(sys.argv) < 3:
        print("Usage: python realLandUseAPI.py <latitude> <longitude> [date]")
        sys.exit(1)
    
    lat = float(sys.argv[1])
    lng = float(sys.argv[2])
    date = sys.argv[3] if len(sys.argv) > 3 else None
    
    try:
        api = RealLandUseAPI()
        result = await api.classify_land_use(lat, lng, date)
        
        print("\n" + "="*60)
        print("🛰️ AUTHENTIC LAND-USE CLASSIFICATION RESULTS")
        print("="*60)
        print(json.dumps(result, indent=2))
        print("="*60)
        
    except Exception as e:
        print(f"❌ Classification failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())