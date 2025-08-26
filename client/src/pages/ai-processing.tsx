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
import { Scan, Brain, Satellite, Upload, RefreshCw } from "lucide-react";

export default function AIProcessing() {
  const { data: processingStatus, isLoading } = useQuery({
    queryKey: ["/api/ai/processing-status"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="p-6 overflow-y-auto h-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">AI Processing Pipeline</h1>
            <p className="text-muted-foreground">
              Automated document processing and spatial analysis
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="upload">Document Upload</TabsTrigger>
              <TabsTrigger value="ocr">Real OCR Testing</TabsTrigger>
              <TabsTrigger value="assets">Asset Detection</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Processing Status Overview */}
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

            <TabsContent value="upload">
              <DocumentUpload />
            </TabsContent>

            <TabsContent value="ocr" className="space-y-6">
              <OCRProcessor />
            </TabsContent>


            <TabsContent value="assets" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Asset Detection Results</CardTitle>
                    <Button variant="outline" size="sm" data-testid="button-run-detection">
                      <Satellite className="h-4 w-4 mr-2" />
                      Run Detection
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Detected Assets - Khandwa Village</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Ponds: 3</span>
                          <Badge variant="secondary">87% confidence</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Farms: 12</span>
                          <Badge variant="secondary">92% confidence</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Homesteads: 45</span>
                          <Badge variant="secondary">95% confidence</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Land Use Classification</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Agriculture: 45.2%</span>
                          <div className="w-16 h-2 bg-yellow-200 rounded-full">
                            <div className="w-3/4 h-2 bg-yellow-500 rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Forest: 32.8%</span>
                          <div className="w-16 h-2 bg-green-200 rounded-full">
                            <div className="w-1/2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Water: 8.5%</span>
                          <div className="w-16 h-2 bg-blue-200 rounded-full">
                            <div className="w-1/4 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
