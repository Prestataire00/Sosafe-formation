import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Search,
  ClipboardList,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
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
import type { Enrollment, InsertEnrollment, Session, Trainee, Enterprise } from "@shared/schema";

const ENROLLMENT_STATUSES = [
  { value: "registered", label: "Inscrit", icon: Clock, className: "bg-accent text-accent-foreground" },
  { value: "confirmed", label: "Confirm\u00e9", icon: UserCheck, className: "bg-primary/10 text-primary dark:bg-primary/20" },
  { value: "completed", label: "Termin\u00e9", icon: CheckCircle, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "cancelled", label: "Annul\u00e9", icon: XCircle, className: "bg-destructive/10 text-destructive" },
];

function EnrollmentStatusBadge({ status }: { status: string }) {
  const st = ENROLLMENT_STATUSES.find((s) => s.value === status) || ENROLLMENT_STATUSES[0];
  const Icon = st.icon;
  return (
    <Badge variant="outline" className={`${st.className} gap-1`}>
      <Icon className="w-3 h-3" />
      {st.label}
    </Badge>
  );
}

function EnrollmentForm({
  sessions,
  trainees,
  enterprises,
  onSubmit,
  isPending,
}: {
  sessions: Session[];
  trainees: Trainee[];
  enterprises: Enterprise[];
  onSubmit: (data: InsertEnrollment) => void;
  isPending: boolean;
}) {
  const [sessionId, setSessionId] = useState("");
  const [traineeId, setTraineeId] = useState("");
  const [enterpriseId, setEnterpriseId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sessionId,
      traineeId,
      enterpriseId: enterpriseId || null,
      status: "registered",
      notes: notes || null,
      certificateUrl: null,
    });
  };

  const plannedSessions = sessions.filter((s) => s.status === "planned" || s.status === "ongoing");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Session</Label>
        <Select value={sessionId} onValueChange={setSessionId} required>
          <SelectTrigger data-testid="select-enrollment-session"><SelectValue placeholder="S\u00e9lectionner une session" /></SelectTrigger>
          <SelectContent>
            {plannedSessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Stagiaire</Label>
        <Select value={traineeId} onValueChange={setTraineeId} required>
          <SelectTrigger data-testid="select-enrollment-trainee"><SelectValue placeholder="S\u00e9lectionner un stagiaire" /></SelectTrigger>
          <SelectContent>
            {trainees.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

  const createMutation = useMutation({
    mutationFn: (data: InsertEnrollment) => apiRequest("POST", "/api/enrollments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      setDialogOpen(false);
      toast({ title: "Inscription cr\u00e9\u00e9e avec succ\u00e8s" });
    },
    onError: () => toast({ title: "Erreur lors de l'inscription", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/enrollments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      toast({ title: "Statut mis \u00e0 jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise \u00e0 jour", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enrollments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment-counts"] });
      toast({ title: "Inscription supprim\u00e9e" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
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
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-enrollments-title">Inscriptions</h1>
          <p className="text-muted-foreground mt-1">G\u00e9rez les inscriptions aux sessions de formation</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-enrollment">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle inscription
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { value: "all", label: "Toutes" },
          { value: "registered", label: "Inscrits" },
          { value: "confirmed", label: "Confirm\u00e9s" },
          { value: "completed", label: "Termin\u00e9s" },
          { value: "cancelled", label: "Annul\u00e9s" },
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-enrollments" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune inscription</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || statusFilter !== "all"
              ? "Aucun r\u00e9sultat pour vos filtres"
              : "Commencez par inscrire un stagiaire \u00e0 une session"}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-enrollment">
              <Plus className="w-4 h-4 mr-2" />
              Inscrire un stagiaire
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stagiaire</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((enrollment) => {
                  const session = sessions?.find((s) => s.id === enrollment.sessionId);
                  const trainee = trainees?.find((t) => t.id === enrollment.traineeId);
                  const enterprise = enterprises?.find((e) => e.id === enrollment.enterpriseId);
                  return (
                    <TableRow key={enrollment.id} data-testid={`row-enrollment-${enrollment.id}`}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{trainee ? `${trainee.firstName} ${trainee.lastName}` : "Inconnu"}</p>
                          <p className="text-xs text-muted-foreground">{trainee?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{session?.title || "Session inconnue"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{enterprise?.name || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <EnrollmentStatusBadge status={enrollment.status} />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle inscription</DialogTitle>
          </DialogHeader>
          <EnrollmentForm
            sessions={sessions || []}
            trainees={trainees || []}
            enterprises={enterprises || []}
            onSubmit={(data) => {
              const cleanData = {
                ...data,
                enterpriseId: data.enterpriseId === "none" ? null : data.enterpriseId,
              };
              createMutation.mutate(cleanData);
            }}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
