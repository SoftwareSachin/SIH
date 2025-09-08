import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/useSimpleAuth";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import SimpleAuthPage from "@/pages/simple-auth";
import Claims from "@/pages/claims";
import WebGIS from "@/pages/webgis";
import AIProcessing from "@/pages/ai-processing";
import AssetDetection from "@/pages/asset-detection";
import DecisionSupport from "@/pages/decision-support";
import DSSPage from "@/pages/dss-page";
import AdminPage from "@/pages/admin";
import { VerificationWorkflowPage } from "@/pages/verification-workflow";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('Simple Auth Debug:', { 
    isAuthenticated, 
    isLoading, 
    user: user?.id,
    userEmail: user?.email,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Dashboard /> : <Landing />}
      </Route>
      <Route path="/landing" component={Landing} />
      <Route path="/auth" component={SimpleAuthPage} />
      <Route path="/claims" component={Claims} />
      <Route path="/webgis" component={WebGIS} />
      <Route path="/ai-processing" component={AIProcessing} />
      <Route path="/asset-detection" component={AssetDetection} />
      <Route path="/decision-support" component={DecisionSupport} />
      <Route path="/dss" component={DSSPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/verification-workflow" component={VerificationWorkflowPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}