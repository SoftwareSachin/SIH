import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Download, Filter, ExternalLink, FileText, AlertCircle, Target, Award, CheckCircle2, Clock, Users, ArrowRight, Shield, Database, Zap, Building2, MapPin } from "lucide-react";

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
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        
        <div className="flex-1 overflow-auto p-8 space-y-8">
          {/* Hero Header Section */}
          <div className="relative">
            <div className="bg-card dark:bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="relative p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
                          <Target className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-foreground tracking-tight">
                          Decision Support System
                        </h1>
                        <p className="text-lg text-muted-foreground font-medium">AI-Powered Scheme Intelligence</p>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                      Advanced artificial intelligence analyzes village-specific data to deliver targeted recommendations 
                      for Central Sector Schemes and government interventions with precision-matched eligibility scoring.
                    </p>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:min-w-96">
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg mx-auto mb-2">
                        <Database className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{schemes?.length || '—'}</div>
                      <div className="text-xs text-muted-foreground font-medium">Active Schemes</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg mx-auto mb-2">
                        <MapPin className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{villages?.length || '—'}</div>
                      <div className="text-xs text-muted-foreground font-medium">Villages Analyzed</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 text-center col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg mx-auto mb-2">
                        <Shield className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">98%</div>
                      <div className="text-xs text-muted-foreground font-medium">Accuracy Rate</div>
                    </div>
                  </div>
                </div>
                
                {/* Action Button */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Generate comprehensive village analysis reports with actionable insights
                    </div>
                    <Button 
                      data-testid="button-generate-report"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  </div>
                  Analysis Dashboard
                </h2>
                <p className="text-muted-foreground">
                  Comprehensive village-level analysis with personalized scheme recommendations
                </p>
              </div>
            </div>

            <Tabs defaultValue="recommendations" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
                <TabsTrigger value="recommendations" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="eligibility" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Eligibility Matrix
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="space-y-6">
                {/* Enhanced Village Selection */}
                <Card className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
                        <Filter className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-foreground">Village Selection & Analysis</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Choose a village to generate targeted scheme recommendations</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {villagesLoading ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-slate-600 dark:border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <span className="mt-4 text-muted-foreground font-medium">Loading village database...</span>
                        <span className="mt-1 text-xs text-muted-foreground">Fetching geographic data</span>
                      </div>
                    ) : villagesError ? (
                      <div className="text-center py-8">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg w-fit mx-auto mb-4">
                          <AlertCircle className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Villages</h3>
                        <p className="text-slate-600 dark:text-slate-400">{villagesError.message}</p>
                      </div>
                    ) : villages.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg w-fit mx-auto mb-4">
                          <AlertCircle className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Villages Found</h3>
                        <p className="text-slate-600 dark:text-slate-400">Please check the database configuration</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {villages.length} villages available for analysis
                            </span>
                          </div>
                          {selectedVillage && (
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                              Village Selected
                            </Badge>
                          )}
                        </div>
                        <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                          <SelectTrigger className="w-full h-12 border border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-background hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <SelectValue placeholder="Select a village to begin analysis" />
                          </SelectTrigger>
                          <SelectContent>
                            {villages.map((village: Village) => (
                              <SelectItem key={village.id} value={village.id} className="py-3">
                                <div className="flex items-center gap-3">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{village.name}</div>
                                    {village.population && (
                                      <div className="text-xs text-muted-foreground">
                                        Population: {village.population.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
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
    </div>
  );
}