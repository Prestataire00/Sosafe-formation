import { useState, useMemo } from "react";
import { CSVImportDialog } from "@/components/CSVImportDialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  UserCheck,
  Monitor,
  Layers,
  Printer,
  Building2,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Video,
  Link2,
  Check,
  Copy,
  Clock,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, isWithinInterval, parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Session, InsertSession, Program, Trainer, Trainee, Enrollment, Enterprise, SessionDate } from "@shared/schema";
import { SESSION_STATUSES, MODALITIES, TRAINEE_PROFILE_TYPES } from "@shared/schema";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedFilters } from "@/components/shared/AdvancedFilters";
import { ExportButton } from "@/components/shared/ExportButton";

const statusLabels: Record<string, string> = {};
SESSION_STATUSES.forEach((s) => { statusLabels[s.value] = s.label; });

function SessionStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} label={statusLabels[status] || status} colorMap={{ planned: "purple", ongoing: "info", completed: "success", cancelled: "destructive" }} />;
}

const inlineStatusVariantMap: Record<string, "purple" | "info" | "success" | "destructive"> = {
  planned: "purple",
  ongoing: "info",
  completed: "success",
  cancelled: "destructive",
};

function InlineStatusBadge({
  session,
  onStatusChange,
}: {
  session: Session;
  onStatusChange: (sessionId: string, newStatus: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus:outline-none cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <StatusBadge
            status={session.status}
            label={statusLabels[session.status] || session.status}
            colorMap={inlineStatusVariantMap}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {SESSION_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            disabled={s.value === session.status}
            onClick={() => onStatusChange(session.id, s.value)}
          >
            <StatusBadge
              status={s.value}
              label={s.label}
              colorMap={inlineStatusVariantMap}
              className="mr-2 pointer-events-none"
            />
            {s.value === session.status && <span className="text-xs text-muted-foreground ml-auto">(actuel)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlineTrainerSelect({
  session,
  trainers,
  sessionTrainerIds,
  onTrainersChange,
}: {
  session: Session;
  trainers: Trainer[];
  sessionTrainerIds: string[];
  onTrainersChange: (sessionId: string, trainerIds: string[]) => void;
}) {
  const currentTrainers = sessionTrainerIds.length > 0
    ? sessionTrainerIds.map((id) => trainers.find((t) => t.id === id)).filter(Boolean) as Trainer[]
    : session.trainerId ? [trainers.find((t) => t.id === session.trainerId)].filter(Boolean) as Trainer[] : [];

  const toggleTrainer = (trainerId: string) => {
    const currentIds = currentTrainers.map((t) => t.id);
    const newIds = currentIds.includes(trainerId)
      ? currentIds.filter((id) => id !== trainerId)
      : [...currentIds, trainerId];
    onTrainersChange(session.id, newIds);
  };

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <UserCheck className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="h-6 text-xs px-1 py-0 min-w-0 w-auto hover:bg-accent/50 transition-colors rounded flex items-center gap-1">
            {currentTrainers.length > 0
              ? currentTrainers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")
              : <span className="text-muted-foreground">Assigner</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[250px] overflow-y-auto">
          {trainers.map((t) => (
            <DropdownMenuItem key={t.id} onClick={(e) => { e.preventDefault(); toggleTrainer(t.id); }} className="flex items-center gap-2 cursor-pointer">
              <div className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                currentTrainers.some((ct) => ct.id === t.id) ? "bg-primary border-primary" : "border-input"
              )}>
                {currentTrainers.some((ct) => ct.id === t.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className="text-xs">{t.firstName} {t.lastName}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CapacityBadge({ enrolled, max, waitlisted }: { enrolled: number; max: number; waitlisted?: number }) {
  const remaining = max - enrolled;
  const isFull = remaining <= 0;
  return (
    <div className="flex items-center gap-1">
      <Badge
        variant="outline"
        className={
          isFull
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1"
            : remaining <= 3
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1"
              : "text-xs gap-1"
        }
        data-testid="badge-capacity"
      >
        <Users className="w-3 h-3" />
        {isFull ? "Complet" : `${remaining} place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`}
      </Badge>
      {isFull && waitlisted && waitlisted > 0 && (
        <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
          <Clock className="w-3 h-3" />
          {waitlisted} en attente
        </Badge>
      )}
    </div>
  );
}

function ModalityIcon({ modality }: { modality: string }) {
  const icons: Record<string, typeof Monitor> = {
    presentiel: MapPin,
    distanciel: Monitor,
    blended: Layers,
  };
  const labels: Record<string, string> = {};
  MODALITIES.forEach((m) => { labels[m.value] = m.label; });
  const Icon = icons[modality] || MapPin;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {labels[modality] || modality}
    </span>
  );
}

type TrainingLocationInfo = { id: string; name: string; address: string | null; city: string | null; postalCode: string | null; rooms: string[] | null };

function SessionForm({
  session,
  programs,
  trainers,
  trainingLocations,
  onSubmit,
  isPending,
  existingDates,
  existingTrainerIds,
}: {
  session?: Session;
  programs: Program[];
  trainers: Trainer[];
  trainingLocations: TrainingLocationInfo[];
  onSubmit: (data: InsertSession, interventionDates: string[], trainerIds: string[]) => void;
  isPending: boolean;
  existingDates?: string[];
  existingTrainerIds?: string[];
}) {
  const [title, setTitle] = useState(session?.title || "");
  const [programId, setProgramId] = useState(session?.programId || "");
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>(
    existingTrainerIds || (session?.trainerId ? [session.trainerId] : [])
  );
  const [startDate, setStartDate] = useState(session?.startDate || "");
  const [endDate, setEndDate] = useState(session?.endDate || "");
  const [location, setLocation] = useState(session?.location || "");
  const [locationAddress, setLocationAddress] = useState(session?.locationAddress || "");
  const [locationRoom, setLocationRoom] = useState(session?.locationRoom || "");
  const [modality, setModality] = useState(session?.modality || "presentiel");
  const [maxParticipants, setMaxParticipants] = useState(session?.maxParticipants?.toString() || "12");
  const [status, setStatus] = useState(session?.status || "planned");
  const [notes, setNotes] = useState(session?.notes || "");
  const [virtualClassUrl, setVirtualClassUrl] = useState(session?.virtualClassUrl || "");
  const [interventionDates, setInterventionDates] = useState<Date[]>(
    (existingDates || []).map((d) => parseISO(d))
  );

  const toggleTrainer = (id: string) => {
    setSelectedTrainerIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStrings = interventionDates.map((d) => format(d, "yyyy-MM-dd")).sort();
    onSubmit({
      title,
      programId,
      trainerId: selectedTrainerIds[0] || null,
      startDate,
      endDate,
      location: location || null,
      locationAddress: locationAddress || null,
      locationRoom: locationRoom || null,
      modality,
      maxParticipants: parseInt(maxParticipants) || 12,
      status,
      notes: notes || null,
      virtualClassUrl: virtualClassUrl || null,
    }, dateStrings, selectedTrainerIds);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="session-title">Titre de la session</Label>
        <Input id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Session Mars 2026" required data-testid="input-session-title" />
      </div>
      <div className="space-y-2">
        <Label>Formation associée</Label>
        <Select value={programId} onValueChange={setProgramId} required>
          <SelectTrigger data-testid="select-session-program"><SelectValue placeholder="Sélectionner une formation" /></SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Formateur(s)</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal" data-testid="select-session-trainer">
              {selectedTrainerIds.length === 0
                ? <span className="text-muted-foreground">Sélectionner un ou plusieurs formateurs</span>
                : <span className="truncate">
                    {selectedTrainerIds.map((id) => {
                      const t = trainers.find((tr) => tr.id === id);
                      return t ? `${t.firstName} ${t.lastName}` : "";
                    }).filter(Boolean).join(", ")}
                  </span>
              }
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-y-auto" align="start">
            {trainers.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={(e) => { e.preventDefault(); toggleTrainer(t.id); }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  selectedTrainerIds.includes(t.id) ? "bg-primary border-primary" : "border-input"
                )}>
                  {selectedTrainerIds.includes(t.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                {t.firstName} {t.lastName}
                {t.specialty && <span className="text-xs text-muted-foreground ml-auto">{t.specialty}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {selectedTrainerIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTrainerIds.map((id) => {
              const t = trainers.find((tr) => tr.id === id);
              if (!t) return null;
              return (
                <Badge key={id} variant="secondary" className="text-xs gap-1">
                  {t.firstName} {t.lastName}
                  <button type="button" className="ml-0.5 hover:text-destructive" onClick={() => toggleTrainer(id)}>×</button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Date de début</Label>
          <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required data-testid="input-session-start" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">Date de fin</Label>
          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required data-testid="input-session-end" />
        </div>
      </div>
      {/* Sélecteur de dates d'intervention */}
      {startDate && endDate && (
        <div className="space-y-2">
          <Label>Jours d'intervention</Label>
          <p className="text-xs text-muted-foreground">
            Sélectionnez les jours précis de formation. Si aucun jour n'est sélectionné, la session apparaîtra sur tous les jours de la période.
          </p>
          <div className="border rounded-lg p-3 bg-muted/30">
            <DayPickerCalendar
              mode="multiple"
              selected={interventionDates}
              onSelect={(dates: Date[] | undefined) => setInterventionDates(dates || [])}
              fromDate={parseISO(startDate)}
              toDate={parseISO(endDate)}
              defaultMonth={parseISO(startDate)}
              locale={fr}
            />
          </div>
          {interventionDates.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {interventionDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((d, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {format(d, "dd/MM/yyyy")}
                    <button
                      type="button"
                      className="ml-0.5 hover:text-destructive"
                      onClick={() => setInterventionDates((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              <span className="text-xs text-muted-foreground self-center ml-1">
                {interventionDates.length} jour(s) sélectionné(s)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Modalité</Label>
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger data-testid="select-session-modality"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODALITIES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-participants">Places max</Label>
          <Input id="max-participants" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} min="1" data-testid="input-session-max" />
        </div>
      </div>
      {trainingLocations.length > 0 && (
        <div className="space-y-2">
          <Label>Lieu de formation (bibliothèque)</Label>
          <Select
            value="none"
            onValueChange={(locId) => {
              if (locId === "none") return;
              const loc = trainingLocations.find((l) => l.id === locId);
              if (loc) {
                setLocation(loc.name);
                setLocationAddress([loc.address, loc.postalCode, loc.city].filter(Boolean).join(", "));
                setLocationRoom("");
              }
            }}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner un lieu existant..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Saisie manuelle</span>
              </SelectItem>
              {trainingLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {loc.name}
                    {loc.city && <span className="text-muted-foreground text-xs">— {loc.city}</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="location">Lieu</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Paris, CHU Bordeaux..." data-testid="input-session-location" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location-address">Adresse</Label>
          <Input id="location-address" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="Ex: 12 Rue Jean Burguet, 33000 Bordeaux" data-testid="input-session-address" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-room">Salle</Label>
          <Select
            value={locationRoom || "none"}
            onValueChange={(v) => setLocationRoom(v === "none" ? "" : v)}
          >
            <SelectTrigger data-testid="input-session-room">
              <SelectValue placeholder="Sélectionner ou saisir..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none"><span className="text-muted-foreground">Aucune salle</span></SelectItem>
              {(() => {
                const loc = trainingLocations.find((l) => l.name === location);
                return (loc?.rooms || []).map((room) => (
                  <SelectItem key={room} value={room}>{room}</SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
          <Input value={locationRoom} onChange={(e) => setLocationRoom(e.target.value)} placeholder="Ou saisir manuellement..." className="text-xs h-8" />
        </div>
      </div>
      {(modality === "distanciel" || modality === "blended") && (
        <div className="space-y-2">
          <Label htmlFor="virtual-class-url">URL classe virtuelle</Label>
          <Input id="virtual-class-url" value={virtualClassUrl} onChange={(e) => setVirtualClassUrl(e.target.value)} placeholder="https://zoom.us/j/..." />
        </div>
      )}
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-session-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SESSION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes supplémentaires..." className="resize-none" data-testid="input-session-notes" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-session-submit">
          {isPending ? "Enregistrement..." : session ? "Modifier" : "Créer"}
        </Button>
      </div>

    </form>
  );
}

// ============================================================
// TRAINEE AVATAR STRIP (inline preview on session cards)
// ============================================================

const MAX_VISIBLE_AVATARS = 5;

function TraineeAvatarStrip({
  trainees,
  onClick,
}: {
  trainees: Trainee[];
  onClick: () => void;
}) {
  if (trainees.length === 0) return null;

  const visible = trainees.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = trainees.length - MAX_VISIBLE_AVATARS;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center gap-1 mt-3 pt-3 border-t w-full hover:bg-accent/50 -mx-1 px-1 rounded transition-colors cursor-pointer"
    >
      <div className="flex -space-x-2">
        {visible.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Avatar className="w-8 h-8 border-2 border-background">
                {t.avatarUrl && <AvatarImage src={t.avatarUrl} alt={`${t.firstName} ${t.lastName}`} />}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {t.firstName} {t.lastName}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Avatar className="w-8 h-8 border-2 border-background">
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
              +{overflow}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground ml-1 truncate">
        {trainees.length === 1
          ? `${trainees[0].firstName} ${trainees[0].lastName}`
          : `${trainees.length} participants`}
      </span>
    </button>
  );
}

// ============================================================
// TROMBINOSCOPE DIALOG (full view)
// ============================================================

function TrombinoscopeDialog({
  open,
  onOpenChange,
  session,
  trainees,
  enterprises,
  sessionTrainersList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | undefined;
  trainees: Trainee[];
  enterprises: Enterprise[];
  sessionTrainersList: Trainer[];
}) {
  if (!session) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">Trombinoscope</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {session.title}
                {" — "}
                {new Date(session.startDate).toLocaleDateString("fr-FR")} au {new Date(session.endDate).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0 print:hidden">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </DialogHeader>

        {/* Trainer section */}
        {sessionTrainersList.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Formateur{sessionTrainersList.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {sessionTrainersList.map((trainer) => (
                <div key={trainer.id} className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    {trainer.avatarUrl && <AvatarImage src={trainer.avatarUrl} alt={`${trainer.firstName} ${trainer.lastName}`} />}
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {trainer.firstName.charAt(0)}{trainer.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{trainer.firstName} {trainer.lastName}</p>
                    <p className="text-xs text-muted-foreground">{trainer.specialty || <a href={`mailto:${trainer.email}`} className="text-primary hover:underline">{trainer.email}</a>}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trainees grid */}
        {trainees.length > 0 ? (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Participants ({trainees.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {trainees.map((trainee) => {
                const enterprise = enterprises.find((e) => e.id === trainee.enterpriseId);
                const profileLabel = TRAINEE_PROFILE_TYPES.find((p) => p.value === trainee.profileType)?.label;
                return (
                  <div key={trainee.id} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <Avatar className="w-20 h-20">
                      {trainee.avatarUrl && <AvatarImage src={trainee.avatarUrl} alt={`${trainee.firstName} ${trainee.lastName}`} />}
                      <AvatarFallback className="text-xl bg-primary/10 text-primary">
                        {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center min-w-0 w-full space-y-0.5">
                      <p className="font-medium text-sm truncate">
                        {trainee.civility ? `${trainee.civility} ` : ""}{trainee.firstName} {trainee.lastName}
                      </p>
                      {enterprise && (
                        <p className="text-xs text-muted-foreground truncate flex items-center justify-center gap-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {enterprise.name}
                        </p>
                      )}
                      {!enterprise && trainee.proDenomination && (
                        <p className="text-xs text-muted-foreground truncate">{trainee.proDenomination}</p>
                      )}
                      {profileLabel && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {profileLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground">Aucun apprenant inscrit à cette session</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// CALENDAR VIEW
// ============================================================

const calendarStatusColors: Record<string, string> = {
  planned: "bg-blue-500",
  ongoing: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
};

const calendarStatusTextColors: Record<string, string> = {
  planned: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/50",
  ongoing: "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/50",
  completed: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/50",
  cancelled: "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/50",
};

const MAX_SESSIONS_PER_CELL = 3;

function SessionCalendarView({
  sessions,
  programs,
  trainers,
  enrollmentCounts,
  waitlistCounts,
  onSessionClick,
  sessionDatesMap,
  sessionTrainerIdsMap,
}: {
  sessions: Session[];
  programs: Program[];
  trainers: Trainer[];
  enrollmentCounts: Record<string, number>;
  waitlistCounts: Record<string, number>;
  onSessionClick: (session: Session) => void;
  sessionDatesMap: Record<string, Set<string>>;
  sessionTrainerIdsMap: Record<string, string[]>;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const getSessionsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return sessions.filter((s) => {
      const start = parseISO(s.startDate);
      const end = parseISO(s.endDate);
      const inRange = isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
      if (!inRange) return false;
      // If specific intervention dates exist, only show on those days
      const dates = sessionDatesMap[s.id];
      if (dates && dates.size > 0) {
        return dates.has(dayStr);
      }
      // Fallback: show on all days in range
      return true;
    });
  };

  const selectedDaySessions = selectedDay ? getSessionsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const daySessions = getSessionsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const overflow = daySessions.length - MAX_SESSIONS_PER_CELL;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "min-h-[90px] p-1 border-b border-r text-left transition-colors relative",
                  !isCurrentMonth && "bg-muted/30",
                  isSelected && "bg-accent/50 ring-2 ring-primary ring-inset",
                  isCurrentMonth && !isSelected && "hover:bg-accent/30",
                  i % 7 === 6 && "border-r-0",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {daySessions.slice(0, MAX_SESSIONS_PER_CELL).map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer",
                        calendarStatusTextColors[s.status] || "bg-gray-100 text-gray-700",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionClick(s);
                      }}
                      title={s.title}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 shrink-0", calendarStatusColors[s.status] || "bg-gray-400")} />
                      {s.title}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{overflow} autre{overflow > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">
              {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
              <span className="text-muted-foreground font-normal ml-2">
                ({selectedDaySessions.length} session{selectedDaySessions.length > 1 ? "s" : ""})
              </span>
            </h3>
            {selectedDaySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session ce jour</p>
            ) : (
              <div className="space-y-3">
                {selectedDaySessions.map((s) => {
                  const program = programs.find((p) => p.id === s.programId);
                  const calTIds = sessionTrainerIdsMap[s.id] || (s.trainerId ? [s.trainerId] : []);
                  const calTrainers = calTIds.map((id) => trainers.find((t) => t.id === id)).filter(Boolean) as Trainer[];
                  const enrolled = enrollmentCounts[s.id] || 0;
                  const remaining = s.maxParticipants - enrolled;
                  return (
                    <div
                      key={s.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/30 cursor-pointer transition-colors"
                      onClick={() => onSessionClick(s)}
                    >
                      <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", calendarStatusColors[s.status] || "bg-gray-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{program?.title}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {s.location}{s.locationRoom ? ` - ${s.locationRoom}` : ""}
                            </span>
                          )}
                          {calTrainers.length > 0 && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              {calTrainers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(s.startDate).toLocaleDateString("fr-FR")} - {new Date(s.endDate).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <SessionStatusBadge status={s.status} />
                        <CapacityBadge enrolled={enrolled} max={s.maxParticipants} waitlisted={waitlistCounts[s.id] || 0} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Sessions() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "kanban">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | undefined>();
  const [trombiSessionId, setTrombiSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const publicEnrollmentUrl = `${window.location.origin}/inscription`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicEnrollmentUrl).then(() => {
      setLinkCopied(true);
      toast({ title: "Lien copié dans le presse-papiers" });
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });
  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });
  const { data: allTrainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });
  const { data: allEnrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });
  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });
  const { data: allSessionDates } = useQuery<SessionDate[]>({
    queryKey: ["/api/session-dates"],
  });
  const { data: trainingLocationsList } = useQuery<TrainingLocationInfo[]>({
    queryKey: ["/api/training-locations"],
  });
  const { data: allSessionTrainers } = useQuery<{ id: string; sessionId: string; trainerId: string; role: string }[]>({
    queryKey: ["/api/session-trainers"],
  });

  // Compute enrollment counts and per-session trainees from the enrollments + trainees data
  const { enrollmentCounts, waitlistCounts, sessionTraineesMap } = useMemo(() => {
    const counts: Record<string, number> = {};
    const waitlist: Record<string, number> = {};
    const map: Record<string, Trainee[]> = {};
    if (!allEnrollments || !allTrainees) return { enrollmentCounts: counts, waitlistCounts: waitlist, sessionTraineesMap: map };

    const traineeById = new Map(allTrainees.map((t) => [t.id, t]));

    for (const e of allEnrollments) {
      if (e.status === "cancelled" || e.status === "no_show") continue;
      if (e.status === "waitlisted") {
        waitlist[e.sessionId] = (waitlist[e.sessionId] || 0) + 1;
        continue;
      }
      counts[e.sessionId] = (counts[e.sessionId] || 0) + 1;
      const trainee = traineeById.get(e.traineeId);
      if (trainee) {
        if (!map[e.sessionId]) map[e.sessionId] = [];
        map[e.sessionId].push(trainee);
      }
    }
    return { enrollmentCounts: counts, waitlistCounts: waitlist, sessionTraineesMap: map };
  }, [allEnrollments, allTrainees]);

  // Build a map of sessionId → Set of date strings for intervention dates
  const sessionDatesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    if (!allSessionDates) return map;
    for (const sd of allSessionDates) {
      if (!map[sd.sessionId]) map[sd.sessionId] = new Set();
      map[sd.sessionId].add(sd.date);
    }
    return map;
  }, [allSessionDates]);

  // Build map of sessionId → trainer IDs from the junction table
  const sessionTrainerIdsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!allSessionTrainers) return map;
    for (const st of allSessionTrainers) {
      if (!map[st.sessionId]) map[st.sessionId] = [];
      map[st.sessionId].push(st.trainerId);
    }
    return map;
  }, [allSessionTrainers]);

  const sessionFilters = useMemo(() => [
    {
      key: "programId",
      label: "Formation",
      type: "select" as const,
      options: (programs || []).map((p) => ({ value: p.id, label: p.title })),
    },
    {
      key: "status",
      label: "Statut",
      type: "select" as const,
      options: [
        { value: "planned", label: "Planifiée" },
        { value: "ongoing", label: "En cours" },
        { value: "completed", label: "Terminée" },
        { value: "cancelled", label: "Annulée" },
      ],
    },
    {
      key: "modality",
      label: "Modalité",
      type: "select" as const,
      options: [
        { value: "presentiel", label: "Présentiel" },
        { value: "distanciel", label: "Distanciel" },
        { value: "blended", label: "Mixte" },
      ],
    },
    {
      key: "dateRange",
      label: "Période",
      type: "date-range" as const,
    },
  ], [programs]);

  // Helper to save intervention dates for a session
  const saveSessionDates = async (sessionId: string, dates: string[]) => {
    if (dates.length > 0) {
      await apiRequest("PUT", `/api/sessions/${sessionId}/dates`, { dates });
    } else {
      await apiRequest("PUT", `/api/sessions/${sessionId}/dates`, { dates: [] });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/session-dates"] });
  };

  // Helper to save session trainers
  const saveSessionTrainers = async (sessionId: string, trainerIds: string[]) => {
    await apiRequest("PUT", `/api/sessions/${sessionId}/trainers`, {
      trainerIds: trainerIds.map((id) => ({ trainerId: id })),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/session-trainers"] });
  };

  const createMutation = useMutation({
    mutationFn: async ({ data, interventionDates, trainerIds }: { data: InsertSession; interventionDates: string[]; trainerIds: string[] }) => {
      const res = await apiRequest("POST", "/api/sessions", data);
      const created = await res.json();
      if (interventionDates.length > 0) {
        await saveSessionDates(created.id, interventionDates);
      }
      if (trainerIds.length > 0) {
        await saveSessionTrainers(created.id, trainerIds);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setDialogOpen(false);
      toast({ title: "Session créée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, interventionDates, trainerIds }: { id: string; data: InsertSession; interventionDates: string[]; trainerIds: string[] }) => {
      await apiRequest("PATCH", `/api/sessions/${id}`, data);
      await saveSessionDates(id, interventionDates);
      await saveSessionTrainers(id, trainerIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/session-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/session-trainers"] });
      setDialogOpen(false);
      setEditSession(undefined);
      toast({ title: "Session modifiée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertSession> }) =>
      apiRequest("PATCH", `/api/sessions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
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

  const handleInlineStatusChange = (sessionId: string, newStatus: string) => {
    patchMutation.mutate(
      { id: sessionId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: `Statut changé : ${statusLabels[newStatus] || newStatus}` });
        },
      }
    );
  };

  const handleInlineTrainersChange = async (sessionId: string, trainerIds: string[]) => {
    try {
      await apiRequest("PUT", `/api/sessions/${sessionId}/trainers`, {
        trainerIds: trainerIds.map((id) => ({ trainerId: id })),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/session-trainers"] });
      toast({ title: trainerIds.length > 0 ? `${trainerIds.length} formateur(s) assigné(s)` : "Formateurs retirés" });
    } catch {
      toast({ title: "Erreur lors de l'assignation", variant: "destructive" });
    }
  };

  const handleCardClick = (session: Session) => {
    setEditSession(session);
    setDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteSessionId) {
      deleteMutation.mutate(deleteSessionId);
      setDeleteSessionId(null);
    }
  };

  const filtered = useMemo(() => {
    let result = sessions || [];
    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q)
      );
    }
    // Advanced filters
    if (filterValues.programId) {
      result = result.filter((s) => s.programId === filterValues.programId);
    }
    if (filterValues.status) {
      result = result.filter((s) => s.status === filterValues.status);
    }
    if (filterValues.modality) {
      result = result.filter((s) => s.modality === filterValues.modality);
    }
    if (filterValues.dateRange_start) {
      result = result.filter((s) => s.startDate >= filterValues.dateRange_start);
    }
    if (filterValues.dateRange_end) {
      result = result.filter((s) => s.endDate <= filterValues.dateRange_end);
    }
    return result;
  }, [sessions, search, filterValues]);

  const deleteSession = sessions?.find((s) => s.id === deleteSessionId);

  return (
    <PageLayout>
      <PageHeader
        title="Sessions de formation"
        subtitle="Planifiez et suivez vos sessions"
        actions={
          <div className="flex items-center gap-3">
            <Button onClick={() => { setEditSession(undefined); setDialogOpen(true); }} data-testid="button-create-session">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle session
            </Button>
            <ExportButton
              data={filtered}
              columns={[
                { key: "title", label: "Titre" },
                { key: "status", label: "Statut" },
                { key: "startDate", label: "Début" },
                { key: "endDate", label: "Fin" },
                { key: "location", label: "Lieu" },
                { key: "modality", label: "Modalité" },
              ]}
              filename="sessions"
            />
          </div>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar" | "kanban")}>
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <LayoutGrid className="w-4 h-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="w-4 h-4" />
              Calendrier
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher une session..."
        className="max-w-md"
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/12" />
                <Skeleton className="h-5 w-1/12" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        (() => {
          const hasTrainer = (s: Session) => (sessionTrainerIdsMap[s.id]?.length > 0) || !!s.trainerId;
          const toplan = filtered.filter((s) => s.status === "planned" && (!hasTrainer(s) || !s.startDate));
          const planned = filtered.filter((s) => (s.status === "planned" && hasTrainer(s) && s.startDate) || s.status === "ongoing");
          const done = filtered.filter((s) => s.status === "completed" || s.status === "cancelled");

          const renderKanbanCard = (session: Session) => {
            const program = programs?.find((p) => p.id === session.programId);
            const kanbanTIds = sessionTrainerIdsMap[session.id] || (session.trainerId ? [session.trainerId] : []);
            const kanbanTrainers = kanbanTIds.map((id) => trainers?.find((t) => t.id === id)).filter(Boolean) as Trainer[];
            const enrolledCount = enrollmentCounts[session.id] || 0;
            return (
              <Card
                key={session.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCardClick(session)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm leading-tight truncate flex-1">{session.title}</h4>
                    <InlineStatusBadge session={session} onStatusChange={handleInlineStatusChange} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{program?.title}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {session.startDate
                        ? `${new Date(session.startDate).toLocaleDateString("fr-FR")} - ${new Date(session.endDate).toLocaleDateString("fr-FR")}`
                        : "Dates non définies"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 shrink-0" />
                      {kanbanTrainers.length > 0
                        ? kanbanTrainers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")
                        : <span className="text-amber-600">Non assigné</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 shrink-0" />
                      {enrolledCount}/{session.maxParticipants} inscrits
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          };

          const columns = [
            { title: "À planifier", items: toplan, color: "border-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/20" },
            { title: "Planifiées", items: planned, color: "border-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/20" },
            { title: "Terminées", items: done, color: "border-green-400", bgColor: "bg-green-50 dark:bg-green-950/20" },
          ];

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((col) => (
                <div key={col.title} className={`rounded-lg border-t-4 ${col.color} ${col.bgColor} p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{col.title}</h3>
                    <Badge variant="outline" className="text-xs">{col.items.length}</Badge>
                  </div>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {col.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">Aucune session</p>
                    ) : (
                      col.items.map(renderKanbanCard)
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : viewMode === "calendar" ? (
        <SessionCalendarView
          sessions={filtered}
          programs={programs || []}
          trainers={trainers || []}
          enrollmentCounts={enrollmentCounts}
          waitlistCounts={waitlistCounts}
          onSessionClick={handleCardClick}
          sessionDatesMap={sessionDatesMap}
          sessionTrainerIdsMap={sessionTrainerIdsMap}
        />
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
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Formation</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Formateur</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Dates</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Lieu</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Participants</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Statut</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((session) => {
                    const program = programs?.find((p) => p.id === session.programId);
                    const sessionTIds = sessionTrainerIdsMap[session.id] || (session.trainerId ? [session.trainerId] : []);
                    const sessionTrainersList = sessionTIds.map((id) => trainers?.find((t) => t.id === id)).filter(Boolean) as Trainer[];
                    const enrolledCount = enrollmentCounts[session.id] || 0;
                    return (
                      <tr
                        key={session.id}
                        className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        data-testid={`row-session-${session.id}`}
                        onClick={() => handleCardClick(session)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-sm">{program?.title || session.title}</span>
                        </td>
                        <td className="px-4 py-3">
                          {sessionTrainersList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sessionTrainersList.map((t) => (
                                <Badge key={t.id} variant="outline" className="text-xs">{t.firstName} {t.lastName}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Non assigné</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div>{new Date(session.startDate).toLocaleDateString("fr-FR")}</div>
                            <div className="text-muted-foreground">{"\u2192"} {new Date(session.endDate).toLocaleDateString("fr-FR")}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{session.location ? `${session.location}${session.locationRoom ? ` - ${session.locationRoom}` : ""}` : <span className="text-muted-foreground">Non défini</span>}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{enrolledCount}/{session.maxParticipants}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <InlineStatusBadge session={session} onStatusChange={handleInlineStatusChange} />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-session-menu-${session.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditSession(session); setDialogOpen(true); }}>
                                <Pencil className="w-4 h-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setTrombiSessionId(session.id)}>
                                <Users className="w-4 h-4 mr-2" /> Trombinoscope
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteSessionId(session.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-sm text-muted-foreground">{filtered.length} session{filtered.length > 1 ? "s" : ""}</p>
        </>
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
            trainingLocations={trainingLocationsList || []}
            existingDates={editSession ? Array.from(sessionDatesMap[editSession.id] || []) : undefined}
            existingTrainerIds={editSession ? sessionTrainerIdsMap[editSession.id] : undefined}
            onSubmit={(data, interventionDates, trainerIds) =>
              editSession
                ? updateMutation.mutate({ id: editSession.id, data, interventionDates, trainerIds })
                : createMutation.mutate({ data, interventionDates, trainerIds })
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <TrombinoscopeDialog
        open={!!trombiSessionId}
        onOpenChange={(open) => { if (!open) setTrombiSessionId(null); }}
        session={sessions?.find((s) => s.id === trombiSessionId)}
        trainees={trombiSessionId ? (sessionTraineesMap[trombiSessionId] || []) : []}
        enterprises={enterprises || []}
        sessionTrainersList={(() => {
          if (!trombiSessionId) return [];
          const tIds = sessionTrainerIdsMap[trombiSessionId] || [];
          const session = sessions?.find((s) => s.id === trombiSessionId);
          const fallbackIds = tIds.length > 0 ? tIds : (session?.trainerId ? [session.trainerId] : []);
          return fallbackIds.map((id) => trainers?.find((t) => t.id === id)).filter(Boolean) as Trainer[];
        })()}
      />

      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => { if (!open) setDeleteSessionId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer la session{" "}
              <strong>{deleteSession?.title}</strong>. Cette action est irréversible
              et supprimera également toutes les inscriptions associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType="sessions"
        entityLabel="sessions"
        queryKey="/api/sessions"
        requiredFields={["Titre", "Date début", "Date fin"]}
        exampleColumns={[
          { header: "Titre", example: "SST - Mars 2026" },
          { header: "Date de début", example: "2026-03-15" },
          { header: "Date de fin", example: "2026-03-16" },
          { header: "Lieu", example: "Paris" },
          { header: "Max participants", example: "12" },
          { header: "Modalité", example: "presentiel" },
        ]}
      />
    </PageLayout>
  );
}
