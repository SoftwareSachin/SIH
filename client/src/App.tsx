import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Claims from "@/pages/claims";
import WebGIS from "@/pages/webgis";
import AIProcessing from "@/pages/ai-processing";
import AssetDetection from "@/pages/asset-detection";
import DecisionSupport from "@/pages/decision-support";
import DSSPage from "@/pages/dss-page";
import AdminPage from "@/pages/admin";
import { VerificationWorkflowPage } from "@/pages/verification-workflow";
import { NERTester } from "@/components/test/ner-tester";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Router() {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      ) : (
        <>
          <Route path="/" component={isAuthenticated ? Dashboard : Landing} />
          <Route path="/landing" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/claims" component={Claims} />
          <Route path="/webgis" component={WebGIS} />
          <Route path="/ai-processing" component={AIProcessing} />
          <Route path="/asset-detection" component={AssetDetection} />
          <Route path="/test/ner" component={NERTester} />
          <Route path="/decision-support" component={DecisionSupport} />
          <Route path="/dss" component={DSSPage} />
          <Route path="/admin">
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          </Route>
          <Route path="/verification-workflow">
            <ProtectedRoute requiredPermission="access_workflow_management">
              <VerificationWorkflowPage />
            </ProtectedRoute>
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
