import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Download, ZoomIn, ZoomOut, Map, Satellite, Eye, EyeOff, ChevronUp, ChevronDown, Search, MapPin, Home, Building, Trees, Route, Zap, Radio, Ruler, Edit3, Save, FileDown, Camera, Globe, Mountain } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import geoData from '@/data/geo-data';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  color: string;
  count: number;
  zIndex: number;
  category?: string;
  icon?: string;
}

interface BasemapConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  icon: string;
}

export default function RealWebGISMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.LayerGroup>>({});
  const drawingLayerRef = useRef<L.LayerGroup | null>(null);
  const measurementLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Basemap configurations with multiple providers
  const [basemaps] = useState<BasemapConfig[]>([
    {
      id: 'satellite_esri',
      name: 'Satellite (Esri)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
      icon: 'satellite'
    },
    {
      id: 'satellite_google',
      name: 'Satellite (Google)',
      url: 'http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      maxZoom: 20,
      icon: 'globe'
    },
    {
      id: 'hybrid_google',
      name: 'Hybrid (Google)',
      url: 'http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      maxZoom: 20,
      icon: 'layers'
    },
    {
      id: 'terrain_google',
      name: 'Terrain (Google)',
      url: 'http://mt0.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      maxZoom: 20,
      icon: 'mountain'
    },
    {
      id: 'openstreetmap',
      name: 'Street Map (OSM)',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      icon: 'map'
    },
    {
      id: 'cartodb_positron',
      name: 'Light Theme',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      icon: 'sun'
    }
  ]);
  
  const [currentBasemap, setCurrentBasemap] = useState('satellite_esri');
  
  // Enhanced layer system with categories
  const [layers, setLayers] = useState<LayerConfig[]>([
    // Core FRA Data
    { id: 'claims', name: 'FRA Claims', visible: true, opacity: 80, color: 'bg-blue-500', count: 0, zIndex: 400, category: 'FRA Data', icon: 'map-pin' },
    { id: 'villages', name: 'Village Boundaries', visible: true, opacity: 60, color: 'bg-green-500', count: 0, zIndex: 300, category: 'FRA Data', icon: 'home' },
    { id: 'assets', name: 'Detected Assets', visible: true, opacity: 90, color: 'bg-purple-500', count: 0, zIndex: 500, category: 'FRA Data', icon: 'building' },
    
    // Land Use Layers
    { id: 'forest', name: 'Forest Cover', visible: false, opacity: 70, color: 'bg-emerald-600', count: 0, zIndex: 200, category: 'Land Use', icon: 'trees' },
    { id: 'water', name: 'Water Bodies', visible: false, opacity: 70, color: 'bg-blue-400', count: 0, zIndex: 250, category: 'Land Use', icon: 'waves' },
    { id: 'agriculture', name: 'Agricultural Land', visible: false, opacity: 60, color: 'bg-yellow-500', count: 0, zIndex: 180, category: 'Land Use', icon: 'wheat' },
    { id: 'urban', name: 'Urban Areas', visible: false, opacity: 65, color: 'bg-gray-500', count: 0, zIndex: 160, category: 'Land Use', icon: 'building-2' },
    
    // Infrastructure
    { id: 'roads', name: 'Roads & Highways', visible: false, opacity: 80, color: 'bg-slate-600', count: 0, zIndex: 350, category: 'Infrastructure', icon: 'route' },
    { id: 'railways', name: 'Railway Lines', visible: false, opacity: 75, color: 'bg-orange-600', count: 0, zIndex: 340, category: 'Infrastructure', icon: 'train' },
    { id: 'powerlines', name: 'Power Lines', visible: false, opacity: 70, color: 'bg-yellow-600', count: 0, zIndex: 330, category: 'Infrastructure', icon: 'zap' },
    { id: 'towers', name: 'Communication Towers', visible: false, opacity: 85, color: 'bg-red-500', count: 0, zIndex: 320, category: 'Infrastructure', icon: 'radio' }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationMode, setClassificationMode] = useState<'single' | 'region' | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<{north: number, south: number, east: number, west: number} | null>(null);
  const [spatialQueryMode, setSpatialQueryMode] = useState(false);
  const [spatialQueryResults, setSpatialQueryResults] = useState<any[]>([]);
  const [drawingMode, setDrawingMode] = useState<'none' | 'polygon' | 'line' | 'point' | 'rectangle' | 'circle'>('none');
  const [measurementMode, setMeasurementMode] = useState<'none' | 'distance' | 'area'>('none');
  const [coordinateSearch, setCoordinateSearch] = useState('');
  const [activeAnalysis, setActiveAnalysis] = useState<'none' | 'buffer' | 'proximity'>('none');
  const [bufferDistance, setBufferDistance] = useState(1000); // meters

  // Fetch real data for map layers
  const { data: claims } = useQuery({ queryKey: ['/api/claims'] });
  // Use static villages data instead of API call
  const villages = geoData.getAllVillages();
  const { data: assets } = useQuery({ queryKey: ['/api/assets'] });

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map centered on Madhya Pradesh where our sample data is located
    const map = L.map(mapRef.current, {
      zoomControl: false // We'll add custom controls
    }).setView([23.4734, 81.1409], 8); // Centered on Shahdol/Anuppur region with sample data
    mapInstance.current = map;

    // Add the default basemap
    const defaultBasemap = basemaps.find(b => b.id === currentBasemap);
    if (defaultBasemap) {
      L.tileLayer(defaultBasemap.url, {
        attribution: defaultBasemap.attribution,
        maxZoom: defaultBasemap.maxZoom,
      }).addTo(map);
    }

    // Initialize layer groups
    layers.forEach(layer => {
      layersRef.current[layer.id] = L.layerGroup().addTo(map);
    });
    
    // Initialize drawing and measurement layers
    drawingLayerRef.current = L.layerGroup().addTo(map);
    measurementLayerRef.current = L.layerGroup().addTo(map);

    // Add scale control
    L.control.scale({ position: 'bottomleft' }).addTo(map);

    // Add custom zoom controls
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Add map click event for spatial queries and land-use classification
    map.on('click', async (e) => {
      if (spatialQueryMode) {
        const { lat, lng } = e.latlng;
        const results = performSpatialQuery(lat, lng, 5); // 5km radius
        setSpatialQueryResults(results);
        
        // Add a temporary marker at click location
        const queryMarker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })
        }).addTo(map);
        
        queryMarker.bindPopup(`
          <div>
            <h3>Spatial Query Results</h3>
            <p>Found ${results.length} features within 5km</p>
            <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
          </div>
        `).openPopup();
        
        // Remove marker after 10 seconds
        setTimeout(() => {
          map.removeLayer(queryMarker);
        }, 10000);
      } else if (classificationMode === 'single') {
        const { lat, lng } = e.latlng;
        await performLandUseClassification(lat, lng);
      }
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update basemap when selection changes
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove all tile layers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current?.removeLayer(layer);
      }
    });

    // Add new basemap
    const selectedBasemap = basemaps.find(b => b.id === currentBasemap);
    if (selectedBasemap) {
      L.tileLayer(selectedBasemap.url, {
        attribution: selectedBasemap.attribution,
        maxZoom: selectedBasemap.maxZoom,
      }).addTo(mapInstance.current);
    }
  }, [currentBasemap, basemaps]);

  // Load real claims data
  useEffect(() => {
    if (!mapInstance.current || !claims || !layersRef.current?.claims) return;
    
    const claimsData = Array.isArray(claims) ? claims : (claims && typeof claims === 'object' && 'data' in claims) ? (claims as any).data || [] : [];
    const claimsLayer = layersRef.current.claims;
    
    try {
      claimsLayer.clearLayers();
    } catch (error) {
      console.warn('Error clearing claims layer:', error);
      return;
    }

    claimsData.forEach((claim: any) => {
      // Handle coordinates from GeoJSON format
      let lat, lng;
      if (claim.coordinates?.coordinates) {
        // GeoJSON polygon - get center point
        if (claim.coordinates.type === 'Polygon' && claim.coordinates.coordinates[0]) {
          const coords = claim.coordinates.coordinates[0];
          lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
      } else if (claim.latitude && claim.longitude) {
        lat = parseFloat(claim.latitude);
        lng = parseFloat(claim.longitude);
      }

      if (lat && lng && isFinite(lat) && isFinite(lng)) {
        try {
          const marker = L.marker([lat, lng])
            .bindPopup(`
              <div>
                <h3>${claim.claimantName || 'Unknown Claimant'}</h3>
                <p><strong>Claim ID:</strong> ${claim.claimId}</p>
                <p><strong>Type:</strong> ${claim.claimType}</p>
                <p><strong>Status:</strong> ${claim.status}</p>
                <p><strong>Area:</strong> ${claim.area || 'N/A'} acres</p>
                <p><strong>Confidence:</strong> ${claim.aiConfidence || 'N/A'}%</p>
              </div>
            `);
          claimsLayer.addLayer(marker);
        } catch (error) {
          console.warn('Error adding claim marker:', error, claim);
        }
      }
    });

    setLayers(prev => prev.map(layer => 
      layer.id === 'claims' ? { ...layer, count: claimsData.length } : layer
    ));

    // Auto-zoom to show all claims if this is the first load and we have data
    if (claimsData.length > 0) {
      const validCoords = claimsData.map((claim: any) => {
        if (claim.coordinates?.coordinates) {
          if (claim.coordinates.type === 'Polygon' && claim.coordinates.coordinates[0]) {
            const coords = claim.coordinates.coordinates[0];
            const lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
            const lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
            return [lat, lng];
          }
        }
        return null;
      }).filter(Boolean);

      if (validCoords.length > 0) {
        const group = new L.FeatureGroup(validCoords.map((coord: any) => L.marker(coord as [number, number])));
        mapInstance.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [claims]);

  // Load real villages data
  useEffect(() => {
    if (!mapInstance.current || !villages || !layersRef.current?.villages) return;
    
    const villagesData = Array.isArray(villages) ? villages : [];
    const villagesLayer = layersRef.current.villages;
    
    try {
      villagesLayer.clearLayers();
    } catch (error) {
      console.warn('Error clearing villages layer:', error);
      return;
    }

    villagesData.forEach((village: any) => {
      // Handle coordinates from database - they might be decimal fields
      let lat, lng;
      if (village.latitude && village.longitude) {
        lat = parseFloat(village.latitude);
        lng = parseFloat(village.longitude);
      } else if (village.boundary?.coordinates) {
        // GeoJSON polygon - get center point
        const coords = village.boundary.coordinates[0];
        lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
        lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
      }

      if (lat && lng && isFinite(lat) && isFinite(lng)) {
        try {
          const currentLayer = layers.find(l => l.id === 'villages');
          const opacity = currentLayer ? currentLayer.opacity / 100 : 0.3;
          const circle = L.circle([lat, lng], {
            color: 'green',
            fillColor: '#90EE90',
            fillOpacity: opacity,
            radius: 1000 // 1km radius
          }).bindPopup(`
            <div>
              <h3>${village.name}</h3>
              <p><strong>Population:</strong> ${village.population || 'N/A'}</p>
              <p><strong>Tribal Population:</strong> ${village.tribalPopulation || 'N/A'}</p>
              <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
            </div>
          `);
          villagesLayer.addLayer(circle);
        } catch (error) {
          console.warn('Error adding village marker:', error, village);
        }
      }
    });

    setLayers(prev => prev.map(layer => 
      layer.id === 'villages' ? { ...layer, count: villagesData.length } : layer
    ));
  }, [villages, layers]);

  // Add event listener for villages opacity updates
  useEffect(() => {
    const handleVillagesUpdate = () => {
      if (!mapInstance.current || !villages || !layersRef.current.villages) return;
      
      const villagesData = Array.isArray(villages) ? villages : [];
      const villagesLayer = layersRef.current.villages;
      villagesLayer.clearLayers();
      
      villagesData.forEach((village: any) => {
        if (village.latitude && village.longitude) {
          const currentLayer = layers.find(l => l.id === 'villages');
          const opacity = currentLayer ? currentLayer.opacity / 100 : 0.3;
          const circle = L.circle([parseFloat(village.latitude), parseFloat(village.longitude)], {
            color: 'green',
            fillColor: '#90EE90',
            fillOpacity: opacity,
            radius: 1000
          }).bindPopup(`
            <div>
              <h3>${village.name}</h3>
              <p><strong>District:</strong> ${village.districtName}</p>
              <p><strong>State:</strong> ${village.stateName}</p>
              <p><strong>Block:</strong> ${village.blockName || 'N/A'}</p>
            </div>
          `);
          villagesLayer.addLayer(circle);
        }
      });
    };
    
    window.addEventListener('villagesUpdate', handleVillagesUpdate);
    return () => window.removeEventListener('villagesUpdate', handleVillagesUpdate);
  }, [villages, layers]);

  // Load real assets data
  useEffect(() => {
    if (!mapInstance.current || !assets || !layersRef.current?.assets) return;
    
    const assetsData = Array.isArray(assets) ? assets : [];
    const assetsLayer = layersRef.current.assets;
    
    try {
      assetsLayer.clearLayers();
    } catch (error) {
      console.warn('Error clearing assets layer:', error);
      return;
    }

    assetsData.forEach((asset: any) => {
      // Handle GeoJSON coordinates
      let lat, lng;
      if (asset.coordinates?.coordinates) {
        if (asset.coordinates.type === 'Polygon' && asset.coordinates.coordinates[0]) {
          // Polygon - get center point
          const coords = asset.coordinates.coordinates[0];
          lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        } else if (asset.coordinates.type === 'Point') {
          // Point coordinates
          [lng, lat] = asset.coordinates.coordinates;
        }
      }

      if (lat && lng && isFinite(lat) && isFinite(lng)) {
        try {
          const color = asset.assetType === 'pond' ? 'blue' : 
                       asset.assetType === 'farm' ? 'green' : 
                       asset.assetType === 'homestead' ? 'orange' : 
                       asset.assetType === 'forest' ? 'darkgreen' :
                       asset.assetType === 'water_body' ? 'cyan' : 'purple';
          
          const currentLayer = layers.find(l => l.id === 'assets');
          const opacity = currentLayer ? currentLayer.opacity / 100 : 0.6;
          const marker = L.circleMarker([lat, lng], {
            color: color,
            fillColor: color,
            fillOpacity: opacity,
            radius: 8
          }).bindPopup(`
            <div>
              <h3>${asset.assetType.charAt(0).toUpperCase() + asset.assetType.slice(1).replace('_', ' ')}</h3>
              <p><strong>Confidence:</strong> ${typeof asset.confidence === 'number' ? asset.confidence.toFixed(1) : asset.confidence || 'N/A'}%</p>
              <p><strong>Area:</strong> ${asset.area || 'N/A'} sq m</p>
              <p><strong>Detected:</strong> ${asset.detectedAt ? new Date(asset.detectedAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          `);
          assetsLayer.addLayer(marker);
        } catch (error) {
          console.warn('Error adding asset marker:', error, asset);
        }
      }
    });

    setLayers(prev => prev.map(layer => 
      layer.id === 'assets' ? { ...layer, count: assetsData.length } : layer
    ));
  }, [assets, layers]);

  // Add event listener for assets opacity updates
  useEffect(() => {
    const handleAssetsUpdate = () => {
      if (!mapInstance.current || !assets || !layersRef.current.assets) return;
      
      const assetsData = Array.isArray(assets) ? assets : [];
      const assetsLayer = layersRef.current.assets;
      assetsLayer.clearLayers();
      
      assetsData.forEach((asset: any) => {
        if (asset.coordinates?.coordinates) {
          const [lng, lat] = asset.coordinates.coordinates;
          const color = asset.assetType === 'pond' ? 'blue' : 
                       asset.assetType === 'farm' ? 'green' : 
                       asset.assetType === 'homestead' ? 'orange' : 'purple';
          
          const currentLayer = layers.find(l => l.id === 'assets');
          const opacity = currentLayer ? currentLayer.opacity / 100 : 0.6;
          const marker = L.circleMarker([lat, lng], {
            color: color,
            fillColor: color,
            fillOpacity: opacity,
            radius: 8
          }).bindPopup(`
            <div>
              <h3>${asset.assetType.charAt(0).toUpperCase() + asset.assetType.slice(1)}</h3>
              <p><strong>Confidence:</strong> ${asset.confidence?.toFixed(1)}%</p>
              <p><strong>Area:</strong> ${asset.area || 'N/A'} sq m</p>
              <p><strong>Detected:</strong> ${new Date(asset.detectedAt).toLocaleDateString()}</p>
            </div>
          `);
          assetsLayer.addLayer(marker);
        }
      });
    };
    
    window.addEventListener('assetsUpdate', handleAssetsUpdate);
    return () => window.removeEventListener('assetsUpdate', handleAssetsUpdate);
  }, [assets, layers]);

  // Handle search on map
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchOnMap(searchQuery);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, villages, claims]);

  const toggleLayer = (layerId: string) => {
    if (!mapInstance.current || !layersRef.current[layerId]) return;

    const layer = layersRef.current[layerId];
    const isVisible = mapInstance.current.hasLayer(layer);

    if (isVisible) {
      mapInstance.current.removeLayer(layer);
    } else {
      mapInstance.current.addLayer(layer);
    }

    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, visible: !isVisible } : l
    ));
  };

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, opacity } : l
    ));
    
    // Trigger re-render of the layer with new opacity
    if (layerId === 'villages' && villages) {
      // Re-trigger villages effect
      const event = new CustomEvent('villagesUpdate');
      window.dispatchEvent(event);
    } else if (layerId === 'assets' && assets) {
      // Re-trigger assets effect
      const event = new CustomEvent('assetsUpdate');
      window.dispatchEvent(event);
    }
  };

  const moveLayerUp = (layerId: string) => {
    setLayers(prev => {
      const currentIndex = prev.findIndex(l => l.id === layerId);
      if (currentIndex > 0) {
        const newLayers = [...prev];
        [newLayers[currentIndex - 1], newLayers[currentIndex]] = [newLayers[currentIndex], newLayers[currentIndex - 1]];
        return newLayers.map((layer, index) => ({ ...layer, zIndex: 500 - (index * 100) }));
      }
      return prev;
    });
  };

  const moveLayerDown = (layerId: string) => {
    setLayers(prev => {
      const currentIndex = prev.findIndex(l => l.id === layerId);
      if (currentIndex < prev.length - 1) {
        const newLayers = [...prev];
        [newLayers[currentIndex], newLayers[currentIndex + 1]] = [newLayers[currentIndex + 1], newLayers[currentIndex]];
        return newLayers.map((layer, index) => ({ ...layer, zIndex: 500 - (index * 100) }));
      }
      return prev;
    });
  };

  const searchOnMap = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // Search for villages, claims, and assets
      const results: any[] = [];
      
      const villagesData = Array.isArray(villages) ? villages : [];
      if (villagesData.length > 0) {
        const matchingVillages = villagesData.filter((v: any) => 
          v.name?.toLowerCase().includes(query.toLowerCase()) ||
          v.districtName?.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matchingVillages.map((v: any) => ({ ...v, type: 'village' })));
      }
      
      const claimsData = Array.isArray(claims) ? claims : (claims && typeof claims === 'object' && 'data' in claims) ? (claims as any).data || [] : [];
      if (claimsData.length > 0) {
        const matchingClaims = claimsData.filter((c: any) => 
          c.claimantName?.toLowerCase().includes(query.toLowerCase()) ||
          c.claimId?.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matchingClaims.map((c: any) => ({ ...c, type: 'claim' })));
      }
      
      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const flyToLocation = (lat: number, lng: number, zoom: number = 15) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Preset zoom levels for different administrative boundaries
  const zoomToIndia = () => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([23.5937, 78.9629], 5, {
        animate: true,
        duration: 2
      });
    }
  };

  const zoomToState = () => {
    // Zoom to Madhya Pradesh (one of the main FRA states)
    if (mapInstance.current) {
      mapInstance.current.flyTo([23.4734, 77.9476], 7, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const zoomToDistrict = () => {
    // Zoom to Mandla district (major FRA implementation area)
    if (mapInstance.current) {
      mapInstance.current.flyTo([22.5988, 80.3720], 9, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const zoomToVillage = () => {
    // Zoom to village level for detailed view
    const villagesData = Array.isArray(villages) ? villages : [];
    if (villagesData && villagesData.length > 0) {
      const firstVillage = villagesData[0];
      if (firstVillage.latitude && firstVillage.longitude) {
        const lat = typeof firstVillage.latitude === 'string' ? parseFloat(firstVillage.latitude) : firstVillage.latitude;
        const lng = typeof firstVillage.longitude === 'string' ? parseFloat(firstVillage.longitude) : firstVillage.longitude;
        flyToLocation(lat, lng, 13);
      }
    } else if (mapInstance.current) {
      mapInstance.current.flyTo([22.6000, 80.3800], 11, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Enhanced spatial query with buffer zones
  const performSpatialQuery = (lat: number, lng: number, radiusKm: number = 5) => {
    const results: any[] = [];
    
    const villagesData = Array.isArray(villages) ? villages : [];
    if (villagesData.length > 0) {
      villagesData.forEach((village: any) => {
        if (village.latitude && village.longitude) {
          const distance = calculateDistance(
            lat, lng, 
            parseFloat(village.latitude), 
            parseFloat(village.longitude)
          );
          if (distance <= radiusKm) {
            results.push({ ...village, type: 'village', distance });
          }
        }
      });
    }
    
    const claimsData = Array.isArray(claims) ? claims : (claims && typeof claims === 'object' && 'data' in claims) ? (claims as any).data || [] : [];
    if (claimsData.length > 0) {
      claimsData.forEach((claim: any) => {
        if (claim.latitude && claim.longitude) {
          const distance = calculateDistance(
            lat, lng, 
            parseFloat(claim.latitude), 
            parseFloat(claim.longitude)
          );
          if (distance <= radiusKm) {
            results.push({ ...claim, type: 'claim', distance });
          }
        }
      });
    }
    
    const assetsData = Array.isArray(assets) ? assets : [];
    if (assetsData.length > 0) {
      assetsData.forEach((asset: any) => {
        if (asset.coordinates?.coordinates) {
          const [assetLng, assetLat] = asset.coordinates.coordinates;
          const distance = calculateDistance(lat, lng, assetLat, assetLng);
          if (distance <= radiusKm) {
            results.push({ ...asset, type: 'asset', distance });
          }
        }
      });
    }
    
    return results.sort((a, b) => a.distance - b.distance);
  };

  // Haversine formula for distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Real AI/ML Land-Use Classification
  const performLandUseClassification = async (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    
    setIsClassifying(true);
    
    try {
      const response = await fetch('/api/land-use/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat,
          lng,
          highResolution: false
        })
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const result = await response.json();
      
      // Create a marker with classification results
      const classificationMarker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      }).addTo(mapInstance.current);
      
      // Get dominant land-use class
      const classifications = result.classifications;
      const dominantClass = Object.keys(classifications).reduce((a, b) => 
        classifications[a] > classifications[b] ? a : b
      );
      
      const popupContent = `
        <div style="min-width: 250px;">
          <h3 style="margin: 0 0 10px 0; color: #2563eb;">AI Land-Use Classification</h3>
          <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
          <p><strong>Dominant Class:</strong> ${dominantClass.charAt(0).toUpperCase() + dominantClass.slice(1)} (${classifications[dominantClass].toFixed(1)}%)</p>
          <hr style="margin: 10px 0;">
          <div style="margin-bottom: 8px;"><strong>Agriculture:</strong> ${classifications.agriculture.toFixed(1)}%</div>
          <div style="margin-bottom: 8px;"><strong>Forest Cover:</strong> ${classifications.forest.toFixed(1)}%</div>
          <div style="margin-bottom: 8px;"><strong>Water Bodies:</strong> ${classifications.water.toFixed(1)}%</div>
          <div style="margin-bottom: 8px;"><strong>Built-up Area:</strong> ${classifications.builtUp.toFixed(1)}%</div>
          <hr style="margin: 10px 0;">
          <p><strong>Confidence:</strong> ${result.confidence.toFixed(1)}%</p>
          <p><strong>Sensor:</strong> ${result.sensor}</p>
          <p><strong>Resolution:</strong> ${result.resolution}m</p>
          <p><strong>Date:</strong> ${new Date(result.metadata.imageDate).toLocaleDateString()}</p>
          <p><strong>Processing Time:</strong> ${result.processingTime}ms</p>
        </div>
      `;
      
      classificationMarker.bindPopup(popupContent).openPopup();
      
      // Show classification on land-use layers
      updateLandUseLayers(result);
      
    } catch (error) {
      console.error('Land-use classification failed:', error);
      alert('Failed to classify land use. Please try again.');
    } finally {
      setIsClassifying(false);
    }
  };

  // Perform region-wide land-use classification
  const performRegionClassification = async () => {
    if (!mapInstance.current || !selectedRegion) return;
    
    setIsClassifying(true);
    
    try {
      const response = await fetch('/api/land-use/geojson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bounds: selectedRegion,
          gridResolution: 15,
          includeMetadata: true
        })
      });

      if (!response.ok) {
        throw new Error('Region classification failed');
      }

      const result = await response.json();
      
      // Add GeoJSON layer to map
      const geoJsonLayer = L.geoJSON(result.geoJSON, {
        style: (feature) => {
          const landUseClass = feature?.properties?.landUseClass;
          let fillColor = '#gray';
          
          switch (landUseClass) {
            case 'agriculture': fillColor = '#fbbf24'; break;
            case 'forest': fillColor = '#059669'; break;
            case 'water': fillColor = '#3b82f6'; break;
            case 'builtUp': fillColor = '#6b7280'; break;
          }
          
          return {
            fillColor,
            weight: 1,
            opacity: 0.8,
            color: 'white',
            fillOpacity: 0.6
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div>
              <h4>Land Use: ${props.landUseClass}</h4>
              <p><strong>Confidence:</strong> ${props.confidence.toFixed(1)}%</p>
              <p><strong>Agriculture:</strong> ${props.agriculture.toFixed(1)}%</p>
              <p><strong>Forest:</strong> ${props.forest.toFixed(1)}%</p>
              <p><strong>Water:</strong> ${props.water.toFixed(1)}%</p>
              <p><strong>Built-up:</strong> ${props.builtUp.toFixed(1)}%</p>
            </div>
          `);
        }
      }).addTo(mapInstance.current);
      
      // Store reference to remove later
      layersRef.current['landUseClassification'] = geoJsonLayer;
      
      // Show region statistics
      alert(`Region Classification Complete!\nTotal Area: ${result.metadata.totalArea.toFixed(2)} km²\nProcessing Time: ${result.metadata.processingTime}ms`);
      
    } catch (error) {
      console.error('Region classification failed:', error);
      alert('Failed to classify region. Please try again.');
    } finally {
      setIsClassifying(false);
    }
  };

  // Update land-use layers with classification results
  const updateLandUseLayers = (result: any) => {
    const { classifications } = result;
    
    // Update layer visibility and create visualization
    ['agriculture', 'forest', 'water', 'urban'].forEach(classType => {
      const layerId = classType === 'urban' ? 'urban' : classType;
      const layer = layersRef.current[layerId];
      
      if (layer && classifications[classType === 'urban' ? 'builtUp' : classType] > 30) {
        // Show layer if classification confidence is high
        setLayers(prev => prev.map(l => 
          l.id === layerId ? { ...l, visible: true } : l
        ));
      }
    });
  };

  // Calculate polygon area using shoelace formula
  const calculatePolygonArea = (points: L.LatLng[]) => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const xi = points[i].lng * Math.PI / 180;
      const yi = points[i].lat * Math.PI / 180;
      const xj = points[j].lng * Math.PI / 180;
      const yj = points[j].lat * Math.PI / 180;
      
      area += xi * yj - xj * yi;
    }
    
    const R = 6371000; // Earth's radius in meters
    return Math.abs(area) * R * R / 2;
  };

  // Drawing tools functionality
  const startDrawing = (mode: 'polygon' | 'line' | 'point' | 'rectangle' | 'circle') => {
    if (!mapInstance.current || !drawingLayerRef.current) return;
    
    setDrawingMode(mode);
    const map = mapInstance.current;
    
    if (mode === 'point') {
      map.on('click', handlePointDraw);
    } else if (mode === 'polygon') {
      // Start polygon drawing
      const points: L.LatLng[] = [];
      const tempMarkers: L.Marker[] = [];
      
      const onMapClick = (e: L.LeafletMouseEvent) => {
        points.push(e.latlng);
        const marker = L.marker(e.latlng).addTo(drawingLayerRef.current!);
        tempMarkers.push(marker);
        
        if (points.length >= 3) {
          // Create polygon when we have at least 3 points
          const polygon = L.polygon(points, {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3
          }).addTo(drawingLayerRef.current!);
          
          polygon.bindPopup(`
            <div>
              <h4>Drawn Polygon</h4>
              <p><strong>Area:</strong> ${(calculatePolygonArea(polygon.getLatLngs()[0] as L.LatLng[]) / 10000).toFixed(2)} hectares</p>
              <p><strong>Perimeter:</strong> ${(calculatePolygonPerimeter(points) * 1000).toFixed(0)} meters</p>
            </div>
          `);
          
          // Clean up temp markers
          tempMarkers.forEach(m => drawingLayerRef.current?.removeLayer(m));
          
          // Stop drawing
          map.off('click', onMapClick);
          map.off('dblclick', finishPolygon);
          setDrawingMode('none');
        }
      };
      
      const finishPolygon = () => {
        if (points.length >= 3) {
          onMapClick({ latlng: points[0] } as L.LeafletMouseEvent);
        }
      };
      
      map.on('click', onMapClick);
      map.on('dblclick', finishPolygon);
    }
  };

  const handlePointDraw = (e: L.LeafletMouseEvent) => {
    if (!drawingLayerRef.current) return;
    
    const marker = L.marker(e.latlng, {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      })
    }).addTo(drawingLayerRef.current);
    
    marker.bindPopup(`
      <div>
        <h4>Marked Location</h4>
        <p><strong>Coordinates:</strong> ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}</p>
        <p><strong>Added:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `);
    
    mapInstance.current?.off('click', handlePointDraw);
    setDrawingMode('none');
  };

  const calculatePolygonPerimeter = (points: L.LatLng[]) => {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      perimeter += calculateDistance(current.lat, current.lng, next.lat, next.lng);
    }
    return perimeter;
  };

  // Measurement tools
  const startMeasurement = (mode: 'distance' | 'area') => {
    if (!mapInstance.current || !measurementLayerRef.current) return;
    
    setMeasurementMode(mode);
    const map = mapInstance.current;
    
    if (mode === 'distance') {
      const points: L.LatLng[] = [];
      let polyline: L.Polyline | null = null;
      
      const onMapClick = (e: L.LeafletMouseEvent) => {
        points.push(e.latlng);
        
        if (points.length === 1) {
          // First point - create polyline
          polyline = L.polyline(points, { color: 'blue', weight: 3 }).addTo(measurementLayerRef.current!);
        } else {
          // Update polyline
          polyline?.setLatLngs(points);
          
          // Calculate total distance
          let totalDistance = 0;
          for (let i = 1; i < points.length; i++) {
            totalDistance += calculateDistance(
              points[i-1].lat, points[i-1].lng,
              points[i].lat, points[i].lng
            );
          }
          
          const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
              <div>
                <h4>Distance Measurement</h4>
                <p><strong>Total Distance:</strong> ${(totalDistance * 1000).toFixed(2)} meters</p>
                <p><strong>Distance:</strong> ${totalDistance.toFixed(3)} km</p>
              </div>
            `)
            .openOn(map);
        }
      };
      
      const finishMeasurement = () => {
        map.off('click', onMapClick);
        map.off('dblclick', finishMeasurement);
        setMeasurementMode('none');
      };
      
      map.on('click', onMapClick);
      map.on('dblclick', finishMeasurement);
    }
  };

  // Coordinate search functionality
  const searchByCoordinates = () => {
    if (!coordinateSearch.trim() || !mapInstance.current) return;
    
    try {
      // Parse coordinates (lat,lng or lng,lat)
      const coords = coordinateSearch.split(',').map(c => parseFloat(c.trim()));
      if (coords.length !== 2 || coords.some(isNaN)) {
        alert('Please enter valid coordinates in format: latitude,longitude');
        return;
      }
      
      const [lat, lng] = coords;
      
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Coordinates out of valid range');
        return;
      }
      
      // Fly to location and add marker
      flyToLocation(lat, lng, 15);
      
      const marker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      }).addTo(drawingLayerRef.current!);
      
      marker.bindPopup(`
        <div>
          <h4>Search Result</h4>
          <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
          <p><strong>Searched:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `).openPopup();
      
    } catch (error) {
      alert('Invalid coordinate format. Use: latitude,longitude');
    }
  };

  // Buffer analysis
  const performBufferAnalysis = (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    
    // Create buffer circle
    const bufferCircle = L.circle([lat, lng], {
      radius: bufferDistance,
      color: 'orange',
      fillColor: '#ffa500',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(drawingLayerRef.current!);
    
    // Find features within buffer
    const featuresInBuffer = performSpatialQuery(lat, lng, bufferDistance / 1000);
    
    bufferCircle.bindPopup(`
      <div>
        <h4>Buffer Analysis</h4>
        <p><strong>Radius:</strong> ${bufferDistance} meters</p>
        <p><strong>Features Found:</strong> ${featuresInBuffer.length}</p>
        <p><strong>Area:</strong> ${(Math.PI * Math.pow(bufferDistance / 1000, 2)).toFixed(2)} km²</p>
      </div>
    `).openPopup();
  };

  // Clear drawing layers
  const clearDrawings = () => {
    drawingLayerRef.current?.clearLayers();
    measurementLayerRef.current?.clearLayers();
  };

  const zoomIn = () => mapInstance.current?.zoomIn();
  const zoomOut = () => mapInstance.current?.zoomOut();

  // Enhanced export functionality
  const exportMapData = (format: 'json' | 'geojson' | 'kml' | 'image') => {
    if (!mapInstance.current) return;
    
    const map = mapInstance.current;
    
    if (format === 'json') {
      // Export map state and layer data
      const mapState = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        basemap: currentBasemap,
        layers: layers.filter(l => l.visible).map(l => ({
          id: l.id,
          name: l.name,
          opacity: l.opacity,
          visible: l.visible
        })),
        exportedAt: new Date().toISOString(),
        bounds: map.getBounds()
      };
      
      downloadFile(
        JSON.stringify(mapState, null, 2),
        `fra-atlas-map-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      );
      
    } else if (format === 'geojson') {
      // Export as GeoJSON
      const features: any[] = [];
      
      // Add claims as features
      const claimsData = Array.isArray(claims) ? claims : (claims && typeof claims === 'object' && 'data' in claims) ? (claims as any).data || [] : [];
      claimsData.forEach((claim: any) => {
        if (claim.latitude && claim.longitude) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(claim.longitude), parseFloat(claim.latitude)]
            },
            properties: {
              claimId: claim.claimId,
              claimantName: claim.claimantName,
              claimType: claim.claimType,
              status: claim.status,
              area: claim.area
            }
          });
        }
      });
      
      const geojson = {
        type: 'FeatureCollection',
        features
      };
      
      downloadFile(
        JSON.stringify(geojson, null, 2),
        `fra-claims-${new Date().toISOString().split('T')[0]}.geojson`,
        'application/geo+json'
      );
      
    } else if (format === 'image') {
      // For image export, we'd need additional libraries like html2canvas
      // For now, show information about the map
      alert('Image export requires additional setup. Current map state saved to JSON.');
      exportMapData('json');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Group layers by category
  const layersByCategory = layers.reduce((acc, layer) => {
    const category = layer.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(layer);
    return acc;
  }, {} as Record<string, LayerConfig[]>);

  // Legacy export function for backward compatibility
  const exportMap = () => exportMapData('json');

  return (
    <div className="h-full flex">
      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="h-full w-full" data-testid="webgis-map" />
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {/* Zoom Controls */}
          <div className="bg-card rounded-lg border border-border shadow-lg">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 border-b border-border rounded-none rounded-t-lg"
                onClick={zoomIn}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-none rounded-b-lg"
                onClick={zoomOut}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Quick Basemap Toggle */}
          <div className="bg-card rounded-lg border border-border shadow-lg">
            <div className="flex flex-col">
              <Button
                variant={currentBasemap.includes('satellite') ? 'default' : 'ghost'}
                size="sm"
                className="p-2 border-b border-border rounded-none rounded-t-lg"
                onClick={() => setCurrentBasemap('satellite_esri')}
                data-testid="button-satellite-view"
              >
                <Satellite className="h-4 w-4" />
              </Button>
              <Button
                variant={currentBasemap === 'openstreetmap' ? 'default' : 'ghost'}
                size="sm"
                className="p-2 rounded-none rounded-b-lg"
                onClick={() => setCurrentBasemap('openstreetmap')}
                data-testid="button-street-view"
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Preset Controls */}
          <div className="bg-card rounded-lg border border-border shadow-lg">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 border-b border-border rounded-none rounded-t-lg"
                onClick={zoomToIndia}
                title="Zoom to India"
                data-testid="button-zoom-india"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 border-b border-border rounded-none"
                onClick={zoomToState}
                title="Zoom to State Level"
                data-testid="button-zoom-state"
              >
                <Building className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 border-b border-border rounded-none"
                onClick={zoomToDistrict}
                title="Zoom to District Level"
                data-testid="button-zoom-district"
              >
                <Trees className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-none rounded-b-lg"
                onClick={zoomToVillage}
                title="Zoom to Village Level"
                data-testid="button-zoom-village"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Export Control */}
          <Button
            variant="outline"
            size="sm"
            className="bg-card border border-border shadow-lg"
            onClick={exportMap}
            data-testid="button-export-map"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Control Panel */}
      <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" />
          <h3 className="font-semibold">WebGIS Controls</h3>
        </div>
        
        {/* Basemap Selector */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Basemap</h4>
          <Select value={currentBasemap} onValueChange={setCurrentBasemap}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {basemaps.map(basemap => (
                <SelectItem key={basemap.id} value={basemap.id}>
                  <div className="flex items-center space-x-2">
                    {basemap.icon === 'satellite' && <Satellite className="h-4 w-4" />}
                    {basemap.icon === 'globe' && <Globe className="h-4 w-4" />}
                    {basemap.icon === 'layers' && <Layers className="h-4 w-4" />}
                    {basemap.icon === 'mountain' && <Mountain className="h-4 w-4" />}
                    {basemap.icon === 'map' && <Map className="h-4 w-4" />}
                    {basemap.icon === 'sun' && <Camera className="h-4 w-4" />}
                    <span>{basemap.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Search Panel */}
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium">Search & Navigation</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search claims, villages..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-map-search"
            />
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="p-2 text-xs bg-accent/50 rounded cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    if (result.latitude && result.longitude) {
                      flyToLocation(parseFloat(result.latitude), parseFloat(result.longitude));
                    }
                  }}
                  data-testid={`search-result-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <div>
                      <div className="font-medium">
                        {result.type === 'village' ? result.name : result.claimantName || result.claimId}
                      </div>
                      <div className="text-muted-foreground">
                        {result.type === 'village' ? result.districtName : 'FRA Claim'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Coordinate Search */}
          <div className="space-y-2">
            <div className="flex space-x-1">
              <Input
                placeholder="Lat,Lng coordinates"
                value={coordinateSearch}
                onChange={(e) => setCoordinateSearch(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button onClick={searchByCoordinates} size="sm">
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Spatial Query Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Spatial Query Mode</span>
            <Switch
              checked={spatialQueryMode}
              onCheckedChange={setSpatialQueryMode}
              data-testid="toggle-spatial-query"
            />
          </div>
          
          {spatialQueryMode && (
            <div className="text-xs text-muted-foreground p-2 bg-accent/30 rounded">
              Click anywhere on the map to search for features within 5km radius
            </div>
          )}
          
          {/* Spatial Query Results */}
          {spatialQueryResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Spatial Query Results ({spatialQueryResults.length})</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {spatialQueryResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-2 text-xs bg-blue-50 dark:bg-blue-900/20 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    onClick={() => {
                      if (result.type === 'village' && result.latitude && result.longitude) {
                        flyToLocation(parseFloat(result.latitude), parseFloat(result.longitude));
                      } else if (result.type === 'claim' && result.latitude && result.longitude) {
                        flyToLocation(parseFloat(result.latitude), parseFloat(result.longitude));
                      } else if (result.type === 'asset' && result.coordinates?.coordinates) {
                        const [lng, lat] = result.coordinates.coordinates;
                        flyToLocation(lat, lng);
                      }
                    }}
                    data-testid={`spatial-result-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {result.type === 'village' ? result.name : 
                           result.type === 'claim' ? result.claimantName || result.claimId :
                           result.assetType || 'Asset'}
                        </div>
                        <div className="text-muted-foreground">
                          {result.type} • {result.distance.toFixed(2)}km away
                        </div>
                      </div>
                      <MapPin className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Drawing Tools */}
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium">Drawing Tools</h4>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={drawingMode === 'point' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startDrawing('point')}
              className="text-xs"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant={drawingMode === 'polygon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startDrawing('polygon')}
              className="text-xs"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDrawings}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
          {drawingMode !== 'none' && (
            <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
              Drawing Mode: {drawingMode}
            </div>
          )}
        </div>
        
        {/* Measurement Tools */}
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium">Measurement</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={measurementMode === 'distance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startMeasurement('distance')}
              className="text-xs"
            >
              <Ruler className="h-4 w-4 mr-1" />
              Distance
            </Button>
            <Button
              variant={measurementMode === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startMeasurement('area')}
              className="text-xs"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Area
            </Button>
          </div>
          {measurementMode !== 'none' && (
            <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              Measuring: {measurementMode}
            </div>
          )}
        </div>
        
        {/* AI Land-Use Classification */}
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium">AI Land-Use Classification</h4>
          
          {/* Classification Mode Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Single Point Mode</span>
              <Switch
                checked={classificationMode === 'single'}
                onCheckedChange={(checked) => setClassificationMode(checked ? 'single' : null)}
                disabled={isClassifying}
              />
            </div>
            
            {classificationMode === 'single' && (
              <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                Click anywhere on the map to classify land use at that location using real satellite imagery and AI models
              </div>
            )}
          </div>

          {/* Region Classification */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (mapInstance.current) {
                  const bounds = mapInstance.current.getBounds();
                  setSelectedRegion({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest()
                  });
                }
              }}
              disabled={isClassifying}
              className="w-full text-xs"
            >
              <Satellite className="h-4 w-4 mr-1" />
              Select Current View
            </Button>
            
            {selectedRegion && (
              <Button
                variant="default"
                size="sm"
                onClick={performRegionClassification}
                disabled={isClassifying}
                className="w-full text-xs"
              >
                {isClassifying ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Classifying...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-1" />
                    Classify Region
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Classification Status */}
          {isClassifying && (
            <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                Processing satellite imagery with AI models...
              </div>
            </div>
          )}
        </div>

        {/* Analysis Tools */}
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium">Spatial Analysis</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">Buffer Distance</span>
              <span className="text-xs font-medium">{bufferDistance}m</span>
            </div>
            <Slider
              value={[bufferDistance]}
              onValueChange={([value]) => setBufferDistance(value)}
              min={100}
              max={10000}
              step={100}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Use spatial query mode for buffer analysis
            </div>
          </div>
        </div>
        
        {/* Export Tools */}
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium">Export Data</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMapData('json')}
              className="text-xs"
            >
              <FileDown className="h-4 w-4 mr-1" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMapData('geojson')}
              className="text-xs"
            >
              <FileDown className="h-4 w-4 mr-1" />
              GeoJSON
            </Button>
          </div>
        </div>
        
        {/* Layer Controls */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Layers className="h-4 w-4 mr-2" />
            Data Layers by Category
          </h4>
        </div>
        
        <div className="space-y-4">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className="p-3 border border-border rounded-lg hover:bg-accent/20 transition-colors"
            >
              {/* Layer Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${layer.color}`} />
                  <div>
                    <div className="font-medium text-sm">{layer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {layer.count} features
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {layer.count}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLayer(layer.id)}
                    data-testid={`button-toggle-${layer.id}`}
                  >
                    {layer.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Layer Controls */}
              {layer.visible && (
                <div className="space-y-3">
                  {/* Opacity Control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Opacity</span>
                      <span className="font-medium">{layer.opacity}%</span>
                    </div>
                    <Slider
                      value={[layer.opacity]}
                      onValueChange={([value]) => updateLayerOpacity(layer.id, value)}
                      max={100}
                      min={10}
                      step={10}
                      className="w-full"
                      data-testid={`slider-opacity-${layer.id}`}
                    />
                  </div>
                  
                  {/* Layer Ordering */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Layer Order</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLayerUp(layer.id)}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                        data-testid={`button-move-up-${layer.id}`}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLayerDown(layer.id)}
                        disabled={index === layers.length - 1}
                        className="h-6 w-6 p-0"
                        data-testid={`button-move-down-${layer.id}`}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="font-medium mb-3">Legend</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>IFR Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Village Boundaries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span>Detected Assets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
