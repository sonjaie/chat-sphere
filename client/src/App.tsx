import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthForm } from "@/components/auth/auth-form";
import MessengerPage from "@/pages/messenger";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";
import { AuthService, PresenceService } from "./lib";
import { useEffect } from "react";

function Router() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: AuthService.getCurrentUser,
  });

  // Initialize presence service when user is authenticated
  useEffect(() => {
    if (currentUser?.id) {
      PresenceService.initialize(currentUser.id);
      
      // Cleanup on unmount
      return () => {
        PresenceService.cleanup();
      };
    }
  }, [currentUser?.id]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthForm />;
  }

  return (
    <Switch>
      <Route path="/" component={MessengerPage} />
      <Route path="/messenger" component={MessengerPage} />
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
