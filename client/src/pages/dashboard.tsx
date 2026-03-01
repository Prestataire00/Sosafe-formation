import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Calendar,
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
  Euro,
} from "lucide-react";
import type { Program, Session, Trainer, Trainee, Enterprise, Enrollment } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

const sessionStatusMap: Record<string, string> = {
  planned: "Planifiée",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

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
    <PageLayout>
      <PageHeader
        title={greeting}
        subtitle={
          user?.role === "admin"
            ? "Vue d'ensemble de l'activité SO'SAFE"
            : user?.role === "trainer"
              ? "Vos sessions et formations"
              : "Votre espace de formation"
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Formations"
          value={programs?.length ?? 0}
          icon={BookOpen}
          color="primary"
          subtitle={`${certifyingPrograms.length} certifiante${certifyingPrograms.length > 1 ? "s" : ""}`}
          loading={loading}
          testId="card-stat-programs"
        />
        <StatCard
          title="Sessions actives"
          value={activeSessions.length}
          icon={Calendar}
          color="info"
          subtitle="En cours / Planifiées"
          loading={loading}
          testId="card-stat-sessions"
        />
        <StatCard
          title="Inscriptions"
          value={activeEnrollments.length}
          icon={UserCheck}
          color="success"
          subtitle="Stagiaires inscrits"
          loading={loading}
          testId="card-stat-enrollments"
        />
        {user?.role === "admin" ? (
          <StatCard
            title="Chiffre d'affaires"
            value={invoiceStats ? `${(invoiceStats.paid / 100).toLocaleString("fr-FR")} €` : "0 €"}
            icon={Euro}
            color="orange"
            subtitle={invoiceStats ? `${invoiceStats.count} facture${invoiceStats.count > 1 ? "s" : ""}` : ""}
            loading={loading}
            testId="card-stat-revenue"
          />
        ) : (
          <StatCard
            title="Formateurs"
            value={trainers?.length ?? 0}
            icon={Users}
            color="purple"
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
            color="purple"
            subtitle="Clients actifs"
            loading={loading}
            testId="card-stat-enterprises"
          />
          <StatCard
            title="Satisfaction moyenne"
            value={surveyStats?.averageRating ? `${surveyStats.averageRating}/5` : "N/A"}
            icon={Star}
            color="warning"
            subtitle={surveyStats ? `${surveyStats.totalResponses} réponse${surveyStats.totalResponses > 1 ? "s" : ""}` : ""}
            loading={loading}
            testId="card-stat-satisfaction"
          />
          <StatCard
            title="Impayés"
            value={invoiceStats ? `${((invoiceStats.pending + invoiceStats.overdue) / 100).toLocaleString("fr-FR")} €` : "0 €"}
            icon={CreditCard}
            color="destructive"
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
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-info/10">
              <Clock className="w-4 h-4 text-info" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : recentSessions.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Aucune session"
                description="Aucune session pour le moment"
              />
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => {
                  const program = programs?.find((p) => p.id === session.programId);
                  const enrolledCount = enrollments?.filter((e) => e.sessionId === session.id && e.status !== "cancelled").length || 0;
                  return (
                    <div key={session.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors" data-testid={`dashboard-session-${session.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {program?.title} &middot; {new Date(session.startDate).toLocaleDateString("fr-FR")} &middot; {enrolledCount}/{session.maxParticipants} inscrits
                        </p>
                      </div>
                      <StatusBadge status={session.status} label={sessionStatusMap[session.status] || session.status} />
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
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-success/10">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sessions terminées</p>
                  <p className="text-xs text-muted-foreground">
                    {sessions?.filter((s) => s.status === "completed").length ?? 0} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-info/10">
                  <Clock className="w-4 h-4 text-info" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sessions en cours</p>
                  <p className="text-xs text-muted-foreground">
                    {sessions?.filter((s) => s.status === "ongoing").length ?? 0} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-warning/10">
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sessions planifiées</p>
                  <p className="text-xs text-muted-foreground">
                    {sessions?.filter((s) => s.status === "planned").length ?? 0} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple/10">
                  <Award className="w-4 h-4 text-purple" />
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
    </PageLayout>
  );
}
