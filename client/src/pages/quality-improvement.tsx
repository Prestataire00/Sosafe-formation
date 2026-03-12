import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
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
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Bell,
  Eye,
  FileText,
  Shield,
  Radar,
  UserX,
  ExternalLink,
  X,
} from "lucide-react";
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
import {
  ABSENCE_TYPES,
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_CATEGORIES,
  VEILLE_TYPES,
  VEILLE_IMPACT_LEVELS,
  VEILLE_STATUSES,
} from "@shared/schema";

// =============================================
// ABSENCES TAB
// =============================================

function AbsencesTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ["/api/absence-records"],
    queryFn: () => apiRequest("GET", "/api/absence-records").then(r => r.json()),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then(r => r.json()),
  });

  const { data: trainees = [] } = useQuery({
    queryKey: ["/api/trainees"],
    queryFn: () => apiRequest("GET", "/api/trainees").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/absence-records", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absence-records"] });
      setShowForm(false);
      toast({ title: "Absence enregistrée" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/absence-records/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absence-records"] });
      setEditingRecord(null);
      toast({ title: "Absence mise à jour" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/absence-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absence-records"] });
      toast({ title: "Absence supprimée" });
    },
  });

  const notifyQualiopiMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/absence-records/${id}/notify-qualiopi`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absence-records"] });
      toast({ title: "Notification Qualiopi envoyée" });
    },
  });

  const filtered = absences.filter((a: any) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.traineeName?.toLowerCase().includes(s) || a.sessionTitle?.toLowerCase().includes(s) || a.reason?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: absences.length,
    open: absences.filter((a: any) => a.status === "open").length,
    justified: absences.filter((a: any) => a.justified).length,
    notifiedQualiopi: absences.filter((a: any) => a.notifiedQualiopi).length,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total absences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <div className="text-sm text-muted-foreground">Non résolues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.justified}</div>
            <div className="text-sm text-muted-foreground">Justifiées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{stats.notifiedQualiopi}</div>
            <div className="text-sm text-muted-foreground">Notifiées Qualiopi</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="w-56" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {ABSENCE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="open">Ouvert</SelectItem>
              <SelectItem value="resolved">Résolu</SelectItem>
              <SelectItem value="closed">Clôturé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditingRecord(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Déclarer une absence
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Apprenant</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Justifiée</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Qualiopi</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Aucune absence enregistrée
                </TableCell>
              </TableRow>
            ) : filtered.map((a: any) => {
              const typeInfo = ABSENCE_TYPES.find(t => t.value === a.type);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.date ? new Date(a.date).toLocaleDateString("fr-FR") : "-"}
                  </TableCell>
                  <TableCell>{a.traineeName}</TableCell>
                  <TableCell className="max-w-48 truncate">{a.sessionTitle || "-"}</TableCell>
                  <TableCell>
                    <Badge className={typeInfo?.color || ""}>{typeInfo?.label || a.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {a.justified ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Oui</Badge>
                    ) : (
                      <Badge variant="outline">Non</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.status === "open" ? "destructive" : a.status === "resolved" ? "default" : "outline"}>
                      {a.status === "open" ? "Ouvert" : a.status === "resolved" ? "Résolu" : "Clôturé"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.notifiedQualiopi ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Bell className="h-3 w-3 mr-1" /> Notifié
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => notifyQualiopiMutation.mutate(a.id)}
                        className="text-xs"
                      >
                        <Bell className="h-3 w-3 mr-1" /> Notifier
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingRecord(a); setShowForm(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        {a.status === "open" && (
                          <DropdownMenuItem onClick={() => updateMutation.mutate({ id: a.id, data: { status: "resolved" } })}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Marquer résolu
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(a.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <AbsenceFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingRecord(null); }}
        onSubmit={(data: any) => {
          if (editingRecord) {
            updateMutation.mutate({ id: editingRecord.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        editing={editingRecord}
        sessions={sessions}
        trainees={trainees}
      />
    </div>
  );
}

function AbsenceFormDialog({ open, onClose, onSubmit, editing, sessions, trainees }: any) {
  const [sessionId, setSessionId] = useState(editing?.sessionId || "");
  const [traineeId, setTraineeId] = useState(editing?.traineeId || "");
  const [date, setDate] = useState(editing?.date || "");
  const [type, setType] = useState(editing?.type || "absence");
  const [reason, setReason] = useState(editing?.reason || "");
  const [justified, setJustified] = useState(editing?.justified || false);
  const [duration, setDuration] = useState(editing?.duration || "");
  const [notes, setNotes] = useState(editing?.notes || "");

  const selectedSession = sessions?.find((s: any) => s.id === sessionId);
  const selectedTrainee = trainees?.find((t: any) => t.id === traineeId);

  const handleSubmit = () => {
    onSubmit({
      sessionId,
      traineeId,
      traineeName: selectedTrainee ? `${selectedTrainee.firstName} ${selectedTrainee.lastName}` : editing?.traineeName || "",
      sessionTitle: selectedSession?.title || editing?.sessionTitle || "",
      date,
      type,
      reason,
      justified,
      duration: duration ? parseInt(duration) : null,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier l'absence" : "Déclarer une absence"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une session" /></SelectTrigger>
              <SelectContent>
                {sessions?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Apprenant</Label>
            <Select value={traineeId} onValueChange={setTraineeId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un apprenant" /></SelectTrigger>
              <SelectContent>
                {trainees?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ABSENCE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Motif</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison de l'absence..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Durée (minutes)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ex: 120" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="justified" checked={justified} onChange={e => setJustified(e.target.checked)} />
              <Label htmlFor="justified">Justifiée</Label>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes complémentaires..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit}>{editing ? "Mettre à jour" : "Enregistrer"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// QUALITY INCIDENTS TAB
// =============================================

function IncidentsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [viewingIncident, setViewingIncident] = useState<any>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["/api/quality-incidents"],
    queryFn: () => apiRequest("GET", "/api/quality-incidents").then(r => r.json()),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/quality-incidents", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-incidents"] });
      setShowForm(false);
      toast({ title: "Incident créé" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/quality-incidents/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-incidents"] });
      setEditingIncident(null);
      setViewingIncident(null);
      toast({ title: "Incident mis à jour" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quality-incidents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-incidents"] });
      toast({ title: "Incident supprimé" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => apiRequest("GET", "/api/quality-incidents-export").then(r => r.json()),
    onSuccess: (data: any[]) => {
      if (data.length === 0) return toast({ title: "Aucune donnée à exporter" });
      const headers = Object.keys(data[0]);
      const bom = "\uFEFF";
      const csv = bom + headers.join(";") + "\n" + data.map(r => headers.map(h => `"${(r as any)[h] ?? ""}"`).join(";")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incidents-qualite-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export CSV téléchargé" });
    },
  });

  const filtered = incidents.filter((i: any) => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterType !== "all" && i.type !== filterType) return false;
    if (filterSeverity !== "all" && i.severity !== filterSeverity) return false;
    if (search) {
      const s = search.toLowerCase();
      return i.title?.toLowerCase().includes(s) || i.reference?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter((i: any) => i.status === "open" || i.status === "investigating" || i.status === "corrective_action").length,
    critical: incidents.filter((i: any) => i.severity === "critical").length,
    resolved: incidents.filter((i: any) => i.status === "resolved" || i.status === "closed").length,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total incidents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
            <div className="text-sm text-muted-foreground">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Critiques</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Résolus/Clôturés</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="w-56" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {INCIDENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {INCIDENT_SEVERITIES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {INCIDENT_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportMutation.mutate()}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => { setEditingIncident(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Déclarer un incident
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions corr.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucun incident déclaré
                </TableCell>
              </TableRow>
            ) : filtered.map((i: any) => {
              const typeInfo = INCIDENT_TYPES.find(t => t.value === i.type);
              const severityInfo = INCIDENT_SEVERITIES.find(s => s.value === i.severity);
              const statusInfo = INCIDENT_STATUSES.find(s => s.value === i.status);
              const actionsCount = Array.isArray(i.correctiveActions) ? i.correctiveActions.length : 0;
              const actionsDone = Array.isArray(i.correctiveActions) ? i.correctiveActions.filter((a: any) => a.status === "done").length : 0;
              return (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => setViewingIncident(i)}>
                  <TableCell className="font-mono text-sm font-medium">{i.reference}</TableCell>
                  <TableCell className="max-w-48 truncate">{i.title}</TableCell>
                  <TableCell>
                    <Badge className={typeInfo?.color || ""}>{typeInfo?.label || i.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={severityInfo?.color || ""}>{severityInfo?.label || i.severity}</Badge>
                  </TableCell>
                  <TableCell className="max-w-36 truncate">{i.sessionTitle || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusInfo?.color || ""}>{statusInfo?.label || i.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {actionsCount > 0 ? (
                      <span className="text-sm">{actionsDone}/{actionsCount}</span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {i.reportedAt ? new Date(i.reportedAt).toLocaleDateString("fr-FR") : "-"}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingIncident(i)}>
                          <Eye className="h-4 w-4 mr-2" /> Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingIncident(i); setShowForm(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(i.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Form */}
      <IncidentFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingIncident(null); }}
        onSubmit={(data: any) => {
          if (editingIncident) {
            updateMutation.mutate({ id: editingIncident.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        editing={editingIncident}
        sessions={sessions}
      />

      {/* Detail View */}
      <IncidentDetailDialog
        incident={viewingIncident}
        onClose={() => setViewingIncident(null)}
        onUpdate={(data: any) => {
          if (viewingIncident) updateMutation.mutate({ id: viewingIncident.id, data });
        }}
      />
    </div>
  );
}

function IncidentFormDialog({ open, onClose, onSubmit, editing, sessions }: any) {
  const [sessionId, setSessionId] = useState(editing?.sessionId || "");
  const [type, setType] = useState(editing?.type || "incident");
  const [severity, setSeverity] = useState(editing?.severity || "minor");
  const [title, setTitle] = useState(editing?.title || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [category, setCategory] = useState(editing?.category || "");
  const [rootCause, setRootCause] = useState(editing?.rootCause || "");

  const selectedSession = sessions?.find((s: any) => s.id === sessionId);

  const handleSubmit = () => {
    onSubmit({
      sessionId: (sessionId && sessionId !== "_none") ? sessionId : null,
      sessionTitle: selectedSession?.title || editing?.sessionTitle || "",
      type,
      severity,
      title,
      description,
      category: (category && category !== "_none") ? category : null,
      rootCause: rootCause || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier l'incident" : "Déclarer un incident qualité"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'incident" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sévérité</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_SEVERITIES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Session liée</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {sessions?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non défini</SelectItem>
                  {INCIDENT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez l'incident..." rows={4} />
          </div>
          <div>
            <Label>Cause racine (optionnel)</Label>
            <Textarea value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Analyse des causes..." rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!title || !description}>{editing ? "Mettre à jour" : "Déclarer"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncidentDetailDialog({ incident, onClose, onUpdate }: any) {
  const [newActionDesc, setNewActionDesc] = useState("");
  const [newActionResp, setNewActionResp] = useState("");
  const [newActionDeadline, setNewActionDeadline] = useState("");
  const [newAxisName, setNewAxisName] = useState("");
  const [newAxisDesc, setNewAxisDesc] = useState("");
  const [newAxisPriority, setNewAxisPriority] = useState("medium");

  if (!incident) return null;

  const statusInfo = INCIDENT_STATUSES.find(s => s.value === incident.status);
  const typeInfo = INCIDENT_TYPES.find(t => t.value === incident.type);
  const severityInfo = INCIDENT_SEVERITIES.find(s => s.value === incident.severity);
  const actions = Array.isArray(incident.correctiveActions) ? incident.correctiveActions : [];
  const axes = Array.isArray(incident.improvementAxes) ? incident.improvementAxes : [];

  const addCorrectiveAction = () => {
    if (!newActionDesc) return;
    const updated = [
      ...actions,
      {
        id: crypto.randomUUID(),
        description: newActionDesc,
        responsible: newActionResp,
        deadline: newActionDeadline,
        status: "pending",
      },
    ];
    onUpdate({ correctiveActions: updated });
    setNewActionDesc("");
    setNewActionResp("");
    setNewActionDeadline("");
  };

  const toggleActionStatus = (actionId: string) => {
    const updated = actions.map((a: any) =>
      a.id === actionId
        ? { ...a, status: a.status === "done" ? "pending" : "done", completedAt: a.status === "done" ? undefined : new Date().toISOString() }
        : a
    );
    onUpdate({ correctiveActions: updated });
  };

  const addImprovementAxis = () => {
    if (!newAxisName) return;
    const updated = [
      ...axes,
      {
        id: crypto.randomUUID(),
        axis: newAxisName,
        description: newAxisDesc,
        priority: newAxisPriority,
        status: "identified",
      },
    ];
    onUpdate({ improvementAxes: updated });
    setNewAxisName("");
    setNewAxisDesc("");
    setNewAxisPriority("medium");
  };

  return (
    <Dialog open={!!incident} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-sm">{incident.reference}</span>
            <Badge className={typeInfo?.color || ""}>{typeInfo?.label}</Badge>
            <Badge className={severityInfo?.color || ""}>{severityInfo?.label}</Badge>
            <Badge className={statusInfo?.color || ""}>{statusInfo?.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info */}
          <div>
            <h3 className="font-semibold text-lg mb-1">{incident.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incident.description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <span>Déclaré par : {incident.reportedByName}</span>
              {incident.sessionTitle && <span>Session : {incident.sessionTitle}</span>}
              {incident.category && <span>Catégorie : {INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</span>}
              <span>Date : {incident.reportedAt ? new Date(incident.reportedAt).toLocaleDateString("fr-FR") : "-"}</span>
            </div>
            {incident.rootCause && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="text-xs font-medium text-muted-foreground mb-1">Cause racine</div>
                <p className="text-sm">{incident.rootCause}</p>
              </div>
            )}
          </div>

          {/* Status update */}
          <div className="flex gap-2">
            <Label className="pt-2">Statut :</Label>
            <Select value={incident.status} onValueChange={v => onUpdate({ status: v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCIDENT_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Corrective Actions */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Actions correctives ({actions.length})
            </h4>
            {actions.length > 0 && (
              <div className="space-y-2 mb-3">
                {actions.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={a.status === "done"}
                      onChange={() => toggleActionStatus(a.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.description}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        {a.responsible && <span>Responsable : {a.responsible}</span>}
                        {a.deadline && <span>Échéance : {new Date(a.deadline).toLocaleDateString("fr-FR")}</span>}
                        {a.completedAt && <span>Fait le : {new Date(a.completedAt).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    </div>
                    <Badge variant={a.status === "done" ? "default" : a.status === "in_progress" ? "secondary" : "outline"} className="text-xs">
                      {a.status === "done" ? "Fait" : a.status === "in_progress" ? "En cours" : "À faire"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
              <Input placeholder="Description de l'action..." value={newActionDesc} onChange={e => setNewActionDesc(e.target.value)} />
              <div className="flex gap-2">
                <Input placeholder="Responsable" value={newActionResp} onChange={e => setNewActionResp(e.target.value)} className="flex-1" />
                <Input type="date" value={newActionDeadline} onChange={e => setNewActionDeadline(e.target.value)} className="w-40" />
                <Button size="sm" onClick={addCorrectiveAction} disabled={!newActionDesc}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Improvement Axes */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Radar className="h-4 w-4" /> Axes d'amélioration ({axes.length})
            </h4>
            {axes.length > 0 && (
              <div className="space-y-2 mb-3">
                {axes.map((a: any) => (
                  <div key={a.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.axis}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {a.priority === "high" ? "Haute" : a.priority === "medium" ? "Moyenne" : "Basse"}
                        </Badge>
                        <Badge variant={a.status === "implemented" ? "default" : "secondary"} className="text-xs">
                          {a.status === "implemented" ? "Implémenté" : a.status === "in_progress" ? "En cours" : "Identifié"}
                        </Badge>
                      </div>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
              <Input placeholder="Nom de l'axe..." value={newAxisName} onChange={e => setNewAxisName(e.target.value)} />
              <div className="flex gap-2">
                <Input placeholder="Description" value={newAxisDesc} onChange={e => setNewAxisDesc(e.target.value)} className="flex-1" />
                <Select value={newAxisPriority} onValueChange={setNewAxisPriority}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addImprovementAxis} disabled={!newAxisName}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// VEILLE TAB
// =============================================

function VeilleTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterImpact, setFilterImpact] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/veille-entries"],
    queryFn: () => apiRequest("GET", "/api/veille-entries").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/veille-entries", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/veille-entries"] });
      setShowForm(false);
      toast({ title: "Entrée de veille créée" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/veille-entries/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/veille-entries"] });
      setEditingEntry(null);
      toast({ title: "Entrée mise à jour" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/veille-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/veille-entries"] });
      toast({ title: "Entrée supprimée" });
    },
  });

  const filtered = entries.filter((e: any) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterImpact !== "all" && e.impactLevel !== filterImpact) return false;
    if (search) {
      const s = search.toLowerCase();
      return e.title?.toLowerCase().includes(s) || e.description?.toLowerCase().includes(s) || e.source?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: entries.length,
    actionRequired: entries.filter((e: any) => e.status === "action_required").length,
    highImpact: entries.filter((e: any) => e.impactLevel === "high" || e.impactLevel === "critical").length,
    newEntries: entries.filter((e: any) => e.status === "new").length,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total veille</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{stats.newEntries}</div>
            <div className="text-sm text-muted-foreground">Nouveaux</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{stats.actionRequired}</div>
            <div className="text-sm text-muted-foreground">Actions requises</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{stats.highImpact}</div>
            <div className="text-sm text-muted-foreground">Impact élevé/critique</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="w-56" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {VEILLE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterImpact} onValueChange={setFilterImpact}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Impact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous impacts</SelectItem>
              {VEILLE_IMPACT_LEVELS.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {VEILLE_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditingEntry(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle entrée
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucune entrée de veille
                </TableCell>
              </TableRow>
            ) : filtered.map((e: any) => {
              const typeInfo = VEILLE_TYPES.find(t => t.value === e.type);
              const impactInfo = VEILLE_IMPACT_LEVELS.find(l => l.value === e.impactLevel);
              const statusInfo = VEILLE_STATUSES.find(s => s.value === e.status);
              return (
                <TableRow key={e.id}>
                  <TableCell className="max-w-56">
                    <div className="font-medium truncate">{e.title}</div>
                    {e.description && <div className="text-xs text-muted-foreground truncate">{e.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge className={typeInfo?.color || ""}>{typeInfo?.label || e.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={impactInfo?.color || ""}>{impactInfo?.label || e.impactLevel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusInfo?.color || ""}>{statusInfo?.label || e.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-32 truncate">
                    {e.source ? (
                      e.source.startsWith("http") ? (
                        <a href={e.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                          <ExternalLink className="h-3 w-3" /> Lien
                        </a>
                      ) : (
                        <span className="text-sm">{e.source}</span>
                      )
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{e.assignedToName || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {e.actionDeadline ? new Date(e.actionDeadline).toLocaleDateString("fr-FR") : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString("fr-FR") : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingEntry(e); setShowForm(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        {e.status !== "archived" && (
                          <DropdownMenuItem onClick={() => updateMutation.mutate({ id: e.id, data: { status: "archived" } })}>
                            <FileText className="h-4 w-4 mr-2" /> Archiver
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(e.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <VeilleFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingEntry(null); }}
        onSubmit={(data: any) => {
          if (editingEntry) {
            updateMutation.mutate({ id: editingEntry.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        editing={editingEntry}
      />
    </div>
  );
}

function VeilleFormDialog({ open, onClose, onSubmit, editing }: any) {
  const [title, setTitle] = useState(editing?.title || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [type, setType] = useState(editing?.type || "reglementaire");
  const [source, setSource] = useState(editing?.source || "");
  const [publicationDate, setPublicationDate] = useState(editing?.publicationDate || "");
  const [impactLevel, setImpactLevel] = useState(editing?.impactLevel || "info");
  const [status, setStatus] = useState(editing?.status || "new");
  const [actionRequired, setActionRequired] = useState(editing?.actionRequired || "");
  const [actionDeadline, setActionDeadline] = useState(editing?.actionDeadline || "");
  const [notes, setNotes] = useState(editing?.notes || "");

  const handleSubmit = () => {
    onSubmit({
      title,
      description,
      type,
      source: source || null,
      publicationDate: publicationDate || null,
      impactLevel,
      status,
      actionRequired: actionRequired || null,
      actionDeadline: actionDeadline || null,
      notes: notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier l'entrée" : "Nouvelle entrée de veille"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'entrée" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEILLE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Niveau d'impact</Label>
              <Select value={impactLevel} onValueChange={setImpactLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEILLE_IMPACT_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description détaillée..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source (URL ou référence)</Label>
              <Input value={source} onChange={e => setSource(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Date de publication</Label>
              <Input type="date" value={publicationDate} onChange={e => setPublicationDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VEILLE_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Action requise</Label>
            <Textarea value={actionRequired} onChange={e => setActionRequired(e.target.value)} placeholder="Actions à entreprendre..." rows={2} />
          </div>
          <div>
            <Label>Échéance de l'action</Label>
            <Input type="date" value={actionDeadline} onChange={e => setActionDeadline(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes complémentaires..." rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!title}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// MAIN PAGE
// =============================================

export default function QualityImprovement() {
  return (
    <PageLayout>
      <PageHeader
        title="Amélioration continue"
        subtitle="Suivi des non-conformités et actions correctives"
      />

      <Tabs defaultValue="absences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="absences" className="flex items-center gap-2">
            <UserX className="h-4 w-4" /> Absences & Anomalies
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Incidents Qualité
          </TabsTrigger>
          <TabsTrigger value="veille" className="flex items-center gap-2">
            <Radar className="h-4 w-4" /> Veille
          </TabsTrigger>
        </TabsList>

        <TabsContent value="absences">
          <AbsencesTab />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="veille">
          <VeilleTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
