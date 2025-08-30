import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Layers, Download, ZoomIn, ZoomOut, Map, Satellite, Eye, EyeOff, ChevronUp, ChevronDown, Search, MapPin, Home, Building, Trees } from "lucide-react";
import { useQuery } from '@tanstack/react-query';

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
}

export default function RealWebGISMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.LayerGroup>>({});
  const [mapView, setMapView] = useState<'satellite' | 'street'>('satellite');
  const [layers, setLayers] = useState<LayerConfig[]>([
    { id: 'claims', name: 'FRA Claims', visible: true, opacity: 80, color: 'bg-blue-500', count: 0, zIndex: 400 },
    { id: 'villages', name: 'Village Boundaries', visible: true, opacity: 60, color: 'bg-green-500', count: 0, zIndex: 300 },
    { id: 'forest', name: 'Forest Cover', visible: false, opacity: 70, color: 'bg-emerald-600', count: 0, zIndex: 200 },
    { id: 'water', name: 'Water Bodies', visible: false, opacity: 70, color: 'bg-blue-400', count: 0, zIndex: 250 },
    { id: 'assets', name: 'Detected Assets', visible: true, opacity: 90, color: 'bg-purple-500', count: 0, zIndex: 500 },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [spatialQueryMode, setSpatialQueryMode] = useState(false);
  const [spatialQueryResults, setSpatialQueryResults] = useState<any[]>([]);

  // Fetch real data for map layers
  const { data: claims } = useQuery({ queryKey: ['/api/claims'] });
  const { data: villages } = useQuery({ queryKey: ['/api/geo/villages/all'] });
  const { data: assets } = useQuery({ queryKey: ['/api/assets'] });

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map with India center coordinates
    const map = L.map(mapRef.current).setView([23.5937, 78.9629], 5);
    mapInstance.current = map;

    // Add base layers (real satellite imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    // Add default layer
    satelliteLayer.addTo(map);

    // Initialize layer groups
    layers.forEach(layer => {
      layersRef.current[layer.id] = L.layerGroup().addTo(map);
    });

    // Add custom controls
    const customControls = L.control({ position: 'topright' });
    customControls.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control-custom');
      div.innerHTML = '<div id="custom-controls"></div>';
      return div;
    };
    customControls.addTo(map);

    // Handle base layer switching
    const baseLayers = {
      'Satellite': satelliteLayer,
      'Street': streetLayer
    };

    // Add layer control
    L.control.layers(baseLayers, {}, { position: 'topleft' }).addTo(map);

    // Add map click event for spatial queries
    map.on('click', (e) => {
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
      }
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map view when switching base layers
  useEffect(() => {
    if (!mapInstance.current) return;

    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current?.removeLayer(layer);
      }
    });

    if (mapView === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
      }).addTo(mapInstance.current);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }
  }, [mapView]);

  // Load real claims data
  useEffect(() => {
    if (!mapInstance.current || !claims?.data || !layersRef.current.claims) return;

    const claimsLayer = layersRef.current.claims;
    claimsLayer.clearLayers();

    claims.data.forEach((claim: any) => {
      if (claim.latitude && claim.longitude) {
        const marker = L.marker([parseFloat(claim.latitude), parseFloat(claim.longitude)])
          .bindPopup(`
            <div>
              <h3>${claim.claimantName || 'Unknown Claimant'}</h3>
              <p><strong>Claim ID:</strong> ${claim.claimId}</p>
              <p><strong>Type:</strong> ${claim.claimType}</p>
              <p><strong>Status:</strong> ${claim.status}</p>
              <p><strong>Area:</strong> ${claim.area || 'N/A'} acres</p>
            </div>
          `);
        claimsLayer.addLayer(marker);
      }
    });

    setLayers(prev => prev.map(layer => 
      layer.id === 'claims' ? { ...layer, count: claims.data.length } : layer
    ));
  }, [claims]);

  // Load real villages data
  useEffect(() => {
    if (!mapInstance.current || !villages || !layersRef.current.villages) return;

    const villagesLayer = layersRef.current.villages;
    villagesLayer.clearLayers();

    villages.forEach((village: any) => {
      if (village.latitude && village.longitude) {
        const currentLayer = layers.find(l => l.id === 'villages');
        const opacity = currentLayer ? currentLayer.opacity / 100 : 0.3;
        const circle = L.circle([parseFloat(village.latitude), parseFloat(village.longitude)], {
          color: 'green',
          fillColor: '#90EE90',
          fillOpacity: opacity,
          radius: 1000 // 1km radius
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

    setLayers(prev => prev.map(layer => 
      layer.id === 'villages' ? { ...layer, count: villages.length } : layer
    ));
  }, [villages, layers]);

  // Add event listener for villages opacity updates
  useEffect(() => {
    const handleVillagesUpdate = () => {
      if (!mapInstance.current || !villages || !layersRef.current.villages) return;
      
      const villagesLayer = layersRef.current.villages;
      villagesLayer.clearLayers();
      
      villages.forEach((village: any) => {
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
    if (!mapInstance.current || !assets || !layersRef.current.assets) return;

    const assetsLayer = layersRef.current.assets;
    assetsLayer.clearLayers();

    assets.forEach((asset: any) => {
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

    setLayers(prev => prev.map(layer => 
      layer.id === 'assets' ? { ...layer, count: assets.length } : layer
    ));
  }, [assets, layers]);

  // Add event listener for assets opacity updates
  useEffect(() => {
    const handleAssetsUpdate = () => {
      if (!mapInstance.current || !assets || !layersRef.current.assets) return;
      
      const assetsLayer = layersRef.current.assets;
      assetsLayer.clearLayers();
      
      assets.forEach((asset: any) => {
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
  }, [searchQuery, villages, claims?.data]);

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
      const results = [];
      
      if (villages) {
        const matchingVillages = villages.filter((v: any) => 
          v.name?.toLowerCase().includes(query.toLowerCase()) ||
          v.districtName?.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matchingVillages.map((v: any) => ({ ...v, type: 'village' })));
      }
      
      if (claims?.data) {
        const matchingClaims = claims.data.filter((c: any) => 
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
    if (villages && villages.length > 0) {
      const firstVillage = villages[0];
      if (firstVillage.latitude && firstVillage.longitude) {
        flyToLocation(parseFloat(firstVillage.latitude), parseFloat(firstVillage.longitude), 13);
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
    const results = [];
    
    if (villages) {
      villages.forEach((village: any) => {
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
    
    if (claims?.data) {
      claims.data.forEach((claim: any) => {
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
    
    if (assets) {
      assets.forEach((asset: any) => {
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

  const zoomIn = () => mapInstance.current?.zoomIn();
  const zoomOut = () => mapInstance.current?.zoomOut();

  const exportMap = () => {
    if (!mapInstance.current) return;
    
    // Generate export data
    const mapState = {
      center: mapInstance.current.getCenter(),
      zoom: mapInstance.current.getZoom(),
      layers: layers.filter(l => l.visible),
      baseLayer: mapView,
      exportedAt: new Date().toISOString()
    };
    
    // Create downloadable JSON
    const dataStr = JSON.stringify(mapState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `fra-atlas-map-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

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
          
          {/* Base Layer Controls */}
          <div className="bg-card rounded-lg border border-border shadow-lg">
            <div className="flex flex-col">
              <Button
                variant={mapView === 'satellite' ? 'default' : 'ghost'}
                size="sm"
                className="p-2 border-b border-border rounded-none rounded-t-lg"
                onClick={() => setMapView('satellite')}
                data-testid="button-satellite-view"
              >
                <Satellite className="h-4 w-4" />
              </Button>
              <Button
                variant={mapView === 'street' ? 'default' : 'ghost'}
                size="sm"
                className="p-2 rounded-none rounded-b-lg"
                onClick={() => setMapView('street')}
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

      {/* Layers Panel */}
      <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5" />
          <h3 className="font-semibold">Map Layers</h3>
        </div>
        
        {/* Search Panel */}
        <div className="mb-6 space-y-3">
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