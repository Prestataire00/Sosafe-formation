import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Play,
  FileText,
  CheckCircle,
  Clock,
  Award,
  Video,
  HelpCircle,
  ChevronRight,
  AlertCircle,
  Loader2,
  PenTool,
  ClipboardList,
  Upload,
  Eye,
  Download,
  CalendarCheck,
  FileCheck,
  FolderOpen,
} from "lucide-react";
import type {
  Enrollment,
  Session,
  Program,
  ElearningModule,
  ElearningBlock,
  QuizQuestion,
  LearnerProgress,
  Trainee,
  GeneratedDocument,
  AttendanceSheet,
  AttendanceRecord,
} from "@shared/schema";

// ============================================================
// HELPERS
// ============================================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    registered: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    confirmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    attended: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    no_show: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels: Record<string, string> = {
    pending: "En attente",
    registered: "Inscrit",
    confirmed: "Confirmé",
    attended: "Présent",
    completed: "Terminé",
    cancelled: "Annulé",
    no_show: "Absent",
  };
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

function BlockTypeIcon({ type }: { type: string }) {
  if (type === "video") return <Video className="w-4 h-4 text-blue-500" />;
  if (type === "quiz") return <HelpCircle className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function BlockTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    text: "Texte",
    video: "Vidéo",
    quiz: "Quiz",
  };
  return <span className="text-xs text-muted-foreground">{labels[type] || type}</span>;
}

// ============================================================
// QUIZ PLAYER COMPONENT
// ============================================================

