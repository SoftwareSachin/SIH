import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, TrendingUp, ExternalLink, Phone, MapPin, Wheat, Building2, Briefcase, BookOpen, Heart, ClipboardList, Target, BarChart3 } from 'lucide-react';
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
        
        <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="dss-page">
          {/* Header Section */}
          <div className="bg-white dark:bg-card rounded-lg shadow-sm border border-gray-200 dark:border-border p-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Target className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground" data-testid="page-title">
                  Decision Support System
                </h1>
              </div>
              <p className="text-gray-600 dark:text-muted-foreground">Intelligent scheme recommendations</p>
            </div>
          </div>
          
          {/* Action Section */}
          <div className="bg-gray-50 dark:bg-muted/50 border border-gray-200 dark:border-border rounded-lg p-6">
            <p className="text-gray-700 dark:text-muted-foreground mb-4 leading-relaxed" data-testid="page-description">
              Get AI-powered recommendations for Central Sector Schemes and government benefits 
              based on your Forest Rights Act claim profile and eligibility criteria.
            </p>
            <Button 
              onClick={generateRecommendations}
              disabled={loading}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-primary dark:hover:bg-primary/90 text-white font-medium"
              data-testid="generate-recommendations-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Profile...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>

      {error && (
        <Alert className="mb-6 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" data-testid="error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Available Schemes Overview */}
      <Card className="mb-8 bg-card dark:bg-card border-border" data-testid="schemes-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            Available Schemes ({Array.isArray(schemesData) ? schemesData.length : 0})
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Central Sector Schemes available for Forest Rights Act claimants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schemesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading schemes...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(schemesData) ? schemesData.map((scheme: Scheme) => (
                <Card key={scheme.id} className="border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card dark:bg-card" data-testid={`scheme-card-${scheme.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-medium border-border text-foreground bg-background dark:bg-muted">
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(scheme.category)} 
                          {scheme.category}
                        </span>
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-foreground">{scheme.shortName || scheme.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {scheme.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-foreground">{scheme.benefitAmount}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{scheme.implementingMinistry}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div data-testid="recommendations-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-600 dark:bg-green-700 rounded-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Your Personalized Recommendations
            </h2>
          </div>
          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <Card key={rec.schemeId} className="border border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20 shadow-sm" data-testid={`recommendation-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          <CardTitle className="text-xl text-foreground">
                            {rec.schemeName}
                          </CardTitle>
                        </div>
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 font-semibold">
                          Match: {rec.eligibilityScore}%
                        </Badge>
                        <Badge variant="outline" className={rec.priority === 'high' ? 'bg-red-100 text-red-800' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                          {rec.priority.toUpperCase()} Priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Benefit Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background dark:bg-muted border border-border rounded-lg">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wide">Estimated Benefit</h4>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">₹{rec.estimatedBenefit.toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wide">Scheme ID</h4>
                      <p className="text-sm text-muted-foreground font-medium">{rec.schemeId}</p>
                    </div>
                  </div>

                  {/* Eligibility Reason */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 text-sm uppercase tracking-wide">Eligibility Assessment</h4>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-400 dark:border-blue-600 p-3 rounded-r-lg">
                      <p className="text-muted-foreground">{rec.rationale}</p>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 text-sm uppercase tracking-wide">Required Documents & Actions</h4>
                    <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 dark:border-amber-600 p-4 rounded-r-lg">
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {rec.requirements.map((req, reqIndex) => (
                          <li key={reqIndex}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recommendations.length === 0 && !loading && !error && (
        <Card className="text-center py-16 border-2 border-dashed border-border bg-muted/20 dark:bg-muted/10" data-testid="no-recommendations">
          <CardContent>
            <div className="p-3 bg-muted dark:bg-muted/50 rounded-full w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Recommendations Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Generate personalized scheme recommendations based on your Forest Rights Act profile and eligibility criteria.
            </p>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}