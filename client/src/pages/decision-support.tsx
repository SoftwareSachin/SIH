import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Download, Filter } from "lucide-react";

export default function DecisionSupport() {
  const [selectedVillage, setSelectedVillage] = useState<string>('');

  const { data: villages } = useQuery({
    queryKey: ["/api/geo/villages", "all"],
  });

  const { data: recommendations } = useQuery({
    queryKey: ["/api/dss/village-recommendations", selectedVillage],
    enabled: !!selectedVillage,
  });

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
                      <SelectItem value="village1">Khandwa, Bhopal</SelectItem>
                      <SelectItem value="village2">Amarkantak, Anuppur</SelectItem>
                      <SelectItem value="village3">Patalkot, Chhindwara</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedVillage && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* High Priority Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">High Priority Interventions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">Jal Jeevan Mission</h4>
                              <p className="text-sm text-muted-foreground">Water infrastructure development</p>
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-800">High Priority</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Eligible Households:</span>
                            <span className="font-medium">23</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Estimated Budget:</span>
                            <span className="font-medium">₹4.2 Cr</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Eligibility Score:</span>
                            <span className="font-medium">92%</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">DAJGUA Development</h4>
                              <p className="text-sm text-muted-foreground">Tribal area comprehensive development</p>
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-800">High Priority</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Beneficiaries:</span>
                            <span className="font-medium">156</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Estimated Budget:</span>
                            <span className="font-medium">₹5.0 Cr</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Eligibility Score:</span>
                            <span className="font-medium">88%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medium Priority Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Medium Priority Interventions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <BarChart3 className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">PM-KISAN</h4>
                              <p className="text-sm text-muted-foreground">Direct farmer income support</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Medium Priority</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Eligible Farmers:</span>
                            <span className="font-medium">156</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Annual Disbursement:</span>
                            <span className="font-medium">₹9.36 L</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Eligibility Score:</span>
                            <span className="font-medium">76%</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-yellow-100 rounded-full">
                              <BarChart3 className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">MGNREGA</h4>
                              <p className="text-sm text-muted-foreground">Employment guarantee scheme</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Medium Priority</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Eligible Households:</span>
                            <span className="font-medium">89</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Person-Days:</span>
                            <span className="font-medium">2,340</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Eligibility Score:</span>
                            <span className="font-medium">71%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium">Scheme</th>
                          <th className="text-left p-4 font-medium">Eligible Claims</th>
                          <th className="text-left p-4 font-medium">Total Benefit</th>
                          <th className="text-left p-4 font-medium">Priority</th>
                          <th className="text-left p-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-4">PM-KISAN</td>
                          <td className="p-4">234/456</td>
                          <td className="p-4">₹14.04 L</td>
                          <td className="p-4">
                            <Badge variant="secondary">Medium</Badge>
                          </td>
                          <td className="p-4">
                            <Badge>Active</Badge>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-4">Jal Jeevan Mission</td>
                          <td className="p-4">67/456</td>
                          <td className="p-4">₹23.45 Cr</td>
                          <td className="p-4">
                            <Badge className="bg-red-100 text-red-800">High</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">Planned</Badge>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-4">MGNREGA</td>
                          <td className="p-4">345/456</td>
                          <td className="p-4">₹8.62 L</td>
                          <td className="p-4">
                            <Badge variant="secondary">Medium</Badge>
                          </td>
                          <td className="p-4">
                            <Badge>Active</Badge>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-4">DAJGUA</td>
                          <td className="p-4">123/456</td>
                          <td className="p-4">₹61.5 Cr</td>
                          <td className="p-4">
                            <Badge className="bg-red-100 text-red-800">High</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">Under Review</Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
