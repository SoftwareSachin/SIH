import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Droplets, Sprout, Briefcase } from "lucide-react";

export default function DecisionSupportPanel() {
  const recommendations = [
    {
      title: "Water Infrastructure Priority",
      description: "23 villages eligible for Jal Jeevan Mission",
      priority: "High Priority",
      budget: "₹4.2Cr budget required",
      icon: Droplets,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      priorityBg: "bg-red-100",
      priorityColor: "text-red-800"
    },
    {
      title: "Agricultural Support",
      description: "156 farmers eligible for PM-KISAN",
      priority: "Medium Priority", 
      budget: "₹9.36L annual disbursement",
      icon: Sprout,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      priorityBg: "bg-yellow-100",
      priorityColor: "text-yellow-800"
    },
    {
      title: "Employment Generation",
      description: "89 households eligible for MGNREGA",
      priority: "Low Priority",
      budget: "2,340 person-days estimated",
      icon: Briefcase,
      bgColor: "bg-yellow-100", 
      iconColor: "text-yellow-600",
      priorityBg: "bg-gray-100",
      priorityColor: "text-gray-800"
    }
  ];

  return (
    <Card className="border border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">Decision Support Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
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
      </CardContent>
      <div className="p-4 border-t border-border">
        <Button className="w-full" data-testid="button-full-report">
          Generate Full Report
        </Button>
      </div>
    </Card>
  );
}
