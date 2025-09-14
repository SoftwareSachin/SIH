import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Map, 
  FileText, 
  Brain, 
  BarChart3, 
  Menu,
  X,
  Satellite,
  Shield,
  ClipboardCheck,
  ChevronRight
} from "lucide-react";
import governmentEmblem from "@/assets/government-emblem.png";

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
      "bg-card dark:bg-slate-900 border-r border-border transition-all duration-300 ease-in-out flex flex-col h-screen shadow-lg",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 p-2 rounded-lg bg-card dark:bg-slate-800 border border-border shadow-md">
                <img 
                  src={governmentEmblem} 
                  alt="Government of India Emblem" 
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-lg text-foreground">FRA Atlas</span>
                <p className="text-xs text-muted-foreground mt-0.5">Government Portal</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex-shrink-0 p-2 rounded-lg bg-card dark:bg-slate-800 border border-border shadow-md mx-auto">
              <img 
                src={governmentEmblem} 
                alt="Government of India Emblem" 
                className="h-8 w-8 object-contain"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "hover:bg-white/80 dark:hover:bg-slate-600 text-foreground rounded-lg shadow-sm border border-border/50",
              isCollapsed ? "mx-auto mt-3" : "ml-auto"
            )}
            data-testid="button-sidebar-toggle"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out cursor-pointer relative overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-md border border-primary/20 shadow-primary/10" 
                      : "text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
                    isCollapsed && "justify-center px-3 py-4"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-all duration-200 flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground",
                      isCollapsed ? "mx-auto" : "mr-4"
                    )} 
                  />
                  {!isCollapsed && (
                    <>
                      <span className="truncate font-medium">{item.name}</span>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 ml-auto text-primary" />
                      )}
                    </>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-6 border-t border-border bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-700">
          <div className="text-center">
            <div className="text-sm font-semibold text-foreground mb-1">
              Forest Rights Act Atlas
            </div>
            <div className="text-xs text-muted-foreground">
              Government of India
            </div>
          </div>
        </div>
      )}
    </div>
  );
}