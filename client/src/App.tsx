import { Component, type ErrorInfo, type ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
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
import { LogOut, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Une erreur est survenue</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "Erreur inattendue"}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                queryClient.clear();
                window.location.href = "/";
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recharger l'application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
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
import LearnerPortal from "@/pages/learner";
import TrainerPortal from "@/pages/trainer-portal";
import EnterprisePortal from "@/pages/enterprise-portal";
import ExpenseNotesPage from "@/pages/expense-notes";
import TrainerInvoicesPage from "@/pages/trainer-invoices-page";
import TrainerCompetencies from "@/pages/trainer-competencies";
import SettingsPage from "@/pages/settings";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import PublicEnrollment from "@/pages/public-enrollment";
import AfgsuSimulator from "@/pages/afgsu-simulator";
import PublicEmargement from "@/pages/public-emargement";
import PublicEnterpriseRegistration from "@/pages/public-enterprise-registration";
import PublicEvaluation from "@/pages/public-evaluation";
import Messaging from "@/pages/messaging";
import CrmPage from "@/pages/crm";
import Reporting from "@/pages/reporting";
import QualityImprovement from "@/pages/quality-improvement";
import CertificationsBadges from "@/pages/certifications-badges";
import AdvancedFeatures from "@/pages/advanced-features";
import TaskListsPage from "@/pages/task-lists";
import IntegrationWebsite from "@/pages/integration-website";
import DataMigration from "@/pages/data-migration";
import CommandPalette from "@/components/CommandPalette";
import NotificationBell from "@/components/NotificationBell";

/** Redirect based on role: trainee -> learner-portal, enterprise -> enterprise-portal */
function RoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && !allowedRoles.includes(user.role)) {
    const portalRedirects: Record<string, string> = {
      trainee: "/learner-portal",
      enterprise: "/enterprise-portal",
    };
    return <Redirect to={portalRedirects[user.role] || "/"} />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/programs">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><Programs /></RoleGuard>}</Route>
      <Route path="/sessions">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><Sessions /></RoleGuard>}</Route>
      <Route path="/trainees">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><Trainees /></RoleGuard>}</Route>
      <Route path="/trainers">{() => <RoleGuard allowedRoles={["admin"]}><Trainers /></RoleGuard>}</Route>
      <Route path="/enterprises">{() => <RoleGuard allowedRoles={["admin"]}><Enterprises /></RoleGuard>}</Route>
      <Route path="/enrollments">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><Enrollments /></RoleGuard>}</Route>
      <Route path="/email-templates">{() => <RoleGuard allowedRoles={["admin"]}><EmailTemplates /></RoleGuard>}</Route>
      <Route path="/documents">{() => <RoleGuard allowedRoles={["admin"]}><Documents /></RoleGuard>}</Route>
      <Route path="/prospects">{() => <RoleGuard allowedRoles={["admin"]}><Prospects /></RoleGuard>}</Route>
      <Route path="/quotes">{() => <RoleGuard allowedRoles={["admin"]}><Quotes /></RoleGuard>}</Route>
      <Route path="/invoices">{() => <RoleGuard allowedRoles={["admin"]}><Invoices /></RoleGuard>}</Route>
      <Route path="/financial-reports">{() => <RoleGuard allowedRoles={["admin"]}><FinancialReports /></RoleGuard>}</Route>
      <Route path="/attendance">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><Attendance /></RoleGuard>}</Route>
      <Route path="/quality">{() => <RoleGuard allowedRoles={["admin"]}><QualityDashboard /></RoleGuard>}</Route>
      <Route path="/surveys">{() => <RoleGuard allowedRoles={["admin"]}><Surveys /></RoleGuard>}</Route>
      <Route path="/elearning">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><Elearning /></RoleGuard>}</Route>
      <Route path="/learner-portal/:section?" component={LearnerPortal} />
      <Route path="/expense-notes">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><ExpenseNotesPage /></RoleGuard>}</Route>
      <Route path="/trainer-invoices">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><TrainerInvoicesPage /></RoleGuard>}</Route>
      <Route path="/trainer-competencies">{() => <RoleGuard allowedRoles={["admin"]}><TrainerCompetencies /></RoleGuard>}</Route>
      <Route path="/trainer-portal/:section?" component={TrainerPortal} />
      <Route path="/enterprise-portal" component={EnterprisePortal} />
      <Route path="/messaging" component={Messaging} />
      <Route path="/crm">{() => <RoleGuard allowedRoles={["admin"]}><CrmPage /></RoleGuard>}</Route>
      <Route path="/reporting">{() => <RoleGuard allowedRoles={["admin"]}><Reporting /></RoleGuard>}</Route>
      <Route path="/quality-improvement">{() => <RoleGuard allowedRoles={["admin"]}><QualityImprovement /></RoleGuard>}</Route>
      <Route path="/certifications-badges">{() => <RoleGuard allowedRoles={["admin"]}><CertificationsBadges /></RoleGuard>}</Route>
      <Route path="/advanced-features">{() => <RoleGuard allowedRoles={["admin"]}><AdvancedFeatures /></RoleGuard>}</Route>
      <Route path="/task-lists">{() => <RoleGuard allowedRoles={["admin", "trainer"]}><TaskListsPage /></RoleGuard>}</Route>
      <Route path="/integration">{() => <RoleGuard allowedRoles={["admin"]}><IntegrationWebsite /></RoleGuard>}</Route>
      <Route path="/data-migration">{() => <RoleGuard allowedRoles={["admin"]}><DataMigration /></RoleGuard>}</Route>
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

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background">
          <SidebarTrigger className="md:hidden" data-testid="button-sidebar-toggle" />
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 px-3"
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Rechercher...</span>
              <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
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
            <NotificationBell />
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
      <CommandPalette />
    </SidebarProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/inscription" component={PublicEnrollment} />
              <Route path="/simulateur-afgsu" component={AfgsuSimulator} />
              <Route path="/inscription-entreprise" component={PublicEnterpriseRegistration} />
              <Route path="/emargement/:token" component={PublicEmargement} />
              <Route path="/evaluation/:token" component={PublicEvaluation} />
              <Route>
                <AuthProvider>
                  <ErrorBoundary>
                    <AppShell />
                  </ErrorBoundary>
                </AuthProvider>
              </Route>
            </Switch>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
