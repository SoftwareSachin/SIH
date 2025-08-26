import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Download, ZoomIn, ZoomOut, Map, Satellite } from "lucide-react";

export default function WebGIS() {
  const [activeLayer, setActiveLayer] = useState('claims');
  const [mapView, setMapView] = useState('satellite');

  const layers = [
    { id: 'claims', name: 'FRA Claims', color: 'bg-blue-500', count: 1247 },
    { id: 'villages', name: 'Village Boundaries', color: 'bg-green-500', count: 847 },
    { id: 'forest', name: 'Forest Cover', color: 'bg-emerald-600', count: 1 },
    { id: 'water', name: 'Water Bodies', color: 'bg-blue-400', count: 156 },
    { id: 'assets', name: 'Detected Assets', color: 'bg-purple-500', count: 892 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="flex h-full">
          {/* Map Area */}
          <div className="flex-1 relative">
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <div className="bg-card rounded-lg border border-border shadow-lg">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 border-b border-border"
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2"
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-card rounded-lg border border-border shadow-lg">
                <div className="flex flex-col">
                  <Button
                    variant={mapView === 'satellite' ? 'default' : 'ghost'}
                    size="sm"
                    className="p-2 border-b border-border"
                    onClick={() => setMapView('satellite')}
                    data-testid="button-satellite-view"
                  >
                    <Satellite className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={mapView === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    className="p-2"
                    onClick={() => setMapView('map')}
                    data-testid="button-map-view"
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-card p-4 rounded-lg border border-border shadow-lg max-w-xs">
              <h4 className="text-sm font-medium text-foreground mb-3">Map Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">Forest Land</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-muted-foreground">Agricultural Land</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-muted-foreground">Water Bodies</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-muted-foreground">Settlements</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-muted-foreground">FRA Claims</span>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="h-full bg-gradient-to-br from-green-100 to-blue-100 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Satellite className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Interactive WebGIS Map</p>
                  <p className="text-sm">
                    {mapView === 'satellite' ? 'Satellite Imagery View' : 'Standard Map View'}
                  </p>
                  <p className="text-xs mt-2">
                    Integration with mapping service (MapBox/Google Maps) required
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Layers Panel */}
          <div className="w-80 bg-card border-l border-border overflow-y-auto">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Map Layers</h3>
                <Button variant="outline" size="sm" data-testid="button-export-map">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {layers.map((layer) => (
                <Card 
                  key={layer.id} 
                  className={`cursor-pointer transition-colors ${
                    activeLayer === layer.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setActiveLayer(layer.id)}
                  data-testid={`layer-${layer.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 ${layer.color} rounded-full`}></div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{layer.name}</p>
                          <p className="text-xs text-muted-foreground">{layer.count} features</p>
                        </div>
                      </div>
                      <Badge variant={activeLayer === layer.id ? 'default' : 'secondary'}>
                        {activeLayer === layer.id ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="p-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">Layer Filters</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" data-testid="filter-all-claims">
                  All Claims
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="filter-ifr">
                  IFR Only
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="filter-cfr">
                  CFR Only
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="filter-cr">
                  CR Only
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="filter-verified">
                  Verified Only
                </Button>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">Selected Feature</h4>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    Click on any feature on the map to view details
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
