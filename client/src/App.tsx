import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Dashboard from "@/pages/dashboard";
import Programs from "@/pages/programs";
import Sessions from "@/pages/sessions";
import Trainees from "@/pages/trainees";
import Trainers from "@/pages/trainers";
import Enterprises from "@/pages/enterprises";
import Enrollments from "@/pages/enrollments";
import EmailTemplates from "@/pages/email-templates";
import Documents from "@/pages/documents";
import Prospects from "@/pages/prospects";
import Quotes from "@/pages/quotes";
import Invoices from "@/pages/invoices";
import FinancialReports from "@/pages/financial-reports";
import Attendance from "@/pages/attendance";
import QualityDashboard from "@/pages/quality-dashboard";
import Surveys from "@/pages/surveys";
import Elearning from "@/pages/elearning";
import LearnerPortal from "@/pages/learner-portal";
import TrainerPortal from "@/pages/trainer-portal";
import EnterprisePortal from "@/pages/enterprise-portal";
import SettingsPage from "@/pages/settings";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/programs" component={Programs} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/trainees" component={Trainees} />
      <Route path="/trainers" component={Trainers} />
      <Route path="/enterprises" component={Enterprises} />
      <Route path="/enrollments" component={Enrollments} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/documents" component={Documents} />
      <Route path="/prospects" component={Prospects} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/financial-reports" component={FinancialReports} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/quality" component={QualityDashboard} />
      <Route path="/surveys" component={Surveys} />
      <Route path="/elearning" component={Elearning} />
      <Route path="/learner-portal" component={LearnerPortal} />
      <Route path="/trainer-portal" component={TrainerPortal} />
      <Route path="/enterprise-portal" component={EnterprisePortal} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-3 text-center">
          <Skeleton className="h-10 w-10 rounded-md mx-auto" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </span>
              </div>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
