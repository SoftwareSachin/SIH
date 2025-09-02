import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertCircle, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function DecisionSupportPanel() {
  const [, setLocation] = useLocation();

  // Get latest schemes and recommendations
  const { data: schemes } = useQuery({
    queryKey: ["/api/dss/schemes"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get a sample village for demonstration
  const { data: villages } = useQuery({
    queryKey: ["/api/geo/villages/all"],
    select: (data: any) => data?.slice?.(0, 3), // Get first 3 villages for quick preview
  });

  const sampleVillage = villages?.[0];

  const { data: sampleRecommendations } = useQuery({
    queryKey: ["/api/dss/village-recommendations", sampleVillage?.id],
    enabled: !!sampleVillage?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    } else {
      return `₹${amount.toLocaleString()}`;
    }
  };

  // Helper function to get priority badge styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return { className: 'bg-red-100 text-red-800', text: 'High Priority' };
      case 'medium':
        return { className: 'bg-yellow-100 text-yellow-800', text: 'Medium Priority' };
      case 'low':
        return { className: 'bg-green-100 text-green-800', text: 'Low Priority' };
      default:
        return { className: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    }
  };

  const topRecommendations = (sampleRecommendations as any)?.recommendations?.slice?.(0, 3) || [];

  return (
    <Card className="border border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">Decision Support Recommendations</CardTitle>
        <p className="text-xs text-muted-foreground">
          Real government scheme recommendations based on FRA claims analysis
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {topRecommendations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Loading recommendations...</p>
            <p className="text-xs mt-1">Analyzing claims and scheme eligibility</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topRecommendations.map((rec: any, index: number) => {
              const priorityBadge = getPriorityBadge(rec.priority);
              return (
                <div key={index} className="border border-border rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 ${rec.priority === 'high' ? 'bg-red-100' : rec.priority === 'medium' ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex-shrink-0`}>
                      {rec.priority === 'high' ? (
                        <AlertCircle className={`h-4 w-4 ${rec.priority === 'high' ? 'text-red-600' : 'text-blue-600'}`} />
                      ) : (
                        <TrendingUp className={`h-4 w-4 ${rec.priority === 'medium' ? 'text-blue-600' : 'text-green-600'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{rec.schemeName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <Badge className={`${priorityBadge.className} text-xs`}>
                          {priorityBadge.text}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(rec.estimatedBenefit)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground">
                          Eligibility: {rec.eligibilityScore}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Summary Stats */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Schemes Available:</span>
                <span className="font-medium">{schemes?.length ?? 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-muted-foreground">Sample Village:</span>
                <span className="font-medium">{sampleVillage?.name || 'Loading...'}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-muted-foreground">Total Benefit Potential:</span>
                <span className="font-medium">
                  {sampleRecommendations?.totalBenefit ? formatCurrency(sampleRecommendations.totalBenefit) : 'Calculating...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t border-border">
        <Button 
          className="w-full" 
          data-testid="button-full-report"
          onClick={() => setLocation('/decision-support')}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Full DSS Analysis
        </Button>
      </div>
    </Card>
  );
}
