import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TreePine, ShieldCheck, UsersRound, Satellite, Brain, Globe, Lock, Sparkles, Network, MapPin, Cpu } from "lucide-react";
import { useLocation } from "wouter";
import forestSunriseImage from "@assets/generated_images/Forest_sunrise_panoramic_background_2afc9c55.png";
import secureAccessImage from "@assets/generated_images/Secure_forest_access_authentication_9aa9e8b9.png";

// Form schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  requestedRole: z.string().min(1, "Please select a role"),
  state: z.string().optional(),
  district: z.string().optional(),
  organizationName: z.string().optional(),
  justification: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Static roles data - no API fetching needed
  const availableRoles = [
    {
      name: 'admin',
      displayName: 'System Administrator',
      description: 'Full system control, user management, config, data & model governance.'
    },
    {
      name: 'state',
      displayName: 'State Officer',
      description: 'Oversee FRA progress and data quality at state level; approve district-level decisions.'
    },
    {
      name: 'district',
      displayName: 'District Officer',
      description: 'Day-to-day verification and approvals for claims inside their district.'
    },
    {
      name: 'field',
      displayName: 'Field Officer',
      description: 'Mobile-first field verification, document collection, and on-ground linking.'
    },
    {
      name: 'ngo',
      displayName: 'NGO Partner',
      description: 'Support claimants, submit supporting evidence, and suggest interventions.'
    },
    {
      name: 'public',
      displayName: 'Public Viewer',
      description: 'Transparent public access to aggregated FRA outcomes (no sensitive PII).'
    }
  ];

  // Redirect if already authenticated (exclude anonymous users)
  useEffect(() => {
    if (!isLoading && user && user.id !== 'anonymous-user') {
      console.log('User authenticated, redirecting:', user);
      window.location.href = '/';
    }
  }, [user, isLoading]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      requestedRole: "public",
      state: "",
      district: "",
      organizationName: "",
      justification: ""
    },
  });

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-lg font-medium text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

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
        {/* Left Side - Authentication Forms */}
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
                <ShieldCheck className="w-4 h-4 mr-2" />
                Secure Access Portal
              </Badge>
            </div>

            {/* Auth Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/80 border border-slate-700">
                <TabsTrigger 
                  value="login" 
                  data-testid="tab-login"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  data-testid="tab-register"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card className="border-2 border-slate-700 shadow-2xl bg-white/95 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-gray-900">Login to your account</CardTitle>
                    <CardDescription className="text-gray-600">
                      Access the Forest Rights Act management system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your.email@example.com" 
                                  data-testid="input-email"
                                  className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter your password" 
                                  data-testid="input-password"
                                  className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition-all duration-200 shadow-lg" 
                          disabled={loginMutation.isPending}
                          data-testid="button-login"
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            "Login"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card className="border-2 border-slate-700 shadow-2xl bg-white/95 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-gray-900">Create new account</CardTitle>
                    <CardDescription className="text-gray-600">
                      Join the Forest Rights Act management system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-medium">First Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="First name" 
                                    data-testid="input-first-name"
                                    className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-medium">Last Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Last name" 
                                    data-testid="input-last-name"
                                    className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your.email@example.com" 
                                  data-testid="input-register-email"
                                  className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Create a password (6+ characters)" 
                                  data-testid="input-register-password"
                                  className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Confirm Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Confirm your password" 
                                  data-testid="input-confirm-password"
                                  className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="requestedRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Role</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedRole(value);
                              }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11">
                                    <SelectValue placeholder="Select your role">
                                      {field.value && availableRoles.find((role: any) => role.name === field.value)?.displayName}
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="min-w-[400px]">
                                  {availableRoles.map((role: any) => (
                                    <SelectItem key={role.name} value={role.name} className="data-[highlighted]:bg-green-50">
                                      <div className="flex flex-col gap-1 py-1">
                                        <span className="font-medium">{role.displayName}</span>
                                        <span className="text-xs text-gray-600 leading-relaxed">
                                          {role.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedRole === 'field' || selectedRole === 'district' || selectedRole === 'state' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={registerForm.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-medium">State</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter state" 
                                      className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {(selectedRole === 'district' || selectedRole === 'field') && (
                              <FormField
                                control={registerForm.control}
                                name="district"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-medium">District</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Enter district" 
                                        className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        ) : null}

                        {selectedRole === 'ngo' && (
                          <FormField
                            control={registerForm.control}
                            name="organizationName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-medium">Organization Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your NGO/organization name" 
                                    className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 h-11"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {selectedRole !== 'public' && (
                          <FormField
                            control={registerForm.control}
                            name="justification"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-medium">Justification</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Please explain why you need this role access..." 
                                    className="border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <Button 
                          type="submit" 
                          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition-all duration-200 shadow-lg" 
                          disabled={registerMutation.isPending}
                          data-testid="button-register"
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
            
            <h2 className="text-4xl font-bold mb-6 text-white">Digitizing Forest Rights for India</h2>
            <p className="text-xl leading-relaxed mb-8 text-green-100 font-medium">
              AI-powered platform for managing Forest Rights Act claims across India. 
              Streamline documentation, verification, and decision support for sustainable forest management.
            </p>
            
            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3 border border-white/10">
                  <ShieldCheck className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">Secure Access</h3>
                <p className="text-sm text-green-100">Role-based permissions</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3 border border-white/10">
                  <Brain className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">AI Processing</h3>
                <p className="text-sm text-green-100">Intelligent document analysis</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3 border border-white/10">
                  <Globe className="h-8 w-8 mx-auto text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">WebGIS Maps</h3>
                <p className="text-sm text-green-100">Interactive spatial data</p>
              </div>
              
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-3 border border-white/10">
                  <UsersRound className="h-8 w-8 mx-auto text-white" />
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