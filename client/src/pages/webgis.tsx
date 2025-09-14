import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import RealWebGISMap from "@/components/real-webgis-map";

export default function WebGIS() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        
        <div className="flex-1">
          <RealWebGISMap />
        </div>
      </div>
    </div>
  );
}