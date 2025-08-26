import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Claims from "@/pages/claims";
import WebGIS from "@/pages/webgis";
import AIProcessing from "@/pages/ai-processing";
import DecisionSupport from "@/pages/decision-support";
import { NERTester } from "@/components/test/ner-tester";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/claims" component={Claims} />
          <Route path="/webgis" component={WebGIS} />
          <Route path="/ai-processing" component={AIProcessing} />
          <Route path="/test/ner" component={NERTester} />
          <Route path="/decision-support" component={DecisionSupport} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
