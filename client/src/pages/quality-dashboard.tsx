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
  MoreHorizontal,
  Pencil,
  Trash2,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
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
import type { QualityAction, InsertQualityAction, SurveyResponse } from "@shared/schema";
import { QUALITY_ACTION_TYPES, QUALITY_ACTION_STATUSES, QUALITY_PRIORITIES } from "@shared/schema";

function ActionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    improvement: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    corrective: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    preventive: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  };
  const label = QUALITY_ACTION_TYPES.find((t) => t.value === type)?.label || type;
  return <Badge variant="outline" className={variants[type] || ""}>{label}</Badge>;
}

function ActionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    open: "bg-accent text-accent-foreground",
    in_progress: "bg-primary/10 text-primary dark:bg-primary/20",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-destructive/10 text-destructive",
  };
  const label = QUALITY_ACTION_STATUSES.find((s) => s.value === status)?.label || status;
  return <Badge variant="outline" className={variants[status] || ""}>{label}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const label = QUALITY_PRIORITIES.find((p) => p.value === priority)?.label || priority;
  return <Badge variant="outline" className={variants[priority] || ""}>{label}</Badge>;
}

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
  icon: typeof ShieldCheck;
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

function QualityActionForm({
  action,
  onSubmit,
  isPending,
}: {
  action?: QualityAction;
  onSubmit: (data: InsertQualityAction) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(action?.title || "");
  const [description, setDescription] = useState(action?.description || "");
  const [type, setType] = useState(action?.type || "improvement");
  const [status, setStatus] = useState(action?.status || "open");
  const [priority, setPriority] = useState(action?.priority || "medium");
  const [assignedTo, setAssignedTo] = useState(action?.assignedTo || "");
  const [dueDate, setDueDate] = useState(action?.dueDate || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      type,
      status,
      priority,
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      completedAt: status === "completed" ? new Date() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="action-title">Titre</Label>
        <Input
          id="action-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Mise a jour du processus d'evaluation"
          required
          data-testid="input-action-title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="action-description">Description</Label>
        <Textarea
          id="action-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Decrivez l'action qualite..."
          className="resize-none"
          data-testid="input-action-description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger data-testid="select-action-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_ACTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-action-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_ACTION_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priorite</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-action-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="action-due-date">Date limite</Label>
          <Input
            id="action-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            data-testid="input-action-due-date"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="action-assigned">Responsable</Label>
        <Input
          id="action-assigned"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Nom du responsable"
          data-testid="input-action-assigned"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-action-submit">
          {isPending ? "Enregistrement..." : action ? "Modifier" : "Creer"}
        </Button>
      </div>
    </form>
  );
}

export default function QualityDashboard() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAction, setEditAction] = useState<QualityAction | undefined>();
  const { toast } = useToast();

  const { data: actions, isLoading: loadingActions } = useQuery<QualityAction[]>({
    queryKey: ["/api/quality-actions"],
  });

  const { data: surveyStats, isLoading: loadingStats } = useQuery<{
    averageRating: number;
    totalResponses: number;
    completionRate: number;
  }>({
    queryKey: ["/api/survey-responses/stats"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertQualityAction) => apiRequest("POST", "/api/quality-actions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-actions"] });
      setDialogOpen(false);
      toast({ title: "Action qualite creee avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la creation", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertQualityAction }) =>
      apiRequest("PATCH", `/api/quality-actions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-actions"] });
      setDialogOpen(false);
      setEditAction(undefined);
      toast({ title: "Action qualite modifiee avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quality-actions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-actions"] });
      toast({ title: "Action qualite supprimee" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const openActions = actions?.filter((a) => a.status === "open") || [];
  const loading = loadingActions || loadingStats;

  const filtered = actions?.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.assignedTo || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-quality-title">Qualite / Qualiopi</h1>
          <p className="text-muted-foreground mt-1">Suivi qualite et amelioration continue</p>
        </div>
        <Button
          onClick={() => {
            setEditAction(undefined);
            setDialogOpen(true);
          }}
          data-testid="button-create-action"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle action
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Satisfaction moyenne"
          value={surveyStats?.averageRating ? `${surveyStats.averageRating.toFixed(1)}/5` : "-"}
          icon={TrendingUp}
          subtitle={`${surveyStats?.totalResponses ?? 0} reponses`}
          loading={loading}
          testId="card-stat-satisfaction"
        />
        <StatCard
          title="Taux de completion"
          value={surveyStats?.completionRate ? `${Math.round(surveyStats.completionRate)}%` : "-"}
          icon={CheckCircle}
          subtitle="Enquetes completees"
          loading={loading}
          testId="card-stat-completion"
        />
        <StatCard
          title="Actions ouvertes"
          value={openActions.length}
          icon={AlertTriangle}
          subtitle="A traiter"
          loading={loading}
          testId="card-stat-open-actions"
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-actions"
        />
      </div>

      {loadingActions ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune action qualite</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun resultat pour votre recherche" : "Creez votre premiere action qualite"}
          </p>
          {!search && (
            <Button
              onClick={() => setDialogOpen(true)}
              data-testid="button-create-first-action"
            >
              <Plus className="w-4 h-4 mr-2" />
              Creer une action
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorite</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Date limite</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((action) => (
                  <TableRow key={action.id} data-testid={`row-action-${action.id}`}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{action.title}</p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {action.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActionTypeBadge type={action.type} />
                    </TableCell>
                    <TableCell>
                      <ActionStatusBadge status={action.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={action.priority} />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{action.assignedTo || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {action.dueDate
                          ? new Date(action.dueDate).toLocaleDateString("fr-FR")
                          : "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-action-menu-${action.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditAction(action);
                              setDialogOpen(true);
                            }}
                            data-testid={`button-edit-action-${action.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(action.id)}
                            data-testid={`button-delete-action-${action.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditAction(undefined);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editAction ? "Modifier l'action qualite" : "Nouvelle action qualite"}
            </DialogTitle>
          </DialogHeader>
          <QualityActionForm
            action={editAction}
            onSubmit={(data) =>
              editAction
                ? updateMutation.mutate({ id: editAction.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
