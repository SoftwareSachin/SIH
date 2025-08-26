import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import RealWebGISMap from "@/components/webgis/real-webgis-map";

export default function WebGIS() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="h-full">
          <RealWebGISMap />
        </div>
      </div>
    </div>
  );
}