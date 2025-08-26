import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Image, 
  CheckCircle, 
  AlertCircle, 
  Brain,
  Globe,
  Activity,
  Clock,
  Eye,
  Download
} from "lucide-react";

interface OCRResult {
  success: boolean;
  documentId: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  claimId: string;
  ocrResults: {
    text: string;
    confidence: number;
    language: string;
    entities: {
      names?: string[];
      villages?: string[];
      areas?: string[];
      coordinates?: string[];
      dates?: string[];
      claimTypes?: string[];
      documentTypes?: string[];
      surveyNumbers?: string[];
      boundaries?: string[];
    };
    metadata: {
      processingTime: number;
      imageQuality: string;
      ocrMethod: string;
      preprocessingApplied: string[];
    };
  };
}

export default function OCRProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const { toast } = useToast();

  const { data: claims } = useQuery({
    queryKey: ["/api/claims", { limit: 100 }],
  });

  const { data: ocrHealth } = useQuery({
    queryKey: ["/api/test/ocr/health"],
    refetchInterval: 30000, // Check health every 30 seconds
  });

  const processOCRMutation = useMutation({
    mutationFn: async ({ file, claimId }: { file: File; claimId: string }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('claimId', claimId);

      const response = await fetch('/api/documents/process', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: Processing failed`);
      }

      return response.json();
    },
    onSuccess: (result: OCRResult) => {
      setOcrResult(result);
      toast({
        title: "OCR Processing Complete",
        description: `Document processed with ${result.ocrResults.confidence}% confidence`,
      });
    },
    onError: (error) => {
      console.error("OCR processing failed:", error);
      toast({
        title: "OCR Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    
    const file = newFiles[0];
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF, JPEG, PNG, or TIFF files only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setOcrResult(null);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const processDocument = () => {
    if (!selectedFile || !selectedClaimId) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and a claim before processing.",
        variant: "destructive",
      });
      return;
    }

    processOCRMutation.mutate({ file: selectedFile, claimId: selectedClaimId });
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <Image className="h-8 w-8 text-blue-500" />;
  };

  const getHealthStatus = () => {
    if (!ocrHealth) return { color: "bg-gray-500", text: "Unknown" };
    
    switch (ocrHealth.status) {
      case 'healthy':
        return { color: "bg-green-500", text: "Healthy" };
      case 'degraded':
        return { color: "bg-yellow-500", text: "Degraded" };
      case 'unhealthy':
        return { color: "bg-red-500", text: "Unhealthy" };
      default:
        return { color: "bg-gray-500", text: "Unknown" };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* OCR System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>OCR System Status</CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${healthStatus.color}`} />
              <span className="text-sm font-medium">{healthStatus.text}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Active Workers</p>
                <p className="text-xs text-muted-foreground">
                  {ocrHealth?.workersActive || 0} / {ocrHealth?.totalWorkers || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Languages</p>
                <p className="text-xs text-muted-foreground">
                  {ocrHealth?.supportedLanguages?.length || 0} supported
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Engine</p>
                <p className="text-xs text-muted-foreground">Tesseract.js</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ready</p>
                <p className="text-xs text-muted-foreground">
                  {ocrHealth?.status === 'healthy' ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Processing */}
      <Card>
        <CardHeader>
          <CardTitle>Real OCR Document Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Claim Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Claim for Processing *
            </label>
            <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
              <SelectTrigger data-testid="select-claim-ocr">
                <SelectValue placeholder="Select a claim to process document for" />
              </SelectTrigger>
              <SelectContent>
                {(claims as any)?.data?.map((claim: any) => (
                  <SelectItem key={claim.id} value={claim.id}>
                    {claim.claimId} - {claim.claimantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <p className="font-medium">
                Drop FRA document here or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, JPEG, PNG, TIFF files up to 10MB
              </p>
              <p className="text-xs text-muted-foreground">
                Multi-language OCR with entity extraction
              </p>
            </div>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              data-testid="input-ocr-file"
              id="ocr-file-upload"
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById('ocr-file-upload')?.click()}
              data-testid="button-select-ocr-file"
            >
              Select Document
            </Button>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {getFileIcon(selectedFile)}
                  <div className="flex-1">
                    <h4 className="font-medium">{selectedFile.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                    </p>
                  </div>
                  <Button
                    onClick={processDocument}
                    disabled={!selectedClaimId || processOCRMutation.isPending}
                    data-testid="button-process-ocr"
                  >
                    {processOCRMutation.isPending ? "Processing..." : "Process with OCR"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Progress */}
          {processOCRMutation.isPending && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Processing Document</p>
                    <p className="text-sm text-muted-foreground">
                      Applying image preprocessing, multi-language OCR, and entity extraction...
                    </p>
                  </div>
                </div>
                <Progress value={undefined} className="mt-4" />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* OCR Results */}
      {ocrResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>OCR Processing Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="text">Extracted Text</TabsTrigger>
                <TabsTrigger value="entities">Entities</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {ocrResult.ocrResults.confidence}%
                    </div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {ocrResult.ocrResults.language.toUpperCase()}
                    </div>
                    <p className="text-sm text-muted-foreground">Language</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {ocrResult.ocrResults.metadata.processingTime}ms
                    </div>
                    <p className="text-sm text-muted-foreground">Processing Time</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold capitalize">
                      {ocrResult.ocrResults.metadata.imageQuality}
                    </div>
                    <p className="text-sm text-muted-foreground">Image Quality</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Preprocessing Applied:</h4>
                  <div className="flex flex-wrap gap-2">
                    {ocrResult.ocrResults.metadata.preprocessingApplied.map((step, index) => (
                      <Badge key={index} variant="outline">
                        {step.replace(/-/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Extracted Text</h4>
                    <Badge>
                      {ocrResult.ocrResults.text.split(' ').length} words
                    </Badge>
                  </div>
                  <div className="text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {ocrResult.ocrResults.text || 'No text extracted'}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="entities" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(ocrResult.ocrResults.entities).map(([key, values]) => {
                    if (!values || values.length === 0) return null;
                    
                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h5>
                        <div className="space-y-1">
                          {values.map((value: string, index: number) => (
                            <Badge key={index} variant="secondary" className="mr-1 mb-1">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">Document Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Document ID:</span>
                        <span className="font-mono">{ocrResult.documentId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Name:</span>
                        <span>{ocrResult.originalFileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Type:</span>
                        <span>{ocrResult.fileType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span>{(ocrResult.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">Processing Details</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>OCR Method:</span>
                        <span>{ocrResult.ocrResults.metadata.ocrMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Time:</span>
                        <span>{ocrResult.ocrResults.metadata.processingTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image Quality:</span>
                        <span className="capitalize">{ocrResult.ocrResults.metadata.imageQuality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Language Detected:</span>
                        <span>{ocrResult.ocrResults.language}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}