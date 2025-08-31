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

export default function DecisionSupport() {
  const [selectedVillage, setSelectedVillage] = useState<string>('');

  const { data: villages } = useQuery({
    queryKey: ["/api/geo/villages/all"],
  });

  const { data: recommendations } = useQuery({
    queryKey: ["/api/dss/village-recommendations", selectedVillage],
    enabled: !!selectedVillage,
  });

  const { data: schemes } = useQuery({
    queryKey: ["/api/dss/schemes"],
  });

  const { data: eligibilityMatrix } = useQuery({
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
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    } else {
      return `₹${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <TopBar />
        
        <div className="p-6 overflow-y-auto h-full">
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
                  <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a village to generate recommendations" />
                    </SelectTrigger>
                    <SelectContent>
                      {villages?.map((village: any) => (
                        <SelectItem key={village.id} value={village.id}>
                          {village.name}
                          {village.district && `, ${village.district.name}`}
                          {village.district?.state && `, ${village.district.state.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedVillage && recommendations && (
                <div className="space-y-6">
                  {/* Scheme Recommendations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {recommendations.recommendations?.filter((rec: any) => rec.priority === 'high').length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">High Priority Interventions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {recommendations.recommendations
                            .filter((rec: any) => rec.priority === 'high')
                            .map((rec: any, index: number) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-red-100 rounded-full">
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium">{rec.schemeName}</h4>
                                      <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                                    </div>
                                  </div>
                                  <Badge {...getPriorityBadge(rec.priority)}>{getPriorityBadge(rec.priority).text}</Badge>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Eligibility Score:</span>
                                    <span className="font-medium">{rec.eligibilityScore}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Estimated Benefit:</span>
                                    <span className="font-medium">{formatCurrency(rec.estimatedBenefit)}</span>
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-2">Required Documents:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {rec.requirements?.slice(0, 3).map((req: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {req}
                                        </Badge>
                                      ))}
                                      {rec.requirements?.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{rec.requirements.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    )}

                    {recommendations.recommendations?.filter((rec: any) => rec.priority === 'medium').length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Medium Priority Interventions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {recommendations.recommendations
                            .filter((rec: any) => rec.priority === 'medium')
                            .map((rec: any, index: number) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-full">
                                      <BarChart3 className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium">{rec.schemeName}</h4>
                                      <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                                    </div>
                                  </div>
                                  <Badge {...getPriorityBadge(rec.priority)}>{getPriorityBadge(rec.priority).text}</Badge>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Eligibility Score:</span>
                                    <span className="font-medium">{rec.eligibilityScore}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Estimated Benefit:</span>
                                    <span className="font-medium">{formatCurrency(rec.estimatedBenefit)}</span>
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-2">Required Documents:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {rec.requirements?.slice(0, 3).map((req: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {req}
                                        </Badge>
                                      ))}
                                      {rec.requirements?.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{rec.requirements.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Village Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Village Recommendation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {recommendations.recommendations?.length || 0}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Schemes</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(recommendations.totalBenefit || 0)}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Benefits</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {recommendations.priorityLevel || 'Medium'}
                          </div>
                          <p className="text-sm text-muted-foreground">Priority Level</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedVillage && !recommendations && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading recommendations...</p>
                      <p className="text-xs mt-1">Analyzing village data and scheme eligibility</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedVillage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Implementation Roadmap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Immediate Actions (0-3 months)</p>
                          <p className="text-sm text-muted-foreground">
                            Complete FRA verification, initiate Jal Jeevan Mission survey
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Short-term Goals (3-12 months)</p>
                          <p className="text-sm text-muted-foreground">
                            PM-KISAN enrollment, MGNREGA job card distribution
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
                        <div className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Long-term Development (1-3 years)</p>
                          <p className="text-sm text-muted-foreground">
                            DAJGUA comprehensive development, infrastructure upgrades
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="eligibility" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scheme Eligibility Matrix</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Real government scheme eligibility analysis for selected village
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedVillage && eligibilityMatrix ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">
                            {eligibilityMatrix.village}
                          </div>
                          <p className="text-xs text-muted-foreground">Selected Village</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">
                            {eligibilityMatrix.totalClaims}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Claims</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-xl font-bold text-yellow-600">
                            {eligibilityMatrix.verifiedClaims}
                          </div>
                          <p className="text-xs text-muted-foreground">Verified Claims</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium">Scheme</th>
                              <th className="text-left p-4 font-medium">Eligible Claims</th>
                              <th className="text-left p-4 font-medium">Total Benefit</th>
                              <th className="text-left p-4 font-medium">Eligibility Rate</th>
                              <th className="text-left p-4 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eligibilityMatrix.schemes?.map((scheme: any, index: number) => {
                              const eligibilityRate = eligibilityMatrix.totalClaims > 0 
                                ? Math.round((scheme.eligibleClaims / eligibilityMatrix.totalClaims) * 100)
                                : 0;
                              
                              return (
                                <tr key={scheme.id} className="border-b">
                                  <td className="p-4">
                                    <div>
                                      <div className="font-medium">{scheme.name}</div>
                                      <div className="text-xs text-muted-foreground">{scheme.id}</div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="text-sm">
                                      {scheme.eligibleClaims}/{eligibilityMatrix.totalClaims}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-medium">
                                      {formatCurrency(scheme.totalBenefit)}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-full bg-gray-200 rounded-full h-2`}>
                                        <div 
                                          className={`h-2 rounded-full ${
                                            eligibilityRate >= 70 ? 'bg-green-500' :
                                            eligibilityRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${eligibilityRate}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-medium">{eligibilityRate}%</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <Badge 
                                      variant={scheme.eligibleClaims > 0 ? "default" : "outline"}
                                    >
                                      {scheme.eligibleClaims > 0 ? "Applicable" : "Not Applicable"}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : selectedVillage ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading eligibility matrix...</p>
                      <p className="text-xs mt-1">Analyzing scheme eligibility for selected village</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a village to view eligibility matrix</p>
                      <p className="text-xs mt-1">Choose a village from the dropdown above</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Available Schemes */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Government Schemes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Complete list of Central Sector and Forest Rights Act schemes
                  </p>
                </CardHeader>
                <CardContent>
                  {schemes ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {schemes.map((scheme: any) => (
                        <div key={scheme.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{scheme.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {scheme.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {scheme.description}
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Ministry:</span>
                              <span className="text-right">{scheme.ministry.replace('Ministry of ', '')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Benefits:</span>
                              <span className="text-right font-medium">{scheme.benefits}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Target:</span>
                              <span className="text-right">{scheme.targetBeneficiaries}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading available schemes...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,247</div>
                    <p className="text-xs text-muted-foreground">
                      +15% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Implementation Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">68%</div>
                    <p className="text-xs text-muted-foreground">
                      +5% from last quarter
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Budget Impact</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹127 Cr</div>
                    <p className="text-xs text-muted-foreground">
                      Estimated annual allocation
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
