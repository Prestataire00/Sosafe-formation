import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  LineChart,
  Line,
} from "recharts";
import {
  Wifi,
  ShieldCheck,
  Download,
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Calendar,
  TrendingUp,
  Star,
  ThumbsUp,
  Euro,
  FileText,
  ClipboardCheck,
  Globe,
  Monitor,
} from "lucide-react";
import type { ConnectionLog, Session } from "@shared/schema";

// ============================================================
// Helpers
// ============================================================

function formatEuros(centimes: number): string {
  return (centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20ac";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes > 0 ? `${remainingMinutes}min` : ""}`;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

// ============================================================
// Stat Card
// ============================================================

function StatCard({ title, value, icon: Icon, subtitle, loading }: {
  title: string;
  value: string | number;
  icon: typeof Users;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Types
// ============================================================

interface GlobalStats {
  overview: {
    totalPrograms: number;
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    plannedSessions: number;
    totalTrainees: number;
    totalTrainers: number;
    totalEnterprises: number;
    totalEnrollments: number;
    completedEnrollments: number;
    enrollmentCompletionRate: number;
  };
  quality: {
    totalResponses: number;
    avgSatisfaction: number;
    recommendationRate: number;
    successRate: number;
  };
  financial: {
    totalRevenue: number;
    pendingRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    conversionRate: number;
    totalQuotes: number;
  };
  charts: {
    monthlyRevenue: Array<{ month: string; revenue: number; count: number }>;
    monthlyEnrollments: Array<{ month: string; count: number }>;
    modalityStats: { presentiel: number; distance: number; hybrid: number };
    categoryBreakdown: Array<{ name: string; count: number }>;
  };
}

interface QualityReport {
  satisfactionByType: Array<{ type: string; count: number; avgRating: string; avgWeighted: string }>;
  sessionStats: Array<{
    id: string; title: string; startDate: string | null; endDate: string | null;
    totalEnrollments: number; completedEnrollments: number; completionRate: number;
    avgSatisfaction: string | null; responsesCount: number;
  }>;
  qualityActions: { total: number; open: number; inProgress: number; completed: number };
  templates: Array<{ id: string; title: string; category: string }>;
}

// ============================================================
// Connection Logs Tab
// ============================================================

function ConnectionLogsTab() {
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs, isLoading } = useQuery<ConnectionLog[]>({
    queryKey: ["/api/connection-logs"],
  });

  const filtered = (logs || []).filter(log => {
    const matchesUser = !userFilter ||
      log.userName.toLowerCase().includes(userFilter.toLowerCase()) ||
      log.userRole.toLowerCase().includes(userFilter.toLowerCase());
    const matchesFrom = !dateFrom || (log.connectedAt && new Date(log.connectedAt) >= new Date(dateFrom));
    const matchesTo = !dateTo || (log.connectedAt && new Date(log.connectedAt) <= new Date(dateTo + "T23:59:59"));
    return matchesUser && matchesFrom && matchesTo;
  });

  // Aggregate stats
  const uniqueUsers = new Set(filtered.map(l => l.userId)).size;
  const totalDuration = filtered.reduce((sum, l) => sum + (l.duration || 0), 0);
  const avgDuration = filtered.length > 0 ? Math.round(totalDuration / filtered.length) : 0;

  // By role breakdown
  const byRole: Record<string, number> = {};
  filtered.forEach(l => {
    byRole[l.userRole] = (byRole[l.userRole] || 0) + 1;
  });

  const roleLabels: Record<string, string> = {
    admin: "Administrateur",
    trainer: "Formateur",
    trainee: "Apprenant",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total connexions" value={filtered.length} icon={Wifi} loading={isLoading} />
        <StatCard title="Utilisateurs uniques" value={uniqueUsers} icon={Users} loading={isLoading} />
        <StatCard title="Duree totale" value={formatDuration(totalDuration)} icon={Monitor} loading={isLoading} />
        <StatCard title="Duree moyenne" value={formatDuration(avgDuration)} icon={Monitor} loading={isLoading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Input
            placeholder="Filtrer par utilisateur ou role..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* By role badges */}
      <div className="flex gap-2">
        {Object.entries(byRole).map(([role, count]) => (
          <Badge key={role} variant="outline">
            {roleLabels[role] || role}: {count}
          </Badge>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wifi className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Aucun log de connexion</p>
          <p className="text-xs mt-1">Les connexions des utilisateurs apparaitront ici</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Adresse IP</TableHead>
                  <TableHead>Duree</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.userName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[log.userRole] || log.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                    <TableCell className="text-sm">{log.duration ? formatDuration(log.duration) : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.connectedAt ? new Date(log.connectedAt).toLocaleString("fr-FR") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {filtered.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">
          Affichage des 100 premiers resultats sur {filtered.length}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Quality Stats Tab
// ============================================================

function QualityStatsTab() {
  const { data: quality, isLoading } = useQuery<QualityReport>({
    queryKey: ["/api/reporting/quality"],
  });

  const { data: globalStats } = useQuery<GlobalStats>({
    queryKey: ["/api/reporting/global-stats"],
  });

  const evalTypeLabels: Record<string, string> = {
    satisfaction_chaud: "Satisfaction a chaud",
    satisfaction_froid: "Satisfaction a froid",
    skills_pre: "Competences (pre)",
    skills_post: "Competences (post)",
    pedagogical: "Pedagogique",
    general: "General",
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Satisfaction moyenne"
          value={globalStats ? `${globalStats.quality.avgSatisfaction}/5` : "-"}
          icon={Star}
          subtitle="Note moyenne des evaluations"
          loading={isLoading}
        />
        <StatCard
          title="Taux de recommandation"
          value={globalStats ? `${globalStats.quality.recommendationRate}%` : "-"}
          icon={ThumbsUp}
          subtitle="Note >= 4/5"
          loading={isLoading}
        />
        <StatCard
          title="Taux de reussite"
          value={globalStats ? `${globalStats.quality.successRate}%` : "-"}
          icon={GraduationCap}
          subtitle="Enrollments termines"
          loading={isLoading}
        />
        <StatCard
          title="Total reponses"
          value={globalStats?.quality.totalResponses || 0}
          icon={ClipboardCheck}
          loading={isLoading}
        />
      </div>

      {/* Satisfaction by type */}
      {quality?.satisfactionByType && quality.satisfactionByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resultats par type d'evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Reponses</TableHead>
                  <TableHead className="text-right">Note moy.</TableHead>
                  <TableHead className="text-right">Score pondere</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quality.satisfactionByType.map(row => (
                  <TableRow key={row.type}>
                    <TableCell className="font-medium">{evalTypeLabels[row.type] || row.type}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={
                        parseFloat(row.avgRating) >= 4 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        parseFloat(row.avgRating) >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }>
                        {row.avgRating}/5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.avgWeighted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Session performance */}
      {quality?.sessionStats && quality.sessionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Performance par session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Inscrits</TableHead>
                    <TableHead className="text-right">Termines</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Satisfaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quality.sessionStats.filter(s => s.totalEnrollments > 0).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{s.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.startDate ? new Date(s.startDate).toLocaleDateString("fr-FR") : "-"}
                        {s.endDate ? ` - ${new Date(s.endDate).toLocaleDateString("fr-FR")}` : ""}
                      </TableCell>
                      <TableCell className="text-right">{s.totalEnrollments}</TableCell>
                      <TableCell className="text-right">{s.completedEnrollments}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={
                          s.completionRate >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          s.completionRate >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }>
                          {s.completionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.avgSatisfaction ? `${s.avgSatisfaction}/5 (${s.responsesCount})` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality actions */}
      {quality?.qualityActions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Actions qualite Qualiopi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{quality.qualityActions.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{quality.qualityActions.open}</div>
                <p className="text-xs text-muted-foreground">Ouvertes</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{quality.qualityActions.inProgress}</div>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{quality.qualityActions.completed}</div>
                <p className="text-xs text-muted-foreground">Terminees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Exports Tab
// ============================================================

function ExportsTab() {
  const [exportType, setExportType] = useState("enrollments");
  const [sessionFilter, setSessionFilter] = useState("");

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const exportTypes = [
    { value: "enrollments", label: "Inscriptions", icon: GraduationCap, description: "Liste des inscriptions avec details apprenants et sessions" },
    { value: "sessions", label: "Sessions", icon: Calendar, description: "Liste des sessions avec formateurs et programmes" },
    { value: "trainees", label: "Apprenants", icon: Users, description: "Liste complete des apprenants" },
    { value: "invoices", label: "Factures", icon: Euro, description: "Export des factures pour comptabilite" },
    { value: "survey-responses", label: "Evaluations", icon: ClipboardCheck, description: "Reponses aux enquetes de satisfaction" },
    { value: "attendance", label: "Emargements", icon: FileText, description: "Feuilles de presence et attestations OPCO" },
    { value: "connection-logs", label: "Connexions", icon: Wifi, description: "Logs de connexion pour attestations OPCO" },
  ];

  const handleExport = async (type: string) => {
    try {
      let url = `/api/reporting/export/${type}`;
      if (sessionFilter && sessionFilter !== "all") url += `?sessionId=${sessionFilter}`;
      const res = await apiRequest("GET", url);
      const jsonData = await res.json() as Record<string, unknown>[];

      if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
        alert("Aucune donnee a exporter");
        return;
      }

      // Convert to CSV
      const headers = Object.keys(jsonData[0]);
      const csvRows = [
        headers.join(";"),
        ...jsonData.map(row =>
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            if (typeof val === "object") return JSON.stringify(val);
            return String(val).replace(/;/g, ",").replace(/\n/g, " ");
          }).join(";")
        ),
      ];
      const csv = csvRows.join("\n");

      // Download
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `export-${type}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Erreur lors de l'export");
    }
  };

  return (
    <div className="space-y-4">
      {/* Session filter */}
      <div className="flex items-center gap-4 max-w-md">
        <Label className="whitespace-nowrap text-sm">Filtrer par session</Label>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes les sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sessions</SelectItem>
            {(sessions || []).map(s => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportTypes.map(exp => {
          const Icon = exp.icon;
          return (
            <Card key={exp.value} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-accent shrink-0">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{exp.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleExport(exp.value)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Exporter CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Exports specifiques Qualiopi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Ces exports sont conformes aux exigences du referentiel Qualiopi pour les audits de certification.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start" onClick={() => handleExport("attendance")}>
              <FileText className="w-4 h-4 mr-2" />
              Attestations de presence (OPCO)
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleExport("connection-logs")}>
              <Wifi className="w-4 h-4 mr-2" />
              Rapports de connexion (OPCO)
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleExport("survey-responses")}>
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Enquetes de satisfaction
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleExport("enrollments")}>
              <GraduationCap className="w-4 h-4 mr-2" />
              Suivi des apprenants
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Dashboard Tab
// ============================================================

function DashboardTab() {
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ["/api/reporting/global-stats"],
  });

  const modalityData = stats ? [
    { name: "Presentiel", value: stats.charts.modalityStats.presentiel },
    { name: "Distance", value: stats.charts.modalityStats.distance },
    { name: "Hybride", value: stats.charts.modalityStats.hybrid },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Programmes" value={stats?.overview.totalPrograms || 0} icon={BookOpen} loading={isLoading} />
        <StatCard title="Sessions" value={stats?.overview.totalSessions || 0} icon={Calendar} subtitle={`${stats?.overview.activeSessions || 0} en cours`} loading={isLoading} />
        <StatCard title="Apprenants" value={stats?.overview.totalTrainees || 0} icon={GraduationCap} loading={isLoading} />
        <StatCard title="Formateurs" value={stats?.overview.totalTrainers || 0} icon={Users} loading={isLoading} />
        <StatCard title="Entreprises" value={stats?.overview.totalEnterprises || 0} icon={Building2} loading={isLoading} />
        <StatCard title="Inscriptions" value={stats?.overview.totalEnrollments || 0} icon={ClipboardCheck} subtitle={`${stats?.overview.enrollmentCompletionRate || 0}% termines`} loading={isLoading} />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Chiffre d'affaires"
          value={stats ? formatEuros(stats.financial.totalRevenue) : "-"}
          icon={Euro}
          subtitle={`${stats?.financial.paidInvoices || 0} factures payees`}
          loading={isLoading}
        />
        <StatCard
          title="En attente"
          value={stats ? formatEuros(stats.financial.pendingRevenue) : "-"}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="Satisfaction"
          value={stats ? `${stats.quality.avgSatisfaction}/5` : "-"}
          icon={Star}
          subtitle={`${stats?.quality.totalResponses || 0} reponses`}
          loading={isLoading}
        />
        <StatCard
          title="Recommandation"
          value={stats ? `${stats.quality.recommendationRate}%` : "-"}
          icon={ThumbsUp}
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Chiffre d'affaires mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.charts.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 100).toFixed(0)}`} />
                  <Tooltip
                    formatter={(value: number) => [formatEuros(value), "CA"]}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Enrollments Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inscriptions mensuelles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats?.charts.monthlyEnrollments || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value, "Inscriptions"]}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Modality Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Repartition par modalite</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : modalityData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnee</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={modalityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {modalityData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Programmes par categorie</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.charts.categoryBreakdown || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" className="text-xs" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session status summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Etat des sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.overview.plannedSessions || 0}</div>
              <p className="text-sm text-muted-foreground">Planifiees</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats?.overview.activeSessions || 0}</div>
              <p className="text-sm text-muted-foreground">En cours</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.overview.completedSessions || 0}</div>
              <p className="text-sm text-muted-foreground">Terminees</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Reporting() {
  return (
    <PageLayout>
      <PageHeader
        title="Reporting"
        subtitle="Tableaux de bord et indicateurs de performance"
      />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1">
            <LayoutDashboard className="w-4 h-4" />
            Tableaux de bord
          </TabsTrigger>
          <TabsTrigger value="connections" className="gap-1">
            <Wifi className="w-4 h-4" />
            Connexions
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1">
            <ShieldCheck className="w-4 h-4" />
            Qualite
          </TabsTrigger>
          <TabsTrigger value="exports" className="gap-1">
            <Download className="w-4 h-4" />
            Exports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="connections" className="mt-4">
          <ConnectionLogsTab />
        </TabsContent>
        <TabsContent value="quality" className="mt-4">
          <QualityStatsTab />
        </TabsContent>
        <TabsContent value="exports" className="mt-4">
          <ExportsTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
