import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import AssetDetectionPanel from "@/components/asset-detection/asset-detection-panel";

export default function AssetDetection() {

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="p-6 overflow-y-auto h-full">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">Asset Detection</h1>
              <p className="text-muted-foreground mt-2">
                Automatically detect physical and social infrastructure assets using real satellite imagery and AI classification
              </p>
            </div>
            
            <AssetDetectionPanel />
          </div>
        </div>
      </div>
    </div>
  );
}