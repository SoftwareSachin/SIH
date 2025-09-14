import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Download, Filter, ExternalLink, FileText, AlertCircle } from "lucide-react";

interface Village {
  id: string;
  name: string;
  code?: string;
  districtId: string;
  latitude: string;
  longitude: string;
  population?: number;
  tribalPopulation?: number;
}

interface Analytics {
  totalRecommendations: number;
  implementationRate: number;
  totalBudgetImpact: string;
  implementedRecommendations: number;
  lastUpdated: string;
}

export default function DecisionSupport() {
  const [selectedVillage, setSelectedVillage] = useState<string>('');

  const { data: villages = [], isLoading: villagesLoading, error: villagesError } = useQuery<Village[]>({
    queryKey: ["/api/geo/villages/all"],
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<any>({
    queryKey: ["/api/dss/village-recommendations", selectedVillage],
    queryFn: () => fetch(`/api/dss/village-recommendations/${selectedVillage}`).then(res => res.json()),
    enabled: !!selectedVillage,
  });

  const { data: schemes = [] } = useQuery<any[]>({
    queryKey: ["/api/dss/schemes"],
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/dss/analytics"],
  });

  const { data: eligibilityMatrix } = useQuery<any>({
    queryKey: ["/api/dss/eligibility-matrix", selectedVillage],
    enabled: !!selectedVillage,
  });

  // Helper function to get priority badge styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return { variant: 'destructive' as const, text: 'High Priority' };
      case 'medium':
        return { variant: 'secondary' as const, text: 'Medium Priority' };
      case 'low':
        return { variant: 'outline' as const, text: 'Low Priority' };
      default:
        return { variant: 'outline' as const, text: 'Unknown' };
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(1)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)} L`;
    } else {
      return `₹${num.toLocaleString()}`;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="p-6 overflow-y-auto h-full pb-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Decision Support System</h1>
              <p className="text-muted-foreground">
                AI-powered recommendations for scheme eligibility and interventions
              </p>
            </div>
            <Button data-testid="button-generate-report">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          <Tabs defaultValue="recommendations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="eligibility">Eligibility Matrix</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-6">
              {/* Village Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Select Village for Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {villagesLoading ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading villages...
                    </div>
                  ) : villagesError ? (
                    <div className="text-center py-4 text-red-500">
                      Error loading villages: {villagesError.message}
                    </div>
                  ) : villages.length === 0 ? (
                    <div className="text-center py-4 text-yellow-600">
                      No villages found. Please check the database.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {villages.length} villages available for analysis
                      </p>
                      <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                        <SelectTrigger className="w-full border-2 border-blue-200 focus:border-blue-400">
                          <SelectValue placeholder="Click here to select a village" />
                        </SelectTrigger>
                        <SelectContent>
                          {villages.map((village: Village) => (
                            <SelectItem key={village.id} value={village.id}>
                              {village.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedVillage && recommendations && (
                <div className="space-y-6">
                  {/* Scheme Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Scheme Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recommendations?.recommendations?.length > 0 ? (
                        <div className="space-y-4">
                          {recommendations.recommendations.map((rec: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium">{rec.schemeName}</h4>
                                  <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                                </div>
                                <Badge {...getPriorityBadge(rec.priority)}>{getPriorityBadge(rec.priority).text}</Badge>
                              </div>
                              <div className="text-sm text-green-600 font-medium">
                                Estimated Benefit: ₹{rec.estimatedBenefit?.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No recommendations available for this village</p>
                          <p className="text-sm">The system could not generate recommendations for this location</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Implementation Roadmap */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Implementation Roadmap</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">1</div>
                          <div>
                            <h4 className="font-medium">Immediate Actions (0-3 months)</h4>
                            <p className="text-sm text-muted-foreground">Complete FRA verification, initiate Jal Jeevan Mission survey</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-medium">2</div>
                          <div>
                            <h4 className="font-medium">Short-term Goals (3-12 months)</h4>
                            <p className="text-sm text-muted-foreground">PM-KISAN enrollment, MGNREGA job card distribution</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-yellow-600 text-white rounded-full text-sm font-medium">3</div>
                          <div>
                            <h4 className="font-medium">Long-term Development (1-3 years)</h4>
                            <p className="text-sm text-muted-foreground">Infrastructure development, skill training programs</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedVillage && recommendationsLoading && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                      <p>Loading recommendations...</p>
                      <p className="text-sm">Analyzing village data for {villages.find(v => v.id === selectedVillage)?.name}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="eligibility" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Matrix</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Detailed analysis of scheme eligibility for the selected village
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedVillage && eligibilityMatrix ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {eligibilityMatrix?.totalClaims || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Claims</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {eligibilityMatrix?.verifiedClaims || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">Verified Claims</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {eligibilityMatrix?.schemes?.length || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">Eligible Schemes</p>
                        </div>
                      </div>

                      {/* Eligibility Table */}
                      <div className="border rounded-lg">
                        <table className="w-full">
                          <thead className="bg-muted dark:bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium">Scheme</th>
                              <th className="px-4 py-3 text-left text-sm font-medium">Eligibility</th>
                              <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                              <th className="px-4 py-3 text-left text-sm font-medium">Action Required</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {schemes.map((scheme: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm font-medium">{scheme.name}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant="secondary">Eligible</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">85%</td>
                                <td className="px-4 py-3 text-sm text-blue-600">
                                  <Button variant="link" className="h-auto p-0">
                                    Apply Now
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : selectedVillage ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading eligibility matrix...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a village to view eligibility matrix</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.totalRecommendations || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleDateString() : 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Implementation Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.implementationRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.implementedRecommendations || 0} of {analytics?.totalRecommendations || 0} implemented
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Budget Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analytics?.totalBudgetImpact || 0)}</div>
                    <p className="text-xs text-muted-foreground">
                      Total estimated benefits
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Scheme Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Performance charts and analytics</p>
                      <p className="text-sm">Integration with chart library required</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}