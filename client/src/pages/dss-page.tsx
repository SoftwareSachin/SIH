import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, TrendingUp, ExternalLink, Phone, MapPin, Wheat, Building2, Briefcase, BookOpen, Heart, ClipboardList, Target, BarChart3, Award, CheckCircle2, Clock, Users, ArrowRight, Shield, Database, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";

interface Scheme {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  benefitAmount: string;
  applicationWebsite: string;
  helplineNumber: string;
  implementingMinistry: string;
}

interface Recommendation {
  schemeId: string;
  schemeName: string;
  priority: 'high' | 'medium' | 'low';
  eligibilityScore: number;
  estimatedBenefit: number;
  rationale: string;
  requirements: string[];
}

export default function DSSPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Fetch available schemes
  const { data: schemesData, isLoading: schemesLoading } = useQuery({
    queryKey: ['/api/dss/schemes'],
  });

  const generateRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/dss/recommendations/demo-user');
      
      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }
      
      const data = await response.json();
      setRecommendations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconProps = { className: "h-4 w-4" };
    switch (category.toLowerCase()) {
      case 'agriculture':
      case 'Agriculture & Livelihood':
        return <Wheat {...iconProps} />;
      case 'infrastructure':
        return <Building2 {...iconProps} />;
      case 'livelihood':
      case 'employment':
        return <Briefcase {...iconProps} />;
      case 'education':
        return <BookOpen {...iconProps} />;
      case 'healthcare':
        return <Heart {...iconProps} />;
      default:
        return <ClipboardList {...iconProps} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (score >= 10) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        
        <div className="flex-1 overflow-auto p-8 space-y-8" data-testid="dss-page">
          {/* Hero Header Section */}
          <div className="relative">
            <div className="bg-card dark:bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <div className="relative p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary/10 border-2 border-primary/20 rounded-2xl">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Zap className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-foreground tracking-tight" data-testid="page-title">
                          Decision Support System
                        </h1>
                        <p className="text-lg text-muted-foreground font-medium">AI-Powered Scheme Intelligence</p>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed max-w-2xl" data-testid="page-description">
                      Advanced artificial intelligence analyzes your Forest Rights Act profile to deliver personalized recommendations 
                      for Central Sector Schemes and government benefits with precision-matched eligibility scoring.
                    </p>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:min-w-96">
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-2">
                        <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{Array.isArray(schemesData) ? schemesData.length : '—'}</div>
                      <div className="text-xs text-muted-foreground font-medium">Active Schemes</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-2">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">98%</div>
                      <div className="text-xs text-muted-foreground font-medium">Accuracy Rate</div>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 text-center col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto mb-2">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">2.3M+</div>
                      <div className="text-xs text-muted-foreground font-medium">Beneficiaries Served</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Action Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-2 border-primary/20 bg-primary/5 dark:bg-primary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-foreground">Generate Recommendations</CardTitle>
                      <CardDescription className="text-sm">Start your personalized analysis journey</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    Our advanced AI engine processes your claim profile against 12+ Central Sector Schemes, 
                    analyzing eligibility criteria, benefit amounts, and implementation requirements to deliver 
                    prioritized recommendations tailored to your specific circumstances.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={generateRecommendations}
                      disabled={loading}
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex-1"
                      data-testid="generate-recommendations-btn"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing Profile...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="mr-2 h-5 w-5" />
                          Start Analysis
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Process Overview */}
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Profile Analysis</p>
                      <p className="text-xs text-muted-foreground">AI analyzes your FRA claim data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Scheme Matching</p>
                      <p className="text-xs text-muted-foreground">Cross-reference with eligibility criteria</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Prioritized Results</p>
                      <p className="text-xs text-muted-foreground">Ranked recommendations with confidence scores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

      {error && (
        <Alert className="mb-6 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" data-testid="error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Available Schemes Overview */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Available Government Schemes
            </h2>
            <p className="text-muted-foreground">
              Comprehensive Central Sector Schemes database for Forest Rights Act beneficiaries
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-foreground">
              {Array.isArray(schemesData) ? schemesData.length : 0} Active Schemes
            </span>
          </div>
        </div>

        <Card className="bg-card dark:bg-card border-border shadow-sm" data-testid="schemes-overview">
          <CardContent className="p-6">
            {schemesLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span className="mt-4 text-muted-foreground font-medium">Loading government schemes...</span>
                <span className="mt-1 text-xs text-muted-foreground">Fetching latest eligibility criteria</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.isArray(schemesData) ? schemesData.map((scheme: Scheme) => (
                  <Card key={scheme.id} className="group border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-background dark:bg-background overflow-hidden" data-testid={`scheme-card-${scheme.id}`}>
                    <CardHeader className="pb-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs font-semibold px-3 py-1 border-2 bg-background"
                          style={{
                            borderColor: scheme.category.toLowerCase() === 'agriculture' ? '#059669' : 
                                        scheme.category.toLowerCase() === 'infrastructure' ? '#dc2626' :
                                        scheme.category.toLowerCase() === 'livelihood' || scheme.category.toLowerCase() === 'employment' ? '#7c3aed' :
                                        scheme.category.toLowerCase() === 'education' ? '#ea580c' :
                                        scheme.category.toLowerCase() === 'healthcare' ? '#db2777' : '#6b7280',
                            color: scheme.category.toLowerCase() === 'agriculture' ? '#059669' : 
                                   scheme.category.toLowerCase() === 'infrastructure' ? '#dc2626' :
                                   scheme.category.toLowerCase() === 'livelihood' || scheme.category.toLowerCase() === 'employment' ? '#7c3aed' :
                                   scheme.category.toLowerCase() === 'education' ? '#ea580c' :
                                   scheme.category.toLowerCase() === 'healthcare' ? '#db2777' : '#6b7280'
                          }}
                        >
                          <span className="flex items-center gap-1.5">
                            {getCategoryIcon(scheme.category)} 
                            {scheme.category}
                          </span>
                        </Badge>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                      <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {scheme.shortName || scheme.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {scheme.description}
                      </p>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Benefit Amount</span>
                          </div>
                          <span className="font-bold text-green-700 dark:text-green-400 text-sm">{scheme.benefitAmount}</span>
                        </div>
                        
                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Implementing Ministry</p>
                            <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">{scheme.implementingMinistry}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Scheme ID: {scheme.id}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-6" data-testid="recommendations-section">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                Your Personalized Recommendations
              </h2>
              <p className="text-muted-foreground">
                AI-generated scheme matches based on your Forest Rights Act profile analysis
              </p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {recommendations.length} Recommendations Found
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <Card key={rec.schemeId} className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 shadow-lg hover:shadow-xl transition-all duration-300" data-testid={`recommendation-${index}`}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">
                          {rec.schemeName}
                        </CardTitle>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 font-bold px-3 py-1 text-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {rec.eligibilityScore}% Match
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`font-semibold px-3 py-1 text-sm border-2 ${
                            rec.priority === 'high' 
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800' 
                              : rec.priority === 'medium' 
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800' 
                              : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800'
                          }`}
                        >
                          {rec.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-center lg:text-right">
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                        ₹{rec.estimatedBenefit.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">Estimated Benefit</div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Key Information Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-bold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Eligibility Assessment
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-r-lg">
                        <p className="text-muted-foreground leading-relaxed">{rec.rationale}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-bold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Required Documentation
                      </h4>
                      <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 dark:border-amber-400 p-4 rounded-r-lg">
                        <ul className="space-y-2">
                          {rec.requirements.map((req, reqIndex) => (
                            <li key={reqIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scheme Information */}
                  <div className="bg-background dark:bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Scheme Reference</span>
                      <span className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">{rec.schemeId}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recommendations.length === 0 && !loading && !error && (
        <Card className="text-center py-20 border-2 border-dashed border-border bg-muted/30 dark:bg-muted/20 hover:bg-muted/40 dark:hover:bg-muted/30 transition-colors" data-testid="no-recommendations">
          <CardContent className="space-y-6">
            <div className="relative mx-auto w-fit">
              <div className="p-6 bg-primary/10 rounded-2xl">
                <BarChart3 className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-foreground">Ready to Discover Your Benefits?</h3>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Start your personalized analysis to unlock government scheme recommendations 
                tailored specifically to your Forest Rights Act profile and eligibility status.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>AI-Powered Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Personalized Results</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Instant Recommendations</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}