import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shrub, 
  LayoutDashboard, 
  Map, 
  FileText, 
  Brain, 
  BarChart3, 
  Upload, 
  Download, 
  CheckCircle,
  Menu,
  X,
  TestTube2
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'WebGIS Portal', href: '/webgis', icon: Map },
    { name: 'Claims Management', href: '/claims', icon: FileText },
    { name: 'AI Processing', href: '/ai-processing', icon: Brain },
    { name: 'NER Tester', href: '/test/ner', icon: TestTube2 },
    { name: 'Decision Support', href: '/decision-support', icon: BarChart3 },
  ];

  const states = [
    { name: 'Madhya Pradesh', count: 1247, active: true },
    { name: 'Tripura', count: 432, active: false },
    { name: 'Odisha', count: 856, active: false },
    { name: 'Telangana', count: 623, active: false },
  ];

  const quickActions = [
    { name: 'Upload Documents', icon: Upload },
    { name: 'Export Data', icon: Download },
    { name: 'Verify Claims', icon: CheckCircle },
  ];

  return (
    <div className={cn(
      "bg-card border-r border-border flex-shrink-0 transition-all duration-300 overflow-y-auto",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
            <div className="bg-accent p-2 rounded-lg">
              <Shrub className="h-6 w-6 text-accent-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">FRA Atlas</h1>
                <p className="text-sm text-muted-foreground">Shrub Rights Management</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="md:hidden"
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "justify-center px-2"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </div>

        {!isCollapsed && (
          <>
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                States
              </h3>
              <div className="mt-2 space-y-1">
                {states.map((state) => (
                  <Button
                    key={state.name}
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid={`state-${state.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <Map className="h-4 w-4 mr-3" />
                    <span className="flex-1 text-left">{state.name}</span>
                    <Badge 
                      variant={state.active ? "default" : "secondary"}
                      className="ml-auto"
                    >
                      {state.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="mt-2 space-y-1">
                {quickActions.map((action) => (
                  <Button
                    key={action.name}
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid={`action-${action.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <action.icon className="h-4 w-4 mr-3" />
                    <span>{action.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
