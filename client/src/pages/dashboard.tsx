import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import StatsCards from "@/components/dashboard/stats-cards";
import RealWebGISMap from "@/components/real-webgis-map";
import ClaimsPanel from "@/components/dashboard/claims-panel";
import AIProcessingPanel from "@/components/dashboard/ai-processing-panel";
import DecisionSupportPanel from "@/components/dashboard/decision-support-panel";
import ClaimsTable from "@/components/claims/claims-table";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="p-6 overflow-y-auto h-full">
          {/* Stats Overview */}
          <StatsCards stats={stats as any} isLoading={statsLoading} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* WebGIS Map */}
            <div className="lg:col-span-2 h-96">
              <RealWebGISMap />
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
