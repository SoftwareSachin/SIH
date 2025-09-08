import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  TestTube2,
  Satellite,
  Shield,
  Users,
  ClipboardCheck
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Navigation items - now available to all users
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'WebGIS Portal', href: '/webgis', icon: Map },
    { name: 'Claims Management', href: '/claims', icon: FileText },
    { name: 'Verification Workflow', href: '/verification-workflow', icon: ClipboardCheck },
    { name: 'AI Processing', href: '/ai-processing', icon: Brain },
    { name: 'Asset Detection', href: '/asset-detection', icon: Satellite },
    { name: 'Decision Support', href: '/dss', icon: BarChart3 },
    { name: 'Admin Panel', href: '/admin', icon: Shield },
  ];

  return (
    <div className={cn(
      "bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Shrub className="h-6 w-6 text-green-600" />
              <span className="font-bold text-lg">FRA Atlas</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "px-2"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
                  {!isCollapsed && item.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}