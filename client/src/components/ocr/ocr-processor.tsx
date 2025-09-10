import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Brain, Eye, RefreshCw } from "lucide-react";

export default function OCRProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOcrResult(null);
    }
  };

  const processDocument = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', 'individual_forest_rights');
      formData.append('state', 'all_states');

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Use enhanced FRA processing endpoint
      const response = await fetch('/api/fra/process', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        // FIX: Handle nested results structure for FRA API response
        if (result.results) {
          // Flatten the results structure for the UI
          setOcrResult({
            ...result.results,
            originalFileName: result.originalFileName,
            documentType: result.documentType,
            state: result.state,
            fileSize: result.fileSize,
            success: result.success
          });
        } else {
          setOcrResult(result);
        }
      } else {
        const errorResult = await response.json();
        console.error('FRA OCR processing failed:', errorResult);
        setOcrResult({
          error: errorResult.message || 'FRA OCR processing failed. Please try again.',
          text: '',
          confidence: 0
        });
      }
    } catch (error) {
      console.error('Error processing FRA document:', error);
      setOcrResult({
        error: 'Network error. Please check your connection.',
        text: '',
        confidence: 0
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const testOCRService = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/test/ocr/health');
      const result = await response.json();
      setOcrResult({
        serviceTest: true,
        ...result
      });
    } catch (error) {
      setOcrResult({
        serviceTest: true,
        error: 'Failed to connect to OCR service',
        status: 'unhealthy'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Real OCR Testing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">OCR Service Status</p>
                <p className="text-xs text-muted-foreground">Real-time FRA document processing</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testOCRService}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test Service
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label htmlFor="document-upload" className="text-sm font-medium mb-2 block">
                Upload Document for OCR Testing
              </label>
              <div className="flex items-center space-x-4">
                <Input
                  id="document-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button 
                  onClick={processDocument}
                  disabled={!selectedFile || isProcessing}
                  className="min-w-[120px]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Process OCR
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Upload Progress */}
            {isProcessing && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing document...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Selected File Info */}
            {selectedFile && (
              <div className="p-3 bg-accent/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <Badge variant="secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* OCR Results */}
          {ocrResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {ocrResult.serviceTest ? 'Service Test Results' : 'OCR Results'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ocrResult.error ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-200 text-sm">{ocrResult.error}</p>
                  </div>
                ) : ocrResult.serviceTest ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Service Status:</span>
                      <Badge variant={ocrResult.status === 'healthy' ? 'default' : 'destructive'}>
                        {ocrResult.status || 'Unknown'}
                      </Badge>
                    </div>
                    {ocrResult.workersActive && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Active Workers:</span>
                        <span className="text-sm">{ocrResult.workersActive}</span>
                      </div>
                    )}
                    {ocrResult.capabilities && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Capabilities:</span>
                        <div className="flex flex-wrap gap-2">
                          {ocrResult.capabilities.map((cap: string, idx: number) => (
                            <Badge key={idx} variant="outline">{cap}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Confidence Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence Score:</span>
                      <Badge variant={(ocrResult.confidence || 0) > 80 ? 'default' : (ocrResult.confidence || 0) > 60 ? 'secondary' : 'destructive'}>
                        {ocrResult.confidence !== undefined && ocrResult.confidence !== null && !isNaN(ocrResult.confidence) && ocrResult.confidence > 0
                          ? `${Math.round(ocrResult.confidence)}%` 
                          : ocrResult.confidence === 0 
                            ? '0%' 
                            : 'Processing...'}
                      </Badge>
                    </div>

                    {/* Language Detection */}
                    {ocrResult.language && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Detected Language:</span>
                        <Badge variant="outline">{ocrResult.language}</Badge>
                      </div>
                    )}

                    {/* Extracted Text */}
                    {ocrResult.text && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Extracted Text:</label>
                        <Textarea
                          value={ocrResult.text}
                          readOnly
                          className="min-h-[200px] font-mono text-sm"
                          placeholder="No text extracted"
                        />
                      </div>
                    )}

                    {/* Entities */}
                    {ocrResult.entities && Object.keys(ocrResult.entities).length > 0 && (
                      <div className="space-y-3">
                        <span className="text-sm font-medium">Extracted Entities:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(ocrResult.entities).map(([key, value]: [string, any]) => (
                            <div key={key} className="p-3 bg-muted rounded-lg">
                              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm font-medium mt-1">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Processing Metadata */}
                    {ocrResult.metadata && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Processing Details:</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {ocrResult.metadata.processingTime && (
                            <div>Processing Time: {ocrResult.metadata.processingTime}ms</div>
                          )}
                          {ocrResult.metadata.ocrMethod && (
                            <div>OCR Method: {ocrResult.metadata.ocrMethod}</div>
                          )}
                          {ocrResult.metadata.imageQuality && (
                            <div>Image Quality: {ocrResult.metadata.imageQuality}</div>
                          )}
                          {ocrResult.metadata.pageCount && (
                            <div>Pages: {ocrResult.metadata.pageCount}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}