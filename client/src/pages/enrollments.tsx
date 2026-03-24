import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Plus,
  ClipboardList,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText } from "lucide-react";
import type { Enrollment, InsertEnrollment, Session, Trainee, Enterprise, Program, ProgramPrerequisite, ProgramCustomField } from "@shared/schema";
import { VAE_STATUSES } from "@shared/schema";

const ENROLLMENT_STATUSES = [
  { value: "registered", label: "Inscrit", icon: Clock },
  { value: "confirmed", label: "Confirmé", icon: UserCheck },
  { value: "completed", label: "Terminé", icon: CheckCircle },
  { value: "cancelled", label: "Annulé", icon: XCircle },
  { value: "waitlisted", label: "Liste d'attente", icon: Clock },
];

function EnrollmentStatusBadge({ status }: { status: string }) {
  const st = ENROLLMENT_STATUSES.find((s) => s.value === status) || ENROLLMENT_STATUSES[0];
  return <StatusBadge status={st.value} label={st.label} />;
}

const ENROLLMENT_MEMORY_KEY = "enrollment_last_values";

function EnrollmentForm({
  sessions,
  trainees,
  enterprises,
  enrollments: existingEnrollments,
  onSubmit,
  isPending,
  batchCount,
}: {
  sessions: Session[];
  trainees: Trainee[];
  enterprises: Enterprise[];
  enrollments: Enrollment[];
  onSubmit: (data: InsertEnrollment) => void;
  isPending: boolean;
  batchCount: number;
}) {
  const plannedSessions = sessions.filter((s) => s.status === "planned" || s.status === "ongoing");

  const savedValues = (() => {
    try {
      const raw = localStorage.getItem(ENROLLMENT_MEMORY_KEY);
      if (!raw) return { sessionId: "", enterpriseId: "" };
      const parsed = JSON.parse(raw);
      return {
        sessionId: plannedSessions.some((s) => s.id === parsed.sessionId) ? parsed.sessionId : "",
        enterpriseId: enterprises.some((e) => e.id === parsed.enterpriseId) ? parsed.enterpriseId : "",
      };
    } catch {
      return { sessionId: "", enterpriseId: "" };
    }
  })();

  const [sessionId, setSessionId] = useState(savedValues.sessionId);
  const [traineeId, setTraineeId] = useState("");
  const [enterpriseId, setEnterpriseId] = useState(savedValues.enterpriseId);
  const [notes, setNotes] = useState("");

  // Filter out trainees already enrolled in the selected session
  const enrolledTraineeIds = sessionId
    ? existingEnrollments
        .filter((e) => e.sessionId === sessionId && e.status !== "cancelled")
        .map((e) => e.traineeId)
    : [];
  const availableTrainees = trainees.filter((t) => !enrolledTraineeIds.includes(t.id));

  const handleTraineeChange = (id: string) => {
    setTraineeId(id);
    const trainee = trainees.find((t) => t.id === id);
    if (trainee?.enterpriseId) {
      setEnterpriseId(trainee.enterpriseId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(ENROLLMENT_MEMORY_KEY, JSON.stringify({ sessionId, enterpriseId }));
    onSubmit({
      sessionId,
      traineeId,
      enterpriseId: enterpriseId || null,
      status: "registered",
      notes: notes || null,
      certificateUrl: null,
    });
  };

  const selectedSession = plannedSessions.find((s) => s.id === sessionId);
  const hasSavedSession = savedValues.sessionId !== "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasSavedSession && batchCount === 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          Session et entreprise pre-remplies depuis la derniere inscription.
        </div>
      )}
      {batchCount > 0 && (
        <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" />
          {batchCount} inscription{batchCount > 1 ? "s" : ""} ajoutee{batchCount > 1 ? "s" : ""} — continuez ou fermez la fenetre.
        </div>
      )}
      <div className="space-y-2">
        <Label>Session</Label>
        <Select value={sessionId} onValueChange={(v) => { setSessionId(v); setTraineeId(""); }} required>
          <SelectTrigger data-testid="select-enrollment-session"><SelectValue placeholder="Selectionner une session" /></SelectTrigger>
          <SelectContent>
            {plannedSessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Stagiaire {sessionId && availableTrainees.length < trainees.length && (
          <span className="text-xs text-muted-foreground ml-1">({enrolledTraineeIds.length} deja inscrit{enrolledTraineeIds.length > 1 ? "s" : ""})</span>
        )}</Label>
        <Select value={traineeId} onValueChange={handleTraineeChange} required>
          <SelectTrigger data-testid="select-enrollment-trainee"><SelectValue placeholder="Selectionner un stagiaire" /></SelectTrigger>
          <SelectContent>
            {availableTrainees.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sessionId && availableTrainees.length === 0 && (
          <p className="text-xs text-muted-foreground">Tous les stagiaires sont deja inscrits a cette session.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Entreprise (optionnel)</Label>
        <Select value={enterpriseId} onValueChange={setEnterpriseId}>
          <SelectTrigger data-testid="select-enrollment-enterprise"><SelectValue placeholder="Aucune entreprise" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {enterprises.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="enrollment-notes">Notes</Label>
        <Textarea id="enrollment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur l'inscription..." className="resize-none" data-testid="input-enrollment-notes" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending || !sessionId || !traineeId} data-testid="button-enrollment-submit">
          {isPending ? "Inscription..." : "Inscrire"}
        </Button>
      </div>
    </form>
  );
}

export default function Enrollments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveEnrollment, setMoveEnrollment] = useState<Enrollment | null>(null);
  const [selectedTargetSession, setSelectedTargetSession] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: enrollments, isLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });
  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const [prereqWarnings, setPrereqWarnings] = useState<string[]>([]);

  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEnrollment) => {
      const res = await apiRequest("POST", "/api/enrollments", data);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      setBatchCount((c) => c + 1);
      setFormKey((k) => k + 1);
      if (result._warnings && result._warnings.length > 0) {
        setPrereqWarnings(result._warnings);
        toast({ title: "Inscription ajoutée avec avertissements" });
      } else {
        setPrereqWarnings([]);
        toast({ title: "Inscription ajoutee" });
      }
    },
    onError: () => toast({ title: "Erreur lors de l'inscription", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; vaeStatus?: string }) =>
      apiRequest("PATCH", `/api/enrollments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enrollments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      toast({ title: "Inscription supprimée" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const { data: alternatives } = useQuery<Array<{ id: string; title: string; startDate: string; endDate: string; location: string | null; modality: string; remainingSpots: number }>>({
    queryKey: ["/api/sessions", moveEnrollment?.sessionId, "alternatives"],
    queryFn: () => fetch(`/api/sessions/${moveEnrollment?.sessionId}/alternatives`).then(r => r.json()),
    enabled: !!moveEnrollment?.sessionId && moveDialogOpen,
  });

  const moveToSessionMutation = useMutation({
    mutationFn: ({ enrollmentId, targetSessionId }: { enrollmentId: string; targetSessionId: string }) =>
      apiRequest("POST", `/api/enrollments/${enrollmentId}/move-to-session`, { targetSessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      setMoveDialogOpen(false);
      setMoveEnrollment(null);
      setSelectedTargetSession("");
      toast({ title: "Stagiaire déplacé vers la nouvelle session" });
    },
    onError: () => toast({ title: "Erreur lors du déplacement", variant: "destructive" }),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const res = await apiRequest("POST", "/api/enrollments/bulk-update", { ids, status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      setSelectedIds(new Set());
      toast({ title: "Statut mis à jour en masse" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour en masse", variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/enrollments/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      setSelectedIds(new Set());
      toast({ title: "Inscriptions supprimées en masse" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression en masse", variant: "destructive" }),
  });

  const filtered = enrollments?.filter((e) => {
    const session = sessions?.find((s) => s.id === e.sessionId);
    const trainee = trainees?.find((t) => t.id === e.traineeId);
    const matchesSearch = search === "" ||
      (session?.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (trainee?.firstName + " " + trainee?.lastName).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const statusCounts = {
    all: enrollments?.length || 0,
    registered: enrollments?.filter((e) => e.status === "registered").length || 0,
    confirmed: enrollments?.filter((e) => e.status === "confirmed").length || 0,
    completed: enrollments?.filter((e) => e.status === "completed").length || 0,
    cancelled: enrollments?.filter((e) => e.status === "cancelled").length || 0,
    waitlisted: enrollments?.filter((e) => e.status === "waitlisted").length || 0,
  };

  return (
    <PageLayout>
      <PageHeader
        title="Inscriptions"
        subtitle="Gérez les inscriptions aux sessions"
        actions={
          <Button onClick={() => setDialogOpen(true)} data-testid="button-create-enrollment">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle inscription
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { value: "all", label: "Toutes" },
          { value: "registered", label: "Inscrits" },
          { value: "confirmed", label: "Confirmés" },
          { value: "completed", label: "Terminés" },
          { value: "cancelled", label: "Annulés" },
          { value: "waitlisted", label: "En attente" },
        ].map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s.value)}
            data-testid={`button-filter-${s.value}`}
          >
            {s.label} ({statusCounts[s.value as keyof typeof statusCounts] || 0})
          </Button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="max-w-sm" />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune inscription"
          description={
            search || statusFilter !== "all"
              ? "Aucun résultat pour vos filtres"
              : "Commencez par inscrire un stagiaire à une session"
          }
          action={
            !search && statusFilter === "all" ? (
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-enrollment">
                <Plus className="w-4 h-4 mr-2" />
                Inscrire un stagiaire
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(filtered.map((e) => e.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Stagiaire</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>VAE</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((enrollment) => {
                  const session = sessions?.find((s) => s.id === enrollment.sessionId);
                  const trainee = trainees?.find((t) => t.id === enrollment.traineeId);
                  const enterprise = enterprises?.find((e) => e.id === enrollment.enterpriseId);
                  const program = session ? programs?.find((p) => p.id === session.programId) : null;
                  const isVaeProgram = program?.categories?.includes("VAE");
                  return (
                    <TableRow key={enrollment.id} data-testid={`row-enrollment-${enrollment.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(enrollment.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(enrollment.id);
                              } else {
                                next.delete(enrollment.id);
                              }
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium">{trainee ? `${trainee.firstName} ${trainee.lastName}` : "Inconnu"}</p>
                            {enrollment.customData && Object.keys(enrollment.customData).length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 cursor-help">
                                    <FileText className="w-3 h-3" />
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="font-medium text-xs mb-1">Informations complémentaires</p>
                                  {(() => {
                                    const customFields = program?.customFields as ProgramCustomField[] | undefined;
                                    return Object.entries(enrollment.customData!).map(([key, val]) => {
                                      const field = customFields?.find((f) => f.id === key);
                                      const label = field?.label || key;
                                      const display = typeof val === "object" && val?.fileName ? val.fileName : typeof val === "boolean" ? (val ? "Oui" : "Non") : String(val);
                                      return (
                                        <p key={key} className="text-xs"><span className="text-muted-foreground">{label}:</span> {display}</p>
                                      );
                                    });
                                  })()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {trainee?.email ? <a href={`mailto:${trainee.email}`} className="text-xs text-primary hover:underline">{trainee.email}</a> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{session?.title || "Session inconnue"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{enterprise?.name || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EnrollmentStatusBadge status={enrollment.status} />
                          {enrollment.status === "waitlisted" && enrollment.waitlistPosition && (
                            <Badge variant="outline" className="text-xs">#{enrollment.waitlistPosition}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isVaeProgram ? (
                          <Select
                            value={enrollment.vaeStatus || ""}
                            onValueChange={(v) => updateStatusMutation.mutate({ id: enrollment.id, status: enrollment.status, vaeStatus: v } as any)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[140px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {VAE_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.enrolledAt
                            ? new Date(enrollment.enrolledAt).toLocaleDateString("fr-FR")
                            : "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-enrollment-menu-${enrollment.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ENROLLMENT_STATUSES.filter((s) => s.value !== enrollment.status).map((s) => (
                              <DropdownMenuItem
                                key={s.value}
                                onClick={() => updateStatusMutation.mutate({ id: enrollment.id, status: s.value })}
                                data-testid={`button-status-${s.value}-${enrollment.id}`}
                              >
                                <s.icon className="w-4 h-4 mr-2" />
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                            {enrollment.status === "waitlisted" && (
                              <DropdownMenuItem onClick={() => { setMoveEnrollment(enrollment); setMoveDialogOpen(true); }}>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Déplacer vers une autre session
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(enrollment.id)} data-testid={`button-delete-enrollment-${enrollment.id}`}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setBatchCount(0); setFormKey((k) => k + 1); setPrereqWarnings([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle inscription</DialogTitle>
          </DialogHeader>
          {prereqWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 space-y-1">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Avertissements prérequis
              </div>
              <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5 ml-6 list-disc">
                {prereqWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
              <p className="text-xs text-muted-foreground mt-1">L'inscription reste possible malgré ces alertes.</p>
            </div>
          )}
          <EnrollmentForm
            key={formKey}
            sessions={sessions || []}
            trainees={trainees || []}
            enterprises={enterprises || []}
            enrollments={enrollments || []}
            onSubmit={(data) => {
              const cleanData = {
                ...data,
                enterpriseId: data.enterpriseId === "none" ? null : data.enterpriseId,
              };
              createMutation.mutate(cleanData);
            }}
            isPending={createMutation.isPending}
            batchCount={batchCount}
          />
        </DialogContent>
      </Dialog>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border rounded-lg shadow-lg px-5 py-3">
          <span className="text-sm font-medium">{selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={bulkUpdateMutation.isPending}
            onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: "confirmed" })}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Confirmer
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulkUpdateMutation.isPending}
            onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: "cancelled" })}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Annuler
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Supprimer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Déselectionner
          </Button>
        </div>
      )}

      <Dialog open={moveDialogOpen} onOpenChange={(open) => { setMoveDialogOpen(open); if (!open) { setMoveEnrollment(null); setSelectedTargetSession(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Déplacer vers une autre session</DialogTitle>
          </DialogHeader>
          {moveEnrollment && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sélectionnez une session alternative (même programme) pour déplacer ce stagiaire.
              </p>
              {alternatives && alternatives.length > 0 ? (
                <>
                  <Select value={selectedTargetSession} onValueChange={setSelectedTargetSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une session" />
                    </SelectTrigger>
                    <SelectContent>
                      {alternatives.map((alt) => (
                        <SelectItem key={alt.id} value={alt.id}>
                          {alt.title} — {new Date(alt.startDate).toLocaleDateString("fr-FR")} ({alt.remainingSpots} place{alt.remainingSpots > 1 ? "s" : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Annuler</Button>
                    <Button
                      disabled={!selectedTargetSession || moveToSessionMutation.isPending}
                      onClick={() => moveToSessionMutation.mutate({ enrollmentId: moveEnrollment.id, targetSessionId: selectedTargetSession })}
                    >
                      {moveToSessionMutation.isPending ? "Déplacement..." : "Déplacer"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucune session alternative disponible pour ce programme.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
