import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  ClipboardList,
  Target,
  ShieldCheck,
  Euro,
  CalendarDays,
  MapPin,
} from "lucide-react";
import type { Enrollment, Session, Trainee, Program, Invoice } from "@shared/schema";
import {
  EnterpriseCertification,
  getRecyclingStatus,
  formatDate,
  formatCurrency,
} from "./helpers";

const CHART_COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#6b7280"];

interface EnterpriseDashboardTabProps {
  enrollments: Enrollment[];
  sessions: Session[];
  trainees: Trainee[];
  programs: Program[];
  certifications: EnterpriseCertification[];
  invoices: Invoice[];
  sessionMap: Map<string, Session>;
  traineeMap: Map<string, Trainee>;
  programMap: Map<string, Program>;
}

export default function EnterpriseDashboardTab({
  enrollments,
  sessions,
  trainees,
  programs,
  certifications,
  invoices,
  sessionMap,
  traineeMap,
  programMap,
}: EnterpriseDashboardTabProps) {
  // ============================================================
  // KPI Computations
  // ============================================================

  const totalTrainees = trainees.length;

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status !== "completed" && e.status !== "cancelled"),
    [enrollments],
  );

  const completionRate = useMemo(() => {
    if (enrollments.length === 0) return 0;
    const completed = enrollments.filter((e) => e.status === "completed").length;
    return Math.round((completed / enrollments.length) * 100);
  }, [enrollments]);

  const validCertifications = useMemo(
    () =>
      certifications.filter(
        (cert) => getRecyclingStatus(cert.computedExpiresAt).status === "ok",
      ).length,
    [certifications],
  );

  const pendingInvoiceAmount = useMemo(() => {
    const pending = invoices.filter(
      (inv) =>
        inv.status === "sent" || inv.status === "partial" || inv.status === "overdue",
    );
    return pending.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);
  }, [invoices]);

  // ============================================================
  // Chart Data: Completion par formation
  // ============================================================

  const completionByProgram = useMemo(() => {
    const programStats: Record<string, { total: number; completed: number; title: string }> = {};

    for (const enrollment of enrollments) {
      const session = sessionMap.get(enrollment.sessionId);
      if (!session) continue;

      const programId = session.programId;
      const program = programMap.get(programId);
      const programTitle = program?.title || "Programme inconnu";

      if (!programStats[programId]) {
        programStats[programId] = { total: 0, completed: 0, title: programTitle };
      }
      programStats[programId].total += 1;
      if (enrollment.status === "completed") {
        programStats[programId].completed += 1;
      }
    }

    return Object.values(programStats).map((stat) => ({
      programTitle:
        stat.title.length > 25 ? stat.title.substring(0, 25) + "..." : stat.title,
      completionRate:
        stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
    }));
  }, [enrollments, sessionMap, programMap]);

  // ============================================================
  // Chart Data: Repartition des inscriptions
  // ============================================================

  const enrollmentsByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};

    for (const enrollment of enrollments) {
      const status = enrollment.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    const statusLabels: Record<string, string> = {
      pending: "En attente",
      registered: "Inscrit",
      confirmed: "Confirme",
      attended: "Present",
      completed: "Termine",
      cancelled: "Annule",
      no_show: "Absent",
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    }));
  }, [enrollments]);

  // ============================================================
  // Prochaines sessions
  // ============================================================

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => new Date(s.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
      .map((session) => {
        const enrolledCount = enrollments.filter(
          (e) => e.sessionId === session.id,
        ).length;
        return { ...session, enrolledCount };
      });
  }, [sessions, enrollments]);

  // ============================================================
  // Performance par apprenant
  // ============================================================

  const traineePerformance = useMemo(() => {
    const stats: Record<
      string,
      { traineeId: string; name: string; total: number; completed: number }
    > = {};

    for (const enrollment of enrollments) {
      const trainee = traineeMap.get(enrollment.traineeId);
      if (!trainee) continue;

      if (!stats[trainee.id]) {
        stats[trainee.id] = {
          traineeId: trainee.id,
          name: `${trainee.firstName} ${trainee.lastName}`,
          total: 0,
          completed: 0,
        };
      }
      stats[trainee.id].total += 1;
      if (enrollment.status === "completed") {
        stats[trainee.id].completed += 1;
      }
    }

    return Object.values(stats)
      .map((s) => ({
        ...s,
        completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 10);
  }, [enrollments, traineeMap]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total apprenants</p>
                <p className="text-2xl font-bold">{totalTrainees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inscriptions actives</p>
                <p className="text-2xl font-bold">{activeEnrollments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de completion</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Certifications valides</p>
                <p className="text-2xl font-bold">{validCertifications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Euro className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Factures en attente</p>
                <p className="text-2xl font-bold">{formatCurrency(pendingInvoiceAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Completion par formation */}
          <Card>
            <CardHeader>
              <CardTitle>Completion par formation</CardTitle>
            </CardHeader>
            <CardContent>
              {completionByProgram.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnee
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={completionByProgram}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="programTitle"
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Taux de completion"]}
                    />
                    <Bar dataKey="completionRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Repartition des inscriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Repartition des inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnee
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={enrollmentsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {enrollmentsByStatus.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, "Inscriptions"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Prochaines sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Prochaines sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnee
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.startDate)}
                        </p>
                        {session.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.location}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {session.enrolledCount}
                        </span>
                        <p className="text-xs text-muted-foreground">inscrits</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance par apprenant */}
          <Card>
            <CardHeader>
              <CardTitle>Performance par apprenant</CardTitle>
            </CardHeader>
            <CardContent>
              {traineePerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnee
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employe</TableHead>
                      <TableHead className="text-center">Inscriptions</TableHead>
                      <TableHead className="text-center">Termine</TableHead>
                      <TableHead>Taux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {traineePerformance.map((perf) => (
                      <TableRow key={perf.traineeId}>
                        <TableCell className="font-medium text-sm">
                          {perf.name}
                        </TableCell>
                        <TableCell className="text-center">{perf.total}</TableCell>
                        <TableCell className="text-center">{perf.completed}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={perf.completionRate}
                              className="h-2 w-16"
                            />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {perf.completionRate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