function QuizPlayer({
  blockId,
  traineeId,
  moduleId,
  existingProgress,
}: {
  blockId: string;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(!!existingProgress?.completed);
  const [score, setScore] = useState<number | null>(existingProgress?.score ?? null);

  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz-questions", `?blockId=${blockId}`],
  });

  const submitProgressMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      toast({ title: "Quiz soumis avec succès !" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  const sortedQuestions = useMemo(
    () => questions?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [questions]
  );

  const handleSubmit = () => {
    if (sortedQuestions.length === 0) return;

    let correct = 0;
    sortedQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    const computedScore = Math.round((correct / sortedQuestions.length) * 100);
    setScore(computedScore);
    setSubmitted(true);

    submitProgressMutation.mutate({
      traineeId,
      moduleId,
      blockId,
      completed: true,
      score: computedScore,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Chargement du quiz...</span>
      </div>
    );
  }

  if (!sortedQuestions.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Aucune question disponible pour ce quiz.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sortedQuestions.map((q, qIdx) => (
        <div key={q.id} className="p-3 rounded-lg bg-accent/30 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {qIdx + 1}. {q.question}
            </span>
            <Badge variant="secondary" className="text-xs">
              {q.type === "vrai_faux" ? "Vrai/Faux" : "QCM"}
            </Badge>
          </div>
          <div className="space-y-1 ml-4">
            {(q.options as string[])?.map((opt, optIdx) => {
              const isSelected = answers[qIdx] === optIdx;
              const isCorrect = submitted && optIdx === q.correctAnswer;
              const isWrong =
                submitted && isSelected && optIdx !== q.correctAnswer;
              return (
                <label
                  key={optIdx}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors ${
                    isCorrect
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : isWrong
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        : isSelected
                          ? "bg-primary/10"
                          : "hover:bg-accent/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`quiz-${blockId}-q${qIdx}`}
                    checked={isSelected}
                    onChange={() => {
                      if (!submitted) {
                        setAnswers({ ...answers, [qIdx]: optIdx });
                      }
                    }}
                    disabled={submitted}
                    className="accent-primary"
                  />
                  <span>{opt}</span>
                  {submitted && isCorrect && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={
            Object.keys(answers).length < sortedQuestions.length ||
            submitProgressMutation.isPending
          }
        >
          {submitProgressMutation.isPending
            ? "Soumission..."
            : "Soumettre le quiz"}
        </Button>
      ) : (
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            score !== null && score >= 70
              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
              : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          }`}
        >
          {score !== null && score >= 70 ? (
            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-medium">Score : {score}%</p>
            <p className="text-xs text-muted-foreground">
              {score !== null && score >= 70
                ? "Félicitations, vous avez réussi ce quiz !"
                : "Vous n'avez pas atteint le seuil de 70%. Réessayez !"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODULE CONTENT VIEWER (blocks inside a module)
// ============================================================

function ModuleContentViewer({
  moduleId,
  traineeId,
  progressData,
}: {
  moduleId: string;
  traineeId: string;
  progressData: LearnerProgress[];
}) {
  const { toast } = useToast();

  const { data: blocks, isLoading } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${moduleId}`],
  });

  const markCompleteMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      toast({ title: "Bloc marqué comme terminé" });
    },
    onError: () =>
      toast({
        title: "Erreur lors de la mise à jour",
        variant: "destructive",
      }),
  });

  const sortedBlocks = useMemo(
    () => blocks?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [blocks]
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Chargement du contenu...</span>
      </div>
    );
  }

  if (sortedBlocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucun contenu disponible pour ce module.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {sortedBlocks.map((block) => {
        const blockProgress = progressData.find(
          (p) => p.blockId === block.id
        );
        const isCompleted = blockProgress?.completed;

        return (
          <AccordionItem key={block.id} value={block.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <BlockTypeIcon type={block.type} />
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {block.title}
                </span>
                <BlockTypeLabel type={block.type} />
                {isCompleted && (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-7 space-y-3">
                {/* TEXT BLOCK */}
                {block.type === "text" && (
                  <div className="space-y-3">
                    {block.content && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {block.content}
                      </div>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                )}

                {/* VIDEO BLOCK */}
                {block.type === "video" && (
                  <div className="space-y-3">
                    {block.videoUrl ? (
                      <a
                        href={block.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Regarder la vidéo
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune vidéo disponible.
                      </p>
                    )}
                    {block.content && (
                      <p className="text-sm text-muted-foreground">
                        {block.content}
                      </p>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme visionné
                      </Button>
                    )}
                  </div>
                )}

                {/* QUIZ BLOCK */}
                {block.type === "quiz" && (
                  <QuizPlayer
                    blockId={block.id}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// ============================================================
// SESSION ENROLLMENT CARD
// ============================================================

function EnrollmentCard({
  enrollment,
  session,
  program,
  modules,
  progressData,
  traineeId,
}: {
  enrollment: Enrollment;
  session: Session;
  program?: Program;
  modules: ElearningModule[];
  progressData: LearnerProgress[];
  traineeId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Calculate overall progress for this session's modules
  const { completedCount, totalCount, progressPercent } = useMemo(() => {
    if (modules.length === 0) {
      return { completedCount: 0, totalCount: 0, progressPercent: 0 };
    }
    const moduleIds = new Set(modules.map((m) => m.id));
    const relevantProgress = progressData.filter((p) =>
      moduleIds.has(p.moduleId)
    );
    const total = relevantProgress.length;
    const completed = relevantProgress.filter((p) => p.completed).length;

    // If no progress records exist yet, show 0% over module count
    if (total === 0) {
      return { completedCount: 0, totalCount: modules.length, progressPercent: 0 };
    }
    const percent = Math.round((completed / total) * 100);
    return { completedCount: completed, totalCount: total, progressPercent: percent };
  }, [modules, progressData]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {program && (
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {program.title}
              </p>
            )}
            <CardTitle className="text-lg">{session.title}</CardTitle>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <EnrollmentStatusBadge status={enrollment.status} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDate(session.startDate)} &mdash;{" "}
                  {formatDate(session.endDate)}
                </span>
              </div>
              {session.location && (
                <span className="text-xs text-muted-foreground">
                  {session.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} bloc(s) terminé(s)
          </p>
        </div>

        {/* Module count and expand button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>
              {modules.length} module{modules.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            variant={expanded ? "secondary" : "outline"}
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Masquer" : "Continuer"}
            <ChevronRight
              className={`w-4 h-4 ml-1 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </Button>
        </div>

        {/* Expanded modules list */}
        {expanded && (
          <div className="border-t pt-4 space-y-3">
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun module disponible pour cette session.
              </p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {modules
                  .slice()
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((mod) => {
                    const moduleProgress = progressData.filter(
                      (p) => p.moduleId === mod.id
                    );
                    const moduleCompletedCount = moduleProgress.filter(
                      (p) => p.completed
                    ).length;
                    const moduleTotalCount = moduleProgress.length;
                    const modulePercent =
                      moduleTotalCount > 0
                        ? Math.round(
                            (moduleCompletedCount / moduleTotalCount) * 100
                          )
                        : 0;

                    return (
                      <AccordionItem key={mod.id} value={mod.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            <BookOpen className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium truncate">
                                {mod.title}
                              </p>
                              {mod.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {mod.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Progress
                                value={modulePercent}
                                className="h-1.5 w-16"
                              />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {modulePercent}%
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ModuleContentViewer
                            moduleId={mod.id}
                            traineeId={traineeId}
                            progressData={moduleProgress}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// SIGNATURE PAD COMPONENT (with attendance signing)
// ============================================================

function SignatureCanvas({
  onSign,
  isPending,
  label,
}: {
  onSign: (signatureData: string) => void;
  isPending: boolean;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, [getCtx]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
  }, [isDrawing, getCtx]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  }, []);

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    onSign(canvas.toDataURL("image/png"));
    clearCanvas();
  };

  return (
    <div className="space-y-3">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="border rounded-lg p-1 bg-white dark:bg-gray-950">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
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
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          Effacer
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!hasSignature || isPending}
        >
          {isPending ? "Envoi..." : "Valider la signature"}
        </Button>
      </div>
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  matin: "Matin",
  "apres-midi": "Après-midi",
  journee: "Journée entière",
};

function LearnerSignatureTab({
  traineeId,
  enrollments: myEnrollments,
  sessions,
}: {
  traineeId: string;
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { toast } = useToast();
  const [signingSheetId, setSigningSheetId] = useState<string | null>(null);

  // Fetch attendance sheets for the learner's sessions
  const sessionIds = useMemo(
    () => myEnrollments.map((e) => e.sessionId),
    [myEnrollments],
  );

  const { data: allSheets } = useQuery<AttendanceSheet[]>({
    queryKey: ["/api/attendance-sheets"],
  });

  const { data: allRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records"],
  });

  const { data: signatures } = useQuery<Array<{ id: string; signerId: string; documentType: string; relatedId: string | null; signedAt: string | null }>>({
    queryKey: [`/api/signatures?signerId=${traineeId}`],
    enabled: !!traineeId,
  });

  const mySheets = useMemo(() => {
    if (!allSheets) return [];
    return allSheets
      .filter((s) => sessionIds.includes(s.sessionId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSheets, sessionIds]);

  const myRecords = useMemo(() => {
    if (!allRecords) return [];
    const sheetIds = new Set(mySheets.map((s) => s.id));
    return allRecords.filter(
      (r) => r.traineeId === traineeId && sheetIds.has(r.sheetId),
    );
  }, [allRecords, mySheets, traineeId]);

  const signedSheetIds = useMemo(() => {
    const signed = new Set<string>();
    // Sheets where attendance record is signed
    myRecords.forEach((r) => {
      if (r.signedAt) signed.add(r.sheetId);
    });
    // Sheets where a signature record exists
    signatures?.forEach((s) => {
      if (s.documentType === "emargement" && s.relatedId) {
        signed.add(s.relatedId);
      }
    });
    return signed;
  }, [myRecords, signatures]);

  const submitSignatureMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/signatures", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-records"] });
      toast({ title: "Signature enregistrée avec succès" });
      setSigningSheetId(null);
    },
    onError: () =>
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" }),
  });

  // Also update the attendance record to "present" when signing
  const signAttendanceMutation = useMutation({
    mutationFn: async ({ sheetId, signatureData }: { sheetId: string; signatureData: string }) => {
      // Find the learner's attendance record for this sheet
      const record = myRecords.find((r) => r.sheetId === sheetId);
      if (record) {
        await apiRequest("PATCH", `/api/attendance-records/${record.id}`, {
          status: "present",
          signedAt: new Date().toISOString(),
        });
      }
      // Save the signature
      await apiRequest("POST", "/api/signatures", {
        signerId: traineeId,
        signerType: "trainee",
        documentType: "emargement",
        relatedId: sheetId,
        signatureData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-records"] });
      toast({ title: "Émargement signé avec succès" });
      setSigningSheetId(null);
    },
    onError: () =>
      toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  const handleGenericSign = (signatureData: string) => {
    submitSignatureMutation.mutate({
      signerId: traineeId,
      signerType: "trainee",
      documentType: "emargement",
      relatedId: null,
      signatureData,
    });
  };

  const pendingSheets = mySheets.filter((s) => !signedSheetIds.has(s.id));
  const completedSheets = mySheets.filter((s) => signedSheetIds.has(s.id));

  return (
    <div className="space-y-4">
      {/* Pending attendance signatures */}
      {pendingSheets.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-amber-600" />
              Émargements à signer ({pendingSheets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSheets.map((sheet) => {
              const session = sessions.find((s) => s.id === sheet.sessionId);
              const isSigning = signingSheetId === sheet.id;
              return (
                <div key={sheet.id} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{session?.title || "Session"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sheet.date)} — {PERIOD_LABELS[sheet.period] || sheet.period}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isSigning ? "secondary" : "default"}
                      onClick={() => setSigningSheetId(isSigning ? null : sheet.id)}
                    >
                      <PenTool className="w-4 h-4 mr-2" />
                      {isSigning ? "Annuler" : "Signer"}
                    </Button>
                  </div>
                  {isSigning && (
                    <div className="px-3 pb-3 border-t border-amber-200 dark:border-amber-800 pt-3">
                      <SignatureCanvas
                        onSign={(sig) => signAttendanceMutation.mutate({ sheetId: sheet.id, signatureData: sig })}
                        isPending={signAttendanceMutation.isPending}
                        label="Signez ci-dessous pour confirmer votre présence."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed attendance signatures */}
      {completedSheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Émargements signés ({completedSheets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSheets.map((sheet) => {
                const session = sessions.find((s) => s.id === sheet.sessionId);
                return (
                  <div key={sheet.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{session?.title || "Session"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sheet.date)} — {PERIOD_LABELS[sheet.period] || sheet.period}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Signé
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generic signature pad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Signature libre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignatureCanvas
            onSign={handleGenericSign}
            isPending={submitSignatureMutation.isPending}
            label="Utilisez cette zone pour signer des documents, conventions de formation ou tout autre document nécessitant votre signature."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// LEARNER DOCUMENTS TAB
// ============================================================

interface UserDocument {
  id: string;
  ownerId: string;
  ownerType: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  mimeType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
}) {
  if (!fileUrl) return null;
  const isPdf = mimeType === "application/pdf" || fileUrl.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{fileName || "Apercu du document"}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-[70vh] rounded-lg border" title={fileName || "PDF"} />
          ) : isImage ? (
            <div className="flex items-center justify-center">
              <img src={fileUrl} alt={fileName || "Image"} className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">L'apercu n'est pas disponible pour ce type de fichier.</p>
              <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Telecharger
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  convention: "Convention de formation",
  contrat_particulier: "Contrat particulier",
  contrat_vae: "Contrat VAE",
  politique_confidentialite: "Politique de confidentialité",
  devis: "Devis",
  devis_sous_traitance: "Devis sous-traitance",
  facture: "Facture",
  facture_blended: "Facture formation blended",
  facture_specifique: "Facture formation spécifique",
  convocation: "Convocation",
  attestation: "Attestation de formation",
  certificat: "Certificat",
  programme: "Programme de formation",
  reglement: "Règlement intérieur",
  etiquette_envoi: "Étiquette d'envoi postal",
  bpf: "Bilan Pédagogique et Financier",
  autre: "Document",
};

function LearnerDocumentsTab({
  traineeId,
  enrollments: myEnrollments,
  sessions,
}: {
  traineeId: string;
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [previewGenDoc, setPreviewGenDoc] = useState<GeneratedDocument | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("autre");
  const [uploadFile_, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Personal documents
  const { data: documents, isLoading: docsLoading } = useQuery<UserDocument[]>({
    queryKey: [`/api/user-documents?ownerId=${traineeId}&ownerType=trainee`],
    enabled: !!traineeId,
  });

  // Training documents (generated documents linked to the trainee or their sessions)
  const { data: generatedDocs, isLoading: genDocsLoading } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/generated-documents"],
  });

  const sessionIds = useMemo(
    () => new Set(myEnrollments.map((e) => e.sessionId)),
    [myEnrollments],
  );

  const trainingDocuments = useMemo(() => {
    if (!generatedDocs) return [];
    return generatedDocs.filter(
      (d) =>
        d.traineeId === traineeId ||
        (d.sessionId && sessionIds.has(d.sessionId)),
    );
  }, [generatedDocs, traineeId, sessionIds]);

  const handleUpload = async () => {
    if (!uploadFile_ || !uploadTitle) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(uploadFile_);
      await apiRequest("POST", "/api/user-documents", {
        ownerId: traineeId,
        ownerType: "trainee",
        title: uploadTitle,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        category: uploadCategory,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-documents?ownerId=${traineeId}&ownerType=trainee`] });
      toast({ title: "Document déposé avec succès" });
      setUploadTitle("");
      setUploadCategory("autre");
      setUploadFile(null);
      setShowUploadDialog(false);
    } catch {
      toast({ title: "Erreur lors du dépôt", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = docsLoading || genDocsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Training documents (generated) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Documents de formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucun document de formation disponible pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {trainingDocuments.map((doc) => {
                  const session = sessions.find((s) => s.id === doc.sessionId);
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOC_TYPE_LABELS[doc.type] || doc.type}
                            {session ? ` — ${session.title}` : ""}
                            {doc.createdAt ? ` — ${formatDate(String(doc.createdAt))}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewGenDoc(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal documents + upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mes documents personnels
              </CardTitle>
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Déposer un document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucun document personnel déposé pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category || "Document"} {doc.uploadedAt ? `— ${formatDate(doc.uploadedAt)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.fileUrl && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déposer un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre du document</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Ex: Justificatif d'identité" />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="identite">Identité</SelectItem>
                  <SelectItem value="administratif">Administratif</SelectItem>
                  <SelectItem value="attestation">Attestation</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleUpload} disabled={!uploadFile_ || !uploadTitle || isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Déposer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Personal document preview */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        fileUrl={previewDoc?.fileUrl || null}
        fileName={previewDoc?.fileName || null}
        mimeType={previewDoc?.mimeType || null}
      />

      {/* Generated document preview (text content) */}
      <Dialog open={!!previewGenDoc} onOpenChange={(open) => { if (!open) setPreviewGenDoc(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewGenDoc?.title || "Document"}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 overflow-auto max-h-[70vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {previewGenDoc?.content}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// LEARNER EVALUATIONS TAB
// ============================================================

interface SurveyResponse {
  id: string;
  surveyId: string;
  sessionId: string | null;
  traineeId: string | null;
  responses: unknown;
  submittedAt: string | null;
}

interface Survey {
  id: string;
  title: string;
  type: string;
  status: string;
}

function LearnerEvaluationsTab({ traineeId }: { traineeId: string }) {
  const { data: surveys } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const { data: responses, isLoading } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses"],
  });

  const myResponses = useMemo(() => {
    if (!responses) return [];
    return responses.filter((r) => r.traineeId === traineeId);
  }, [responses, traineeId]);

  const respondedSurveyIds = useMemo(() => {
    return new Set(myResponses.map((r) => r.surveyId));
  }, [myResponses]);

  const pendingSurveys = useMemo(() => {
    if (!surveys) return [];
    return surveys.filter((s) => s.status === "active" && !respondedSurveyIds.has(s.id));
  }, [surveys, respondedSurveyIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingSurveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Enquêtes à compléter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSurveys.map((survey) => (
                <div key={survey.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                  <div>
                    <p className="text-sm font-medium">{survey.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {survey.type === "satisfaction" ? "Enquête de satisfaction" : survey.type === "hot" ? "Évaluation à chaud" : "Évaluation à froid"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    À compléter
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Enquêtes complétées ({myResponses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myResponses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Vous n'avez encore complété aucune enquête.
            </p>
          ) : (
            <div className="space-y-2">
              {myResponses.map((response) => {
                const survey = surveys?.find((s) => s.id === response.surveyId);
                return (
                  <div key={response.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{survey?.title || "Enquête"}</p>
                      <p className="text-xs text-muted-foreground">
                        Soumise le {response.submittedAt ? formatDate(response.submittedAt) : "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Complétée
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function LearnerPortal() {
  const { user } = useAuth();

  // Fetch trainees to find the current user's trainee record
  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  // Match the logged-in user to their trainee record by email or name
  const trainee = useMemo(() => {
    if (!trainees || !user) return null;
    // First try to match by email
    if (user.email) {
      const byEmail = trainees.find((t) => t.email === user.email);
      if (byEmail) return byEmail;
    }
    // Fallback: match by first + last name
    return trainees.find(
      (t) => t.firstName === user.firstName && t.lastName === user.lastName
    ) || null;
  }, [trainees, user]);

  const traineeId = trainee?.id;

  // Fetch enrollments
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<
    Enrollment[]
  >({
    queryKey: ["/api/enrollments"],
  });

  // Fetch sessions
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Fetch programs
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch e-learning modules
  const { data: modules } = useQuery<ElearningModule[]>({
    queryKey: ["/api/elearning-modules"],
  });

  // Fetch learner progress for this trainee
  const { data: progressData } = useQuery<LearnerProgress[]>({
    queryKey: ["/api/learner-progress", `?traineeId=${traineeId}`],
    enabled: !!traineeId,
  });

  // Filter enrollments for the current trainee
  const myEnrollments = useMemo(() => {
    if (!enrollments || !traineeId) return [];
    return enrollments.filter(
      (e) => e.traineeId === traineeId && e.status !== "cancelled"
    );
  }, [enrollments, traineeId]);

  // Stats
  const completedSessions = myEnrollments.filter(
    (e) => e.status === "completed"
  ).length;
  const activeSessions = myEnrollments.filter(
    (e) => e.status !== "completed" && e.status !== "cancelled"
  ).length;

  const isLoading = enrollmentsLoading || !trainees;

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">
            Accès non autorisé
          </h3>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour accéder à votre espace
            apprenant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mon espace apprenant</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue, {user.firstName} {user.lastName}. Suivez vos formations et
          progressez à votre rythme.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myEnrollments.length}</p>
              <p className="text-xs text-muted-foreground">
                Inscriptions totales
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSessions}</p>
              <p className="text-xs text-muted-foreground">
                Sessions en cours
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedSessions}</p>
              <p className="text-xs text-muted-foreground">
                Sessions terminées
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trainee not linked warning */}
      {!isLoading && !traineeId && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                Profil apprenant non associé
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre compte utilisateur n'est pas encore lié à un
                profil stagiaire. Contactez votre administrateur pour qu'il
                associe votre compte.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Formations, Signature, Documents, Evaluations */}
      {traineeId ? (
        <Tabs defaultValue="formations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="formations" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Formations
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2">
              <PenTool className="w-4 h-4" />
              Signature
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Évaluations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formations">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : myEnrollments.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium mb-1">Aucune inscription</h3>
                <p className="text-sm text-muted-foreground">
                  Vous n'êtes inscrit à aucune session de formation pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {myEnrollments.map((enrollment) => {
                  const session = sessions?.find(
                    (s) => s.id === enrollment.sessionId
                  );
                  if (!session) return null;

                  const program = programs?.find(
                    (p) => p.id === session.programId
                  );
                  const sessionModules = (modules || []).filter(
                    (m) =>
                      m.status === "published" &&
                      (m.sessionId === session.id ||
                        (m.programId === session.programId && !m.sessionId))
                  );

                  return (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      session={session}
                      program={program}
                      modules={sessionModules}
                      progressData={progressData || []}
                      traineeId={traineeId!}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="signature">
            <LearnerSignatureTab
              traineeId={traineeId}
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="documents">
            <LearnerDocumentsTab
              traineeId={traineeId}
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="evaluations">
            <LearnerEvaluationsTab traineeId={traineeId} />
          </TabsContent>
        </Tabs>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}
