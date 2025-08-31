import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TreePine, Shield, Users, Map, BarChart3 } from "lucide-react";
import forestSunriseImage from "@assets/generated_images/Forest_sunrise_panoramic_background_2afc9c55.png";
import secureAccessImage from "@assets/generated_images/Secure_forest_access_authentication_9aa9e8b9.png";

interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  token: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return response.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      // Store the token for future requests
      localStorage.setItem('auth_token', data.token);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user.firstName}!`,
      });

      // Reload the page to trigger auth state change
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900">
      {/* Background Forest Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={forestSunriseImage} 
          alt="Forest landscape background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/70"></div>
      </div>
      
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side - Login Form */}
        <div className="flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Brand Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-4 rounded-xl shadow-lg">
                  <TreePine className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">FRA Atlas</h1>
              <p className="text-gray-300 text-lg">Forest Rights Act Management System</p>
              <Badge variant="outline" className="mt-3 px-4 py-1 text-green-300 border-green-300 bg-green-950/30">
                <Shield className="w-4 h-4 mr-2" />
                Secure Access Portal
              </Badge>
            </div>

            {/* Login Card */}
            <Card className="border-2 border-slate-700 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-2xl font-bold text-gray-900">Login to your account</CardTitle>
                <p className="text-center text-gray-600 mt-2">Access the Forest Rights Act management system</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      disabled={loginMutation.isPending}
                      className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-12"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={loginMutation.isPending}
                      className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-12"
                      required
                      data-testid="input-password"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition-all duration-200 shadow-lg" 
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Development Mode
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    For testing purposes, you can use any email and password combination.
                    The system will automatically create a developer account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Right Side - Information Panel */}
        <div className="hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-green-700/90 to-blue-700/90">
          <div className="text-center text-white max-w-lg">
            <div className="mb-8">
              <img 
                src={secureAccessImage} 
                alt="Secure forest access authentication"
                className="w-full h-64 object-cover rounded-xl shadow-xl mb-6"
              />
            </div>
            
            <h2 className="text-3xl font-bold mb-6">Digitizing Forest Rights for India</h2>
            <p className="text-lg leading-relaxed mb-8 text-green-100">
              AI-powered platform for managing Forest Rights Act claims across India. 
              Streamline documentation, verification, and decision support for sustainable forest management.
            </p>
            
            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3">
                  <Shield className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">Secure Access</h3>
                <p className="text-sm text-green-100">Role-based permissions</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3">
                  <BarChart3 className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">AI Processing</h3>
                <p className="text-sm text-green-100">Intelligent document analysis</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3">
                  <Map className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">WebGIS Maps</h3>
                <p className="text-sm text-green-100">Interactive spatial data</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3">
                  <Users className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">Multi-stakeholder</h3>
                <p className="text-sm text-green-100">Collaborative platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}