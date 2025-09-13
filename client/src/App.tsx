import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/theme-provider";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
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
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/landing" component={Landing} />
      <Route path="/claims" component={Claims} />
      <Route path="/webgis" component={WebGIS} />
      <Route path="/ai-processing" component={AIProcessing} />
      <Route path="/asset-detection" component={AssetDetection} />
      <Route path="/decision-support" component={DecisionSupport} />
      <Route path="/dss" component={DSSPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/verification-workflow" component={VerificationWorkflowPage} />
      <Route path="/verification-workflow/:claimId" component={VerificationWorkflowPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="fra-atlas-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}