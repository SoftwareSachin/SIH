import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, MapPin, Search, Zap, Droplets, Home, Building2, TreePine, Leaf, Mountain, Waves, Satellite, Globe, Trees, Sprout, MapIcon } from 'lucide-react';

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
    if (assetType.includes('water') || assetType.includes('pond') || assetType.includes('lake') || assetType.includes('river')) {
      return <Waves className="h-5 w-5 text-blue-600" />;
    }
    if (assetType.includes('farm') || assetType.includes('agriculture') || assetType.includes('crop')) {
      return <Sprout className="h-5 w-5 text-emerald-600" />;
    }
    if (assetType.includes('forest') || assetType.includes('tree') || assetType.includes('vegetation')) {
      return <Trees className="h-5 w-5 text-green-700" />;
    }
    if (assetType.includes('homestead') || assetType.includes('built') || assetType.includes('settlement')) {
      return <Home className="h-5 w-5 text-amber-600" />;
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health') || assetType.includes('road')) {
      return <Building2 className="h-5 w-5 text-stone-600" />;
    }
    return <MapIcon className="h-5 w-5 text-slate-600" />;
  };

  const getAssetColor = (assetType: string) => {
    if (assetType.includes('water') || assetType.includes('pond') || assetType.includes('lake') || assetType.includes('river')) {
      return 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 border border-blue-200 shadow-sm';
    }
    if (assetType.includes('farm') || assetType.includes('agriculture') || assetType.includes('crop')) {
      return 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border border-emerald-200 shadow-sm';
    }
    if (assetType.includes('forest') || assetType.includes('tree') || assetType.includes('vegetation')) {
      return 'bg-gradient-to-r from-green-50 to-lime-50 text-green-800 border border-green-200 shadow-sm';
    }
    if (assetType.includes('homestead') || assetType.includes('built') || assetType.includes('settlement')) {
      return 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200 shadow-sm';
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health') || assetType.includes('road')) {
      return 'bg-gradient-to-r from-stone-50 to-gray-50 text-stone-800 border border-stone-200 shadow-sm';
    }
    return 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-800 border border-slate-200 shadow-sm';
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
    <div className="space-y-8 p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border border-green-100 shadow-lg">
      {/* Header Section with Forest Theme */}
      <div className="text-center space-y-4">
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full shadow-lg">
            <Satellite className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-800 to-emerald-700 bg-clip-text text-transparent">
              Forest Asset Detection
            </h1>
            <p className="text-green-700 font-medium">AI-Powered Satellite Analysis</p>
          </div>
        </div>
        <p className="text-green-800 max-w-2xl mx-auto leading-relaxed">
          Harness the power of real satellite imagery and advanced AI to automatically detect and classify forest resources, agricultural assets, water bodies, and infrastructure across rural landscapes.
        </p>
      </div>
      
      <Card className="shadow-xl border-green-200 bg-white/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Globe className="h-6 w-6" />
            Detection Controls
          </CardTitle>
          <CardDescription className="text-green-100">
            Enter coordinates to analyze satellite imagery and detect natural and built assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="latitude" className="text-green-800 font-semibold flex items-center gap-2">
                <Mountain className="h-4 w-4" />
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g., 23.5937"
                value={coordinates.lat}
                onChange={(e) => setCoordinates(prev => ({ ...prev, lat: e.target.value }))}
                className="border-green-200 focus:border-green-400 focus:ring-green-200 bg-green-50/50"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="longitude" className="text-green-800 font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Longitude
              </Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g., 78.9629"
                value={coordinates.lng}
                onChange={(e) => setCoordinates(prev => ({ ...prev, lng: e.target.value }))}
                className="border-green-200 focus:border-green-400 focus:ring-green-200 bg-green-50/50"
              />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="highRes"
                checked={highResolution}
                onChange={(e) => setHighResolution(e.target.checked)}
                className="w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500"
              />
              <Label htmlFor="highRes" className="text-green-800 font-medium flex items-center gap-2">
                <Satellite className="h-4 w-4" />
                High-Resolution Sentinel-2 Analysis (10m precision)
              </Label>
            </div>
            <p className="text-sm text-green-700 mt-2 ml-8">Enhanced detection capabilities for detailed forest and land-use mapping</p>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={detectAssets} 
              disabled={isDetecting} 
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Analyzing Satellite Data...
                </>
              ) : (
                <>
                  <Search className="mr-3 h-5 w-5" />
                  Detect Forest Assets
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={getCurrentLocation}
              className="border-green-300 text-green-700 hover:bg-green-50 h-12 px-6"
            >
              <MapPin className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {detectedAssets.length > 0 && (
        <Card className="shadow-xl border-green-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Leaf className="h-6 w-6" />
              Detected Forest Assets ({detectionCount})
            </CardTitle>
            <CardDescription className="text-green-100">
              Comprehensive analysis results from satellite imagery and AI classification
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4">
              {detectedAssets.map((asset, index) => (
                <div key={index} className="bg-gradient-to-r from-white to-green-50/30 border border-green-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shadow-sm">
                      {getAssetIcon(asset.type)}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-green-900 text-lg">{formatAssetType(asset.type)}</h3>
                        <Badge className={`px-3 py-1 rounded-full font-semibold ${getAssetColor(asset.type)}`}>
                          {Math.round(asset.confidence)}% confidence
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-green-800">
                          <Mountain className="h-4 w-4" />
                          <span className="font-medium">Area:</span> {formatArea(asset.area)}
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <MapIcon className="h-4 w-4" />
                          <span className="font-medium">Location:</span> {asset.coordinates.coordinates[1].toFixed(6)}, {asset.coordinates.coordinates[0].toFixed(6)}
                        </div>
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
        <Card className="shadow-lg border-green-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full w-fit mx-auto">
                <Search className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800">No Assets Detected</h3>
              <p className="text-green-700">No forest or infrastructure assets were found at the specified coordinates.</p>
              <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                💡 Try exploring a different location or enable high-resolution Sentinel-2 mode for enhanced detection capabilities.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetDetectionPanel;