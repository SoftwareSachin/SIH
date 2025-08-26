import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Layers, Download, Satellite } from "lucide-react";

export default function WebGISMap() {
  const [activeFilters, setActiveFilters] = useState<string[]>(['all-claims']);

  const filters = [
    { id: 'all-claims', label: 'All Claims', active: true },
    { id: 'ifr', label: 'IFR', active: false },
    { id: 'cfr', label: 'CFR', active: false },
    { id: 'cr', label: 'CR', active: false },
    { id: 'verified', label: 'Verified Only', active: false },
  ];

  const toggleFilter = (filterId: string) => {
    if (filterId === 'all-claims') {
      setActiveFilters(['all-claims']);
    } else {
      setActiveFilters(prev => {
        const newFilters = prev.filter(f => f !== 'all-claims');
        if (newFilters.includes(filterId)) {
          return newFilters.filter(f => f !== filterId);
        } else {
          return [...newFilters, filterId];
        }
      });
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Interactive FRA Atlas</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" data-testid="button-layers">
              <Layers className="h-4 w-4 mr-2" />
              Layers
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-map">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <div className="h-96 map-container relative overflow-hidden">
        {/* Map controls */}
        <div className="absolute top-4 right-4 bg-card rounded-lg border border-border shadow-lg z-10">
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 border-b border-border rounded-none rounded-t-lg"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-none rounded-b-lg"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card p-4 rounded-lg border border-border shadow-lg z-10">
          <h4 className="text-sm font-medium text-foreground mb-2">Legend</h4>
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
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="absolute inset-4 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Satellite className="h-16 w-16 mx-auto mb-4" />
            <p className="text-lg font-medium">WebGIS Map Viewer</p>
            <p className="text-sm">Satellite imagery with FRA claims overlay</p>
            <p className="text-xs mt-2">
              Integration with mapping service required
            </p>
          </div>
        </div>
      </div>
      
      {/* Map Filters */}
      <div className="p-4 border-t border-border">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilters.includes(filter.id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFilter(filter.id)}
              data-testid={`filter-${filter.id}`}
              className="text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
