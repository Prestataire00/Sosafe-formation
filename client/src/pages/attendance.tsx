import { useState, useRef, useCallback } from "react";
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
  Tablet,
  Mail,
  Video,
  QrCode,
  Printer,
  Send,
  Download,
  Loader2,
  FileBarChart,
} from "lucide-react";
import type {
  Session,
  AttendanceSheet,
  AttendanceRecord,
  Enrollment,
  Trainee,
  Enterprise,
} from "@shared/schema";
import { ATTENDANCE_STATUSES, ATTENDANCE_PERIODS } from "@shared/schema";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

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

  // Fetch all attendance records for all sheets in a single query
  const sheetIdsKey = sheets.map((s) => s.id).sort().join(",");
  const { data: allRecordsRaw } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records", "sheets", sheetIdsKey],
    queryFn: async () => {
      const results: AttendanceRecord[] = [];
      for (const sheet of sheets) {
        const res = await fetch(`/api/attendance-records?sheetId=${sheet.id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          results.push(...data);
        }
      }
      return results;
    },
    enabled: sheets.length > 0,
  });

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
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance-records", "sheets", sheetIdsKey],
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
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance-records", "sheets", sheetIdsKey],
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
  if (allRecordsRaw) {
    for (const record of allRecordsRaw) {
      const list = recordsBySheet.get(record.sheetId) || [];
      list.push(record);
      recordsBySheet.set(record.sheetId, list);
    }
  }

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
      <EmptyState
        icon={Users}
        title="Aucun stagiaire inscrit a cette session"
      />
    );
  }

  if (sheets.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucune feuille d'emargement"
        description="Creez-en une pour commencer."
      />
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
                    {trainee?.email ? <a href={`mailto:${trainee.email}`} className="text-xs text-primary hover:underline">{trainee.email}</a> : null}
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
      <EmptyState
        icon={BarChart3}
        title="Aucune donnee de presence pour cette session"
      />
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
// Tablet Emargement (Section 8.1)
// ============================================================

function TabletEmargement({
  sessionId,
  sheets,
}: {
  sessionId: string;
  sheets: AttendanceSheet[];
}) {
  const { toast } = useToast();
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [activeTraineeId, setActiveTraineeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const { data: records, refetch: refetchRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records", `?sheetId=${selectedSheetId}`],
    enabled: !!selectedSheetId,
  });

  const activeEnrollments = enrollments?.filter((e) => e.status !== "cancelled") || [];
  const traineeMap = new Map(trainees?.map((t) => [t.id, t]) || []);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const ctx = getCtx();
      if (!ctx) return;
      setIsDrawing(true);
      setHasSignature(true);
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      ctx.beginPath();
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
    },
    [getCtx],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const ctx = getCtx();
      if (!ctx) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
    },
    [isDrawing, getCtx],
  );

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const signMutation = useMutation({
    mutationFn: async ({ traineeId, signatureData }: { traineeId: string; signatureData: string }) => {
      const record = records?.find((r) => r.traineeId === traineeId);
      if (record) {
        return apiRequest("PATCH", `/api/attendance-records/${record.id}`, {
          status: "present",
          signedAt: new Date().toISOString(),
          signatureData,
        });
      }
      return apiRequest("POST", "/api/attendance-records", {
        sheetId: selectedSheetId,
        traineeId,
        status: "present",
        signedAt: new Date().toISOString(),
        signatureData,
      });
    },
    onSuccess: () => {
      refetchRecords();
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-records/report"] });
      toast({ title: "Signature enregistree" });
      setActiveTraineeId(null);
      clearCanvas();
    },
    onError: () => toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  const handleSign = () => {
    if (!activeTraineeId || !canvasRef.current || !hasSignature) return;
    signMutation.mutate({
      traineeId: activeTraineeId,
      signatureData: canvasRef.current.toDataURL("image/png"),
    });
  };

  if (sheets.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Creez d'abord une feuille d'emargement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Feuille :</Label>
        <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Choisir une feuille..." />
          </SelectTrigger>
          <SelectContent>
            {sheets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("fr-FR")} - {periodLabel(s.period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSheetId && (
        <div className="space-y-2">
          {activeEnrollments.map((enrollment) => {
            const trainee = traineeMap.get(enrollment.traineeId);
            const record = records?.find((r) => r.traineeId === enrollment.traineeId);
            const isSigned = !!record?.signedAt;

            return (
              <div
                key={enrollment.traineeId}
                className={`flex items-center justify-between p-3 rounded-lg border ${isSigned ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-white dark:bg-gray-950"}`}
              >
                <div>
                  <p className="text-sm font-medium">
                    {trainee ? `${trainee.firstName} ${trainee.lastName}` : "Inconnu"}
                  </p>
                  {trainee?.email ? <a href={`mailto:${trainee.email}`} className="text-xs text-primary hover:underline">{trainee.email}</a> : null}
                </div>
                {isSigned ? (
                  <StatusBadge status="signed" label="Signe" />
                ) : (
                  <Button
                    size="sm"
                    onClick={() => { setActiveTraineeId(enrollment.traineeId); clearCanvas(); }}
                  >
                    <PenLine className="w-4 h-4 mr-1" /> Signer
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeTraineeId} onOpenChange={(open) => { if (!open) { setActiveTraineeId(null); clearCanvas(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Signature — {activeTraineeId && traineeMap.get(activeTraineeId)
                ? `${traineeMap.get(activeTraineeId)!.firstName} ${traineeMap.get(activeTraineeId)!.lastName}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Tracez votre signature ci-dessous :</p>
            <div className="border rounded-lg p-1 bg-white dark:bg-gray-950">
              <canvas
                ref={canvasRef}
                width={460}
                height={180}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={clearCanvas}>Effacer</Button>
              <Button onClick={handleSign} disabled={!hasSignature || signMutation.isPending}>
                <PenLine className="w-4 h-4 mr-2" />
                {signMutation.isPending ? "Enregistrement..." : "Valider"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Email Emargement (Section 8.1)
// ============================================================

function EmailEmargement({
  sessionId,
  sheets,
}: {
  sessionId: string;
  sheets: AttendanceSheet[];
}) {
  const { toast } = useToast();
  const [selectedSheetId, setSelectedSheetId] = useState("");

  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const { data: records } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records", `?sheetId=${selectedSheetId}`],
    enabled: !!selectedSheetId,
  });

  const activeEnrollments = enrollments?.filter((e) => e.status !== "cancelled") || [];
  const traineeMap = new Map(trainees?.map((t) => [t.id, t]) || []);

  const sendMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const resp = await apiRequest("POST", "/api/attendance-records/send-emargement", { sheetId });
      return resp.json();
    },
    onSuccess: (data) => {
      const parts = [`${data.sentCount} email(s) envoye(s)`];
      if (data.skippedNoEmail > 0) parts.push(`${data.skippedNoEmail} sans email`);
      if (data.skippedAlreadySigned > 0) parts.push(`${data.skippedAlreadySigned} deja signe(s)`);
      toast({ title: parts.join(" — ") });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-records"] });
    },
    onError: () => toast({ title: "Erreur lors de l'envoi", variant: "destructive" }),
  });

  if (sheets.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Creez d'abord une feuille d'emargement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Feuille :</Label>
        <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Choisir une feuille..." />
          </SelectTrigger>
          <SelectContent>
            {sheets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("fr-FR")} - {periodLabel(s.period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSheetId && (
        <>
          {(() => {
            const withoutEmail = activeEnrollments.filter(e => !traineeMap.get(e.traineeId)?.email);
            return (
              <>
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Un email sera envoye a chaque stagiaire avec un lien personnel pour signer son emargement.
                  </p>
                </div>

                {withoutEmail.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {withoutEmail.length} stagiaire(s) sans adresse email — utilisez le mode QR Code ou Tablette pour ces stagiaires.
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => sendMutation.mutate(selectedSheetId)}
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {sendMutation.isPending ? "Envoi en cours..." : "Envoyer les liens d'emargement"}
                </Button>
              </>
            );
          })()}

          <div className="space-y-2">
            {activeEnrollments.map((enrollment) => {
              const trainee = traineeMap.get(enrollment.traineeId);
              const record = records?.find((r) => r.traineeId === enrollment.traineeId);
              const isSigned = !!record?.signedAt;
              const hasToken = !!(record as any)?.emargementToken;
              const hasEmail = !!trainee?.email;

              return (
                <div key={enrollment.traineeId} className={`flex items-center justify-between p-3 rounded-lg border ${isSigned ? "bg-green-50 dark:bg-green-900/20 border-green-200" : !hasEmail ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200" : ""}`}>
                  <div>
                    <p className="text-sm font-medium">
                      {trainee ? `${trainee.firstName} ${trainee.lastName}` : "Inconnu"}
                    </p>
                    {hasEmail ? (
                      <a href={`mailto:${trainee!.email}`} className="text-xs text-primary hover:underline">{trainee!.email}</a>
                    ) : (
                      <p className="text-xs text-amber-600">Pas d'email — utiliser QR Code ou Tablette</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasEmail && !isSigned && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Sans email</Badge>
                    )}
                    {hasToken && !isSigned && (
                      <StatusBadge status="email_sent" label="Email envoye" />
                    )}
                    {isSigned && (
                      <StatusBadge status="signed" label="Signe" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Visio Emargement (Section 8.1)
// ============================================================

function VisioEmargement({
  sessionId,
  sheets,
  session,
}: {
  sessionId: string;
  sheets: AttendanceSheet[];
  session?: Session;
}) {
  const { toast } = useToast();
  const [selectedSheetId, setSelectedSheetId] = useState("");

  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const { data: records, refetch: refetchRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records", `?sheetId=${selectedSheetId}`],
    enabled: !!selectedSheetId,
  });

  const activeEnrollments = enrollments?.filter((e) => e.status !== "cancelled") || [];
  const traineeMap = new Map(trainees?.map((t) => [t.id, t]) || []);

  const sendMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const resp = await apiRequest("POST", "/api/attendance-records/send-emargement", { sheetId });
      return resp.json();
    },
    onSuccess: (data) => {
      const parts = [`${data.sentCount} email(s) envoye(s)`];
      if (data.skippedNoEmail > 0) parts.push(`${data.skippedNoEmail} sans email`);
      if (data.skippedAlreadySigned > 0) parts.push(`${data.skippedAlreadySigned} deja confirme(s)`);
      toast({ title: parts.join(" — ") });
      refetchRecords();
    },
    onError: () => toast({ title: "Erreur lors de l'envoi", variant: "destructive" }),
  });

  // One-click confirm by admin for a trainee
  const confirmMutation = useMutation({
    mutationFn: async ({ traineeId }: { traineeId: string }) => {
      const record = records?.find((r) => r.traineeId === traineeId);
      if (record) {
        return apiRequest("PATCH", `/api/attendance-records/${record.id}`, {
          status: "present",
          signedAt: new Date().toISOString(),
          signatureData: "VISIO_ONE_CLICK",
        });
      }
      return apiRequest("POST", "/api/attendance-records", {
        sheetId: selectedSheetId,
        traineeId,
        status: "present",
        signedAt: new Date().toISOString(),
        signatureData: "VISIO_ONE_CLICK",
      });
    },
    onSuccess: () => {
      refetchRecords();
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-records/report"] });
      toast({ title: "Presence confirmee" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const isDistanciel = session?.modality === "distanciel";

  if (!isDistanciel) {
    return (
      <div className="text-center py-8">
        <Video className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          L'emargement visioconference est disponible uniquement pour les sessions en distanciel.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Modalite actuelle : <strong>{session?.modality || "non definie"}</strong>
        </p>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Creez d'abord une feuille d'emargement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 p-3">
        <p className="text-sm text-purple-700 dark:text-purple-400">
          Session en visioconference — confirmez la presence directement ou envoyez un lien de confirmation par email.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Feuille :</Label>
        <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Choisir une feuille..." />
          </SelectTrigger>
          <SelectContent>
            {sheets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("fr-FR")} - {periodLabel(s.period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSheetId && (
        <>
          <Button
            onClick={() => sendMutation.mutate(selectedSheetId)}
            disabled={sendMutation.isPending}
            variant="outline"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {sendMutation.isPending ? "Envoi en cours..." : "Envoyer les liens par email"}
          </Button>

          <div className="space-y-2">
            {activeEnrollments.map((enrollment) => {
              const trainee = traineeMap.get(enrollment.traineeId);
              const record = records?.find((r) => r.traineeId === enrollment.traineeId);
              const isSigned = !!record?.signedAt;
              const hasToken = !!(record as any)?.emargementToken;

              return (
                <div
                  key={enrollment.traineeId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${isSigned ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-white dark:bg-gray-950"}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {trainee ? `${trainee.firstName} ${trainee.lastName}` : "Inconnu"}
                    </p>
                    {trainee?.email ? (
                      <p className="text-xs text-muted-foreground">{trainee.email}</p>
                    ) : (
                      <p className="text-xs text-amber-600">Pas d'email</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasToken && !isSigned && (
                      <StatusBadge status="email_sent" label="Email envoye" />
                    )}
                    {isSigned ? (
                      <StatusBadge status="signed" label="Present" />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => confirmMutation.mutate({ traineeId: enrollment.traineeId })}
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirmer
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// QR Code Emargement (Section 8.1)
// ============================================================

function QRCodeEmargement({
  sessionId,
  sheets,
}: {
  sessionId: string;
  sheets: AttendanceSheet[];
}) {
  const { toast } = useToast();
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const { data: records } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records", `?sheetId=${selectedSheetId}`],
    enabled: !!selectedSheetId,
  });

  const activeEnrollments = enrollments?.filter((e) => e.status !== "cancelled") || [];
  const traineeMap = new Map(trainees?.map((t) => [t.id, t]) || []);

  const generateAllQR = async () => {
    if (!selectedSheetId) return;
    setLoading(true);
    const newQR = new Map<string, string>();

    for (const enrollment of activeEnrollments) {
      let record = records?.find((r) => r.traineeId === enrollment.traineeId);

      // Create record if it doesn't exist
      if (!record) {
        try {
          const resp = await apiRequest("POST", "/api/attendance-records", {
            sheetId: selectedSheetId,
            traineeId: enrollment.traineeId,
            status: "absent",
          });
          record = await resp.json();
          queryClient.invalidateQueries({ queryKey: ["/api/attendance-records", `?sheetId=${selectedSheetId}`] });
        } catch { continue; }
      }

      if (record) {
        try {
          const resp = await fetch(`/api/attendance-records/${record.id}/qrcode`, { credentials: "include" });
          if (resp.ok) {
            const data = await resp.json();
            newQR.set(enrollment.traineeId, data.qrDataUrl);
          }
        } catch {}
      }
    }

    setQrCodes(newQR);
    setLoading(false);
    toast({ title: `${newQR.size} QR code(s) genere(s)` });
  };

  const printAllQR = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const selectedSheet = sheets.find((s) => s.id === selectedSheetId);
    let html = `<html><head><title>QR Codes Emargement</title><style>
      body{font-family:Arial,sans-serif;padding:20px;}
      .qr-item{display:inline-block;text-align:center;margin:15px;padding:15px;border:1px solid #ccc;border-radius:8px;}
      .qr-item img{width:200px;height:200px;}
      .qr-item p{margin:5px 0;font-size:12px;}
      h2{margin-bottom:20px;}
      @media print{.no-print{display:none;}}
    </style></head><body>`;
    html += `<h2>QR Codes — ${selectedSheet ? new Date(selectedSheet.date).toLocaleDateString("fr-FR") + " " + periodLabel(selectedSheet.period) : ""}</h2>`;
    html += `<div>`;
    activeEnrollments.forEach((enrollment) => {
      const trainee = traineeMap.get(enrollment.traineeId);
      const qr = qrCodes.get(enrollment.traineeId);
      if (qr && trainee) {
        html += `<div class="qr-item"><img src="${qr}" /><p><strong>${trainee.firstName} ${trainee.lastName}</strong></p><p>Scannez pour emerger</p></div>`;
      }
    });
    html += `</div></body></html>`;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  if (sheets.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Creez d'abord une feuille d'emargement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 p-3">
        <p className="text-sm text-orange-700 dark:text-orange-400">
          QR code de secours — chaque stagiaire peut scanner un QR code unique pour acceder a son emargement.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Feuille :</Label>
        <Select value={selectedSheetId} onValueChange={(v) => { setSelectedSheetId(v); setQrCodes(new Map()); }}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Choisir une feuille..." />
          </SelectTrigger>
          <SelectContent>
            {sheets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("fr-FR")} - {periodLabel(s.period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSheetId && (
        <>
          <div className="flex gap-2">
            <Button onClick={generateAllQR} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
              {loading ? "Generation..." : "Generer tous les QR codes"}
            </Button>
            {qrCodes.size > 0 && (
              <Button variant="outline" onClick={printAllQR}>
                <Printer className="w-4 h-4 mr-2" /> Imprimer les QR codes
              </Button>
            )}
          </div>

          {qrCodes.size > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeEnrollments.map((enrollment) => {
                const trainee = traineeMap.get(enrollment.traineeId);
                const qr = qrCodes.get(enrollment.traineeId);
                if (!qr) return null;
                return (
                  <Card key={enrollment.traineeId}>
                    <CardContent className="p-4 text-center">
                      <img src={qr} alt="QR Code" className="w-32 h-32 mx-auto" />
                      <p className="text-sm font-medium mt-2">
                        {trainee ? `${trainee.firstName} ${trainee.lastName}` : "Inconnu"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Print Emargement (Section 8.1)
// ============================================================

function PrintEmargement({
  sessionId,
  sheets,
  session,
}: {
  sessionId: string;
  sheets: AttendanceSheet[];
  session?: Session;
}) {
  const [selectedSheetId, setSelectedSheetId] = useState("");

  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", `?sessionId=${sessionId}`],
    enabled: !!sessionId,
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const { data: records } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records", `?sheetId=${selectedSheetId}`],
    enabled: !!selectedSheetId,
  });

  const activeEnrollments = enrollments?.filter((e) => e.status !== "cancelled") || [];
  const traineeMap = new Map(trainees?.map((t) => [t.id, t]) || []);
  const selectedSheet = sheets.find((s) => s.id === selectedSheetId);

  const generateHtml = (): string => {
    const dateStr = selectedSheet ? new Date(selectedSheet.date).toLocaleDateString("fr-FR") : "";
    const period = selectedSheet ? periodLabel(selectedSheet.period) : "";

    let html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">`;
    html += `<h2 style="text-align:center;margin-bottom:5px;">Feuille d'emargement</h2>`;
    html += `<p style="text-align:center;color:#666;margin-bottom:20px;">${session?.title || "Formation"} — ${dateStr} — ${period}</p>`;
    html += `<table style="width:100%;border-collapse:collapse;margin-top:15px;">`;
    html += `<thead><tr>
      <th style="border:1px solid #999;padding:8px;background:#f0f0f0;text-align:left;">Nom</th>
      <th style="border:1px solid #999;padding:8px;background:#f0f0f0;text-align:left;">Prenom</th>
      <th style="border:1px solid #999;padding:8px;background:#f0f0f0;text-align:center;width:200px;">Signature</th>
      <th style="border:1px solid #999;padding:8px;background:#f0f0f0;text-align:center;width:80px;">Heure</th>
    </tr></thead><tbody>`;

    activeEnrollments.forEach((enrollment) => {
      const trainee = traineeMap.get(enrollment.traineeId);
      const record = records?.find((r) => r.traineeId === enrollment.traineeId);
      const sigImg = (record as any)?.signatureData && (record as any).signatureData !== "VISIO_ONE_CLICK"
        ? `<img src="${(record as any).signatureData}" style="max-width:150px;max-height:50px;" />`
        : record?.signedAt ? "<em>Signe electroniquement</em>" : "";
      const timeStr = record?.signedAt ? new Date(record.signedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";

      html += `<tr>
        <td style="border:1px solid #999;padding:8px;">${trainee?.lastName || ""}</td>
        <td style="border:1px solid #999;padding:8px;">${trainee?.firstName || ""}</td>
        <td style="border:1px solid #999;padding:8px;text-align:center;height:60px;">${sigImg}</td>
        <td style="border:1px solid #999;padding:8px;text-align:center;">${timeStr}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    html += `<div style="margin-top:40px;display:flex;justify-content:space-between;">
      <div><p style="font-size:12px;color:#666;">Signature du formateur :</p><div style="border-bottom:1px solid #999;width:200px;height:50px;"></div></div>
      <div><p style="font-size:12px;color:#666;">Date : ${dateStr}</p></div>
    </div>`;
    html += `</div>`;
    return html;
  };

  const handlePrint = () => {
    const html = generateHtml();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><title>Feuille d'emargement</title></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  const handlePdf = async () => {
    const html = generateHtml();
    const html2pdf = (await import("html2pdf.js")).default;
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    await html2pdf().set({
      margin: 10,
      filename: `emargement_${selectedSheet ? new Date(selectedSheet.date).toISOString().split("T")[0] : "feuille"}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { format: "a4", orientation: "portrait" },
    }).from(container).save();
    document.body.removeChild(container);
  };

  if (sheets.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Creez d'abord une feuille d'emargement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Feuille :</Label>
        <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Choisir une feuille..." />
          </SelectTrigger>
          <SelectContent>
            {sheets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("fr-FR")} - {periodLabel(s.period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSheetId && (
        <>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Imprimer
            </Button>
            <Button variant="outline" onClick={handlePdf}>
              <Download className="w-4 h-4 mr-2" /> Telecharger PDF
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div dangerouslySetInnerHTML={{ __html: generateHtml() }} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// Report Emargement (Section 8.2)
// ============================================================

interface DetailedReport {
  session: { id: string; title: string; startDate: string; endDate: string; location: string; modality: string };
  programTitle: string | null;
  sheetsCount: number;
  traineesCount: number;
  globalRate: number;
  trainees: Array<{
    traineeId: string;
    traineeName: string;
    traineeEmail: string;
    enterpriseId: string | null;
    enterpriseName: string | null;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
    sheets: Array<{ date: string; period: string; status: string; signedAt: string | null; hasSignature: boolean }>;
  }>;
}

function ReportEmargement({
  sessionId,
  session,
}: {
  sessionId: string;
  session?: Session;
}) {
  const { toast } = useToast();
  const [filterEnterprise, setFilterEnterprise] = useState("");
  const [filterTrainee, setFilterTrainee] = useState("");

  const { data: enterprises } = useQuery<Enterprise[]>({ queryKey: ["/api/enterprises"] });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });

  const queryParams = new URLSearchParams({ sessionId });
  if (filterEnterprise && filterEnterprise !== "all") queryParams.set("enterpriseId", filterEnterprise);
  if (filterTrainee && filterTrainee !== "all") queryParams.set("traineeId", filterTrainee);

  const { data: report, isLoading } = useQuery<DetailedReport>({
    queryKey: ["/api/attendance-records/report-detail", `?${queryParams.toString()}`],
    enabled: !!sessionId,
  });

  const generateMutation = useMutation({
    mutationFn: async (sendToEnterprise: boolean) => {
      const resp = await apiRequest("POST", "/api/attendance-records/generate-report", {
        sessionId,
        sendToEnterprise,
      });
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      toast({ title: data.success ? "Rapport genere avec succes" : "Erreur" });
    },
    onError: () => toast({ title: "Erreur generation rapport", variant: "destructive" }),
  });

  const handlePrint = () => {
    if (!report) return;
    const w = window.open("", "_blank");
    if (!w) return;

    let html = `<div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;">`;
    html += `<h2 style="text-align:center;">Rapport d'emargement</h2>`;
    html += `<p style="text-align:center;color:#666;">${report.session.title} — Du ${new Date(report.session.startDate).toLocaleDateString("fr-FR")} au ${new Date(report.session.endDate).toLocaleDateString("fr-FR")}</p>`;
    html += `<p style="text-align:center;font-size:18px;font-weight:bold;margin:15px 0;">Taux global : ${report.globalRate}%</p>`;
    html += `<table style="width:100%;border-collapse:collapse;margin-top:15px;">`;
    html += `<thead><tr><th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:left;">Stagiaire</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Entreprise</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Present</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Absent</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Retard</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Taux</th></tr></thead><tbody>`;
    for (const t of report.trainees) {
      html += `<tr><td style="border:1px solid #999;padding:6px;">${t.traineeName}</td><td style="border:1px solid #999;padding:6px;">${t.enterpriseName || "-"}</td><td style="border:1px solid #999;padding:6px;text-align:center;">${t.present}</td><td style="border:1px solid #999;padding:6px;text-align:center;">${t.absent}</td><td style="border:1px solid #999;padding:6px;text-align:center;">${t.late}</td><td style="border:1px solid #999;padding:6px;text-align:center;font-weight:bold;">${t.rate}%</td></tr>`;
    }
    html += `</tbody></table></div>`;

    w.document.write(`<!DOCTYPE html><html lang="fr"><head><title>Rapport d'emargement</title></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  const handlePdf = async () => {
    if (!report) return;
    let html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">`;
    html += `<h2 style="text-align:center;">Rapport d'emargement</h2>`;
    html += `<p style="text-align:center;color:#666;">${report.session.title}</p>`;
    html += `<p style="text-align:center;">Taux global : <strong>${report.globalRate}%</strong></p>`;
    html += `<table style="width:100%;border-collapse:collapse;margin-top:15px;">`;
    html += `<thead><tr><th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:left;">Stagiaire</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Entreprise</th><th style="border:1px solid #999;padding:6px;background:#f0f0f0;">Taux</th></tr></thead><tbody>`;
    for (const t of report.trainees) {
      html += `<tr><td style="border:1px solid #999;padding:6px;">${t.traineeName}</td><td style="border:1px solid #999;padding:6px;">${t.enterpriseName || "-"}</td><td style="border:1px solid #999;padding:6px;text-align:center;font-weight:bold;">${t.rate}%</td></tr>`;
    }
    html += `</tbody></table></div>`;

    const html2pdf = (await import("html2pdf.js")).default;
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    await html2pdf().set({
      margin: 10,
      filename: `rapport_emargement_${session?.title?.replace(/[^a-zA-Z0-9]/g, "_") || "session"}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { format: "a4", orientation: "portrait" },
    }).from(container).save();
    document.body.removeChild(container);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Filtrer par entreprise</Label>
          <Select value={filterEnterprise} onValueChange={setFilterEnterprise}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entreprises</SelectItem>
              {enterprises?.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Filtrer par stagiaire</Label>
          <Select value={filterTrainee} onValueChange={setFilterTrainee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les stagiaires</SelectItem>
              {trainees?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : report ? (
        <>
          {/* Global stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{report.traineesCount}</p>
                <p className="text-xs text-muted-foreground">Stagiaires</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{report.globalRate}%</p>
                <p className="text-xs text-muted-foreground">Taux global</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 dark:bg-gray-900/20">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{report.sheetsCount}</p>
                <p className="text-xs text-muted-foreground">Feuilles</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Formation</p>
                <p className="text-sm font-medium truncate">{report.programTitle || report.session.title}</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-trainee table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stagiaire</TableHead>
                  <TableHead className="hidden md:table-cell">Entreprise</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Retard</TableHead>
                  <TableHead className="text-center">Excuse</TableHead>
                  <TableHead className="text-center">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.trainees.map((t) => (
                  <TableRow key={t.traineeId}>
                    <TableCell>
                      <p className="text-sm font-medium">{t.traineeName}</p>
                      <p className="text-xs text-muted-foreground">{t.traineeEmail}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{t.enterpriseName || "-"}</p>
                    </TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{t.present}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{t.absent}</TableCell>
                    <TableCell className="text-center text-amber-600 font-medium">{t.late}</TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">{t.excused}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.rate >= 80 ? "default" : t.rate >= 50 ? "secondary" : "destructive"}>
                        {t.rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" /> Imprimer le rapport
            </Button>
            <Button onClick={handlePdf} variant="outline">
              <Download className="w-4 h-4 mr-2" /> Telecharger PDF
            </Button>
            <Button
              onClick={() => generateMutation.mutate(false)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileBarChart className="w-4 h-4 mr-2" />}
              Generer le rapport (document)
            </Button>
            <Button
              onClick={() => generateMutation.mutate(true)}
              disabled={generateMutation.isPending}
              variant="secondary"
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Generer et envoyer a l'entreprise
            </Button>
          </div>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Aucune donnee disponible"
        />
      )}
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
  const [emargementMode, setEmargementMode] = useState<
    "grid" | "tablet" | "email" | "visio" | "qrcode" | "print" | "report"
  >("grid");
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
    onError: (err: Error) =>
      toast({
        title: "Erreur lors de la creation",
        description: err.message,
        variant: "destructive",
      }),
  });

  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);

  return (
    <PageLayout>
      <PageHeader title="Émargement" subtitle="Suivi de présence des participants" />

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

          {/* Emargement mode toolbar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground mr-2">Mode :</span>
                {([
                  { value: "grid" as const, label: "Grille", icon: ClipboardList },
                  { value: "tablet" as const, label: "Tablette", icon: Tablet },
                  { value: "email" as const, label: "Email", icon: Mail },
                  { value: "visio" as const, label: "Visioconference", icon: Video },
                  { value: "qrcode" as const, label: "QR Code", icon: QrCode },
                  { value: "print" as const, label: "Imprimer", icon: Printer },
                  { value: "report" as const, label: "Rapport", icon: FileBarChart },
                ]).map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <Button
                      key={mode.value}
                      size="sm"
                      variant={emargementMode === mode.value ? "default" : "outline"}
                      onClick={() => setEmargementMode(mode.value)}
                      className="gap-1.5"
                    >
                      <Icon className="w-4 h-4" />
                      {mode.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mode content */}
          {emargementMode === "grid" && (
            <>
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

          {emargementMode === "tablet" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tablet className="w-4 h-4" />
                  Emargement sur tablette
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TabletEmargement sessionId={selectedSessionId} sheets={sheets || []} />
              </CardContent>
            </Card>
          )}

          {emargementMode === "email" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Emargement par email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmailEmargement sessionId={selectedSessionId} sheets={sheets || []} />
              </CardContent>
            </Card>
          )}

          {emargementMode === "visio" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Emargement visioconference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VisioEmargement sessionId={selectedSessionId} sheets={sheets || []} session={selectedSession} />
              </CardContent>
            </Card>
          )}

          {emargementMode === "qrcode" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  QR Codes de secours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QRCodeEmargement sessionId={selectedSessionId} sheets={sheets || []} />
              </CardContent>
            </Card>
          )}

          {emargementMode === "print" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Impression feuille d'emargement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PrintEmargement sessionId={selectedSessionId} sheets={sheets || []} session={selectedSession} />
              </CardContent>
            </Card>
          )}

          {emargementMode === "report" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileBarChart className="w-4 h-4" />
                  Rapport d'emargement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportEmargement sessionId={selectedSessionId} session={selectedSession} />
              </CardContent>
            </Card>
          )}
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
    </PageLayout>
  );
}
