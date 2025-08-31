import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shrub, Map, BarChart3, Brain, Users, CheckCircle, TreePine, Shield, FileText, Satellite, Award, ArrowRight } from "lucide-react";
import governmentMeetingImage from "@assets/generated_images/Government_forest_management_meeting_5f35e229.png";
import forestAerialImage from "@assets/generated_images/Forest_conservation_aerial_view_8aa1e263.png";
import fieldOfficerImage from "@assets/generated_images/Field_officer_forest_documentation_e28df0c4.png";
import madhyaPradeshMap from "@assets/image_1756619529128.png";
import tripuraMap from "@assets/image_1756619548972.png";
import odishaMap from "@assets/image_1756619567129.png";
import telanganaMap from "@assets/image_1756619579419.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="px-6 lg:px-8">
          <div className="mx-auto max-w-7xl py-24 sm:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-left">
                <div className="mb-6">
                  <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 border-gray-200">
                    <Shield className="w-4 h-4 mr-2" />
                    Forest Rights Act 2006 Compliance
                  </Badge>
                </div>
                
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
                  FRA Atlas
                </h1>
                
                <h2 className="text-xl font-semibold text-gray-700 mb-6">
                  Digital Forest Rights Management Platform
                </h2>
                
                <p className="text-lg leading-8 text-gray-600 mb-8">
                  Advanced forest rights management system with WebGIS integration, 
                  intelligent document processing, and comprehensive decision support for transparent governance.
                </p>
                
                <div className="flex items-center gap-x-6">
                  <Button 
                    size="lg" 
                    onClick={() => window.location.href = '/auth'}
                    data-testid="button-login"
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200"
                  >
                    Access Platform
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    data-testid="button-learn-more"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-lg"
                  >
                    Learn More
                  </Button>
                </div>
                
                {/* Trust Indicators */}
                <div className="mt-12 flex items-center gap-8 text-gray-500">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Government Certified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Secure & Compliant</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <img 
                  src={governmentMeetingImage} 
                  alt="Government officials discussing forest management policies" 
                  className="rounded-xl shadow-xl w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-gray-700 border-gray-300">
              Platform Capabilities
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-6">
              Comprehensive Forest Rights Management
            </h2>
            <p className="text-lg leading-8 text-gray-600">
              Advanced forest governance through technology, ensuring transparent 
              and efficient implementation of the Forest Rights Act.
            </p>
          </div>
          
          {/* Forest Conservation Image */}
          <div className="mt-16 mb-16">
            <img 
              src={forestAerialImage} 
              alt="Aerial view of forest conservation area with tribal village" 
              className="rounded-xl shadow-xl w-full h-64 object-cover"
            />
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <Card className="border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Map className="h-8 w-8 text-gray-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">WebGIS Portal</CardTitle>
                    <Badge variant="secondary" className="mt-1">Geospatial Analysis</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Satellite imagery integration with land-use classification, 
                  boundary demarcation, and spatial analysis for decision making.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Brain className="h-8 w-8 text-gray-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">AI Processing</CardTitle>
                    <Badge variant="secondary" className="mt-1">Machine Learning</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Document digitization with multilingual OCR, entity extraction, 
                  and computer vision for asset detection and forest cover analysis.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-gray-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Decision Support</CardTitle>
                    <Badge variant="secondary" className="mt-1">Analytics</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Data-driven recommendations for scheme eligibility, priority interventions, 
                  and policy formulation with analytics and compliance monitoring.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Coverage Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-gray-700 border-gray-300">
              Implementation Coverage
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-6">
              Multi-State Implementation
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Currently implemented across four states for comprehensive forest rights management
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border shadow-md overflow-hidden">
              <div className="aspect-square">
                <img 
                  src={madhyaPradeshMap} 
                  alt="Madhya Pradesh administrative map" 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6 text-center">
                <div className="text-xl font-bold text-gray-900 mb-2">Madhya Pradesh</div>
                <div className="text-sm text-gray-600 mb-4">Primary Implementation</div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="border shadow-md overflow-hidden">
              <div className="aspect-square">
                <img 
                  src={tripuraMap} 
                  alt="Tripura administrative map" 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6 text-center">
                <div className="text-xl font-bold text-gray-900 mb-2">Tripura</div>
                <div className="text-sm text-gray-600 mb-4">Northeast Region</div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="border shadow-md overflow-hidden">
              <div className="aspect-square">
                <img 
                  src={odishaMap} 
                  alt="Odisha administrative map" 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6 text-center">
                <div className="text-xl font-bold text-gray-900 mb-2">Odisha</div>
                <div className="text-sm text-gray-600 mb-4">Eastern Region</div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="border shadow-md overflow-hidden">
              <div className="aspect-square">
                <img 
                  src={telanganaMap} 
                  alt="Telangana administrative map" 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6 text-center">
                <div className="text-xl font-bold text-gray-900 mb-2">Telangana</div>
                <div className="text-sm text-gray-600 mb-4">Southern Region</div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Target Users Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <Badge variant="outline" className="mb-6 px-4 py-2 text-gray-700 border-gray-300">
                Field Operations
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">
                Technology-Enabled Field Work
              </h2>
              <p className="text-lg leading-8 text-gray-600">
                Field officers use advanced digital tools for real-time data collection, 
                claim verification, and forest rights documentation in remote areas.
              </p>
            </div>
            <div>
              <img 
                src={fieldOfficerImage} 
                alt="Field officer documenting forest rights with digital technology" 
                className="rounded-xl shadow-xl w-full h-auto"
              />
            </div>
          </div>
          
          <div className="text-center mb-16">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
              Multi-Level Stakeholder Access
            </h3>
            <p className="text-base leading-7 text-gray-600 max-w-2xl mx-auto">
              Role-based access control for different stakeholders involved in forest rights management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Ministry of Tribal Affairs",
                description: "National policy oversight, strategic analytics, cross-state coordination, and high-level decision support.",
                icon: <Shield className="h-7 w-7" />,
                color: "bg-gray-100 text-gray-700"
              },
              {
                title: "District Tribal Welfare",
                description: "Ground-level implementation, claim verification, community engagement, and beneficiary support.",
                icon: <Users className="h-7 w-7" />,
                color: "bg-gray-100 text-gray-700"
              },
              {
                title: "Forest & Revenue Departments",
                description: "Land records integration, boundary verification, compliance monitoring, and departmental coordination.",
                icon: <TreePine className="h-7 w-7" />,
                color: "bg-gray-100 text-gray-700"
              },
              {
                title: "Planning Authorities",
                description: "Development scheme integration, budget allocation, impact assessment, and strategic planning.",
                icon: <BarChart3 className="h-7 w-7" />,
                color: "bg-gray-100 text-gray-700"
              },
              {
                title: "NGOs & Civil Society",
                description: "Community advocacy, awareness campaigns, implementation monitoring, and grassroots support.",
                icon: <Users className="h-7 w-7" />,
                color: "bg-gray-100 text-gray-700"
              },
              {
                title: "Field Officers",
                description: "Mobile data collection, verification workflows, status tracking, and field-level documentation.",
                icon: <FileText className="h-7 w-7" />,
                color: "bg-gray-100 text-gray-700"
              }
            ].map((user, index) => (
              <Card key={index} className="border shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`${user.color} p-3 rounded-lg`}>
                      {user.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2">{user.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">Authorized Access</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-sm leading-relaxed">{user.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="py-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <div className="mb-8">
            <TreePine className="h-16 w-16 mx-auto mb-6 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Access FRA Atlas Platform
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Secure access to the Forest Rights Act management platform for authorized stakeholders.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/auth'}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              Access Platform
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-gray-400 text-gray-300 hover:bg-gray-800 hover:text-white px-10 py-4 text-lg font-semibold rounded-lg"
            >
              System Information
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-600 p-2 rounded-lg">
                  <TreePine className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">FRA Atlas</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Digital forest rights management platform supporting implementation 
                of the Forest Rights Act 2006 across multiple states.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Forest Rights Act 2006 Compliant</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-400">WebGIS Portal</li>
                <li className="text-gray-400">AI Processing</li>
                <li className="text-gray-400">Decision Support</li>
                <li className="text-gray-400">Analytics Dashboard</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Information</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-400">System Documentation</li>
                <li className="text-gray-400">User Guidelines</li>
                <li className="text-gray-400">Technical Specifications</li>
                <li className="text-gray-400">Compliance Information</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              Forest Rights Act Atlas - Digital Management Platform
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <Satellite className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-400">Geospatial Technology</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
