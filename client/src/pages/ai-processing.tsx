import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/upload/document-upload";
import OCRProcessor from "@/components/ocr/ocr-processor";
import AssetDetectionPanel from "@/components/asset-detection/asset-detection-panel";
import { Scan, Brain, Satellite, Upload, RefreshCw, Activity, Zap, Target } from "lucide-react";

export default function AIProcessing() {
  const { data: processingStatus, isLoading, error } = useQuery({
    queryKey: ["/api/ai/processing-status"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Error fallback
  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <TopBar />
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="text-center py-8">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading AI Processing</h1>
              <p className="text-muted-foreground">Please refresh the page or try again later.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading fallback
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <TopBar />
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading AI Processing...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar />
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Activity className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    AI Processing Pipeline
                  </h1>
                  <p className="text-muted-foreground">
                    Automated document processing and spatial analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Real-time processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Multi-language OCR</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>AI-powered analysis</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="upload">Document Upload</TabsTrigger>
              <TabsTrigger value="ocr">Real OCR Testing</TabsTrigger>
              <TabsTrigger value="assets">Asset Detection</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Enhanced Processing Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">OCR Queue</CardTitle>
                    <Scan className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoading ? '...' : (processingStatus as any)?.ocrQueue || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Documents pending OCR
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">NER Processing</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoading ? '...' : (processingStatus as any)?.nerQueue || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Documents pending entity extraction
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Asset Detection</CardTitle>
                    <Satellite className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoading ? '...' : (processingStatus as any)?.assetDetectionQueue || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Villages pending analysis
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Processing Pipeline Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Scan className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">OCR Processing</p>
                          <p className="text-xs text-muted-foreground">Real document digitization</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div>
                          <p className="text-sm font-medium">
                            {(processingStatus as any)?.totalProcessed || 0}/{(processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 0}
                          </p>
                          <Progress value={Math.min(100, ((processingStatus as any)?.totalProcessed || 0) / Math.max(1, (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1) * 100)} className="w-20" />
                        </div>
                        <Badge variant="secondary">
                          {Math.round(((processingStatus as any)?.totalProcessed || 0) / Math.max(1, (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1) * 100)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-accent/10 rounded-full">
                          <Brain className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">NER Extraction</p>
                          <p className="text-xs text-muted-foreground">Real entity recognition</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div>
                          <p className="text-sm font-medium">
                            {(processingStatus as any)?.nerProcessed || 0}/{(processingStatus as any)?.nerTotal || 0}
                          </p>
                          <Progress value={Math.min(100, ((processingStatus as any)?.nerProcessed || 0) / Math.max(1, (processingStatus as any)?.nerTotal || 1) * 100)} className="w-20" />
                        </div>
                        <Badge variant="secondary">
                          {Math.round(((processingStatus as any)?.nerProcessed || 0) / Math.max(1, (processingStatus as any)?.nerTotal || 1) * 100)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Satellite className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Asset Detection</p>
                          <p className="text-xs text-muted-foreground">Real satellite analysis</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div>
                          <p className="text-sm font-medium">
                            {(processingStatus as any)?.assetProcessed || 0}/{(processingStatus as any)?.assetTotal || 0}
                          </p>
                          <Progress value={Math.min(100, ((processingStatus as any)?.assetProcessed || 0) / Math.max(1, (processingStatus as any)?.assetTotal || 1) * 100)} className="w-20" />
                        </div>
                        <Badge variant="secondary">
                          {Math.round(((processingStatus as any)?.assetProcessed || 0) / Math.max(1, (processingStatus as any)?.assetTotal || 1) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Target className="text-white text-sm h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Document Processing Info</h4>
                    <p className="text-blue-700 dark:text-blue-200">
                      AI processing may take 1-3 minutes per document. The system will:
                    </p>
                    <ul className="mt-2 text-blue-600 dark:text-blue-300 text-xs space-y-1 ml-4 list-disc">
                      <li>Extract text using multi-language OCR (Hindi, English, Odia, Telugu, Bengali)</li>
                      <li>Identify names, villages, coordinates, and claim details</li>
                      <li>Analyze document structure and confidence scores</li>
                    </ul>
                  </div>
                </div>
              </div>
              <DocumentUpload />
            </TabsContent>

            <TabsContent value="ocr" className="space-y-6">
              <OCRProcessor />
            </TabsContent>


            <TabsContent value="assets" className="space-y-6">
              <AssetDetectionPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
