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
        
        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/10">
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-20"></div>
              <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      AI Processing Pipeline
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Advanced automated document processing and spatial intelligence
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Real-time processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Multi-language OCR</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span>AI-powered analysis</span>
                  </div>
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
                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10"></div>
                  <CardHeader className="relative pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          OCR Queue
                        </CardTitle>
                      </div>
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                        <Scan className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {isLoading ? '...' : (processingStatus as any)?.ocrQueue || 0}
                      </div>
                      {((processingStatus as any)?.ocrQueue || 0) > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-600 font-medium">Processing</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Documents in OCR pipeline
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10"></div>
                  <CardHeader className="relative pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          NER Processing
                        </CardTitle>
                      </div>
                      <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {isLoading ? '...' : (processingStatus as any)?.nerQueue || 0}
                      </div>
                      {((processingStatus as any)?.nerQueue || 0) > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Documents awaiting entity extraction
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
                  <CardHeader className="relative pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          Asset Detection
                        </CardTitle>
                      </div>
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                        <Satellite className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {isLoading ? '...' : (processingStatus as any)?.assetDetectionQueue || 0}
                      </div>
                      {((processingStatus as any)?.assetDetectionQueue || 0) > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-purple-600 font-medium">Analyzing</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Villages awaiting satellite analysis
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Pipeline Status */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Processing Pipeline Status
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Real-time AI processing dashboard</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* OCR Processing */}
                  <div className="relative p-6 rounded-2xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-200/50 dark:border-blue-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                            <Scan className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">OCR Processing</p>
                          <p className="text-sm text-muted-foreground">Advanced document digitization engine</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div className="space-y-2">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {(processingStatus as any)?.totalProcessed || 0}/{(processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 0}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={Math.min(100, ((processingStatus as any)?.totalProcessed || 0) / Math.max(1, (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1) * 100)} 
                              className="w-24 h-2" 
                            />
                            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-3 py-1">
                              {Math.round(((processingStatus as any)?.totalProcessed || 0) / Math.max(1, (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NER Extraction */}
                  <div className="relative p-6 rounded-2xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                            <Brain className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">NER Extraction</p>
                          <p className="text-sm text-muted-foreground">AI-powered entity recognition system</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div className="space-y-2">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {(processingStatus as any)?.nerProcessed || 0}/{(processingStatus as any)?.nerTotal || 0}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={Math.min(100, ((processingStatus as any)?.nerProcessed || 0) / Math.max(1, (processingStatus as any)?.nerTotal || 1) * 100)} 
                              className="w-24 h-2" 
                            />
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1">
                              {Math.round(((processingStatus as any)?.nerProcessed || 0) / Math.max(1, (processingStatus as any)?.nerTotal || 1) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asset Detection */}
                  <div className="relative p-6 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                            <Satellite className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Asset Detection</p>
                          <p className="text-sm text-muted-foreground">Satellite imagery analysis platform</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div className="space-y-2">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {(processingStatus as any)?.assetProcessed || 0}/{(processingStatus as any)?.assetTotal || 0}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={Math.min(100, ((processingStatus as any)?.assetProcessed || 0) / Math.max(1, (processingStatus as any)?.assetTotal || 1) * 100)} 
                              className="w-24 h-2" 
                            />
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-3 py-1">
                              {Math.round(((processingStatus as any)?.assetProcessed || 0) / Math.max(1, (processingStatus as any)?.assetTotal || 1) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <div className="relative mb-6 p-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl"></div>
                <div className="relative flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Target className="text-white h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                      Advanced Document Processing Engine
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Our AI-powered system processes Forest Rights Act documents with high precision. Processing typically takes 1-3 minutes per document.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300">Multi-language OCR support</span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300">Entity recognition & extraction</span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300">Confidence scoring & validation</span>
                      </div>
                    </div>
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
