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
      "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col h-screen shadow-sm",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg">
                <Shrub className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">FRA Atlas</span>
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg mx-auto">
              <Shrub className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("hover:bg-gray-100", isCollapsed ? "mx-auto mt-2" : "ml-auto")}
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out cursor-pointer",
                    isActive 
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600" 
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-colors duration-150",
                      isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700",
                      isCollapsed ? "mx-auto" : "mr-3"
                    )} 
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            Forest Rights Act Atlas
          </div>
        </div>
      )}
    </div>
  );
}