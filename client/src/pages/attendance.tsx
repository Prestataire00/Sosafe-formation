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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  PenLine,
  BarChart3,
  CalendarDays,
  Users,
} from "lucide-react";
import type {
  Session,
  AttendanceSheet,
  AttendanceRecord,
  Enrollment,
  Trainee,
} from "@shared/schema";
import { ATTENDANCE_STATUSES, ATTENDANCE_PERIODS } from "@shared/schema";

// ============================================================
// Types for the report endpoint
// ============================================================

interface AttendanceReport {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentPresent: number;
  percentAbsent: number;
  percentLate: number;
  percentExcused: number;
}

// ============================================================
// Helper: Status badge for attendance
// ============================================================

function AttendanceStatusBadge({ status }: { status: string }) {
  const st = ATTENDANCE_STATUSES.find((s) => s.value === status);
  if (!st) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant="outline" className={st.color}>
      {st.label}
    </Badge>
  );
}

// ============================================================
// Helper: Period label
// ============================================================

function periodLabel(period: string): string {
  const p = ATTENDANCE_PERIODS.find((ap) => ap.value === period);
  return p ? p.label : period;
}

// ============================================================
// Inline component: AttendanceGrid
// ============================================================

function AttendanceGrid({
  sessionId,
  sheets,
}: {
  sessionId: string;
  sheets: AttendanceSheet[];
}) {
  const { toast } = useToast();

  // Fetch enrollments for the session to get trainee IDs
  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });

  // Get the list of unique trainee IDs from enrollments (only active)
  const activeEnrollments = enrollments?.filter(
    (e) => e.status !== "cancelled"
  ) || [];
  const traineeIds = Array.from(new Set(activeEnrollments.map((e) => e.traineeId)));

  // Fetch trainees
  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  // For each sheet, fetch attendance records
  const sheetRecordsQueries = sheets.map((sheet) =>
    useQuery<AttendanceRecord[]>({
      queryKey: ["/api/attendance-records", `?sheetId=${sheet.id}`],
      enabled: !!sheet.id,
    })
  );

  // Create or update attendance record
  const upsertRecordMutation = useMutation({
    mutationFn: async ({
      sheetId,
      traineeId,
      status,
      existingRecordId,
    }: {
      sheetId: string;
      traineeId: string;
      status: string;
      existingRecordId?: string;
    }) => {
      if (existingRecordId) {
        return apiRequest("PATCH", `/api/attendance-records/${existingRecordId}`, {
          status,
        });
      }
      return apiRequest("POST", "/api/attendance-records", {
        sheetId,
        traineeId,
        status,
      });
    },
    onSuccess: () => {
      sheets.forEach((sheet) => {
        queryClient.invalidateQueries({
          queryKey: ["/api/attendance-records", `?sheetId=${sheet.id}`],
        });
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance-records/report"],
      });
      toast({ title: "Statut mis a jour" });
    },
    onError: () =>
      toast({
        title: "Erreur lors de la mise a jour",
        variant: "destructive",
      }),
  });

  // Sign attendance record (set signedAt timestamp)
  const signRecordMutation = useMutation({
    mutationFn: async ({
      sheetId,
      traineeId,
      existingRecordId,
    }: {
      sheetId: string;
      traineeId: string;
      existingRecordId?: string;
    }) => {
      if (existingRecordId) {
        return apiRequest("PATCH", `/api/attendance-records/${existingRecordId}`, {
          signedAt: new Date().toISOString(),
        });
      }
      return apiRequest("POST", "/api/attendance-records", {
        sheetId,
        traineeId,
        status: "present",
        signedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      sheets.forEach((sheet) => {
        queryClient.invalidateQueries({
          queryKey: ["/api/attendance-records", `?sheetId=${sheet.id}`],
        });
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance-records/report"],
      });
      toast({ title: "Signature enregistree" });
    },
    onError: () =>
      toast({
        title: "Erreur lors de la signature",
        variant: "destructive",
      }),
  });

  // Build a map of traineeId -> Trainee
  const traineeMap = new Map<string, Trainee>();
  trainees?.forEach((t) => traineeMap.set(t.id, t));

  // Build a map of sheetId -> records
  const recordsBySheet = new Map<string, AttendanceRecord[]>();
  sheets.forEach((sheet, idx) => {
    const records = sheetRecordsQueries[idx]?.data || [];
    recordsBySheet.set(sheet.id, records);
  });

  // Find existing record for a trainee in a sheet
  function findRecord(
    sheetId: string,
    traineeId: string
  ): AttendanceRecord | undefined {
    const records = recordsBySheet.get(sheetId) || [];
    return records.find((r) => r.traineeId === traineeId);
  }

  const statusButtons: Array<{
    value: string;
    label: string;
    icon: typeof CheckCircle;
    variant: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  }> = [
    { value: "present", label: "P", icon: CheckCircle, variant: "outline" },
    { value: "absent", label: "A", icon: XCircle, variant: "outline" },
    { value: "late", label: "R", icon: Clock, variant: "outline" },
  ];

  if (traineeIds.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Aucun stagiaire inscrit a cette session
        </p>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Aucune feuille d'emargement. Creez-en une pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Stagiaire</TableHead>
            {sheets.map((sheet) => (
              <TableHead key={sheet.id} className="text-center min-w-[200px]">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-medium">
                    {new Date(sheet.date).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {periodLabel(sheet.period)}
                  </span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {traineeIds.map((traineeId) => {
            const trainee = traineeMap.get(traineeId);
            return (
              <TableRow key={traineeId}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">
                      {trainee
                        ? `${trainee.firstName} ${trainee.lastName}`
                        : "Inconnu"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trainee?.email || ""}
                    </p>
                  </div>
                </TableCell>
                {sheets.map((sheet) => {
                  const record = findRecord(sheet.id, traineeId);
                  const currentStatus = record?.status || "";
                  const isSigned = !!record?.signedAt;

                  return (
                    <TableCell key={sheet.id} className="text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          {statusButtons.map((btn) => {
                            const isActive = currentStatus === btn.value;
                            const Icon = btn.icon;
                            return (
                              <Button
                                key={btn.value}
                                size="sm"
                                variant={isActive ? "default" : "outline"}
                                className={`h-7 w-7 p-0 ${
                                  isActive && btn.value === "present"
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : isActive && btn.value === "absent"
                                      ? "bg-red-600 hover:bg-red-700 text-white"
                                      : isActive && btn.value === "late"
                                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                                        : ""
                                }`}
                                title={
                                  ATTENDANCE_STATUSES.find(
                                    (s) => s.value === btn.value
                                  )?.label || btn.value
                                }
                                onClick={() =>
                                  upsertRecordMutation.mutate({
                                    sheetId: sheet.id,
                                    traineeId,
                                    status: btn.value,
                                    existingRecordId: record?.id,
                                  })
                                }
                                disabled={upsertRecordMutation.isPending}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </Button>
                            );
                          })}
                        </div>

                        {/* Signer button */}
                        <Button
                          size="sm"
                          variant={isSigned ? "secondary" : "outline"}
                          className="h-6 text-xs gap-1"
                          onClick={() =>
                            signRecordMutation.mutate({
                              sheetId: sheet.id,
                              traineeId,
                              existingRecordId: record?.id,
                            })
                          }
                          disabled={isSigned || signRecordMutation.isPending}
                        >
                          <PenLine className="w-3 h-3" />
                          {isSigned ? "Signe" : "Signer"}
                        </Button>

                        {/* Show current status badge if set */}
                        {currentStatus && (
                          <AttendanceStatusBadge status={currentStatus} />
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// Inline component: AttendanceReport
// ============================================================

function AttendanceReportSection({ sessionId }: { sessionId: string }) {
  const { data: report, isLoading } = useQuery<AttendanceReport>({
    queryKey: ["/api/attendance-records/report", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!report || report.totalRecords === 0) {
    return (
      <div className="text-center py-6">
        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Aucune donnee de presence pour cette session
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: "Presents",
      value: report.present,
      percent: report.percentPresent,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Absents",
      value: report.absent,
      percent: report.percentAbsent,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      label: "Retards",
      value: report.late,
      percent: report.percentLate,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Excuses",
      value: report.excused,
      percent: report.percentExcused,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={stat.bg}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>
              {stat.percent.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {stat.label} ({stat.value})
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// New Sheet Form (inside dialog)
// ============================================================

function NewSheetForm({
  sessionId,
  onSubmit,
  isPending,
}: {
  sessionId: string;
  onSubmit: (data: { sessionId: string; date: string; period: string }) => void;
  isPending: boolean;
}) {
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState("journee");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ sessionId, date, period });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sheet-date">Date</Label>
        <Input
          id="sheet-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          data-testid="input-sheet-date"
        />
      </div>
      <div className="space-y-2">
        <Label>Periode</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger data-testid="select-sheet-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTENDANCE_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isPending || !date}
          data-testid="button-sheet-submit"
        >
          {isPending ? "Creation..." : "Creer"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Main exported component
// ============================================================

export default function Attendance() {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all sessions for the selector
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Fetch attendance sheets for the selected session
  const { data: sheets, isLoading: sheetsLoading } = useQuery<
    AttendanceSheet[]
  >({
    queryKey: [
      "/api/attendance-sheets",
      `?sessionId=${selectedSessionId}`,
    ],
    enabled: !!selectedSessionId,
  });

  // Create new attendance sheet
  const createSheetMutation = useMutation({
    mutationFn: (data: { sessionId: string; date: string; period: string }) =>
      apiRequest("POST", "/api/attendance-sheets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance-sheets"],
      });
      setSheetDialogOpen(false);
      toast({ title: "Feuille d'emargement creee" });
    },
    onError: () =>
      toast({
        title: "Erreur lors de la creation",
        variant: "destructive",
      }),
  });

  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-attendance-title">
            Emargement
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerez les feuilles de presence et l'emargement des stagiaires
          </p>
        </div>
      </div>

      {/* Session selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Selectionner une session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger
                className="max-w-md"
                data-testid="select-attendance-session"
              >
                <SelectValue placeholder="Choisir une session..." />
              </SelectTrigger>
              <SelectContent>
                {sessions?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} ({new Date(s.startDate).toLocaleDateString("fr-FR")} -{" "}
                    {new Date(s.endDate).toLocaleDateString("fr-FR")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Content: only show when a session is selected */}
      {selectedSessionId && (
        <>
          {/* Attendance sheets section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Feuilles d'emargement
                  {selectedSession && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {selectedSession.title}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setSheetDialogOpen(true)}
                  data-testid="button-create-sheet"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nouvelle feuille
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sheetsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sheets && sheets.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {sheets.map((sheet) => (
                    <Badge
                      key={sheet.id}
                      variant="secondary"
                      className="text-xs py-1 px-3"
                    >
                      {new Date(sheet.date).toLocaleDateString("fr-FR")} -{" "}
                      {periodLabel(sheet.period)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune feuille d'emargement pour cette session.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attendance grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Grille de presence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceGrid
                sessionId={selectedSessionId}
                sheets={sheets || []}
              />
            </CardContent>
          </Card>

          {/* Report section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Rapport de presence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceReportSection sessionId={selectedSessionId} />
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state when no session selected */}
      {!selectedSessionId && (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Emargement</h3>
          <p className="text-sm text-muted-foreground">
            Selectionnez une session pour gerer les feuilles de presence
          </p>
        </div>
      )}

      {/* Dialog: new sheet */}
      <Dialog open={sheetDialogOpen} onOpenChange={setSheetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle feuille d'emargement</DialogTitle>
          </DialogHeader>
          <NewSheetForm
            sessionId={selectedSessionId}
            onSubmit={(data) => createSheetMutation.mutate(data)}
            isPending={createSheetMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
