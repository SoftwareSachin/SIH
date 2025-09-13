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
              <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading AI Processing</h1>
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
        
        <div className="flex-1 overflow-y-auto bg-muted/10">
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">AI Processing</h1>
                <p className="text-sm text-muted-foreground mt-1">Document processing and analysis pipeline</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="overview" className="data-[state=active]:bg-muted">Overview</TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-muted">Document Upload</TabsTrigger>
                <TabsTrigger value="ocr" className="data-[state=active]:bg-muted">OCR Testing</TabsTrigger>
                <TabsTrigger value="assets" className="data-[state=active]:bg-muted">Asset Detection</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="bg-card border border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">OCR Queue</p>
                          <p className="text-3xl font-bold text-foreground mt-2">
                            {isLoading ? '—' : (processingStatus as any)?.ocrQueue || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Pending documents</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <Scan className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">NER Processing</p>
                          <p className="text-3xl font-bold text-foreground mt-2">
                            {isLoading ? '—' : (processingStatus as any)?.nerQueue || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Entity extraction queue</p>
                        </div>
                        <div className="h-12 w-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                          <Brain className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Asset Detection</p>
                          <p className="text-3xl font-bold text-foreground mt-2">
                            {isLoading ? '—' : (processingStatus as any)?.assetDetectionQueue || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Analysis queue</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                          <Satellite className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card border border-border">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">Pipeline Status</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                            <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">OCR Processing</p>
                            <p className="text-xs text-muted-foreground">Document digitization</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {(processingStatus as any)?.totalProcessed || 0}/{(processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 0}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Progress 
                                value={Math.min(100, ((processingStatus as any)?.totalProcessed || 0) / Math.max(1, (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1) * 100)} 
                                className="w-16 h-1.5" 
                              />
                              <span className="text-xs text-muted-foreground w-8">
                                {Math.round(((processingStatus as any)?.totalProcessed || 0) / Math.max(1, (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                            <Brain className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">NER Extraction</p>
                            <p className="text-xs text-muted-foreground">Entity recognition</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {(processingStatus as any)?.nerProcessed || 0}/{(processingStatus as any)?.nerTotal || 0}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Progress 
                                value={Math.min(100, ((processingStatus as any)?.nerProcessed || 0) / Math.max(1, (processingStatus as any)?.nerTotal || 1) * 100)} 
                                className="w-16 h-1.5" 
                              />
                              <span className="text-xs text-muted-foreground w-8">
                                {Math.round(((processingStatus as any)?.nerProcessed || 0) / Math.max(1, (processingStatus as any)?.nerTotal || 1) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-purple-50 dark:bg-purple-900/20 rounded-md flex items-center justify-center">
                            <Satellite className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Asset Detection</p>
                            <p className="text-xs text-muted-foreground">Satellite analysis</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {(processingStatus as any)?.assetProcessed || 0}/{(processingStatus as any)?.assetTotal || 0}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Progress 
                                value={Math.min(100, ((processingStatus as any)?.assetProcessed || 0) / Math.max(1, (processingStatus as any)?.assetTotal || 1) * 100)} 
                                className="w-16 h-1.5" 
                              />
                              <span className="text-xs text-muted-foreground w-8">
                                {Math.round(((processingStatus as any)?.assetProcessed || 0) / Math.max(1, (processingStatus as any)?.assetTotal || 1) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upload" className="space-y-6">
                <Card className="bg-card border border-border">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">Document Upload</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <DocumentUpload />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ocr" className="space-y-6">
                <Card className="bg-card border border-border">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">OCR Testing</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <OCRProcessor />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assets" className="space-y-6">
                <Card className="bg-card border border-border">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">Asset Detection</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <AssetDetectionPanel />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
