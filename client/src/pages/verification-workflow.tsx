import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VerificationWorkflow } from '@/components/verification/verification-workflow';
import { useQuery } from '@tanstack/react-query';
import { Search, FileCheck, Clock, CheckCircle } from 'lucide-react';

export function VerificationWorkflowPage() {
  const [location, setLocation] = useLocation();
  const [searchClaimId, setSearchClaimId] = useState('');

  // Get query parameter for claim ID from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const selectedClaimId = urlParams.get('claimId') || '';

  // Fetch all claims with workflow status
  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['/api/claims'],
    select: (data: any) => data?.data || []
  });

  const handleSearchClaim = () => {
    if (searchClaimId.trim()) {
      setLocation(`/verification-workflow?claimId=${encodeURIComponent(searchClaimId.trim())}`);
    }
  };

  const handleSelectClaim = (claimId: string) => {
    setLocation(`/verification-workflow?claimId=${encodeURIComponent(claimId)}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verification Workflow & Audit Trails</h1>
          <p className="text-gray-600 mt-1">
            Standardized claim verification process with complete audit trail tracking
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card data-testid="card-search-claim">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
            <Button onClick={handleSearchClaim} data-testid="button-search-claim">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      {!selectedClaimId && (
        <Card data-testid="card-claims-list">
          <CardHeader>
            <CardTitle>Recent Claims Requiring Verification</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Clock className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading claims...</span>
              </div>
            ) : claimsData?.length > 0 ? (
              <div className="space-y-3">
                {claimsData.slice(0, 10).map((claim: any) => (
                  <div 
                    key={claim.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectClaim(claim.id)}
                    data-testid={`claim-item-${claim.claimId}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{claim.claimId}</div>
                      <div className="text-sm text-gray-600">
                        {claim.claimantName} • {claim.village?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Type: {claim.claimType} • Area: {claim.area} acres
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(claim.status)}>
                        {claim.status}
                      </Badge>
                      <Button variant="outline" size="sm" data-testid={`button-verify-${claim.claimId}`}>
                        Start Verification
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
  );
}

// Helper function for status colors
function getStatusColor(status: string) {
  switch (status) {
    case 'verified':
    case 'approved': 
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'under_review': 
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'rejected': 
      return 'bg-red-100 text-red-800 border-red-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}