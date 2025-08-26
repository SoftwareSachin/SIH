import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Brain, Home, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  stats?: {
    totalClaims: number;
    verifiedClaims: number;
    aiProcessing: number;
    activeVillages: number;
  };
  isLoading: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Claims",
      value: stats?.totalClaims || 0,
      icon: FileText,
      bgColor: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      title: "Verified Claims", 
      value: stats?.verifiedClaims || 0,
      icon: CheckCircle,
      bgColor: "bg-accent/10",
      iconColor: "text-accent"
    },
    {
      title: "AI Processing",
      value: stats?.aiProcessing || 0,
      icon: Brain,
      bgColor: "bg-secondary/50",
      iconColor: "text-secondary-foreground"
    },
    {
      title: "Active Villages",
      value: stats?.activeVillages || 0,
      icon: Home,
      bgColor: "bg-accent/10",
      iconColor: "text-accent"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground" data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-full`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
