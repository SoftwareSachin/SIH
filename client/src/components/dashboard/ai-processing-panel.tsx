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

  const processingSteps = [
    {
      name: "OCR Processing",
      description: "Document digitization",
      icon: Scan,
      processed: (processingStatus as any)?.totalProcessed || 142,
      total: (processingStatus as any)?.totalProcessed + (processingStatus as any)?.ocrQueue || 167,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      progressColor: "bg-primary"
    },
    {
      name: "NER Extraction", 
      description: "Entity recognition",
      icon: Brain,
      processed: 98,
      total: 142,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
      progressColor: "bg-accent"
    },
    {
      name: "Asset Detection",
      description: "Land-use classification", 
      icon: Satellite,
      processed: 67,
      total: 98,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      progressColor: "bg-blue-600"
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
                  <div className={`w-4 h-2 ${step.progressColor} rounded-full`}
                    style={{ 
                      width: `${Math.round((step.processed / step.total) * 100)}%`,
                      minWidth: '4px'
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
