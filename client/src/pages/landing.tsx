import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shrub, Map, BarChart3, Brain, Users, CheckCircle, TreePine, Shield, FileText, Satellite, Award, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-100/30 via-transparent to-transparent"></div>
        </div>
        
        {/* Decorative Forest Silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-800/10 to-transparent"></div>
        
        <div className="relative px-6 lg:px-8">
          <div className="mx-auto max-w-7xl py-28 sm:py-40">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-200/50 rounded-3xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-3xl shadow-2xl">
                    <TreePine className="h-16 w-16 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-green-100 text-green-800 border-green-200">
                  <Shield className="w-4 h-4 mr-2" />
                  Forest Rights Act 2006 Compliance
                </Badge>
              </div>
              
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-green-800 to-emerald-700 bg-clip-text text-transparent sm:text-7xl mb-6">
                FRA Atlas
              </h1>
              
              <h2 className="text-xl font-semibold text-green-700 mb-6 sm:text-2xl">
                Digital Forest Rights Management Platform
              </h2>
              
              <p className="mt-6 text-lg leading-8 text-gray-700 max-w-3xl mx-auto">
                Empowering tribal communities through AI-powered forest rights management with advanced WebGIS integration, 
                intelligent document processing, and comprehensive decision support systems for transparent and efficient governance.
              </p>
              
              <div className="mt-12 flex items-center justify-center gap-x-6">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = '/auth'}
                  data-testid="button-login"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Access Platform
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  data-testid="button-learn-more"
                  className="border-green-300 text-green-700 hover:bg-green-50 px-8 py-4 text-lg font-semibold rounded-lg"
                >
                  Explore Features
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="mt-16 flex items-center justify-center gap-8 opacity-70">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Government Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Secure & Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Satellite className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Satellite Integrated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gradient-to-br from-white to-green-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-green-700 border-green-200">
              Platform Capabilities
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6">
              Comprehensive Forest Rights Management
            </h2>
            <p className="text-xl leading-8 text-gray-600">
              Revolutionizing forest governance through cutting-edge technology, ensuring transparent, 
              efficient, and community-centered implementation of the Forest Rights Act.
            </p>
          </div>
          
          <div className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-8 sm:mt-24 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 opacity-50"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Map className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Advanced WebGIS</CardTitle>
                    <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">Geospatial Intelligence</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  High-resolution satellite imagery integration with real-time land-use classification, 
                  precise boundary demarcation, and comprehensive spatial analysis for evidence-based decision making.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-50"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">AI-Powered Processing</CardTitle>
                    <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-700">Machine Learning</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Intelligent document digitization with multilingual OCR, advanced NER for data extraction, 
                  and computer vision for automated asset detection and forest cover analysis.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-100 opacity-50"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Smart Decision Support</CardTitle>
                    <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-700">Analytics Engine</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-gray-600 text-base leading-relaxed">
                  Data-driven recommendations for scheme eligibility, priority interventions, 
                  and strategic policy formulation with predictive analytics and compliance monitoring.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Impact Statistics */}
      <div className="py-24 bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6 px-4 py-2 bg-white/10 text-white border-white/20">
              National Implementation
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
              Transforming Forest Governance Nationwide
            </h2>
            <p className="text-xl text-green-100 max-w-3xl mx-auto">
              Pioneering digital transformation across four key states with comprehensive coverage and measurable impact
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">MP</div>
              <div className="text-lg font-semibold mb-2">Madhya Pradesh</div>
              <div className="text-green-100 text-sm mb-4">Primary Implementation State</div>
              <Badge className="bg-green-400 text-green-900 hover:bg-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">TR</div>
              <div className="text-lg font-semibold mb-2">Tripura</div>
              <div className="text-green-100 text-sm mb-4">Northeast Regional Hub</div>
              <Badge className="bg-green-400 text-green-900 hover:bg-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">OD</div>
              <div className="text-lg font-semibold mb-2">Odisha</div>
              <div className="text-green-100 text-sm mb-4">Eastern Regional Center</div>
              <Badge className="bg-green-400 text-green-900 hover:bg-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300">
              <div className="text-4xl font-bold mb-2">TS</div>
              <div className="text-lg font-semibold mb-2">Telangana</div>
              <div className="text-green-100 text-sm mb-4">Southern Regional Node</div>
              <Badge className="bg-green-400 text-green-900 hover:bg-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
          
          {/* Impact Metrics */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">10,000+</div>
              <div className="text-green-100">Claims Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-green-100">Villages Mapped</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">250K+</div>
              <div className="text-green-100">Hectares Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">95%</div>
              <div className="text-green-100">Processing Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Users Section */}
      <div className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-gray-700 border-gray-200">
              Stakeholder Ecosystem
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6">
              Designed for Every Stakeholder
            </h2>
            <p className="text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Comprehensive role-based access control ensuring each stakeholder gets the tools and insights they need 
              for effective forest rights management and policy implementation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Ministry of Tribal Affairs",
                description: "National policy oversight, strategic analytics, cross-state coordination, and high-level decision support with comprehensive dashboards.",
                icon: <Shield className="h-7 w-7" />,
                color: "from-blue-500 to-indigo-600",
                bgColor: "from-blue-50 to-indigo-100"
              },
              {
                title: "District Tribal Welfare",
                description: "Ground-level implementation, claim verification, community engagement, and direct beneficiary support with mobile workflows.",
                icon: <Users className="h-7 w-7" />,
                color: "from-green-500 to-emerald-600",
                bgColor: "from-green-50 to-emerald-100"
              },
              {
                title: "Forest & Revenue Departments",
                description: "Land records integration, boundary verification, compliance monitoring, and inter-departmental coordination.",
                icon: <TreePine className="h-7 w-7" />,
                color: "from-emerald-500 to-green-600",
                bgColor: "from-emerald-50 to-green-100"
              },
              {
                title: "Planning Authorities",
                description: "Development scheme integration, budget allocation, impact assessment, and strategic planning with data-driven insights.",
                icon: <BarChart3 className="h-7 w-7" />,
                color: "from-purple-500 to-pink-600",
                bgColor: "from-purple-50 to-pink-100"
              },
              {
                title: "NGOs & Civil Society",
                description: "Community advocacy, awareness campaigns, implementation monitoring, and grassroots support with transparency tools.",
                icon: <Users className="h-7 w-7" />,
                color: "from-orange-500 to-red-600",
                bgColor: "from-orange-50 to-red-100"
              },
              {
                title: "Field Officers",
                description: "Mobile data collection, real-time verification, status tracking, and field-level documentation with offline capabilities.",
                icon: <FileText className="h-7 w-7" />,
                color: "from-teal-500 to-cyan-600",
                bgColor: "from-teal-50 to-cyan-100"
              }
            ].map((user, index) => (
              <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <div className={`absolute inset-0 bg-gradient-to-br ${user.bgColor} opacity-40`}></div>
                <CardHeader className="relative">
                  <div className="flex items-start gap-4">
                    <div className={`bg-gradient-to-br ${user.color} p-3 rounded-xl shadow-md text-white group-hover:scale-110 transition-transform duration-300`}>
                      {user.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2">{user.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">Specialized Access</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="text-gray-600 text-sm leading-relaxed">{user.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <div className="mb-8">
            <TreePine className="h-16 w-16 mx-auto mb-6 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Ready to Transform Forest Rights Management?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of stakeholders already using FRA Atlas to create transparent, 
            efficient, and community-centered forest governance.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/auth'}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-gray-400 text-white hover:bg-gray-700 px-10 py-4 text-lg font-semibold rounded-lg"
            >
              Schedule Demo
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
                Empowering sustainable forest governance through advanced technology, 
                ensuring the rights of tribal communities are protected and preserved.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Forest Rights Act 2006 Compliant</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">WebGIS Portal</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Processing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Decision Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              &copy; 2024 FRA Atlas. Supporting tribal communities and sustainable forest management.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <span className="text-sm text-gray-400">Powered by</span>
              <div className="flex items-center gap-2">
                <Satellite className="h-4 w-4 text-green-400" />
                <span className="text-sm">Advanced Geospatial Technology</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
