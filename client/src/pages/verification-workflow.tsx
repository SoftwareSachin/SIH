import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VerificationWorkflow } from '@/components/verification/verification-workflow';
import { useQuery } from '@tanstack/react-query';
import { Search, FileCheck, Clock, CheckCircle, Shield, FileText } from 'lucide-react';
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";

export function VerificationWorkflowPage() {
  const [location, setLocation] = useLocation();
  const [searchClaimId, setSearchClaimId] = useState('');
  const params = useParams();

  // Get claimId from path parameter
  const selectedClaimId = params.claimId || '';

  // Fetch all claims with workflow status
  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['/api/claims'],
    select: (data: any) => data?.data || []
  });

  const handleSearchClaim = () => {
    if (searchClaimId.trim()) {
      setLocation(`/verification-workflow/${encodeURIComponent(searchClaimId.trim())}`);
    }
  };

  const handleSelectClaim = (claimId: string) => {
    setLocation(`/verification-workflow/${encodeURIComponent(claimId)}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Header Section */}
          <div className="bg-card dark:bg-card rounded-lg shadow-sm border border-border p-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-10 h-10 bg-muted dark:bg-muted border border-border rounded-lg">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Verification Workflow & Audit Trails</h1>
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Standardized claim verification process with complete audit trail tracking
              </p>
            </div>
          </div>

        {/* Search Section */}
        <Card data-testid="card-search-claim" className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Search className="h-5 w-5" />
              Search Claim for Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Claim ID (e.g., FRA-MP-001247)"
                value={searchClaimId}
                onChange={(e) => setSearchClaimId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchClaim()}
                data-testid="input-search-claim"
              />
              <Button 
                onClick={handleSearchClaim} 
                data-testid="button-search-claim"
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Claims List */}
        {!selectedClaimId && (
          <Card data-testid="card-claims-list" className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Claims Requiring Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Clock className="h-8 w-8 animate-spin" />
                  <span className="ml-2 text-muted-foreground">Loading claims...</span>
                </div>
              ) : claimsData?.length > 0 ? (
                <div className="space-y-3">
                  {claimsData.slice(0, 10).map((claim: any) => (
                    <div 
                      key={claim.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleSelectClaim(claim.id)}
                      data-testid={`claim-item-${claim.claimId}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{claim.claimId}</div>
                        <div className="text-sm text-muted-foreground">
                          {claim.claimantName} • {claim.village?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Type: {claim.claimType} • Area: {claim.area} acres
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(claim.status)}>
                          {claim.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectClaim(claim.id);
                          }}
                          data-testid={`button-verify-${claim.claimId}`}
                        >
                          Start Verification
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <FileCheck className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Claims Found</h3>
                  <p>No claims available for verification at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Claim Verification */}
        {selectedClaimId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/verification-workflow')}
                data-testid="button-back-to-list"
              >
                ← Back to Claims List
              </Button>
              <Badge variant="secondary" data-testid="badge-selected-claim">
                Claim ID: {selectedClaimId}
              </Badge>
            </div>
            
            <VerificationWorkflow claimId={selectedClaimId} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// Helper function for status colors
function getStatusColor(status: string) {
  switch (status) {
    case 'verified':
    case 'approved': 
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    case 'pending': 
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
    case 'under_review': 
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    case 'rejected': 
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
    default: 
      return 'bg-muted text-muted-foreground border-border';
  }
}