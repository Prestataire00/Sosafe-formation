import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Euro,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
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
import type { Invoice, Session, Program } from "@shared/schema";
import { INVOICE_STATUSES } from "@shared/schema";

// --- Helpers ---

function formatEuros(centimes: number): string {
  return (centimes / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

const MONTHS_FR = [
  "Jan", "Fev", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aou", "Sep", "Oct", "Nov", "Dec",
];

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#3b82f6",
  paid: "#22c55e",
  partial: "#eab308",
  overdue: "#ef4444",
  cancelled: "#6b7280",
};

const PIE_COLORS = ["#94a3b8", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#6b7280"];

// --- Stat card ---

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  icon: typeof Euro;
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
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main component ---

export default function FinancialReports() {
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<{
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    count: number;
  }>({
    queryKey: ["/api/invoices/stats"],
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: programs, isLoading: loadingPrograms } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const loading = loadingInvoices || loadingStats || loadingSessions || loadingPrograms;

  // --- Computed data ---

  // 1. Stats cards
  const chiffreAffaires = stats?.total ?? 0;
  const impaye = (stats?.overdue ?? 0) + (stats?.pending ?? 0);
  const sessionCount = sessions?.length || 1;
  const valeurMoyenneSession = sessionCount > 0 ? Math.round(chiffreAffaires / sessionCount) : 0;

  // 2. Monthly revenue bar chart data
  const monthlyRevenue = (() => {
    if (!invoices) return [];
    const byMonth: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;
      const d = inv.createdAt ? new Date(inv.createdAt) : null;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + inv.total;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [year, month] = key.split("-");
        return {
          name: `${MONTHS_FR[parseInt(month, 10) - 1]} ${year}`,
          ca: total / 100,
        };
      });
  })();

  // 3. Invoice status pie chart data
  const statusData = (() => {
    if (!invoices) return [];
    const counts: Record<string, number> = {};
    for (const inv of invoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return INVOICE_STATUSES.map((s) => ({
      name: s.label,
      value: counts[s.value] || 0,
      status: s.value,
    })).filter((d) => d.value > 0);
  })();

  // 4. Top formations par CA
  const topFormations = (() => {
    if (!invoices || !sessions || !programs) return [];
    const caByProgram: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status === "cancelled" || !inv.sessionId) continue;
      const session = sessions.find((s) => s.id === inv.sessionId);
      if (!session) continue;
      const programId = session.programId;
      caByProgram[programId] = (caByProgram[programId] || 0) + inv.total;
    }
    return Object.entries(caByProgram)
      .map(([programId, total]) => {
        const program = programs.find((p) => p.id === programId);
        return {
          name: program?.title || "Inconnu",
          ca: total / 100,
        };
      })
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);
  })();

  // 5. BPF summary data
  const bpfData = (() => {
    if (!invoices || !sessions || !programs) return [];
    const byProgram: Record<string, { program: string; sessions: number; ca: number; paid: number; pending: number }> = {};
    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;
      let programTitle = "Hors session";
      let programId = "__none__";
      if (inv.sessionId) {
        const session = sessions.find((s) => s.id === inv.sessionId);
        if (session) {
          programId = session.programId;
          const program = programs.find((p) => p.id === programId);
          programTitle = program?.title || "Inconnu";
        }
      }
      if (!byProgram[programId]) {
        byProgram[programId] = { program: programTitle, sessions: 0, ca: 0, paid: 0, pending: 0 };
      }
      byProgram[programId].ca += inv.total;
      byProgram[programId].paid += inv.paidAmount;
      byProgram[programId].pending += inv.total - inv.paidAmount;
    }
    // Count sessions per program
    if (sessions) {
      for (const session of sessions) {
        if (byProgram[session.programId]) {
          byProgram[session.programId].sessions += 1;
        }
      }
    }
    return Object.values(byProgram).sort((a, b) => b.ca - a.ca);
  })();

  const bpfTotals = bpfData.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.sessions,
      ca: acc.ca + row.ca,
      paid: acc.paid + row.paid,
      pending: acc.pending + row.pending,
    }),
    { sessions: 0, ca: 0, paid: 0, pending: 0 },
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Rapports financiers</h1>
        <p className="text-muted-foreground mt-1">
          Suivi du chiffre d'affaires et des indicateurs financiers SO'SAFE
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Chiffre d'affaires"
          value={formatEuros(chiffreAffaires)}
          icon={Euro}
          subtitle={`${stats?.count ?? 0} facture${(stats?.count ?? 0) > 1 ? "s" : ""} au total`}
          loading={loading}
        />
        <StatCard
          title="Impayé"
          value={formatEuros(impaye)}
          icon={AlertTriangle}
          subtitle="En retard + en attente"
          loading={loading}
        />
        <StatCard
          title="Valeur moyenne / session"
          value={formatEuros(valeurMoyenneSession)}
          icon={TrendingUp}
          subtitle={`${sessionCount} session${sessionCount > 1 ? "s" : ""}`}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly revenue bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              CA mensuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : monthlyRevenue.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                Aucune donnée de facturation disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v: number) =>
                      v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
                      "CA",
                    ]}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="ca" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Invoice status pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Euro className="w-4 h-4 text-muted-foreground" />
              Statut des factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : statusData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                Aucune facture
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }: { name: string; value: number }) => `${name} (${value})`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} facture${value > 1 ? "s" : ""}`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top formations bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Top formations par CA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : topFormations.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topFormations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) =>
                    v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                  }
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={180}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
                    "CA",
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="ca" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* BPF Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Bilan Pédagogique et Financier (BPF)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : bpfData.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucune donnée disponible pour le BPF
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formation</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">CA total</TableHead>
                  <TableHead className="text-right">Encaissé</TableHead>
                  <TableHead className="text-right">Restant dû</TableHead>
                  <TableHead className="text-right">Taux encaissement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bpfData.map((row, idx) => {
                  const taux = row.ca > 0 ? Math.round((row.paid / row.ca) * 100) : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.program}</TableCell>
                      <TableCell className="text-right">{row.sessions}</TableCell>
                      <TableCell className="text-right">{formatEuros(row.ca)}</TableCell>
                      <TableCell className="text-right">{formatEuros(row.paid)}</TableCell>
                      <TableCell className="text-right">{formatEuros(row.pending)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            taux >= 80
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : taux >= 50
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {taux}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableHeader>
                <TableRow className="bg-muted/50 font-semibold">
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="text-right font-semibold">{bpfTotals.sessions}</TableHead>
                  <TableHead className="text-right font-semibold">{formatEuros(bpfTotals.ca)}</TableHead>
                  <TableHead className="text-right font-semibold">{formatEuros(bpfTotals.paid)}</TableHead>
                  <TableHead className="text-right font-semibold">{formatEuros(bpfTotals.pending)}</TableHead>
                  <TableHead className="text-right font-semibold">
                    <Badge variant="outline">
                      {bpfTotals.ca > 0 ? Math.round((bpfTotals.paid / bpfTotals.ca) * 100) : 0}%
                    </Badge>
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
