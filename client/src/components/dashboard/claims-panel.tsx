import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export default function ClaimsPanel() {
  const { toast } = useToast();

  const { data: claims, isLoading, error } = useQuery({
    queryKey: ["/api/claims"],
    retry: false,
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "Please log in to view claims.",
      variant: "destructive",
    });
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-accent/10 text-accent">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'under_review':
        return <Badge className="bg-red-100 text-red-800">Review</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold">Recent Claims</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : (claims as any)?.data && (claims as any).data.length > 0 ? (
          (claims as any).data.slice(0, 3).map((claim: any) => (
            <div key={claim.id} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-foreground">
                    {claim.claimantName || 'Unknown Claimant'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Village: {claim.village?.name || 'Unknown Village'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Area: {claim.area ? `${claim.area} acres` : 'Not specified'}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {getStatusBadge(claim.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">{claim.claimType}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  AI Confidence: {claim.aiConfidence || 'N/A'}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent claims found</p>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full text-primary hover:text-primary/80"
          data-testid="button-view-all-claims"
        >
          View All Claims →
        </Button>
      </div>
    </Card>
  );
}
