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
      return <Sprout className="h-5 w-5 text-green-600" />;
    }
    if (assetType.includes('forest') || assetType.includes('tree') || assetType.includes('vegetation')) {
      return <Trees className="h-5 w-5 text-green-700" />;
    }
    if (assetType.includes('homestead') || assetType.includes('built') || assetType.includes('settlement')) {
      return <Home className="h-5 w-5 text-orange-600" />;
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health') || assetType.includes('road')) {
      return <Building2 className="h-5 w-5 text-gray-600" />;
    }
    return <MapIcon className="h-5 w-5 text-gray-500" />;
  };

  const getAssetColor = (assetType: string) => {
    if (assetType.includes('water') || assetType.includes('pond') || assetType.includes('lake') || assetType.includes('river')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (assetType.includes('farm') || assetType.includes('agriculture') || assetType.includes('crop')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (assetType.includes('forest') || assetType.includes('tree') || assetType.includes('vegetation')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (assetType.includes('homestead') || assetType.includes('built') || assetType.includes('settlement')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (assetType.includes('infrastructure') || assetType.includes('school') || assetType.includes('health') || assetType.includes('road')) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
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
    <div className="min-h-screen bg-slate-50">
      {/* Professional Header */}
      <div className="bg-white border-b-2 border-green-600 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-green-700 rounded-lg shadow-md">
              <Satellite className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Asset Detection
              </h1>
              <p className="text-gray-600 text-lg">
                Automatically detect physical and social infrastructure assets using real satellite imagery and AI classification
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Detection Form */}
        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-700 rounded">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Asset Detection
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Automatically detect physical and social infrastructure assets using real satellite imagery
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Coordinate Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm font-semibold text-gray-700">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 23.5937"
                    value={coordinates.lat}
                    onChange={(e) => setCoordinates(prev => ({ ...prev, lat: e.target.value }))}
                    className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm font-semibold text-gray-700">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 78.9629"
                    value={coordinates.lng}
                    onChange={(e) => setCoordinates(prev => ({ ...prev, lng: e.target.value }))}
                    className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-200"
                  />
                </div>
              </div>
              
              {/* High Resolution Option */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="highRes"
                    checked={highResolution}
                    onChange={(e) => setHighResolution(e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="highRes" className="text-sm font-semibold text-gray-700 cursor-pointer">
                      Use high-resolution Sentinel-2 data (10m resolution)
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Enhanced detection capabilities for detailed forest and land-use mapping
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={detectAssets} 
                  disabled={isDetecting} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium h-11 transition-colors"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Detect Assets
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={getCurrentLocation}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 px-4"
                  title="Use current location"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {detectedAssets.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-700 rounded">
                  <Trees className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Detected Assets ({detectionCount})
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Analysis results from satellite imagery and AI classification
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                {detectedAssets.map((asset, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-gray-900 text-lg">{formatAssetType(asset.type)}</h3>
                          <Badge className={`px-3 py-1 rounded-full text-xs font-medium ${getAssetColor(asset.type)}`}>
                            {Math.round(asset.confidence)}% confidence
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mountain className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">Area:</span> 
                            <span>{formatArea(asset.area)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">Location:</span> 
                            <span className="font-mono text-xs">{asset.coordinates.coordinates[1].toFixed(6)}, {asset.coordinates.coordinates[0].toFixed(6)}</span>
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

        {/* No Results Message */}
        {!isDetecting && detectedAssets.length === 0 && coordinates.lat && coordinates.lng && (
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto">
                  <Search className="h-12 w-12 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assets Detected</h3>
                  <p className="text-gray-600">No assets were found at the specified coordinates.</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Tip:</span> Try a different location or enable high-resolution mode for better detection.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssetDetectionPanel;