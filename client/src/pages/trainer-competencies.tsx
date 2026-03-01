import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  Users,
  AlertTriangle,
  Star,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { Trainer, TrainerCompetency } from "@shared/schema";
import {
  COMPETENCY_DOMAINS,
  COMPETENCY_LEVELS,
  COMPETENCY_STATUSES,
} from "@shared/schema";

// ============================================================
// Types
// ============================================================

type SatisfactionStats = {
  avgRating: number;
  totalResponses: number;
  satisfactionScore: number;
  perYear: { year: number; avgRating: number; count: number }[];
};

type QualiopiStatus = {
  globalScore: number;
  documents: { score: number; coverage: { type: string; present: boolean }[]; total: number; validated: number };
  competencies: { score: number; total: number; active: number; expired: number; renewal: number };
  evaluations: { score: number; hasCurrentYear: boolean; total: number };
  sessions: { count: number };
};

// ============================================================
// Competency Form
// ============================================================

function CompetencyForm({
  competency,
  onSubmit,
  isPending,
}: {
  competency?: TrainerCompetency;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [domain, setDomain] = useState(competency?.domain || "");
  const [competencyLabel, setCompetencyLabel] = useState(competency?.competencyLabel || "");
  const [level, setLevel] = useState(competency?.level || "junior");
  const [certificationRef, setCertificationRef] = useState(competency?.certificationRef || "");
  const [obtainedAt, setObtainedAt] = useState(competency?.obtainedAt || "");
  const [expiresAt, setExpiresAt] = useState(competency?.expiresAt || "");
  const [status, setStatus] = useState(competency?.status || "active");
  const [notes, setNotes] = useState(competency?.notes || "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          domain,
          competencyLabel,
          level,
          certificationRef: certificationRef || null,
          obtainedAt: obtainedAt || null,
          expiresAt: expiresAt || null,
          status,
          documentId: null,
          notes: notes || null,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Domaine</Label>
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger><SelectValue placeholder="Choisir un domaine" /></SelectTrigger>
            <SelectContent>
              {COMPETENCY_DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Niveau</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMPETENCY_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Libelle de la competence</Label>
        <Input value={competencyLabel} onChange={(e) => setCompetencyLabel(e.target.value)} required placeholder="Ex: Formateur AFGSU Niveau 2" />
      </div>
      <div className="space-y-2">
        <Label>Reference de certification</Label>
        <Input value={certificationRef} onChange={(e) => setCertificationRef(e.target.value)} placeholder="Ex: CESU-2024-1234" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date d'obtention</Label>
          <Input type="date" value={obtainedAt} onChange={(e) => setObtainedAt(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Date d'expiration</Label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COMPETENCY_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending || !domain || !competencyLabel}>
          {isPending ? "Enregistrement..." : competency ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Score Gauge
// ============================================================

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  const bgColor = score >= 75 ? "bg-green-100 dark:bg-green-900/30" : score >= 50 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30";
  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bgColor}`}>
        <span className={`text-xl font-bold ${color}`}>{score}%</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ============================================================
// Trainer Detail Panel
// ============================================================

function TrainerDetailPanel({
  trainer,
  onBack,
}: {
  trainer: Trainer;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [editCompetency, setEditCompetency] = useState<TrainerCompetency | undefined>();

  const { data: competencies } = useQuery<TrainerCompetency[]>({
    queryKey: [`/api/trainers/${trainer.id}/competencies`],
  });

  const { data: satisfaction } = useQuery<SatisfactionStats>({
    queryKey: [`/api/trainers/${trainer.id}/satisfaction-stats`],
  });

  const { data: qualiopi } = useQuery<QualiopiStatus>({
    queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`],
  });

  const createCompMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", `/api/trainers/${trainer.id}/competencies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/competencies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`] });
      setCompDialogOpen(false);
      toast({ title: "Competence ajoutee" });
    },
  });

  const updateCompMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/trainer-competencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/competencies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`] });
      setCompDialogOpen(false);
      setEditCompetency(undefined);
      toast({ title: "Competence modifiee" });
    },
  });

  const deleteCompMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer-competencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/competencies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`] });
      toast({ title: "Competence supprimee" });
    },
  });

  const levelInfo = (level: string) => COMPETENCY_LEVELS.find((l) => l.value === level) || COMPETENCY_LEVELS[0];
  const statusInfo = (status: string) => COMPETENCY_STATUSES.find((s) => s.value === status) || COMPETENCY_STATUSES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-primary/10 text-primary">{trainer.firstName[0]}{trainer.lastName[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{trainer.firstName} {trainer.lastName}</h2>
          <p className="text-sm text-muted-foreground">{trainer.specialty || "Formateur"}</p>
        </div>
      </div>

      {/* Qualiopi Score */}
      {qualiopi && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Score Qualiopi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around">
              <ScoreGauge score={qualiopi.globalScore} label="Score global" />
              <ScoreGauge score={qualiopi.documents.score} label="Documents" />
              <ScoreGauge score={qualiopi.competencies.score} label="Competences" />
              <ScoreGauge score={qualiopi.evaluations.score} label="Evaluation" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{qualiopi.documents.validated}/{qualiopi.documents.total}</p>
                <p className="text-xs text-muted-foreground">Docs valides</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{qualiopi.competencies.active}/{qualiopi.competencies.total}</p>
                <p className="text-xs text-muted-foreground">Comp. actives</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{qualiopi.sessions.count}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competencies CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5" />
            Competences
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditCompetency(undefined);
              setCompDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {!competencies || competencies.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune competence enregistree</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Libelle</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competencies.map((comp) => {
                  const li = levelInfo(comp.level);
                  const si = statusInfo(comp.status);
                  return (
                    <TableRow key={comp.id}>
                      <TableCell><Badge variant="outline" className="text-xs">{comp.domain}</Badge></TableCell>
                      <TableCell className="font-medium">{comp.competencyLabel}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${li.color}`}>{li.label}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${si.color}`}>{si.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {comp.expiresAt ? new Date(comp.expiresAt).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditCompetency(comp);
                              setCompDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteCompMutation.mutate(comp.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Satisfaction Stats */}
      {satisfaction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Satisfaction (auto-calculee)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{satisfaction.avgRating}/5</p>
                <p className="text-xs text-muted-foreground">Note moyenne</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{satisfaction.satisfactionScore}%</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{satisfaction.totalResponses}</p>
                <p className="text-xs text-muted-foreground">Reponses</p>
              </div>
            </div>
            {satisfaction.perYear.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Annee</TableHead>
                    <TableHead>Note moyenne</TableHead>
                    <TableHead>Nombre de reponses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {satisfaction.perYear.map((py) => (
                    <TableRow key={py.year}>
                      <TableCell className="font-medium">{py.year}</TableCell>
                      <TableCell>{py.avgRating}/5</TableCell>
                      <TableCell>{py.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Competency Dialog */}
      <Dialog
        open={compDialogOpen}
        onOpenChange={(open) => {
          setCompDialogOpen(open);
          if (!open) setEditCompetency(undefined);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCompetency ? "Modifier la competence" : "Nouvelle competence"}</DialogTitle>
          </DialogHeader>
          <CompetencyForm
            competency={editCompetency}
            onSubmit={(data) =>
              editCompetency
                ? updateCompMutation.mutate({ id: editCompetency.id, data })
                : createCompMutation.mutate(data)
            }
            isPending={createCompMutation.isPending || updateCompMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function TrainerCompetencies() {
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | undefined>();

  const { data: trainers, isLoading: trainersLoading } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const { data: allCompetencies } = useQuery<TrainerCompetency[]>({
    queryKey: ["/api/trainer-competencies"],
  });

  // Summary stats
  const trainerCount = trainers?.length || 0;
  const expiredCount = allCompetencies?.filter((c) => c.status === "expired").length || 0;
  const renewalCount = allCompetencies?.filter((c) => c.status === "renewal").length || 0;
  const alertCount = expiredCount + renewalCount;

  // Build matrix: trainers x domains
  const competencyMap: Record<string, Record<string, TrainerCompetency[]>> = {};
  allCompetencies?.forEach((c) => {
    if (!competencyMap[c.trainerId]) competencyMap[c.trainerId] = {};
    if (!competencyMap[c.trainerId][c.domain]) competencyMap[c.trainerId][c.domain] = [];
    competencyMap[c.trainerId][c.domain].push(c);
  });

  // Active domains (those that have at least one competency)
  const activeDomains = Array.from(new Set(allCompetencies?.map((c) => c.domain) || []));

  if (selectedTrainer) {
    return (
      <PageLayout>
        <TrainerDetailPanel trainer={selectedTrainer} onBack={() => setSelectedTrainer(undefined)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Suivi des compétences"
        subtitle="Gestion des compétences formateurs"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trainerCount}</p>
              <p className="text-xs text-muted-foreground">Formateurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allCompetencies?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Competences</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allCompetencies?.filter(c => c.status === "active").length || 0}</p>
              <p className="text-xs text-muted-foreground">Actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${alertCount > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-900/20"}`}>
              <AlertTriangle className={`w-5 h-5 ${alertCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{alertCount}</p>
              <p className="text-xs text-muted-foreground">Alertes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competency Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Matrice de competences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trainersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !trainers || trainers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun formateur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Formateur</TableHead>
                    {activeDomains.length > 0 ? (
                      activeDomains.map((domain) => (
                        <TableHead key={domain} className="text-center min-w-[120px]">{domain}</TableHead>
                      ))
                    ) : (
                      COMPETENCY_DOMAINS.slice(0, 6).map((domain) => (
                        <TableHead key={domain} className="text-center min-w-[120px]">{domain}</TableHead>
                      ))
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((trainer) => {
                    const trainerComps = competencyMap[trainer.id] || {};
                    const domainsToShow = activeDomains.length > 0 ? activeDomains : COMPETENCY_DOMAINS.slice(0, 6) as unknown as string[];
                    return (
                      <TableRow
                        key={trainer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedTrainer(trainer)}
                      >
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{trainer.firstName[0]}{trainer.lastName[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{trainer.firstName} {trainer.lastName}</span>
                          </div>
                        </TableCell>
                        {domainsToShow.map((domain) => {
                          const comps = trainerComps[domain];
                          if (!comps || comps.length === 0) {
                            return <TableCell key={domain} className="text-center"><span className="text-muted-foreground/30">—</span></TableCell>;
                          }
                          const bestComp = comps[0];
                          const li = COMPETENCY_LEVELS.find((l) => l.value === bestComp.level) || COMPETENCY_LEVELS[0];
                          const si = COMPETENCY_STATUSES.find((s) => s.value === bestComp.status) || COMPETENCY_STATUSES[0];
                          return (
                            <TableCell key={domain} className="text-center">
                              <Badge variant="outline" className={`text-xs ${bestComp.status === "expired" ? si.color : li.color}`}>
                                {bestComp.status === "expired" ? "Exp." : li.label}
                              </Badge>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
