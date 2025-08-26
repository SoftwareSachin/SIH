import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import StatsCards from "@/components/dashboard/stats-cards";
import WebGISMap from "@/components/dashboard/webgis-map";
import ClaimsPanel from "@/components/dashboard/claims-panel";
import AIProcessingPanel from "@/components/dashboard/ai-processing-panel";
import DecisionSupportPanel from "@/components/dashboard/decision-support-panel";
import ClaimsTable from "@/components/claims/claims-table";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="p-6 overflow-y-auto h-full">
          {/* Stats Overview */}
          <StatsCards stats={stats} isLoading={statsLoading} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* WebGIS Map */}
            <div className="lg:col-span-2">
              <WebGISMap />
            </div>
            
            {/* Claims Panel */}
            <div>
              <ClaimsPanel />
            </div>
          </div>

          {/* AI Processing and Decision Support */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <AIProcessingPanel />
            <DecisionSupportPanel />
          </div>

          {/* Claims Management Table */}
          <div className="mt-6">
            <ClaimsTable showHeader={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
