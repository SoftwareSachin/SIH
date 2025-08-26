import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, FileText, Image, X, CheckCircle, AlertCircle } from "lucide-react";

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  claimId?: string;
  result?: any;
}

export default function DocumentUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: claims } = useQuery({
    queryKey: ["/api/claims", { limit: 100 }],
  });

  const uploadMutation = useMutation({
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
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      setFiles(prev => prev.map(f => 
        f.file === variables.file 
          ? { ...f, status: 'completed', result }
          : f
      ));
      queryClient.invalidateQueries({ queryKey: ["/api/ai/processing-status"] });
      toast({
        title: "Success",
        description: "Document uploaded and processing started",
      });
    },
    onError: (error, variables) => {
      setFiles(prev => prev.map(f => 
        f.file === variables.file 
          ? { ...f, status: 'error' }
          : f
      ));
      
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to upload documents.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to upload document",
          variant: "destructive",
        });
      }
    },
  });

  const handleFileSelect = useCallback((newFiles: FileList | null) => {
    if (!newFiles || !selectedClaimId) {
      if (!selectedClaimId) {
        toast({
          title: "No Claim Selected",
          description: "Please select a claim before uploading documents.",
          variant: "destructive",
        });
      }
      return;
    }

    const validFiles = Array.from(newFiles).filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a supported file type. Please upload PDF or image files.`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB. Please upload a smaller file.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    const uploadFiles = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
      claimId: selectedClaimId,
    }));

    setFiles(prev => [...prev, ...uploadFiles]);

    // Start uploads
    uploadFiles.forEach(uploadFile => {
      uploadMutation.mutate({ 
        file: uploadFile.file, 
        claimId: selectedClaimId 
      });
    });
  }, [selectedClaimId, uploadMutation, toast]);

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

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove));
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <Image className="h-8 w-8 text-blue-500" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Claim Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Claim *
            </label>
            <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
              <SelectTrigger data-testid="select-claim">
                <SelectValue placeholder="Select a claim to upload documents for" />
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

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drop files here or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, JPEG, PNG, TIFF files up to 10MB
              </p>
            </div>
            <Input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              data-testid="input-file"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={!selectedClaimId}
              data-testid="button-select-files"
            >
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((uploadFile, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getFileIcon(uploadFile.file)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {uploadFile.file.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {uploadFile.result && uploadFile.result.ocrResults && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {uploadFile.result.ocrResults.confidence}% confidence
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {uploadFile.result.ocrResults.language}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {uploadFile.result.ocrResults.metadata.processingTime}ms
                              </Badge>
                            </div>
                            {uploadFile.result.ocrResults.entities && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(uploadFile.result.ocrResults.entities).map(([key, values]) => {
                                  if (!values || !Array.isArray(values) || values.length === 0) return null;
                                  return (
                                    <Badge key={key} variant="secondary" className="text-xs">
                                      {key}: {values.length}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(uploadFile.status)}
                      {getStatusBadge(uploadFile.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.file)}
                        data-testid={`button-remove-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-3">
                      <Progress value={uploadFile.progress} className="w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
