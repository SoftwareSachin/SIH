import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Settings, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";

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
        // Handle nested results structure for FRA API response
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
      {/* Service Health Status */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">OCR Service Health</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Document processing service status</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testOCRService}
              disabled={isProcessing}
              className="h-9 px-4"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Service Online</span>
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Multi-language processing enabled</div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">FRA document optimized</div>
          </div>
        </CardContent>
      </Card>

      {/* Document Processing */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Document Processing</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload and analyze documents with OCR</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="document-upload" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Document
              </label>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <Input
                    id="document-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="h-10"
                  />
                </div>
                <Button 
                  onClick={processDocument}
                  disabled={!selectedFile || isProcessing}
                  className="h-10"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Start Processing
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported formats: PDF, PNG, JPG, JPEG • Maximum file size: 10MB
              </p>
            </div>

            {/* Processing Progress */}
            {isProcessing && uploadProgress > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Processing document</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Analyzing content and extracting text...
                </p>
              </div>
            )}

            {/* File Information */}
            {selectedFile && !isProcessing && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                      <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedFile.type.split('/')[1].toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Results */}
      {ocrResult && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                {ocrResult.error ? (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {ocrResult.serviceTest ? 'Service Diagnostics' : 'Processing Results'}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {ocrResult.error ? 'Processing failed' : 'Analysis completed successfully'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {ocrResult.error ? (
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Processing Error</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">{ocrResult.error}</p>
                  </div>
                </div>
              </div>
            ) : ocrResult.serviceTest ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                      <Badge variant={ocrResult.status === 'healthy' ? 'default' : 'destructive'}>
                        {ocrResult.status || 'Unknown'}
                      </Badge>
                    </div>
                    {ocrResult.workersActive && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Workers</span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium">{ocrResult.workersActive}</span>
                      </div>
                    )}
                  </div>
                  {ocrResult.capabilities && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Capabilities</span>
                      <div className="flex flex-wrap gap-2">
                        {ocrResult.capabilities.map((cap: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Processing Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      Analysis Summary
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Score</span>
                        <Badge variant={(ocrResult.confidence || 0) > 80 ? 'default' : (ocrResult.confidence || 0) > 60 ? 'secondary' : 'destructive'}>
                          {ocrResult.confidence !== undefined && ocrResult.confidence !== null && !isNaN(Number(ocrResult.confidence))
                            ? `${Math.round(Number(ocrResult.confidence))}%`
                            : '—'}
                        </Badge>
                      </div>
                      {ocrResult.language && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Language</span>
                          <Badge variant="outline">{ocrResult.language}</Badge>
                        </div>
                      )}
                      {ocrResult.metadata?.processingTime && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Processing Time</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {ocrResult.metadata.processingTime}ms
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extracted Entities */}
                  {ocrResult.entities && Object.keys(ocrResult.entities).length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                        Extracted Data
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(ocrResult.entities).slice(0, 6).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Full Text Output */}
                {ocrResult.text && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                      Extracted Text
                    </h4>
                    <Textarea
                      value={ocrResult.text}
                      readOnly
                      className="min-h-[200px] font-mono text-sm bg-gray-50 dark:bg-gray-900"
                      placeholder="No text content extracted"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}