import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VerificationWorkflow } from '@/components/verification/verification-workflow';
import { useQuery } from '@tanstack/react-query';
import { Search, FileCheck, Clock, CheckCircle, ArrowLeft, Shield, FileText } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section with Back Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center gap-2 hover:bg-blue-50 border-blue-200 text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Verification Workflow & Audit Trails</h1>
                </div>
                <p className="text-gray-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Standardized claim verification process with complete audit trail tracking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card data-testid="card-search-claim" className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Search className="h-5 w-5 text-blue-600" />
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
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button 
                onClick={handleSearchClaim} 
                data-testid="button-search-claim"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Claims List */}
        {!selectedClaimId && (
          <Card data-testid="card-claims-list" className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-800">Recent Claims Requiring Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Clock className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading claims...</span>
                </div>
              ) : claimsData?.length > 0 ? (
                <div className="space-y-3">
                  {claimsData.slice(0, 10).map((claim: any) => (
                    <div 
                      key={claim.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => handleSelectClaim(claim.id)}
                      data-testid={`claim-item-${claim.claimId}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{claim.claimId}</div>
                        <div className="text-sm text-gray-600">
                          {claim.claimantName} • {claim.village?.name}
                        </div>
                        <div className="text-xs text-gray-500">
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
                          className="hover:bg-blue-50 border-blue-200 text-blue-600"
                        >
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
                className="hover:bg-blue-50 border-blue-200 text-blue-600"
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