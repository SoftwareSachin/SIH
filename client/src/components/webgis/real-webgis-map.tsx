import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Layers, Download, ZoomIn, ZoomOut, Map, Satellite, Eye, EyeOff } from "lucide-react";
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
    { id: 'claims', name: 'FRA Claims', visible: true, color: 'bg-blue-500', count: 0, zIndex: 400 },
    { id: 'villages', name: 'Village Boundaries', visible: true, color: 'bg-green-500', count: 0, zIndex: 300 },
    { id: 'forest', name: 'Forest Cover', visible: false, color: 'bg-emerald-600', count: 0, zIndex: 200 },
    { id: 'water', name: 'Water Bodies', visible: false, color: 'bg-blue-400', count: 0, zIndex: 250 },
    { id: 'assets', name: 'Detected Assets', visible: true, color: 'bg-purple-500', count: 0, zIndex: 500 },
  ]);

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
        const circle = L.circle([parseFloat(village.latitude), parseFloat(village.longitude)], {
          color: 'green',
          fillColor: '#90EE90',
          fillOpacity: 0.3,
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
  }, [villages]);

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
        
        const marker = L.circleMarker([lat, lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
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
  }, [assets]);

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

  const zoomIn = () => mapInstance.current?.zoomIn();
  const zoomOut = () => mapInstance.current?.zoomOut();

  const exportMap = () => {
    if (!mapInstance.current) return;
    
    // This would implement map export functionality
    // For now, we'll show an alert
    alert('Map export functionality would be implemented here');
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
        
        <div className="space-y-3">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${layer.color}`} />
                <div>
                  <div className="font-medium text-sm">{layer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {layer.count} features
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
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