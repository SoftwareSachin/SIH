import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Home, Building, Trees, Droplets } from "lucide-react";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DetectedAsset {
  type: string;
  confidence: number;
  area: number;
  coordinates: {
    type: string;
    coordinates: [number, number];
  };
}

interface AssetDetectionMapProps {
  assets: DetectedAsset[];
  centerCoordinates: {
    lat: string;
    lng: string;
  };
}

// Get asset icon and color based on type
const getAssetIconColor = (assetType: string) => {
  switch (assetType.toLowerCase()) {
    case 'agricultural_land':
    case 'farm':
      return { color: '#16a34a', icon: 'leaf' };
    case 'water_body':
    case 'pond':
      return { color: '#2563eb', icon: 'droplet' };
    case 'homestead':
    case 'residential':
      return { color: '#ea580c', icon: 'home' };
    case 'forest':
    case 'trees':
      return { color: '#15803d', icon: 'tree' };
    case 'built_up':
    case 'building':
      return { color: '#7c3aed', icon: 'building' };
    default:
      return { color: '#64748b', icon: 'map-pin' };
  }
};

const formatAssetType = (type: string) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const formatArea = (area: number) => {
  if (area < 10000) {
    return `${area.toFixed(0)} sq m`;
  } else {
    return `${(area / 10000).toFixed(2)} hectares`;
  }
};

export default function AssetDetectionMap({ assets, centerCoordinates }: AssetDetectionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Get center coordinates
    const centerLat = parseFloat(centerCoordinates.lat) || 23.4734;
    const centerLng = parseFloat(centerCoordinates.lng) || 81.1409;

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: true
    }).setView([centerLat, centerLng], 15);

    mapInstance.current = map;

    // Add satellite basemap
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    }).addTo(map);

    // Add scale control
    L.control.scale({ position: 'bottomleft' }).addTo(map);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [centerCoordinates]);

  useEffect(() => {
    if (!mapInstance.current || !assets.length) return;

    const map = mapInstance.current;
    
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Add center point marker
    const centerLat = parseFloat(centerCoordinates.lat);
    const centerLng = parseFloat(centerCoordinates.lng);
    
    if (centerLat && centerLng) {
      const centerMarker = L.marker([centerLat, centerLng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      }).addTo(map);
      
      centerMarker.bindPopup(`
        <div>
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Search Center</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Coordinates:</strong> ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}
          </p>
        </div>
      `);
    }

    // Add asset markers
    assets.forEach((asset, index) => {
      if (asset.coordinates?.coordinates) {
        const [lng, lat] = asset.coordinates.coordinates;
        const { color, icon } = getAssetIconColor(asset.type);
        
        // Create circle marker for assets
        const assetMarker = L.circleMarker([lat, lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          radius: 10,
          weight: 3
        }).addTo(map);
        
        // Create detailed popup
        assetMarker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span style="color: ${color}; font-size: 18px;">●</span>
              ${formatAssetType(asset.type)}
            </h3>
            <div style="space-y: 8px;">
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #374151;">Confidence:</span>
                <span style="color: #6b7280; margin-left: 8px;">${Math.round(asset.confidence)}%</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #374151;">Area:</span>
                <span style="color: #6b7280; margin-left: 8px;">${formatArea(asset.area)}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #374151;">Coordinates:</span>
                <span style="color: #6b7280; margin-left: 8px; font-family: monospace; font-size: 12px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        `);
      }
    });

    // Fit map to show all assets if there are any
    if (assets.length > 0) {
      const group = new L.FeatureGroup();
      
      // Add center point to group
      if (centerLat && centerLng) {
        group.addLayer(L.marker([centerLat, centerLng]));
      }
      
      // Add all asset markers to group
      assets.forEach(asset => {
        if (asset.coordinates?.coordinates) {
          const [lng, lat] = asset.coordinates.coordinates;
          group.addLayer(L.marker([lat, lng]));
        }
      });
      
      // Fit bounds with padding
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }

  }, [assets, centerCoordinates]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-96 rounded-lg border border-gray-200 shadow-sm"
      style={{ minHeight: '400px' }}
    />
  );
}