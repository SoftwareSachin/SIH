import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, TrendingUp, ExternalLink, Phone, MapPin, Wheat, Building2, Briefcase, BookOpen, Heart, ClipboardList, Target, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  scheme: Scheme;
  eligibilityScore: number;
  matchingCriteria: string[];
  reason: string;
  guidance: string;
  estimatedBenefit: string;
}

export default function DSSPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setRecommendations(data.recommendations || []);
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
    if (score >= 15) return 'bg-green-100 text-green-800';
    if (score >= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6" data-testid="dss-page">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Decision Support System
            </h1>
            <p className="text-sm text-gray-500">Intelligent scheme recommendations</p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-4 leading-relaxed" data-testid="page-description">
            Get AI-powered recommendations for Central Sector Schemes and government benefits 
            based on your Forest Rights Act claim profile and eligibility criteria.
          </p>
          <Button 
            onClick={generateRecommendations}
            disabled={loading}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
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
      </div>

      {error && (
        <Alert className="mb-6" data-testid="error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Available Schemes Overview */}
      <Card className="mb-8" data-testid="schemes-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Schemes ({Array.isArray(schemesData) ? schemesData.length : 0})
          </CardTitle>
          <CardDescription>
            Central Sector Schemes available for Forest Rights Act claimants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schemesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading schemes...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(schemesData) ? schemesData.map((scheme: Scheme) => (
                <Card key={scheme.id} className="border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white" data-testid={`scheme-card-${scheme.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-medium border-gray-300 text-gray-700 bg-white">
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(scheme.category)} 
                          {scheme.category}
                        </span>
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{scheme.shortName || scheme.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {scheme.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                        <span className="font-medium">{scheme.benefitAmount}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
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
            <div className="p-2 bg-green-600 rounded-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Your Personalized Recommendations
            </h2>
          </div>
          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <Card key={rec.scheme.id} className="border border-green-200 bg-green-50/30 shadow-sm" data-testid={`recommendation-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(rec.scheme.category)}
                          <CardTitle className="text-xl">
                            {rec.scheme.name}
                          </CardTitle>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold">
                          Match: {rec.eligibilityScore}%
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {rec.scheme.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Benefit & Ministry Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wide">Estimated Benefit</h4>
                      <p className="text-lg font-bold text-green-700">{rec.estimatedBenefit}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wide">Implementing Ministry</h4>
                      <p className="text-sm text-gray-700 font-medium">{rec.scheme.implementingMinistry}</p>
                    </div>
                  </div>

                  {/* Eligibility Reason */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">Eligibility Assessment</h4>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                      <p className="text-gray-700">{rec.reason}</p>
                    </div>
                  </div>

                  {/* Application Guidance */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide">Application Process</h4>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {rec.guidance}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    {rec.scheme.applicationWebsite && (
                      <Button asChild variant="default" data-testid={`apply-btn-${index}`}>
                        <a
                          href={rec.scheme.applicationWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Apply Online
                        </a>
                      </Button>
                    )}
                    {rec.scheme.helplineNumber && (
                      <Button variant="outline" asChild data-testid={`contact-btn-${index}`}>
                        <a href={`tel:${rec.scheme.helplineNumber}`} className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contact: {rec.scheme.helplineNumber}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recommendations.length === 0 && !loading && !error && (
        <Card className="text-center py-16 border-2 border-dashed border-gray-300 bg-gray-50/50" data-testid="no-recommendations">
          <CardContent>
            <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Generate personalized scheme recommendations based on your Forest Rights Act profile and eligibility criteria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}