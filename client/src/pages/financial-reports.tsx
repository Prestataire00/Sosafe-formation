import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Users,
  Clock,
  Euro,
  Download,
  Award,
  BarChart3,
  BookOpen,
  Wallet,
} from "lucide-react";
import type { Invoice, Session, Program, Enrollment } from "@shared/schema";

// --- Helpers ---

function formatEuros(centimes: number): string {
  return (centimes / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MONTHS_FR = [
  "Jan", "Fev", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aou", "Sep", "Oct", "Nov", "Dec",
];

// --- Main component ---

export default function FinancialReports() {
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: sessions, isLoading: loadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: programs, isLoading: loadingPrograms } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });

  const loading = loadingInvoices || loadingSessions || loadingPrograms || loadingEnrollments;

  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [bpfYear, setBpfYear] = useState(currentYear.toString());

  const generateBpfMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/documents/generate-bpf", { year: parseInt(bpfYear) }),
    onSuccess: () =>
      toast({ title: `BPF ${bpfYear} exporté dans la GED` }),
    onError: () =>
      toast({ title: "Erreur lors de la génération du BPF", variant: "destructive" }),
  });

  // --- Filter by year ---
  const yearSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      const start = new Date(s.startDate);
      return start.getFullYear() === parseInt(bpfYear);
    });
  }, [sessions, bpfYear]);

  const yearEnrollments = useMemo(() => {
    if (!enrollments || !yearSessions) return [];
    const sessionIds = new Set(yearSessions.map((s) => s.id));
    return enrollments.filter((e) => sessionIds.has(e.sessionId));
  }, [enrollments, yearSessions]);

  const yearInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      if (inv.status === "cancelled") return false;
      const d = inv.createdAt ? new Date(inv.createdAt) : null;
      return d && d.getFullYear() === parseInt(bpfYear);
    });
  }, [invoices, bpfYear]);

  // --- 1. Stats cards ---
  const sessionsRealisees = yearSessions.filter((s) => s.status === "completed" || s.status === "ongoing").length;
  const stagiairesFormes = new Set(yearEnrollments.map((e) => e.traineeId)).size;
  const heuresFormation = yearSessions.reduce((sum, s) => {
    const program = programs?.find((p) => p.id === s.programId);
    return sum + (program?.duration || 0);
  }, 0);
  const caRealise = yearInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // --- 2. Sessions par mois ---
  const sessionsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const s of yearSessions) {
      const month = new Date(s.startDate).getMonth();
      counts[month]++;
    }
    return counts;
  }, [yearSessions]);

  // --- 3. Par catégorie ---
  const byCategory = useMemo(() => {
    if (!programs) return [];
    const cats: Record<string, { sessions: number; stagiaires: number }> = {};
    for (const s of yearSessions) {
      const program = programs.find((p) => p.id === s.programId);
      const categories = program?.categories || ["Autre"];
      const sessionEnrollments = yearEnrollments.filter((e) => e.sessionId === s.id);
      for (const cat of categories) {
        if (!cats[cat]) cats[cat] = { sessions: 0, stagiaires: 0 };
        cats[cat].sessions++;
        cats[cat].stagiaires += sessionEnrollments.length;
      }
    }
    return Object.entries(cats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [yearSessions, yearEnrollments, programs]);

  // --- 4. Provenance des financements ---
  const fundingData = useMemo(() => {
    if (!programs || !yearInvoices || !sessions) return [];
    const byFunding: Record<string, number> = {};
    for (const inv of yearInvoices) {
      if (!inv.sessionId) continue;
      const session = sessions.find((s) => s.id === inv.sessionId);
      if (!session) continue;
      const program = programs.find((p) => p.id === session.programId);
      const fundingTypes = program?.fundingTypes || ["entreprise"];
      const perFunding = Math.round(inv.total / fundingTypes.length);
      for (const ft of fundingTypes) {
        const label = ft.charAt(0).toUpperCase() + ft.slice(1);
        byFunding[label] = (byFunding[label] || 0) + perFunding;
      }
    }
    return Object.entries(byFunding)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearInvoices, sessions, programs]);

  const fundingTotal = fundingData.reduce((sum, f) => sum + f.amount, 0);

  // --- 5. Formations certifiantes ---
  const certifyingPrograms = useMemo(() => {
    if (!programs) return [];
    return programs
      .filter((p) => p.certifying)
      .map((p) => {
        const pSessions = yearSessions.filter((s) => s.programId === p.id);
        const sessionIds = new Set(pSessions.map((s) => s.id));
        const stag = yearEnrollments.filter((e) => sessionIds.has(e.sessionId)).length;
        return { title: p.title, stagiaires: stag, program: p };
      })
      .filter((p) => p.stagiaires > 0 || yearSessions.some((s) => s.programId === p.program.id));
  }, [programs, yearSessions, yearEnrollments]);

  // Export data for CSV
  const exportData = yearSessions.map((s) => {
    const program = programs?.find((p) => p.id === s.programId);
    const enrolled = yearEnrollments.filter((e) => e.sessionId === s.id).length;
    return {
      session: s.title,
      formation: program?.title || "",
      debut: s.startDate,
      fin: s.endDate,
      lieu: s.location || "",
      statut: s.status,
      inscrits: enrolled,
      duree_h: program?.duration || 0,
    };
  });

  return (
    <PageLayout>
      <PageHeader
        title="Bilan Pédagogique et Financier"
        subtitle="Données annuelles pour le BPF"
        actions={
          <div className="flex items-center gap-3">
            <Select value={bpfYear} onValueChange={setBpfYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton
              data={exportData}
              columns={[
                { key: "session", label: "Session" },
                { key: "formation", label: "Formation" },
                { key: "debut", label: "Début" },
                { key: "fin", label: "Fin" },
                { key: "lieu", label: "Lieu" },
                { key: "statut", label: "Statut" },
                { key: "inscrits", label: "Inscrits" },
                { key: "duree_h", label: "Durée (h)" },
              ]}
              filename={`BPF_${bpfYear}`}
            />
            <Button
              variant="outline"
              onClick={() => generateBpfMutation.mutate()}
              disabled={generateBpfMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {generateBpfMutation.isPending ? "Génération..." : "Exporter PDF"}
            </Button>
          </div>
        }
      />

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-8 w-20 mb-2" /><Skeleton className="h-4 w-28" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-muted-foreground">Sessions réalisées</span>
              </div>
              <div className="text-3xl font-bold">{sessionsRealisees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Users className="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-muted-foreground">Stagiaires formés</span>
              </div>
              <div className="text-3xl font-bold">{stagiairesFormes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Clock className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm text-muted-foreground">Heures de formation</span>
              </div>
              <div className="text-3xl font-bold">{heuresFormation}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Euro className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm text-muted-foreground">CA Réalisé HT</span>
              </div>
              <div className="text-3xl font-bold">{formatEuros(caRealise)} €</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions par mois */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Sessions par mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid grid-cols-12 gap-2">
              {MONTHS_FR.map((month, i) => (
                <div key={month} className="text-center">
                  <div className={`text-xs font-medium mb-1 ${sessionsByMonth[i] > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {month}
                  </div>
                  <div className={`rounded-lg py-2 px-1 text-sm font-bold ${
                    sessionsByMonth[i] > 0
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-muted/50 text-muted-foreground"
                  }`}>
                    {sessionsByMonth[i] || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              Par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {byCategory.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium text-sm">{cat.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {cat.sessions} session{cat.sessions > 1 ? "s" : ""} - {cat.stagiaires} stag.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provenance des financements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              Provenance des financements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : fundingData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {fundingData.map((f) => (
                  <div key={f.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium text-sm">{f.name}</span>
                    <span className="text-sm font-medium">{formatEuros(f.amount)} €</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t-2">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="font-semibold text-sm">{formatEuros(fundingTotal)} €</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Formations certifiantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            Formations certifiantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : certifyingPrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune formation certifiante cette année</p>
          ) : (
            <div className="space-y-3">
              {certifyingPrograms.map((cp) => (
                <div key={cp.program.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium text-sm">{cp.title}</span>
                    {cp.program.recyclingMonths && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Recyclage {cp.program.recyclingMonths} mois
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{cp.stagiaires} stag.</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
