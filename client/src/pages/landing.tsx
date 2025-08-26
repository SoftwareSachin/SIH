import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shrub, Map, BarChart3, Brain, Users, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50"></div>
        <div className="relative px-6 lg:px-8">
          <div className="mx-auto max-w-7xl py-24 sm:py-32">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="bg-accent p-4 rounded-2xl">
                  <Shrub className="h-12 w-12 text-accent-foreground" />
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                FRA Atlas
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                AI-powered Shrub Rights Act Management System with WebGIS integration, 
                document digitization, and intelligent decision support for tribal communities.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = '/login'}
                  data-testid="button-login"
                >
                  Access System
                </Button>
                <Button variant="outline" size="lg" data-testid="button-learn-more">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Comprehensive FRA Management
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Digitizing forest rights management with AI-powered tools for accurate, 
              transparent, and efficient processing of claims and policy implementation.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Map className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>WebGIS Portal</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Interactive mapping with satellite imagery, land-use classification, 
                  and spatial analysis of forest rights claims across tribal areas.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-2 rounded-lg">
                    <Brain className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>AI Processing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automated document digitization with OCR, NER for entity extraction, 
                  and computer vision for asset detection and land-use mapping.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Decision Support</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Intelligent recommendations for Central Sector Scheme eligibility, 
                  priority interventions, and policy formulation based on data analysis.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-12">
              Coverage Across Four States
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">Madhya Pradesh</div>
                <div className="text-sm text-muted-foreground mt-2">Primary Focus State</div>
                <Badge variant="secondary" className="mt-3">Active</Badge>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">Tripura</div>
                <div className="text-sm text-muted-foreground mt-2">Northeast Region</div>
                <Badge variant="secondary" className="mt-3">Active</Badge>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">Odisha</div>
                <div className="text-sm text-muted-foreground mt-2">Eastern Region</div>
                <Badge variant="secondary" className="mt-3">Active</Badge>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">Telangana</div>
                <div className="text-sm text-muted-foreground mt-2">Southern Region</div>
                <Badge variant="secondary" className="mt-3">Active</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Target Users Section */}
      <div className="py-24 bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for Key Stakeholders
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Role-based access ensuring appropriate functionality for each user type
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Ministry of Tribal Affairs",
                description: "Policy oversight, national-level analytics, and strategic decision making",
                icon: <Users className="h-6 w-6" />
              },
              {
                title: "District Tribal Welfare Departments",
                description: "Ground-level implementation, claim verification, and community coordination",
                icon: <CheckCircle className="h-6 w-6" />
              },
              {
                title: "Shrub & Revenue Departments",
                description: "Land records integration, boundary verification, and compliance monitoring",
                icon: <Shrub className="h-6 w-6" />
              },
              {
                title: "Planning & Development Authorities",
                description: "Scheme integration, budget allocation, and development planning",
                icon: <BarChart3 className="h-6 w-6" />
              },
              {
                title: "NGOs & Civil Society",
                description: "Community advocacy, awareness building, and implementation support",
                icon: <Users className="h-6 w-6" />
              },
              {
                title: "Field Officers",
                description: "Mobile data collection, verification workflows, and status updates",
                icon: <CheckCircle className="h-6 w-6" />
              }
            ].map((user, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                      {user.icon}
                    </div>
                    <CardTitle className="text-lg">{user.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{user.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <div className="flex items-center space-x-2">
              <Shrub className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Shrub Rights Act 2006</span>
            </div>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-muted-foreground">
              &copy; 2024 FRA Atlas. Supporting tribal communities and forest conservation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
