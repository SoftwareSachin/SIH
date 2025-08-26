import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Scan, Brain, Satellite } from "lucide-react";

export default function AIProcessingPanel() {
  const { data: processingStatus, isLoading } = useQuery({
    queryKey: ["/api/ai/processing-status"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: ocrHealth } = useQuery({
    queryKey: ["/api/test/ocr/health"],
    refetchInterval: 30000, // Check health every 30 seconds
  });

  const processingSteps = [
    {
      name: "OCR Processing",
      description: `${ocrHealth?.workersActive || 0}/${ocrHealth?.totalWorkers || 0} workers active`,
      icon: Scan,
      processed: (processingStatus as any)?.totalProcessed || 0,
      total: Math.max((processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 1, 1),
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      progressColor: "bg-primary",
      status: ocrHealth?.status || 'unknown'
    },
    {
      name: "NER Extraction", 
      description: "Entity recognition",
      icon: Brain,
      processed: (processingStatus as any)?.nerProcessed || 0,
      total: Math.max((processingStatus as any)?.nerQueue + (processingStatus as any)?.nerProcessed || 1, 1),
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
      progressColor: "bg-accent",
      status: 'active'
    },
    {
      name: "Asset Detection",
      description: "Satellite analysis", 
      icon: Satellite,
      processed: (processingStatus as any)?.assetDetectionProcessed || 0,
      total: Math.max((processingStatus as any)?.assetDetectionQueue + (processingStatus as any)?.assetDetectionProcessed || 1, 1),
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      progressColor: "bg-blue-600",
      status: 'active'
    }
  ];

  return (
    <Card className="border border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">AI Processing Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {processingSteps.map((step, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 ${step.bgColor} rounded-full`}>
                  <step.icon className={`h-4 w-4 ${step.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              <div className="text-right flex items-center space-x-4">
                <div>
                  {isLoading ? (
                    <Skeleton className="h-4 w-12 mb-1" />
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {step.processed}/{step.total}
                    </p>
                  )}
                  {isLoading ? (
                    <Skeleton className="h-2 w-20" />
                  ) : (
                    <Progress 
                      value={Math.round((step.processed / step.total) * 100)} 
                      className="w-20"
                    />
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <div className={`flex items-center space-x-1`}>
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        step.status === 'healthy' ? 'bg-green-500' : 
                        step.status === 'degraded' ? 'bg-yellow-500' : 
                        step.status === 'active' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} 
                    />
                    <span className="text-xs font-medium">
                      {Math.round((step.processed / step.total) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
