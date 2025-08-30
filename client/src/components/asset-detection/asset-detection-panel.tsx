import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, MapPin, Search, Zap, Droplets, Home, Building2, TreePine } from 'lucide-react';

interface AssetDetectionResult {
  type: string;
  confidence: number;
  coordinates: {
    type: string;
    coordinates: number[];
  };
  area?: number;
}

interface AssetDetectionResponse {
  success: boolean;
  assets: AssetDetectionResult[];
  count: number;
  timestamp: string;
}

const AssetDetectionPanel: React.FC = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedAssets, setDetectedAssets] = useState<AssetDetectionResult[]>([]);
  const [coordinates, setCoordinates] = useState({ lat: '', lng: '' });
  const [highResolution, setHighResolution] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);

  const getAssetIcon = (assetType: string) => {
    if (assetType.includes('water') || assetType.includes('pond') || assetType.includes('lake')) {
      return <Droplets className="h-4 w-4 text-blue-500" />;
    }
    if (assetType.includes('farm') || assetType.includes('agriculture')) {
      return <TreePine className="h-4 w-4 text-green-500" />;
    }
    if (assetType.includes('homestead') || assetType.includes('built')) {
      return <Home className="h-4 w-4 text-orange-500" />;
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health')) {
      return <Building2 className="h-4 w-4 text-purple-500" />;
    }
    return <MapPin className="h-4 w-4 text-gray-500" />;
  };

  const getAssetColor = (assetType: string) => {
    if (assetType.includes('water') || assetType.includes('pond') || assetType.includes('lake')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (assetType.includes('farm') || assetType.includes('agriculture')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (assetType.includes('homestead') || assetType.includes('built')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatAssetType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatArea = (area?: number) => {
    if (!area) return 'Unknown';
    if (area < 1000) return `${Math.round(area)} m²`;
    return `${(area / 10000).toFixed(2)} hectares`;
  };

  const detectAssets = async () => {
    if (!coordinates.lat || !coordinates.lng) {
      alert('Please enter valid coordinates');
      return;
    }

    setIsDetecting(true);
    try {
      const response = await fetch('/api/assets/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            lat: parseFloat(coordinates.lat),
            lng: parseFloat(coordinates.lng)
          },
          highResolution
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to detect assets');
      }

      const data: AssetDetectionResponse = await response.json();
      setDetectedAssets(data.assets);
      setDetectionCount(data.count);
    } catch (error) {
      console.error('Asset detection failed:', error);
      alert('Asset detection failed. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get current location');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Asset Detection
          </CardTitle>
          <CardDescription>
            Automatically detect physical and social infrastructure assets using real satellite imagery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g., 23.5937"
                value={coordinates.lat}
                onChange={(e) => setCoordinates(prev => ({ ...prev, lat: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g., 78.9629"
                value={coordinates.lng}
                onChange={(e) => setCoordinates(prev => ({ ...prev, lng: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="highRes"
              checked={highResolution}
              onChange={(e) => setHighResolution(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="highRes" className="text-sm">
              Use high-resolution Sentinel-2 data (10m resolution)
            </Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={detectAssets} disabled={isDetecting} className="flex-1">
              {isDetecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detecting Assets...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Detect Assets
                </>
              )}
            </Button>
            <Button variant="outline" onClick={getCurrentLocation}>
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {detectedAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Assets ({detectionCount})</CardTitle>
            <CardDescription>
              Assets identified using real satellite imagery and AI classification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {detectedAssets.map((asset, index) => (
                <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    {getAssetIcon(asset.type)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatAssetType(asset.type)}</span>
                        <Badge className={`text-xs ${getAssetColor(asset.type)}`}>
                          {Math.round(asset.confidence)}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Area: {formatArea(asset.area)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Location: {asset.coordinates.coordinates[1].toFixed(6)}, {asset.coordinates.coordinates[0].toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isDetecting && detectedAssets.length === 0 && coordinates.lat && coordinates.lng && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assets detected at the specified coordinates.</p>
              <p className="text-sm">Try a different location or enable high-resolution mode.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetDetectionPanel;