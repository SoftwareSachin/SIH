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
      return 'bg-blue-50 text-blue-800 border border-blue-200';
    }
    if (assetType.includes('farm') || assetType.includes('agriculture') || assetType.includes('crop')) {
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    }
    if (assetType.includes('forest') || assetType.includes('tree') || assetType.includes('vegetation')) {
      return 'bg-green-50 text-green-800 border border-green-200';
    }
    if (assetType.includes('homestead') || assetType.includes('built') || assetType.includes('settlement')) {
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health') || assetType.includes('road')) {
      return 'bg-stone-50 text-stone-800 border border-stone-200';
    }
    return 'bg-slate-50 text-slate-800 border border-slate-200';
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
    <div className="space-y-8 p-8 bg-green-50 rounded-xl border border-green-200">
      {/* Header Section with Forest Theme */}
      <div className="text-center space-y-6">
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="p-4 bg-green-700 rounded-xl">
            <Satellite className="h-10 w-10 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-bold text-green-900">
              Forest Asset Detection
            </h1>
            <p className="text-green-700 text-lg font-medium">AI-Powered Satellite Analysis</p>
          </div>
        </div>
        <p className="text-green-800 max-w-3xl mx-auto text-lg leading-relaxed">
          Utilize advanced satellite imagery and artificial intelligence to automatically detect and classify forest resources, agricultural assets, water bodies, and infrastructure across rural landscapes.
        </p>
      </div>
      
      <Card className="shadow-lg border-green-300 bg-white">
        <CardHeader className="bg-green-700 text-white">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Globe className="h-6 w-6" />
            Detection Controls
          </CardTitle>
          <CardDescription className="text-green-100 text-base">
            Enter coordinates to analyze satellite imagery and detect natural and built assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label htmlFor="latitude" className="text-green-900 font-bold text-lg flex items-center gap-2">
                <Mountain className="h-5 w-5" />
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g., 23.5937"
                value={coordinates.lat}
                onChange={(e) => setCoordinates(prev => ({ ...prev, lat: e.target.value }))}
                className="border-green-300 focus:border-green-500 focus:ring-green-200 bg-white h-12 text-lg"
              />
            </div>
            <div className="space-y-4">
              <Label htmlFor="longitude" className="text-green-900 font-bold text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Longitude
              </Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g., 78.9629"
                value={coordinates.lng}
                onChange={(e) => setCoordinates(prev => ({ ...prev, lng: e.target.value }))}
                className="border-green-300 focus:border-green-500 focus:ring-green-200 bg-white h-12 text-lg"
              />
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="highRes"
                checked={highResolution}
                onChange={(e) => setHighResolution(e.target.checked)}
                className="w-5 h-5 text-green-600 border-green-400 rounded focus:ring-green-500"
              />
              <Label htmlFor="highRes" className="text-green-900 font-semibold text-lg flex items-center gap-2">
                <Satellite className="h-5 w-5" />
                High-Resolution Sentinel-2 Analysis (10m precision)
              </Label>
            </div>
            <p className="text-green-800 mt-3 ml-9 text-base">Enhanced detection capabilities for detailed forest and land-use mapping</p>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={detectAssets} 
              disabled={isDetecting} 
              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold h-14 text-lg transition-colors duration-200"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Analyzing Satellite Data...
                </>
              ) : (
                <>
                  <Search className="mr-3 h-6 w-6" />
                  Detect Forest Assets
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={getCurrentLocation}
              className="border-green-400 border-2 text-green-800 hover:bg-green-100 h-14 px-8 font-semibold"
            >
              <MapPin className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {detectedAssets.length > 0 && (
        <Card className="shadow-lg border-green-300 bg-white">
          <CardHeader className="bg-green-700 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Trees className="h-7 w-7" />
              Detected Forest Assets ({detectionCount})
            </CardTitle>
            <CardDescription className="text-green-100 text-base">
              Comprehensive analysis results from satellite imagery and AI classification
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {detectedAssets.map((asset, index) => (
                <div key={index} className="bg-white border border-green-200 rounded-lg p-6 shadow-md hover:shadow-lg hover:border-green-300 transition-all duration-200">
                  <div className="flex items-start gap-6">
                    <div className="p-4 bg-green-100 rounded-lg">
                      {getAssetIcon(asset.type)}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <h3 className="font-bold text-green-900 text-xl">{formatAssetType(asset.type)}</h3>
                        <Badge className={`px-4 py-2 rounded-lg font-bold text-sm ${getAssetColor(asset.type)}`}>
                          {Math.round(asset.confidence)}% confidence
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
                        <div className="flex items-center gap-3 text-green-800">
                          <Mountain className="h-5 w-5" />
                          <span className="font-semibold">Area:</span> 
                          <span className="font-medium">{formatArea(asset.area)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-green-800">
                          <MapIcon className="h-5 w-5" />
                          <span className="font-semibold">Location:</span> 
                          <span className="font-medium">{asset.coordinates.coordinates[1].toFixed(6)}, {asset.coordinates.coordinates[0].toFixed(6)}</span>
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
        <Card className="shadow-lg border-green-300 bg-white">
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-100 rounded-xl w-fit mx-auto">
                <Search className="h-16 w-16 text-green-700" />
              </div>
              <h3 className="text-2xl font-bold text-green-900">No Assets Detected</h3>
              <p className="text-green-800 text-lg">No forest or infrastructure assets were found at the specified coordinates.</p>
              <div className="text-green-700 bg-green-50 p-6 rounded-lg border border-green-200 max-w-md mx-auto">
                <p className="font-semibold">Suggestion:</p>
                <p className="mt-2">Try exploring a different location or enable high-resolution Sentinel-2 mode for enhanced detection capabilities.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetDetectionPanel;