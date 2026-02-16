import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
  Calendar,
  MapPin,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session, InsertSession, Program, Trainer } from "@shared/schema";

const sessionStatuses = [
  { value: "planned", label: "Planifiée" },
  { value: "ongoing", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
];

function SessionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    planned: "bg-accent text-accent-foreground",
    ongoing: "bg-primary/10 text-primary dark:bg-primary/20",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-destructive/10 text-destructive",
  };
  const labels: Record<string, string> = {
    planned: "Planifiée",
    ongoing: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  };
  return <Badge variant="outline" className={variants[status] || ""}>{labels[status] || status}</Badge>;
}

function SessionForm({
  session,
  programs,
  trainers,
  onSubmit,
  isPending,
}: {
  session?: Session;
  programs: Program[];
  trainers: Trainer[];
  onSubmit: (data: InsertSession) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(session?.title || "");
  const [programId, setProgramId] = useState(session?.programId || "");
  const [trainerId, setTrainerId] = useState(session?.trainerId || "");
  const [startDate, setStartDate] = useState(session?.startDate || "");
  const [endDate, setEndDate] = useState(session?.endDate || "");
  const [location, setLocation] = useState(session?.location || "");
  const [maxParticipants, setMaxParticipants] = useState(session?.maxParticipants?.toString() || "12");
  const [status, setStatus] = useState(session?.status || "planned");
  const [notes, setNotes] = useState(session?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      programId,
      trainerId: trainerId || null,
      startDate,
      endDate,
      location: location || null,
      maxParticipants: parseInt(maxParticipants) || 12,
      status,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="session-title">Titre de la session</Label>
        <Input
          id="session-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Session Mars 2026"
          required
          data-testid="input-session-title"
        />
      </div>
      <div className="space-y-2">
        <Label>Formation associée</Label>
        <Select value={programId} onValueChange={setProgramId} required>
          <SelectTrigger data-testid="select-session-program">
            <SelectValue placeholder="Sélectionner une formation" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Formateur</Label>
        <Select value={trainerId} onValueChange={setTrainerId}>
          <SelectTrigger data-testid="select-session-trainer">
            <SelectValue placeholder="Sélectionner un formateur" />
          </SelectTrigger>
          <SelectContent>
            {trainers.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Date de début</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            data-testid="input-session-start"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">Date de fin</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            data-testid="input-session-end"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Lieu</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Paris, en ligne..."
            data-testid="input-session-location"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-participants">Places max</Label>
          <Input
            id="max-participants"
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            min="1"
            data-testid="input-session-max"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-session-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sessionStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes supplémentaires..."
          className="resize-none"
          data-testid="input-session-notes"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-session-submit">
          {isPending ? "Enregistrement..." : session ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

export default function Sessions() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | undefined>();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });
  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSession) => apiRequest("POST", "/api/sessions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setDialogOpen(false);
      toast({ title: "Session créée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertSession }) =>
      apiRequest("PATCH", `/api/sessions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setDialogOpen(false);
      setEditSession(undefined);
      toast({ title: "Session modifiée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session supprimée" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered = sessions?.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.location || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-sessions-title">Sessions</h1>
          <p className="text-muted-foreground mt-1">Planifiez et gérez vos sessions de formation</p>
        </div>
        <Button
          onClick={() => { setEditSession(undefined); setDialogOpen(true); }}
          data-testid="button-create-session"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle session
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une session..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-sessions"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune session</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun résultat pour votre recherche" : "Créez votre première session de formation"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-session">
              <Plus className="w-4 h-4 mr-2" />
              Créer une session
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((session) => {
            const program = programs?.find((p) => p.id === session.programId);
            const trainer = trainers?.find((t) => t.id === session.trainerId);
            return (
              <Card key={session.id} className="hover-elevate" data-testid={`card-session-${session.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{session.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {program?.title || "Formation non trouvée"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-session-menu-${session.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => { setEditSession(session); setDialogOpen(true); }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(session.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <SessionStatusBadge status={session.status} />
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {new Date(session.startDate).toLocaleDateString("fr-FR")} - {new Date(session.endDate).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{session.location}</span>
                      </div>
                    )}
                    {trainer && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>{trainer.firstName} {trainer.lastName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{session.maxParticipants} places max</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditSession(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSession ? "Modifier la session" : "Nouvelle session"}</DialogTitle>
          </DialogHeader>
          <SessionForm
            session={editSession}
            programs={programs || []}
            trainers={trainers || []}
            onSubmit={(data) =>
              editSession
                ? updateMutation.mutate({ id: editSession.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
