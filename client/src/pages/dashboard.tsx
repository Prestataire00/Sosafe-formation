import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Award,
  UserCheck,
  CreditCard,
  Star,
  CheckSquare,
  Euro,
} from "lucide-react";
import type { Program, Session, Trainer, Trainee, Enterprise, Enrollment, Invoice } from "@shared/schema";
import { useAuth } from "@/lib/auth";

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
  testId,
}: {
  title: string;
  value: string | number;
  icon: typeof BookOpen;
  subtitle?: string;
  loading?: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    planned: { label: "Planifiée", className: "bg-accent text-accent-foreground" },
    ongoing: { label: "En cours", className: "bg-primary/10 text-primary dark:bg-primary/20" },
    completed: { label: "Terminée", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
  };
  const v = variants[status] || variants.planned;
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: programs, isLoading: loadingPrograms } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });
  const { data: sessions, isLoading: loadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: trainers, isLoading: loadingTrainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });
  const { data: trainees, isLoading: loadingTrainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });
  const { data: enterprises, isLoading: loadingEnterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });
  const { data: invoiceStats } = useQuery<{ total: number; paid: number; pending: number; overdue: number; count: number }>({
    queryKey: ["/api/invoices/stats"],
  });
  const { data: surveyStats } = useQuery<{ totalResponses: number; averageRating: number; ratingsCount: number }>({
    queryKey: ["/api/survey-responses/stats"],
  });

  const loading = loadingPrograms || loadingSessions || loadingTrainers || loadingTrainees || loadingEnterprises || loadingEnrollments;

  const activeSessions = sessions?.filter((s) => s.status === "ongoing" || s.status === "planned") || [];
  const certifyingPrograms = programs?.filter((p) => p.certifying) || [];
  const activeEnrollments = enrollments?.filter((e) => e.status !== "cancelled") || [];

  const recentSessions = sessions
    ?.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5) || [];

  const greeting = user ? `Bonjour, ${user.firstName}` : "Tableau de bord";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">{greeting}</h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === "admin"
            ? "Vue d'ensemble de l'activité SO'SAFE"
            : user?.role === "trainer"
              ? "Vos sessions et formations"
              : "Votre espace de formation"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Formations"
          value={programs?.length ?? 0}
          icon={BookOpen}
          subtitle={`${certifyingPrograms.length} certifiante${certifyingPrograms.length > 1 ? "s" : ""}`}
          loading={loading}
          testId="card-stat-programs"
        />
        <StatCard
          title="Sessions actives"
          value={activeSessions.length}
          icon={Calendar}
          subtitle="En cours / Planifiées"
          loading={loading}
          testId="card-stat-sessions"
        />
        <StatCard
          title="Inscriptions"
          value={activeEnrollments.length}
          icon={UserCheck}
          subtitle="Stagiaires inscrits"
          loading={loading}
          testId="card-stat-enrollments"
        />
        {user?.role === "admin" ? (
          <StatCard
            title="Chiffre d'affaires"
            value={invoiceStats ? `${(invoiceStats.paid / 100).toLocaleString("fr-FR")} €` : "0 €"}
            icon={Euro}
            subtitle={invoiceStats ? `${invoiceStats.count} facture${invoiceStats.count > 1 ? "s" : ""}` : ""}
            loading={loading}
            testId="card-stat-revenue"
          />
        ) : (
          <StatCard
            title="Formateurs"
            value={trainers?.length ?? 0}
            icon={Users}
            subtitle="Disponibles"
            loading={loading}
            testId="card-stat-trainers"
          />
        )}
      </div>

      {user?.role === "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Entreprises"
            value={enterprises?.length ?? 0}
            icon={Building2}
            subtitle="Clients actifs"
            loading={loading}
            testId="card-stat-enterprises"
          />
          <StatCard
            title="Satisfaction moyenne"
            value={surveyStats?.averageRating ? `${surveyStats.averageRating}/5` : "N/A"}
            icon={Star}
            subtitle={surveyStats ? `${surveyStats.totalResponses} réponse${surveyStats.totalResponses > 1 ? "s" : ""}` : ""}
            loading={loading}
            testId="card-stat-satisfaction"
          />
          <StatCard
            title="Impayés"
            value={invoiceStats ? `${((invoiceStats.pending + invoiceStats.overdue) / 100).toLocaleString("fr-FR")} €` : "0 €"}
            icon={CreditCard}
            subtitle={invoiceStats?.overdue ? `dont ${(invoiceStats.overdue / 100).toLocaleString("fr-FR")} € en retard` : ""}
            loading={loading}
            testId="card-stat-unpaid"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Sessions récentes</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Aucune session pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => {
                  const program = programs?.find((p) => p.id === session.programId);
                  const enrolledCount = enrollments?.filter((e) => e.sessionId === session.id && e.status !== "cancelled").length || 0;
                  return (
                    <div key={session.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-accent/30" data-testid={`dashboard-session-${session.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {program?.title} &middot; {new Date(session.startDate).toLocaleDateString("fr-FR")} &middot; {enrolledCount}/{session.maxParticipants} inscrits
                        </p>
                      </div>
                      <SessionStatusBadge status={session.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Activité</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-md bg-accent/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sessions terminées</p>
                  <p className="text-xs text-muted-foreground">
                    {sessions?.filter((s) => s.status === "completed").length ?? 0} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-accent/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 dark:bg-primary/20">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sessions en cours</p>
                  <p className="text-xs text-muted-foreground">
                    {sessions?.filter((s) => s.status === "ongoing").length ?? 0} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-accent/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sessions planifiées</p>
                  <p className="text-xs text-muted-foreground">
                    {sessions?.filter((s) => s.status === "planned").length ?? 0} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-accent/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Formations certifiantes</p>
                  <p className="text-xs text-muted-foreground">
                    {certifyingPrograms.length} formations
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
