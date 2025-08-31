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
import governmentMeetingImage2 from "@assets/generated_images/Government_forest_rights_meeting_dd699004.png";
import tribalVillageImage from "@assets/generated_images/Tribal_village_forest_community_6a9d4cf0.png";
import forestOfficerDigitalImage from "@assets/generated_images/Forest_officer_digital_documentation_58d31e36.png";
import satelliteForestImage from "@assets/generated_images/Satellite_forest_mapping_view_060d3bfa.png";
import ministryTribalAffairsImage from "@assets/generated_images/Ministry_tribal_affairs_office_9ca7af8a.png";
import districtTribalWelfareImage from "@assets/generated_images/District_tribal_welfare_meeting_c10c304e.png";
import forestRevenueImage from "@assets/generated_images/Forest_revenue_department_office_f2ccf6ad.png";
import planningAuthoritiesImage from "@assets/generated_images/Planning_authorities_development_meeting_9438b4ad.png";
import ngoCommunitiesImage from "@assets/generated_images/NGO_community_awareness_campaign_a50a3fed.png";
import fieldOfficersImage from "@assets/generated_images/Field_officers_data_collection_c12e1cfc.png";
import webgisWorkstationImage from "@assets/generated_images/WebGIS_geospatial_analysis_workstation_72df1d4f.png";
import aiProcessingImage from "@assets/generated_images/AI_document_processing_system_9316c4d4.png";
import decisionSupportImage from "@assets/generated_images/Decision_support_analytics_dashboard_b15f56b5.png";

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
                
              </div>
              
              <div className="relative">
                <img 
                  src={governmentMeetingImage2} 
                  alt="Government officials reviewing forest rights documentation" 
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
          
          {/* Technology & Community Context */}
          <div className="mt-16 mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div>
                <img 
                  src={satelliteForestImage} 
                  alt="Satellite mapping view of forest boundaries" 
                  className="rounded-xl shadow-xl w-full h-48 object-cover"
                />
                <div className="mt-4 text-center">
                  <h4 className="font-semibold text-gray-900">Satellite Analysis</h4>
                  <p className="text-sm text-gray-600">Geospatial mapping and boundary detection</p>
                </div>
              </div>
              <div>
                <img 
                  src={tribalVillageImage} 
                  alt="Tribal village community in forest setting" 
                  className="rounded-xl shadow-xl w-full h-48 object-cover"
                />
                <div className="mt-4 text-center">
                  <h4 className="font-semibold text-gray-900">Community Focus</h4>
                  <p className="text-sm text-gray-600">Tribal villages and forest communities</p>
                </div>
              </div>
              <div>
                <img 
                  src={forestAerialImage} 
                  alt="Aerial view of forest conservation area" 
                  className="rounded-xl shadow-xl w-full h-48 object-cover"
                />
                <div className="mt-4 text-center">
                  <h4 className="font-semibold text-gray-900">Forest Conservation</h4>
                  <p className="text-sm text-gray-600">Environmental protection and management</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-200 bg-white overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={webgisWorkstationImage} 
                  alt="Professional GIS workstation with satellite imagery analysis"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-emerald-50 text-emerald-700 border-emerald-100 p-2 rounded-lg border backdrop-blur-sm bg-white/90">
                    <Map className="h-6 w-6" />
                  </div>
                </div>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">WebGIS Portal</CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mt-1">Geospatial Analysis</Badge>
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

            <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-green-200 bg-white overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={aiProcessingImage} 
                  alt="AI document processing system with OCR analysis"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-green-50 text-green-700 border-green-100 p-2 rounded-lg border backdrop-blur-sm bg-white/90">
                    <Brain className="h-6 w-6" />
                  </div>
                </div>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">AI Processing</CardTitle>
                    <Badge className="bg-green-100 text-green-700 border-green-200 mt-1">Machine Learning</Badge>
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

            <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-teal-200 bg-white overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={decisionSupportImage} 
                  alt="Analytics dashboard with data visualizations for decision support"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-teal-50 text-teal-700 border-teal-100 p-2 rounded-lg border backdrop-blur-sm bg-white/90">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Decision Support</CardTitle>
                    <Badge className="bg-teal-100 text-teal-700 border-teal-200 mt-1">Analytics</Badge>
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
            <div className="grid grid-cols-1 gap-6">
              <img 
                src={fieldOfficerImage} 
                alt="Field officer documenting forest rights with digital technology" 
                className="rounded-xl shadow-xl w-full h-48 object-cover"
              />
              <img 
                src={forestOfficerDigitalImage} 
                alt="Forest officer using digital tools for documentation" 
                className="rounded-xl shadow-xl w-full h-48 object-cover"
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
                image: ministryTribalAffairsImage,
                alt: "Ministry of Tribal Affairs officials reviewing forest rights policies",
                color: "bg-emerald-50 text-emerald-700 border-emerald-100"
              },
              {
                title: "District Tribal Welfare",
                description: "Ground-level implementation, claim verification, community engagement, and beneficiary support.",
                icon: <Users className="h-7 w-7" />,
                image: districtTribalWelfareImage,
                alt: "District officials meeting with tribal community representatives",
                color: "bg-green-50 text-green-700 border-green-100"
              },
              {
                title: "Forest & Revenue Departments",
                description: "Land records integration, boundary verification, compliance monitoring, and departmental coordination.",
                icon: <TreePine className="h-7 w-7" />,
                image: forestRevenueImage,
                alt: "Forest and revenue department officials working with land records",
                color: "bg-teal-50 text-teal-700 border-teal-100"
              },
              {
                title: "Planning Authorities",
                description: "Development scheme integration, budget allocation, impact assessment, and strategic planning.",
                icon: <BarChart3 className="h-7 w-7" />,
                image: planningAuthoritiesImage,
                alt: "Planning commission officials working on development schemes",
                color: "bg-emerald-50 text-emerald-700 border-emerald-100"
              },
              {
                title: "NGOs & Civil Society",
                description: "Community advocacy, awareness campaigns, implementation monitoring, and grassroots support.",
                icon: <Users className="h-7 w-7" />,
                image: ngoCommunitiesImage,
                alt: "NGO workers conducting community awareness campaigns",
                color: "bg-green-50 text-green-700 border-green-100"
              },
              {
                title: "Field Officers",
                description: "Mobile data collection, verification workflows, status tracking, and field-level documentation.",
                icon: <FileText className="h-7 w-7" />,
                image: fieldOfficersImage,
                alt: "Field officers using digital tools for data collection",
                color: "bg-teal-50 text-teal-700 border-teal-100"
              }
            ].map((user, index) => (
              <Card key={index} className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-200 bg-white overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={user.image} 
                    alt={user.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <div className={`${user.color} p-2 rounded-lg border backdrop-blur-sm bg-white/90`}>
                      {user.icon}
                    </div>
                  </div>
                </div>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2">{user.title}</CardTitle>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Authorized Access</Badge>
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
      <div className="py-20 bg-slate-800 text-white">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="bg-slate-700 p-4 rounded-xl inline-block">
              <TreePine className="h-12 w-12 text-gray-300" />
            </div>
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
              className="border-gray-300 text-gray-800 bg-white hover:bg-gray-100 hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-lg"
            >
              System Information
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Brand Section */}
            <div className="col-span-1 lg:col-span-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <TreePine className="h-7 w-7 text-gray-300" />
                </div>
                <span className="text-2xl font-bold text-white">FRA Atlas</span>
              </div>
              <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-lg">
                Comprehensive digital platform for Forest Rights Act implementation, providing 
                advanced tools for transparent forest governance and tribal community empowerment 
                across multiple states in India.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-slate-700 p-1.5 rounded">
                    <Shield className="h-4 w-4 text-gray-300" />
                  </div>
                  <span className="text-gray-300">Forest Rights Act 2006 Compliant</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-slate-700 p-1.5 rounded">
                    <Satellite className="h-4 w-4 text-gray-300" />
                  </div>
                  <span className="text-gray-300">Satellite-Enabled Geospatial Analysis</span>
                </div>
              </div>
            </div>
            
            {/* Platform Features */}
            <div className="col-span-1 lg:col-span-3">
              <h3 className="text-white font-semibold mb-6 text-lg">Platform Modules</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="bg-slate-700 p-1 rounded">
                    <Map className="h-3 w-3 text-gray-400" />
                  </div>
                  <span className="text-gray-400 text-sm">WebGIS Portal</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-700 p-1 rounded">
                    <Brain className="h-3 w-3 text-gray-400" />
                  </div>
                  <span className="text-gray-400 text-sm">AI Document Processing</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-700 p-1 rounded">
                    <BarChart3 className="h-3 w-3 text-gray-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Decision Support System</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-slate-700 p-1 rounded">
                    <FileText className="h-3 w-3 text-gray-400" />
                  </div>
                  <span className="text-gray-400 text-sm">Claims Management</span>
                </li>
              </ul>
            </div>
            
            {/* System Information */}
            <div className="col-span-1 lg:col-span-4">
              <h3 className="text-white font-semibold mb-6 text-lg">System Information</h3>
              <ul className="space-y-3">
                <li className="text-gray-400 text-sm">Technical Documentation</li>
                <li className="text-gray-400 text-sm">User Access Guidelines</li>
                <li className="text-gray-400 text-sm">Data Privacy Policy</li>
                <li className="text-gray-400 text-sm">Security Standards</li>
                <li className="text-gray-400 text-sm">Implementation Coverage</li>
                <li className="text-gray-400 text-sm">Compliance Framework</li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Section */}
          <div className="border-t border-slate-700 mt-16 pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6">
                <p className="text-sm text-gray-400">
                  Forest Rights Act Digital Management Platform
                </p>
                <div className="hidden lg:block w-px h-4 bg-slate-700"></div>
                <p className="text-sm text-gray-500">
                  Government of India Initiative
                </p>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-400">System Operational</span>
                </div>
                <span className="text-xs text-gray-500">
                  © 2025 Government of India
                </span>
                <span className="text-xs text-gray-500">
                  Last Updated: August 2025
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
