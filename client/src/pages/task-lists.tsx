import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Check,
  ListChecks,
  ClipboardCheck,
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
import { TASK_LIST_STATUSES } from "@shared/schema";

function TaskListsContent() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [viewingList, setViewingList] = useState<any>(null);

  const { data: taskListsData = [], isLoading } = useQuery({
    queryKey: ["/api/task-lists"],
    queryFn: () => apiRequest("GET", "/api/task-lists").then((r) => r.json()),
  });

  const { data: trainees = [] } = useQuery({
    queryKey: ["/api/trainees"],
    queryFn: () => apiRequest("GET", "/api/trainees").then((r) => r.json()),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then((r) => r.json()),
  });

  const createListMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/task-lists", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-lists"] });
      setShowForm(false);
      toast({ title: "Liste créée" });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/task-lists/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-lists"] });
      setEditingList(null);
      setShowForm(false);
      toast({ title: "Liste mise à jour" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/task-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-lists"] });
      toast({ title: "Liste supprimée" });
    },
  });

  const filtered = taskListsData.filter((l: any) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.title?.toLowerCase().includes(s) || l.traineeName?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: taskListsData.length,
    inProgress: taskListsData.filter((l: any) => l.status === "in_progress").length,
    completed: taskListsData.filter((l: any) => l.status === "completed").length,
    validated: taskListsData.filter((l: any) => l.status === "validated").length,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total listes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Terminées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.validated}</div>
            <div className="text-sm text-muted-foreground">Validées</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="w-56" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {TASK_LIST_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingList(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle liste
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Apprenant</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Progression</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Aucune liste de tâches
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((list: any) => {
                const statusInfo = TASK_LIST_STATUSES.find((s) => s.value === list.status);
                return (
                  <TableRow
                    key={list.id}
                    className="cursor-pointer"
                    onClick={() => setViewingList(list)}
                  >
                    <TableCell className="font-medium max-w-48 truncate">{list.title}</TableCell>
                    <TableCell>{list.traineeName || "-"}</TableCell>
                    <TableCell className="max-w-32 truncate text-sm">
                      {sessions.find((s: any) => s.id === list.sessionId)?.title || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {list.type === "auto" ? "Auto" : list.type === "mixed" ? "Mixte" : "Manuel"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={list.progress || 0} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-8">{list.progress || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo?.color || ""}>{statusInfo?.label || list.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {list.dueDate ? new Date(list.dueDate).toLocaleDateString("fr-FR") : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingList(list)}>
                            <Eye className="h-4 w-4 mr-2" /> Voir tâches
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingList(list);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          {list.status === "completed" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateListMutation.mutate({ id: list.id, data: { status: "validated" } })
                              }
                            >
                              <ClipboardCheck className="h-4 w-4 mr-2" /> Valider
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteListMutation.mutate(list.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <TaskListFormDialog
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingList(null);
        }}
        onSubmit={(data: any) => {
          if (editingList) {
            updateListMutation.mutate({ id: editingList.id, data });
          } else {
            createListMutation.mutate(data);
          }
        }}
        editing={editingList}
        trainees={trainees}
        sessions={sessions}
      />

      {/* Task Items Detail */}
      {viewingList && (
        <TaskItemsDialog
          taskList={viewingList}
          onClose={() => setViewingList(null)}
          onRefreshList={() => queryClient.invalidateQueries({ queryKey: ["/api/task-lists"] })}
        />
      )}
    </div>
  );
}

function TaskListFormDialog({ open, onClose, onSubmit, editing, trainees, sessions }: any) {
  const [title, setTitle] = useState(editing?.title || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [traineeId, setTraineeId] = useState(editing?.traineeId || "none");
  const [sessionId, setSessionId] = useState(editing?.sessionId || "none");
  const [type, setType] = useState(editing?.type || "manual");
  const [dueDate, setDueDate] = useState(editing?.dueDate || "");

  const selectedTrainee = trainees?.find((t: any) => t.id === traineeId);

  const handleSubmit = () => {
    onSubmit({
      title,
      description,
      traineeId: traineeId !== "none" ? traineeId : null,
      traineeName: selectedTrainee ? `${selectedTrainee.firstName} ${selectedTrainee.lastName}` : null,
      sessionId: sessionId !== "none" ? sessionId : null,
      type,
      dueDate: dueDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier la liste" : "Nouvelle liste de tâches"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Parcours AFGSU niveau 2"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Apprenant</Label>
              <Select value={traineeId} onValueChange={setTraineeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {trainees?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {sessions?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="auto">Automatique</SelectItem>
                  <SelectItem value="mixed">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Échéance</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!title}>
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskItemsDialog({ taskList, onClose, onRefreshList }: any) {
  const { toast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMethod, setNewTaskMethod] = useState("manual");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/task-items", taskList.id],
    queryFn: () => apiRequest("GET", `/api/task-items?taskListId=${taskList.id}`).then((r) => r.json()),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/task-items", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-items", taskList.id] });
      onRefreshList();
      setNewTaskTitle("");
      toast({ title: "Tâche ajoutée" });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      apiRequest("PATCH", `/api/task-items/${id}`, { checked }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-items", taskList.id] });
      onRefreshList();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/task-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-items", taskList.id] });
      onRefreshList();
      toast({ title: "Tâche supprimée" });
    },
  });

  const statusInfo = TASK_LIST_STATUSES.find((s) => s.value === taskList.status);
  const checkedCount = items.filter((i: any) => i.checked).length;

  return (
    <Dialog open={!!taskList} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {taskList.title}
            <Badge className={statusInfo?.color || ""} variant="secondary">
              {statusInfo?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {taskList.description && (
            <p className="text-sm text-muted-foreground">{taskList.description}</p>
          )}

          <div className="flex items-center gap-3">
            <Progress value={taskList.progress || 0} className="h-3 flex-1" />
            <span className="text-sm font-medium">
              {checkedCount}/{items.length} ({taskList.progress || 0}%)
            </span>
          </div>

          {taskList.traineeName && (
            <div className="text-sm text-muted-foreground">
              Apprenant : <span className="font-medium text-foreground">{taskList.traineeName}</span>
            </div>
          )}

          {/* Task Items */}
          <div className="space-y-1">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : items.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                Aucune tâche. Ajoutez des tâches ci-dessous.
              </div>
            ) : (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    item.checked ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  <button
                    onClick={() => toggleItemMutation.mutate({ id: item.id, checked: !item.checked })}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.checked
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-green-400"
                    }`}
                  >
                    {item.checked && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                      {item.title}
                    </span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.checkMethod === "automatic" ? "Auto" : "Manuel"}
                      </Badge>
                      {item.checkedAt && (
                        <span className="text-xs text-muted-foreground">
                          Fait le {new Date(item.checkedAt).toLocaleDateString("fr-FR")}
                          {item.checkedByName && ` par ${item.checkedByName}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add task item */}
          <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nouvelle tâche..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTaskTitle.trim()) {
                    addItemMutation.mutate({
                      taskListId: taskList.id,
                      title: newTaskTitle.trim(),
                      checkMethod: newTaskMethod,
                      orderIndex: items.length,
                    });
                  }
                }}
              />
              <Select value={newTaskMethod} onValueChange={setNewTaskMethod}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="automatic">Auto</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  if (newTaskTitle.trim()) {
                    addItemMutation.mutate({
                      taskListId: taskList.id,
                      title: newTaskTitle.trim(),
                      checkMethod: newTaskMethod,
                      orderIndex: items.length,
                    });
                  }
                }}
                disabled={!newTaskTitle.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TaskListsPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Listes de tâches"
        subtitle="Organisez et suivez vos tâches"
      />

      <TaskListsContent />
    </PageLayout>
  );
}
