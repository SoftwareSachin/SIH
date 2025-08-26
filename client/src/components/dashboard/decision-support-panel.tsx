import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

export default function DecisionSupportPanel() {
  // Real recommendations would come from DSS API - no mock data
  const recommendations: any[] = [];

  return (
    <Card className="border border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">Decision Support Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {recommendations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No recommendations available</p>
            <p className="text-xs mt-1">Process more claims to generate insights</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="border border-border rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 ${rec.bgColor} rounded-full flex-shrink-0`}>
                    <rec.icon className={`h-4 w-4 ${rec.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <Badge className={`${rec.priorityBg} ${rec.priorityColor} text-xs`}>
                        {rec.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{rec.budget}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t border-border">
        <Button className="w-full" data-testid="button-full-report">
          Generate Full Report
        </Button>
      </div>
    </Card>
  );
}
