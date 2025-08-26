import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ClaimsTableProps {
  showHeader?: boolean;
}

export default function ClaimsTable({ showHeader = true }: ClaimsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: claims, isLoading, error } = useQuery({
    queryKey: ["/api/claims", { page: currentPage, status: statusFilter === 'all' ? undefined : statusFilter, claimType: typeFilter === 'all' ? undefined : typeFilter }],
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ claimId, status, notes }: { claimId: string; status: string; notes?: string }) => {
      return apiRequest('PATCH', `/api/claims/${claimId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      toast({
        title: "Success",
        description: "Claim status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to update claim status.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update claim status",
          variant: "destructive",
        });
      }
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-accent/10 text-accent">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'under_review':
        return <Badge className="bg-red-100 text-red-800">Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IFR':
        return <Badge className="bg-blue-100 text-blue-800">IFR</Badge>;
      case 'CFR':
        return <Badge className="bg-green-100 text-green-800">CFR</Badge>;
      case 'CR':
        return <Badge className="bg-purple-100 text-purple-800">CR</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (error && isUnauthorizedError(error as Error)) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to view claims.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      {showHeader && (
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Claims Management</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="IFR">IFR</SelectItem>
                  <SelectItem value="CFR">CFR</SelectItem>
                  <SelectItem value="CR">CR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="text-sm font-medium text-muted-foreground">Claim ID</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">Claimant</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">Village</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">Type</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">Area</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">AI Score</TableHead>
              <TableHead className="text-sm font-medium text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : (claims as any)?.data && (claims as any).data.length > 0 ? (
              (claims as any).data.map((claim: any) => (
                <TableRow key={claim.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    {claim.claimId || claim.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {claim.claimantName || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {claim.village?.name || 'Unknown Village'}
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(claim.claimType)}
                  </TableCell>
                  <TableCell>
                    {claim.area ? `${claim.area} acres` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(claim.status)}
                  </TableCell>
                  <TableCell>
                    {claim.aiConfidence ? `${claim.aiConfidence}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-view-${claim.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-edit-${claim.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">No claims found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {claims?.pagination && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * 10) + 1}-{Math.min(currentPage * 10, claims.pagination.total)} of {claims.pagination.total} claims
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              data-testid="button-previous-page"
            >
              Previous
            </Button>
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(1)}
            >
              1
            </Button>
            {claims.pagination.pages > 1 && (
              <>
                <Button
                  variant={currentPage === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(2)}
                >
                  2
                </Button>
                {claims.pagination.pages > 2 && (
                  <Button
                    variant={currentPage === 3 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(3)}
                  >
                    3
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= (claims.pagination.pages || 1)}
              onClick={() => setCurrentPage(currentPage + 1)}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
