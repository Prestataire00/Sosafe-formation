import { useState, useMemo } from "react";
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
import type { Session, InsertSession, Program, Trainer, Trainee, Enrollment, Enterprise } from "@shared/schema";
import { SESSION_STATUSES, MODALITIES, TRAINEE_PROFILE_TYPES } from "@shared/schema";

const statusVariants: Record<string, string> = {
  planned: "bg-accent text-accent-foreground",
  ongoing: "bg-primary/10 text-primary dark:bg-primary/20",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {};
SESSION_STATUSES.forEach((s) => { statusLabels[s.value] = s.label; });

function SessionStatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={statusVariants[status] || ""}>{statusLabels[status] || status}</Badge>;
}

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
          <Badge
            variant="outline"
            className={`${statusVariants[session.status] || ""} hover:opacity-80 transition-opacity cursor-pointer`}
          >
            {statusLabels[session.status] || session.status}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {SESSION_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            disabled={s.value === session.status}
            onClick={() => onStatusChange(session.id, s.value)}
          >
            <Badge variant="outline" className={`${statusVariants[s.value] || ""} mr-2 pointer-events-none`}>
              {s.label}
            </Badge>
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
  currentTrainer,
  onTrainerChange,
}: {
  session: Session;
  trainers: Trainer[];
  currentTrainer?: Trainer;
  onTrainerChange: (sessionId: string, trainerId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <UserCheck className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <Select
        value={session.trainerId || "none"}
        onValueChange={(val) => onTrainerChange(session.id, val === "none" ? null : val)}
      >
        <SelectTrigger className="h-6 text-xs border-none shadow-none px-1 py-0 min-w-0 w-auto gap-1 hover:bg-accent/50 transition-colors">
          <SelectValue placeholder="Assigner un formateur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Aucun formateur</span>
          </SelectItem>
          {trainers.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CapacityBadge({ enrolled, max }: { enrolled: number; max: number }) {
  const remaining = max - enrolled;
  const isFull = remaining <= 0;
  return (
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
  const [locationAddress, setLocationAddress] = useState(session?.locationAddress || "");
  const [locationRoom, setLocationRoom] = useState(session?.locationRoom || "");
  const [modality, setModality] = useState(session?.modality || "presentiel");
  const [maxParticipants, setMaxParticipants] = useState(session?.maxParticipants?.toString() || "12");
  const [status, setStatus] = useState(session?.status || "planned");
  const [notes, setNotes] = useState(session?.notes || "");
  const [virtualClassUrl, setVirtualClassUrl] = useState(session?.virtualClassUrl || "");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      programId,
      trainerId: trainerId || null,
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
    });
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
        <Label>Formateur</Label>
        <Select value={trainerId} onValueChange={setTrainerId}>
          <SelectTrigger data-testid="select-session-trainer"><SelectValue placeholder="Sélectionner un formateur" /></SelectTrigger>
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
          <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required data-testid="input-session-start" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">Date de fin</Label>
          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required data-testid="input-session-end" />
        </div>
      </div>
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
          <Input id="location-room" value={locationRoom} onChange={(e) => setLocationRoom(e.target.value)} placeholder="Ex: Salle A - RDC" data-testid="input-session-room" />
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
  trainer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | undefined;
  trainees: Trainee[];
  enterprises: Enterprise[];
  trainer?: Trainer;
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
        {trainer && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Formateur</p>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {trainer.avatarUrl && <AvatarImage src={trainer.avatarUrl} alt={`${trainer.firstName} ${trainer.lastName}`} />}
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {trainer.firstName.charAt(0)}{trainer.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{trainer.firstName} {trainer.lastName}</p>
                <p className="text-xs text-muted-foreground">{trainer.specialty || trainer.email}</p>
              </div>
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
  onSessionClick,
}: {
  sessions: Session[];
  programs: Program[];
  trainers: Trainer[];
  enrollmentCounts: Record<string, number>;
  onSessionClick: (session: Session) => void;
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
    return sessions.filter((s) => {
      const start = parseISO(s.startDate);
      const end = parseISO(s.endDate);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
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
                  const trainer = trainers.find((t) => t.id === s.trainerId);
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
                          {trainer && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              {trainer.firstName} {trainer.lastName}
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
                        <CapacityBadge enrolled={enrolled} max={s.maxParticipants} />
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
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | undefined>();
  const [trombiSessionId, setTrombiSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
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

  // Compute enrollment counts and per-session trainees from the enrollments + trainees data
  const { enrollmentCounts, sessionTraineesMap } = useMemo(() => {
    const counts: Record<string, number> = {};
    const map: Record<string, Trainee[]> = {};
    if (!allEnrollments || !allTrainees) return { enrollmentCounts: counts, sessionTraineesMap: map };

    const traineeById = new Map(allTrainees.map((t) => [t.id, t]));

    for (const e of allEnrollments) {
      if (e.status === "cancelled") continue;
      counts[e.sessionId] = (counts[e.sessionId] || 0) + 1;
      const trainee = traineeById.get(e.traineeId);
      if (trainee) {
        if (!map[e.sessionId]) map[e.sessionId] = [];
        map[e.sessionId].push(trainee);
      }
    }
    return { enrollmentCounts: counts, sessionTraineesMap: map };
  }, [allEnrollments, allTrainees]);

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

  const handleInlineTrainerChange = (sessionId: string, trainerId: string | null) => {
    patchMutation.mutate(
      { id: sessionId, data: { trainerId } },
      {
        onSuccess: () => {
          const trainerName = trainerId
            ? (() => { const t = trainers?.find((t) => t.id === trainerId); return t ? `${t.firstName} ${t.lastName}` : ""; })()
            : null;
          toast({ title: trainerName ? `Formateur assigné : ${trainerName}` : "Formateur retiré" });
        },
      }
    );
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

  const filtered = sessions?.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.location || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  const deleteSession = sessions?.find((s) => s.id === deleteSessionId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-sessions-title">Sessions</h1>
          <p className="text-muted-foreground mt-1">Planifiez et gérez vos sessions de formation</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "cards" | "calendar")}>
            <TabsList>
              <TabsTrigger value="cards" className="gap-1.5">
                <LayoutGrid className="w-4 h-4" />
                Cartes
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <Calendar className="w-4 h-4" />
                Calendrier
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handleCopyLink} className="gap-2">
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Lien d'inscription</span>
                {linkCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{publicEnrollmentUrl}</p>
            </TooltipContent>
          </Tooltip>
          <Button onClick={() => { setEditSession(undefined); setDialogOpen(true); }} data-testid="button-create-session">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle session
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher une session..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-sessions" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-1/2 mb-4" /><Skeleton className="h-6 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : viewMode === "calendar" ? (
        <SessionCalendarView
          sessions={filtered}
          programs={programs || []}
          trainers={trainers || []}
          enrollmentCounts={enrollmentCounts}
          onSessionClick={handleCardClick}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((session) => {
            const program = programs?.find((p) => p.id === session.programId);
            const trainer = trainers?.find((t) => t.id === session.trainerId);
            const enrolledCount = enrollmentCounts[session.id] || 0;
            const sessionTrainees = sessionTraineesMap[session.id] || [];
            return (
              <Card
                key={session.id}
                className="hover-elevate cursor-pointer transition-shadow hover:shadow-md"
                data-testid={`card-session-${session.id}`}
                onClick={() => handleCardClick(session)}
              >
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
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-session-menu-${session.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => { setEditSession(session); setDialogOpen(true); }} data-testid={`button-edit-session-${session.id}`}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTrombiSessionId(session.id)} data-testid={`button-trombi-session-${session.id}`}>
                          <Users className="w-4 h-4 mr-2" />
                          Trombinoscope
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteSessionId(session.id)}
                          data-testid={`button-delete-session-${session.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <InlineStatusBadge session={session} onStatusChange={handleInlineStatusChange} />
                    <CapacityBadge enrolled={enrolledCount} max={session.maxParticipants} />
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {new Date(session.startDate).toLocaleDateString("fr-FR")} - {new Date(session.endDate).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <ModalityIcon modality={session.modality} />
                    {session.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {session.location}{session.locationRoom ? ` - ${session.locationRoom}` : ""}
                        </span>
                      </div>
                    )}
                    {session.virtualClassUrl && (
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <a href={session.virtualClassUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate text-sm">
                          Classe virtuelle
                        </a>
                      </div>
                    )}
                    <InlineTrainerSelect
                      session={session}
                      trainers={trainers || []}
                      currentTrainer={trainer}
                      onTrainerChange={handleInlineTrainerChange}
                    />
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{enrolledCount}/{session.maxParticipants} inscrits</span>
                    </div>
                  </div>
                  <TraineeAvatarStrip
                    trainees={sessionTrainees}
                    onClick={() => setTrombiSessionId(session.id)}
                  />
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

      <TrombinoscopeDialog
        open={!!trombiSessionId}
        onOpenChange={(open) => { if (!open) setTrombiSessionId(null); }}
        session={sessions?.find((s) => s.id === trombiSessionId)}
        trainees={trombiSessionId ? (sessionTraineesMap[trombiSessionId] || []) : []}
        enterprises={enterprises || []}
        trainer={trainers?.find((t) => t.id === sessions?.find((s) => s.id === trombiSessionId)?.trainerId)}
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

    </div>
  );
}
