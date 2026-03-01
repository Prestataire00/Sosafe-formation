import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Package,
  ClipboardCheck,
  ExternalLink,
  Link,
  Timer,
  Trophy,
  ThumbsUp,
  Smile,
  Layers,
  Globe,
  MonitorPlay,
  Image,
  BarChart3,
  RotateCcw,
  MessageSquare,
  Plus,
  Trash2,
  EyeOff,
  Info,
  MapPin,
  Phone,
  Mail,
  VideoIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
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
  SessionResource,
  ScormPackage,
  FormativeSubmission,
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
  if (type === "video_quiz") return <Video className="w-4 h-4 text-purple-500" />;
  if (type === "scorm") return <Package className="w-4 h-4 text-teal-500" />;
  if (type === "assignment") return <ClipboardCheck className="w-4 h-4 text-orange-500" />;
  if (type === "flashcard") return <Layers className="w-4 h-4 text-pink-500" />;
  if (type === "resource_web") return <Globe className="w-4 h-4 text-indigo-500" />;
  if (type === "virtual_class") return <MonitorPlay className="w-4 h-4 text-emerald-500" />;
  if (type === "document") return <Download className="w-4 h-4 text-sky-500" />;
  if (type === "image") return <Image className="w-4 h-4 text-rose-500" />;
  if (type === "survey") return <BarChart3 className="w-4 h-4 text-violet-500" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function BlockTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    text: "Texte",
    video: "Video",
    quiz: "Quiz",
    video_quiz: "Video + Questions",
    scorm: "Module SCORM",
    assignment: "Evaluation formative",
    flashcard: "Flashcards",
    resource_web: "Ressource web",
    virtual_class: "Classe virtuelle",
    document: "Document",
    image: "Image / Galerie",
    survey: "Sondage",
  };
  return <span className="text-xs text-muted-foreground">{labels[type] || type}</span>;
}

// ============================================================
// QUIZ PLAYER COMPONENT
// ============================================================

const KAHOOT_COLORS = [
  "bg-red-500 hover:bg-red-600 text-white",
  "bg-blue-500 hover:bg-blue-600 text-white",
  "bg-green-500 hover:bg-green-600 text-white",
  "bg-yellow-500 hover:bg-yellow-600 text-white",
];

function QuizPlayer({
  blockId,
  traineeId,
  moduleId,
  existingProgress,
  quizConfig,
  isSurvey = false,
}: {
  blockId: string;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
  quizConfig?: { timerSeconds?: number; showOneAtATime?: boolean; passingScore?: number; allowRetry?: boolean };
  isSurvey?: boolean;
}) {
  const { toast } = useToast();
  const config = quizConfig || {};
  const passingScore = config.passingScore ?? 70;
  const oneAtATime = config.showOneAtATime ?? false;
  const timerSec = config.timerSeconds || 0;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(!!existingProgress?.completed);
  const [score, setScore] = useState<number | null>(existingProgress?.score ?? null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSec);
  const [questionResults, setQuestionResults] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz-questions", `?blockId=${blockId}`],
  });

  const submitProgressMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      toast({ title: "Quiz soumis avec succes !" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  const sortedQuestions = useMemo(
    () => questions?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [questions]
  );

  // Timer logic for one-at-a-time mode
  useEffect(() => {
    if (!oneAtATime || !timerSec || submitted || showFeedback) return;
    setTimeLeft(timerSec);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-answer with wrong on timeout
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, submitted, showFeedback, oneAtATime, timerSec]);

  const handleAnswer = (optIdx: number) => {
    if (submitted || showFeedback) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const q = sortedQuestions[currentIndex];
    if (!q) return;
    const isCorrect = optIdx === q.correctAnswer;

    setAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
    setQuestionResults((prev) => ({ ...prev, [currentIndex]: isCorrect }));
    setShowFeedback(true);

    // Advance after delay
    setTimeout(() => {
      setShowFeedback(false);
      if (currentIndex < sortedQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Final question answered — submit
        const finalAnswers = { ...answers, [currentIndex]: optIdx };
        const finalResults = { ...questionResults, [currentIndex]: isCorrect };
        submitQuiz(finalAnswers, finalResults);
      }
    }, 1500);
  };

  const submitQuiz = (allAnswers: Record<number, number>, allResults?: Record<number, boolean>) => {
    let correct = 0;
    sortedQuestions.forEach((q, idx) => {
      if (allResults) {
        if (allResults[idx]) correct++;
      } else if (allAnswers[idx] === q.correctAnswer) {
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

  const handleClassicSubmit = () => {
    if (sortedQuestions.length === 0) return;
    submitQuiz(answers);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setCurrentIndex(0);
    setShowFeedback(false);
    setQuestionResults({});
    setTimeLeft(timerSec);
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

  // Final score screen
  if (submitted) {
    if (isSurvey) {
      return (
        <div className="text-center p-6 rounded-xl border-2 bg-violet-50 border-violet-300 dark:bg-violet-900/20 dark:border-violet-700">
          <CheckCircle className="w-12 h-12 mx-auto text-violet-500 mb-2" />
          <p className="text-lg font-bold mb-1">Merci pour vos reponses !</p>
          <p className="text-sm text-muted-foreground">
            Votre sondage a ete enregistre avec succes.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className={`text-center p-6 rounded-xl border-2 ${
          score !== null && score >= passingScore
            ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700"
            : "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
        }`}>
          {score !== null && score >= 90 ? (
            <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          ) : score !== null && score >= passingScore ? (
            <ThumbsUp className="w-12 h-12 mx-auto text-green-500 mb-2" />
          ) : (
            <Smile className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          )}
          <p className="text-3xl font-bold mb-1">{score}%</p>
          <p className="text-sm text-muted-foreground">
            {score !== null && score >= passingScore
              ? "Felicitations, vous avez reussi ce quiz !"
              : `Vous n'avez pas atteint le seuil de ${passingScore}%. Courage !`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {Object.values(questionResults).filter(Boolean).length}/{sortedQuestions.length} reponses correctes
          </p>
        </div>
        {config.allowRetry && (
          <Button variant="outline" onClick={handleRetry} className="w-full">
            Reessayer le quiz
          </Button>
        )}
      </div>
    );
  }

  // Kahoot-style one-at-a-time mode
  if (oneAtATime) {
    const q = sortedQuestions[currentIndex];
    const options = (q.options as string[]) || [];
    return (
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Question {currentIndex + 1}/{sortedQuestions.length}
          </span>
          <Progress value={((currentIndex) / sortedQuestions.length) * 100} className="flex-1 h-2" />
        </div>

        {/* Timer */}
        {timerSec > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Timer className={`w-4 h-4 ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <span className={`text-sm font-mono font-bold ${timeLeft <= 5 ? "text-red-500" : ""}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${(timeLeft / timerSec) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Question */}
        <div className="text-center py-4">
          <p className="text-lg font-semibold">{q.question}</p>
          <Badge variant="secondary" className="text-xs mt-2">
            {q.type === "vrai_faux" ? "Vrai/Faux" : "QCM"}
          </Badge>
        </div>

        {/* Colored option buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt, optIdx) => {
            const colorClass = KAHOOT_COLORS[optIdx % KAHOOT_COLORS.length];
            const isFeedbackCorrect = showFeedback && optIdx === q.correctAnswer;
            const isFeedbackWrong = showFeedback && answers[currentIndex] === optIdx && optIdx !== q.correctAnswer;

            return (
              <button
                key={optIdx}
                onClick={() => handleAnswer(optIdx)}
                disabled={showFeedback}
                className={`p-4 rounded-xl text-left font-medium transition-all ${
                  isFeedbackCorrect
                    ? "bg-green-500 text-white ring-4 ring-green-300 scale-105"
                    : isFeedbackWrong
                      ? "bg-gray-400 text-white opacity-60"
                      : showFeedback
                        ? "bg-gray-200 text-gray-500 opacity-50"
                        : colorClass
                } ${!showFeedback ? "hover:scale-[1.02] active:scale-95" : ""}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Classic all-at-once mode
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
              return (
                <label
                  key={optIdx}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-accent/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`quiz-${blockId}-q${qIdx}`}
                    checked={isSelected}
                    onChange={() => setAnswers({ ...answers, [qIdx]: optIdx })}
                    className="accent-primary"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        onClick={handleClassicSubmit}
        disabled={
          Object.keys(answers).length < sortedQuestions.length ||
          submitProgressMutation.isPending
        }
      >
        {submitProgressMutation.isPending ? "Soumission..." : "Soumettre le quiz"}
      </Button>
    </div>
  );
}

// ============================================================
// VIDEO QUIZ PLAYER
// ============================================================

function VideoQuizPlayer({
  block,
  blockId,
  traineeId,
  moduleId,
  existingProgress,
}: {
  block: ElearningBlock;
  blockId: string;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const [videoWatched, setVideoWatched] = useState(!!existingProgress?.completed);
  const videoUrl = block.videoUrl || "";
  const config = (block.quizConfig as any) || {};

  const getEmbedUrl = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    return url;
  };

  if (!videoWatched) {
    return (
      <div className="space-y-4">
        {videoUrl && (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {videoUrl.match(/youtube|youtu\.be|vimeo/) ? (
              <iframe
                src={getEmbedUrl(videoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={videoUrl} controls className="w-full h-full" />
            )}
          </div>
        )}
        <Button onClick={() => setVideoWatched(true)} className="w-full">
          <CheckCircle className="w-4 h-4 mr-2" />
          J'ai termine la video — Passer aux questions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Video terminee — Repondez aux questions</span>
      </div>
      <QuizPlayer
        blockId={blockId}
        traineeId={traineeId}
        moduleId={moduleId}
        existingProgress={existingProgress}
        quizConfig={config}
      />
    </div>
  );
}

// ============================================================
// SCORM PLAYER
// ============================================================

function ScormPlayer({
  block,
  traineeId,
  moduleId,
  existingProgress,
}: {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [launched, setLaunched] = useState(false);
  const [completed, setCompleted] = useState(!!existingProgress?.completed);

  const { data: scormPackage } = useQuery<ScormPackage>({
    queryKey: [`/api/scorm-packages/${block.scormPackageId}`],
    enabled: !!block.scormPackageId,
  });

  const submitProgress = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      setCompleted(true);
    },
  });

  useEffect(() => {
    if (!launched || !scormPackage) return;

    const scormData: Record<string, string> = {};
    const api = {
      LMSInitialize: () => "true",
      LMSFinish: () => {
        const scoreRaw = parseFloat(scormData["cmi.core.score.raw"] || "0");
        const lessonStatus = scormData["cmi.core.lesson_status"] || "";
        const isCompleted = ["completed", "passed"].includes(lessonStatus);
        if (isCompleted || lessonStatus) {
          submitProgress.mutate({
            traineeId,
            moduleId,
            blockId: block.id,
            completed: isCompleted,
            score: isNaN(scoreRaw) ? null : Math.round(scoreRaw),
          });
        }
        return "true";
      },
      LMSGetValue: (key: string) => scormData[key] || "",
      LMSSetValue: (key: string, value: string) => { scormData[key] = value; return "true"; },
      LMSCommit: () => "true",
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => "",
      // SCORM 2004 aliases
      Initialize: () => api.LMSInitialize(),
      Terminate: () => api.LMSFinish(),
      GetValue: (key: string) => api.LMSGetValue(key),
      SetValue: (key: string, value: string) => api.LMSSetValue(key, value),
      Commit: () => api.LMSCommit(),
      GetLastError: () => api.LMSGetLastError(),
      GetErrorString: () => api.LMSGetErrorString(),
      GetDiagnostic: () => api.LMSGetDiagnostic(),
    };

    (window as any).API = api;
    (window as any).API_1484_11 = api;
    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [launched, scormPackage]);

  if (!block.scormPackageId) {
    return <p className="text-sm text-muted-foreground">Aucun package SCORM associe.</p>;
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Module SCORM termine</span>
      </div>
    );
  }

  if (!launched) {
    return (
      <Button onClick={() => setLaunched(true)} className="w-full">
        <Play className="w-4 h-4 mr-2" />
        Lancer le module SCORM
      </Button>
    );
  }

  const launchUrl = scormPackage
    ? `${scormPackage.extractPath}${scormPackage.entryPoint}`
    : null;

  return (
    <div className="space-y-2">
      {launchUrl ? (
        <iframe
          ref={iframeRef}
          src={launchUrl}
          className="w-full border rounded-lg"
          style={{ height: "600px" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Chargement du module SCORM...</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ASSIGNMENT SUBMITTER
// ============================================================

function AssignmentSubmitter({
  block,
  traineeId,
  moduleId,
  existingProgress,
}: {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const { toast } = useToast();
  const config = (block.assignmentConfig as any) || {};
  const instructions = config.instructions || block.content || "";
  const allowText = config.allowText ?? true;
  const allowFile = config.allowFile ?? true;

  const [textContent, setTextContent] = useState("");
  const [fileData, setFileData] = useState<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existingSubmission } = useQuery<FormativeSubmission[]>({
    queryKey: ["/api/formative-submissions", { blockId: block.id, traineeId }],
    queryFn: async () => {
      const resp = await fetch(`/api/formative-submissions?blockId=${block.id}&traineeId=${traineeId}`, { credentials: "include" });
      return resp.json();
    },
  });

  const submission = existingSubmission?.[0];

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/formative-submissions", {
        blockId: block.id,
        moduleId,
        traineeId,
        textContent: allowText ? textContent : null,
        fileUrl: fileData?.fileUrl || null,
        fileName: fileData?.fileName || null,
        fileSize: fileData?.fileSize || null,
        mimeType: fileData?.mimeType || null,
      });
      // Also mark progress
      await apiRequest("POST", "/api/learner-progress", {
        traineeId,
        moduleId,
        blockId: block.id,
        completed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formative-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      toast({ title: "Soumission envoyee" });
    },
    onError: () => toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFileData(result);
    } catch {
      toast({ title: "Erreur de telechargement", variant: "destructive" });
    }
    setUploading(false);
  };

  // Already submitted
  if (submission) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Soumission envoyee</span>
          <Badge variant="outline" className="text-xs ml-2">
            {submission.status === "graded" ? "Note" : submission.status === "reviewing" ? "En revue" : "Soumis"}
          </Badge>
        </div>
        {submission.textContent && (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm">{submission.textContent}</p>
          </div>
        )}
        {submission.fileName && (
          <a href={submission.fileUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center gap-1">
            <Download className="w-3 h-3" />{submission.fileName}
          </a>
        )}
        {submission.status === "graded" && submission.grade != null && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-1">
            <p className="text-sm font-medium">Note : {submission.grade}/100</p>
            {submission.feedback && <p className="text-sm text-muted-foreground">{submission.feedback}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm">{instructions}</p>
        </div>
      )}

      {allowText && (
        <div className="space-y-2">
          <Label className="text-sm">Votre reponse</Label>
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Saisissez votre reponse ici..."
            rows={5}
          />
        </div>
      )}

      {allowFile && (
        <div className="space-y-2">
          <Label className="text-sm">Deposer un fichier</Label>
          <Input type="file" onChange={handleFileUpload} disabled={uploading} />
          {uploading && <p className="text-xs text-muted-foreground">Telechargement en cours...</p>}
          {fileData && <p className="text-xs text-green-600">Fichier telecharge: {fileData.fileName}</p>}
        </div>
      )}

      <Button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || (!textContent && !fileData)}
        className="w-full"
      >
        {submitMutation.isPending ? "Envoi en cours..." : "Soumettre"}
      </Button>
    </div>
  );
}

// ============================================================
// FLASHCARD PLAYER
// ============================================================

function FlashcardPlayer({
  block,
  traineeId,
  moduleId,
  isCompleted,
  onMarkComplete,
  isPending,
}: {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  isCompleted: boolean;
  onMarkComplete: () => void;
  isPending: boolean;
}) {
  const cards = ((block as any).flashcards as Array<{ front: string; back: string }>) || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Aucune flashcard disponible.</p>;
  }

  const card = cards[currentIdx];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Carte {currentIdx + 1}/{cards.length}
        </span>
        <Progress value={((currentIdx + 1) / cards.length) * 100} className="flex-1 mx-3 h-2" />
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className={`cursor-pointer rounded-xl border-2 p-8 text-center min-h-[160px] flex items-center justify-center transition-all ${
          flipped
            ? "bg-pink-50 border-pink-300 dark:bg-pink-900/20 dark:border-pink-700"
            : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 hover:border-pink-300"
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {flipped ? "Reponse" : "Question"}
          </p>
          <p className="text-lg font-medium">{flipped ? card.back : card.front}</p>
          <p className="text-xs text-muted-foreground mt-3">
            <RotateCcw className="w-3 h-3 inline mr-1" />
            Cliquez pour {flipped ? "voir la question" : "reveler la reponse"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === 0}
          onClick={() => { setCurrentIdx(currentIdx - 1); setFlipped(false); }}
        >
          Precedente
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === cards.length - 1}
          onClick={() => { setCurrentIdx(currentIdx + 1); setFlipped(false); }}
        >
          Suivante
        </Button>
      </div>

      {!isCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkComplete}
          disabled={isPending}
        >
          <CheckCircle className="w-3 h-3 mr-2" />
          Marquer comme etudie
        </Button>
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
                    quizConfig={(block.quizConfig as any) || undefined}
                  />
                )}

                {/* VIDEO + QUIZ BLOCK */}
                {block.type === "video_quiz" && (
                  <VideoQuizPlayer
                    block={block}
                    blockId={block.id}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* SCORM BLOCK */}
                {block.type === "scorm" && (
                  <ScormPlayer
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* ASSIGNMENT BLOCK */}
                {block.type === "assignment" && (
                  <AssignmentSubmitter
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* FLASHCARD BLOCK */}
                {block.type === "flashcard" && (
                  <FlashcardPlayer
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    isCompleted={!!isCompleted}
                    onMarkComplete={() =>
                      markCompleteMutation.mutate({
                        traineeId,
                        moduleId,
                        blockId: block.id,
                        completed: true,
                        score: null,
                      })
                    }
                    isPending={markCompleteMutation.isPending}
                  />
                )}

                {/* RESOURCE WEB (IFRAME) BLOCK */}
                {block.type === "resource_web" && (
                  <div className="space-y-3">
                    {(block as any).embedCode ? (
                      <div
                        className="rounded-lg overflow-hidden border"
                        dangerouslySetInnerHTML={{ __html: (block as any).embedCode }}
                      />
                    ) : (block as any).embedUrl ? (
                      <div className="rounded-lg overflow-hidden border">
                        <iframe
                          src={(block as any).embedUrl}
                          className="w-full"
                          style={{ minHeight: "500px" }}
                          allow="fullscreen"
                          title={block.title}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune ressource web configuree.</p>
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
                        Marquer comme termine
                      </Button>
                    )}
                  </div>
                )}

                {/* VIRTUAL CLASS BLOCK */}
                {block.type === "virtual_class" && (
                  <div className="space-y-3">
                    {(block as any).virtualClassDate && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {new Date((block as any).virtualClassDate).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    {(block as any).virtualClassUrl ? (
                      <a
                        href={(block as any).virtualClassUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm font-medium"
                      >
                        <MonitorPlay className="w-4 h-4" />
                        Rejoindre la classe virtuelle
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Lien non encore disponible.</p>
                    )}
                    {block.content && (
                      <p className="text-sm text-muted-foreground">{block.content}</p>
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
                        J'ai participe
                      </Button>
                    )}
                  </div>
                )}

                {/* DOCUMENT BLOCK */}
                {block.type === "document" && (
                  <div className="space-y-3">
                    {(block as any).fileUrl ? (
                      <a
                        href={(block as any).fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Telecharger {(block as any).fileName || "le document"}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Document non disponible.</p>
                    )}
                    {block.content && (
                      <p className="text-sm text-muted-foreground">{block.content}</p>
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

                {/* IMAGE / GALLERY BLOCK */}
                {block.type === "image" && (
                  <div className="space-y-3">
                    {(block as any).imageUrls && ((block as any).imageUrls as string[]).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {((block as any).imageUrls as string[]).map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`${block.title} - ${idx + 1}`}
                              className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune image disponible.</p>
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
                        Marquer comme vu
                      </Button>
                    )}
                  </div>
                )}

                {/* SURVEY (NON-SCORED QUIZ) BLOCK */}
                {block.type === "survey" && (
                  <QuizPlayer
                    blockId={block.id}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                    quizConfig={(block.quizConfig as any) || undefined}
                    isSurvey
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

  // Fetch session resources when expanded
  const { data: sessionResources = [] } = useQuery<SessionResource[]>({
    queryKey: ["/api/learner/session-resources", session.id],
    queryFn: async () => {
      const res = await fetch(`/api/learner/session-resources?sessionId=${session.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: expanded,
  });

  // Fetch session info (programme + formateur) when expanded
  const { data: sessionInfo } = useQuery<{
    session: Session;
    program: { title: string; description: string; objectives: string; prerequisites: string; programContent: string; targetAudience: string; teachingMethods: string; evaluationMethods: string; duration: number; modality: string; level: string } | null;
    trainer: { firstName: string; lastName: string; email: string; phone: string; specialty: string; bio: string } | null;
  }>({
    queryKey: ["/api/learner/session-info", session.id],
    queryFn: async () => {
      const res = await fetch(`/api/learner/session-info?sessionId=${session.id}`, { credentials: "include" });
      if (!res.ok) return { session, program: null, trainer: null };
      return res.json();
    },
    enabled: expanded,
  });

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

            {/* Informations pratiques */}
            {sessionInfo && (sessionInfo.trainer || sessionInfo.program) && (
              <div className="mt-4 border-t pt-4 space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Informations pratiques
                </h4>

                {/* Formateur */}
                {sessionInfo.trainer && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formateur</p>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {sessionInfo.trainer.firstName?.[0]}{sessionInfo.trainer.lastName?.[0]}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {sessionInfo.trainer.firstName} {sessionInfo.trainer.lastName}
                        </p>
                        {sessionInfo.trainer.specialty && (
                          <p className="text-xs text-muted-foreground">{sessionInfo.trainer.specialty}</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          {sessionInfo.trainer.email && (
                            <a href={`mailto:${sessionInfo.trainer.email}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {sessionInfo.trainer.email}
                            </a>
                          )}
                          {sessionInfo.trainer.phone && (
                            <a href={`tel:${sessionInfo.trainer.phone}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {sessionInfo.trainer.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Programme */}
                {sessionInfo.program && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Programme de formation</p>
                    <p className="text-sm font-medium">{sessionInfo.program.title}</p>
                    {sessionInfo.program.objectives && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Objectifs</p>
                        <p className="text-xs whitespace-pre-wrap">{sessionInfo.program.objectives}</p>
                      </div>
                    )}
                    {sessionInfo.program.programContent && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Contenu</p>
                        <p className="text-xs whitespace-pre-wrap">{sessionInfo.program.programContent}</p>
                      </div>
                    )}
                    {sessionInfo.program.prerequisites && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Prerequis</p>
                        <p className="text-xs whitespace-pre-wrap">{sessionInfo.program.prerequisites}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                      {sessionInfo.program.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {sessionInfo.program.duration}h
                        </span>
                      )}
                      {sessionInfo.program.modality && (
                        <Badge variant="outline" className="text-xs">{sessionInfo.program.modality}</Badge>
                      )}
                      {sessionInfo.program.level && (
                        <Badge variant="outline" className="text-xs">{sessionInfo.program.level}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Lieu et horaires */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lieu et horaires</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-sm">
                      <span className="font-medium">Du</span> {formatDate(session.startDate)} <span className="font-medium">au</span> {formatDate(session.endDate)}
                    </p>
                    {session.location && <p>{session.location}</p>}
                    {(session as any).locationAddress && <p className="text-muted-foreground">{(session as any).locationAddress}</p>}
                    {(session as any).locationRoom && <p className="text-muted-foreground">Salle : {(session as any).locationRoom}</p>}
                    {(session as any).modality && (
                      <Badge variant="outline" className="text-xs mt-1">{(session as any).modality}</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Session Resources */}
            {sessionResources.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Ressources de la session
                </h4>
                <div className="space-y-2">
                  {sessionResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {resource.type === "link" ? (
                          <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{resource.title}</p>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {resource.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {(resource.fileSize / 1024).toFixed(0)} Ko
                          </span>
                        )}
                        {resource.type === "link" && resource.externalUrl ? (
                          <a
                            href={resource.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : resource.fileUrl ? (
                          <a
                            href={resource.fileUrl}
                            download={resource.fileName || true}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

  // --- Pending document signatures ---
  const { data: pendingDocs } = useQuery<Array<{ id: string; title: string; type: string; content: string }>>({
    queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`],
    enabled: !!traineeId,
  });

  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [showBatchSign, setShowBatchSign] = useState(false);
  const [previewDocContent, setPreviewDocContent] = useState<{ title: string; content: string } | null>(null);

  const signDocumentMutation = useMutation({
    mutationFn: (data: { documentId: string; signatureData: string }) =>
      apiRequest("POST", `/api/pending-signatures/${data.documentId}/sign`, {
        signerId: traineeId,
        signerType: "trainee",
        signatureData: data.signatureData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`] });
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      toast({ title: "Document signe avec succes" });
      setSigningDocId(null);
    },
    onError: () => toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  const batchSignMutation = useMutation({
    mutationFn: (data: { documentIds: string[]; signatureData: string }) =>
      apiRequest("POST", "/api/pending-signatures/batch-sign", {
        documentIds: data.documentIds,
        signerId: traineeId,
        signerType: "trainee",
        signatureData: data.signatureData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`] });
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      toast({ title: "Tous les documents ont ete signes" });
      setShowBatchSign(false);
    },
    onError: () => toast({ title: "Erreur lors de la signature en lot", variant: "destructive" }),
  });

  const pendingSheets = mySheets.filter((s) => !signedSheetIds.has(s.id));
  const completedSheets = mySheets.filter((s) => signedSheetIds.has(s.id));

  return (
    <div className="space-y-4">
      {/* Pending document signatures */}
      {pendingDocs && pendingDocs.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                Documents a signer ({pendingDocs.length})
              </CardTitle>
              {pendingDocs.length > 1 && !showBatchSign && (
                <Button size="sm" onClick={() => setShowBatchSign(true)}>
                  Tout signer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showBatchSign && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                <p className="text-sm font-medium">Signer les {pendingDocs.length} documents en une fois</p>
                <SignatureCanvas
                  onSign={(sig) =>
                    batchSignMutation.mutate({
                      documentIds: pendingDocs.map((d) => d.id),
                      signatureData: sig,
                    })
                  }
                  isPending={batchSignMutation.isPending}
                  label="Signez ci-dessous pour valider tous les documents en attente."
                />
                <Button variant="outline" size="sm" onClick={() => setShowBatchSign(false)}>
                  Annuler
                </Button>
              </div>
            )}
            {!showBatchSign &&
              pendingDocs.map((doc) => {
                const isSigning = signingDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                  >
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type.replace(/_/g, " ")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewDocContent({ title: doc.title, content: doc.content })}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Apercu
                        </Button>
                        <Button
                          size="sm"
                          variant={isSigning ? "secondary" : "default"}
                          onClick={() => setSigningDocId(isSigning ? null : doc.id)}
                        >
                          <PenTool className="w-4 h-4 mr-2" />
                          {isSigning ? "Annuler" : "Signer"}
                        </Button>
                      </div>
                    </div>
                    {isSigning && (
                      <div className="px-3 pb-3 border-t border-blue-200 dark:border-blue-800 pt-3">
                        <SignatureCanvas
                          onSign={(sig) =>
                            signDocumentMutation.mutate({ documentId: doc.id, signatureData: sig })
                          }
                          isPending={signDocumentMutation.isPending}
                          label="Signez ci-dessous pour valider ce document."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Document preview dialog */}
      {previewDocContent && (
        <Dialog open={!!previewDocContent} onOpenChange={(open) => { if (!open) setPreviewDocContent(null); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b">
              <DialogTitle>{previewDocContent.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto bg-neutral-100 p-6">
              <div className="shadow-md bg-white rounded min-h-[400px]">
                <div dangerouslySetInnerHTML={{ __html: previewDocContent.content }} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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

import { Star } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SurveyTemplate, EvaluationAssignment } from "@shared/schema";
import { EVALUATION_TYPES } from "@shared/schema";

function LearnerEvaluationsTab({ traineeId }: { traineeId: string }) {
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluationAssignment | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<EvaluationAssignment[]>({
    queryKey: ["/api/evaluation-assignments", { traineeId }],
    queryFn: async () => {
      const resp = await fetch(`/api/evaluation-assignments?traineeId=${traineeId}`, { credentials: "include" });
      if (!resp.ok) return [];
      return resp.json();
    },
  });

  const { data: templates } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
  });

  const pending = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter((a) => a.status === "sent" || a.status === "pending");
  }, [assignments]);

  const completed = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter((a) => a.status === "completed");
  }, [assignments]);

  const getTemplate = (templateId: string) => templates?.find(t => t.id === templateId);

  const getEvalLabel = (evalType: string | null | undefined) => {
    if (!evalType) return "Evaluation";
    return EVALUATION_TYPES.find(e => e.value === evalType)?.label || evalType;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignment) return;
      const answersArray = Object.entries(answers).map(([idx, answer]) => ({
        questionIndex: parseInt(idx),
        answer,
      }));
      const numericAnswers = answersArray.filter(a => typeof a.answer === "number");
      const avgRating = numericAnswers.length > 0
        ? Math.round(numericAnswers.reduce((s, a) => s + (a.answer as number), 0) / numericAnswers.length)
        : null;

      const template = getTemplate(selectedAssignment.templateId);

      const resp = await fetch("/api/survey-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          surveyId: selectedAssignment.templateId,
          sessionId: selectedAssignment.sessionId,
          traineeId,
          answers: answersArray,
          rating: avgRating,
          respondentType: "trainee",
          evaluationType: template?.evaluationType || null,
          assignmentId: selectedAssignment.id,
        }),
      });
      if (!resp.ok) throw new Error("Erreur");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-assignments"] });
      setEvalDialogOpen(false);
      setSelectedAssignment(null);
      setAnswers({});
      toast({ title: "Evaluation soumise avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Evaluations a completer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pending.map((assignment) => {
                const template = getTemplate(assignment.templateId);
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                    <div>
                      <p className="text-sm font-medium">{template?.title || "Evaluation"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEvalLabel(template?.evaluationType)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setAnswers({});
                        setEvalDialogOpen(true);
                      }}
                    >
                      Completer
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Evaluations completees ({completed.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Vous n'avez encore complete aucune evaluation.
            </p>
          ) : (
            <div className="space-y-2">
              {completed.map((assignment) => {
                const template = getTemplate(assignment.templateId);
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{template?.title || "Evaluation"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEvalLabel(template?.evaluationType)}
                        {assignment.completedAt && ` — ${formatDate(new Date(assignment.completedAt).toISOString())}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Completee
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={evalDialogOpen} onOpenChange={(open) => { setEvalDialogOpen(open); if (!open) setSelectedAssignment(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {getTemplate(selectedAssignment?.templateId || "")?.title || "Evaluation"}
            </DialogTitle>
          </DialogHeader>
          {selectedAssignment && (() => {
            const template = getTemplate(selectedAssignment.templateId);
            const questions = (template?.questions as Array<{ question: string; type: string; options?: string[] }>) || [];
            return (
              <div className="space-y-4">
                {template?.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                {questions.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <Label className="text-sm font-medium">{q.question}</Label>
                    {q.type === "rating" && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setAnswers(prev => ({ ...prev, [i]: star }))}>
                            <Star className={`w-6 h-6 ${star <= ((answers[i] as number) || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === "text" && (
                      <Textarea
                        value={(answers[i] as string) || ""}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="Votre reponse..."
                        rows={3}
                      />
                    )}
                    {q.type === "qcm" && q.options && (
                      <RadioGroup
                        value={(answers[i] as string) || ""}
                        onValueChange={(v) => setAnswers(prev => ({ ...prev, [i]: v }))}
                      >
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`eval-q${i}-o${oi}`} />
                            <Label htmlFor={`eval-q${i}-o${oi}`} className="text-sm">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="w-full"
                >
                  {submitMutation.isPending ? "Envoi..." : "Soumettre l'evaluation"}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// LEARNER CALENDAR TAB
// ============================================================

function LearnerCalendarTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map enrolled session IDs
  const enrolledSessionIds = new Set(enrollments.map((e) => e.sessionId));
  const enrolledSessions = sessions.filter((s) => enrolledSessionIds.has(s.id));

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    return enrolledSessions.filter((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  // Check if a date has sessions
  const hasSession = (day: number) => {
    const date = new Date(year, month, day);
    return getSessionsForDate(date).length > 0;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const selectedSessions = selectedDay ? getSessionsForDate(selectedDay) : [];

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = [
    "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
  ];

  // Build calendar grid cells
  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const hasSess = hasSession(day);
    const today = isToday(day);
    const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month && selectedDay?.getFullYear() === year;

    cells.push(
      <button
        key={day}
        type="button"
        onClick={() => setSelectedDay(new Date(year, month, day))}
        className={`h-10 rounded-lg text-sm font-medium transition-colors relative
          ${today ? "ring-2 ring-primary" : ""}
          ${isSelected ? "bg-primary text-primary-foreground" : hasSess ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200" : "hover:bg-accent"}
        `}
      >
        {day}
        {hasSess && !isSelected && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <h3 className="text-sm font-medium">
              {monthNames[month]} {year}
            </h3>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells}
          </div>
        </CardContent>
      </Card>

      {/* Selected day events */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">
              {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h4>
            {selectedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session ce jour.</p>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10">
                    <CalendarCheck className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(s.startDate)} — {formatDate(s.endDate)}</span>
                        {s.location && <span>| {s.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming sessions summary */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Prochaines echeances
          </h4>
          {enrolledSessions
            .filter((s) => new Date(s.endDate) >= new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 5)
            .map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  {s.location && <p className="text-xs text-muted-foreground">{s.location}</p>}
                </div>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                  {formatDate(s.startDate)}
                </Badge>
              </div>
            ))}
          {enrolledSessions.filter((s) => new Date(s.endDate) >= new Date()).length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune session a venir.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// LEARNER FORUM TAB
// ============================================================

interface ForumPost {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  authorRole: string | null;
  title: string;
  content: string;
  pinned: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  createdAt: string | null;
}

function LearnerForumTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState("");
  const [newPostDialogOpen, setNewPostDialogOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [viewingPost, setViewingPost] = useState<ForumPost | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const enrolledSessionIds = new Set(enrollments.map((e) => e.sessionId));
  const enrolledSessions = sessions.filter((s) => enrolledSessionIds.has(s.id));

  // Forum posts for selected session
  const { data: posts = [], isLoading: postsLoading } = useQuery<ForumPost[]>({
    queryKey: ["/api/learner/forum-posts", selectedSession],
    queryFn: async () => {
      const res = await fetch(`/api/learner/forum-posts?sessionId=${selectedSession}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedSession,
  });

  // Mute status
  const { data: muteStatus } = useQuery<{ muted: boolean }>({
    queryKey: ["/api/learner/forum-mute", selectedSession],
    queryFn: async () => {
      const res = await fetch(`/api/learner/forum-mute?sessionId=${selectedSession}`, { credentials: "include" });
      if (!res.ok) return { muted: false };
      return res.json();
    },
    enabled: !!selectedSession,
  });

  // Replies for viewed post
  const { data: replies = [], isLoading: repliesLoading } = useQuery<ForumReply[]>({
    queryKey: ["/api/learner/forum-replies", viewingPost?.id],
    queryFn: async () => {
      const res = await fetch(`/api/learner/forum-replies?postId=${viewingPost!.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!viewingPost,
  });

  const createPostMutation = useMutation({
    mutationFn: (data: { sessionId: string; title: string; content: string }) =>
      apiRequest("POST", "/api/learner/forum-posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-posts"] });
      setNewPostDialogOpen(false);
      setNewPostTitle("");
      setNewPostContent("");
      toast({ title: "Sujet cree" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/learner/forum-posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-posts"] });
      setViewingPost(null);
      toast({ title: "Sujet supprime" });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: (data: { postId: string; content: string }) =>
      apiRequest("POST", "/api/learner/forum-replies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-replies"] });
      setReplyContent("");
      toast({ title: "Reponse ajoutee" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/learner/forum-replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-replies"] });
      toast({ title: "Reponse supprimee" });
    },
  });

  const toggleMuteMutation = useMutation({
    mutationFn: async () => {
      if (muteStatus?.muted) {
        await apiRequest("DELETE", `/api/learner/forum-mute?sessionId=${selectedSession}`);
      } else {
        await apiRequest("POST", "/api/learner/forum-mute", { sessionId: selectedSession });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-mute"] });
      toast({ title: muteStatus?.muted ? "Notifications reactivees" : "Notifications desactivees" });
    },
  });

  const formatPostDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const RoleBadge = ({ role }: { role: string | null }) => {
    if (role === "trainer") return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">Formateur</Badge>;
    if (role === "admin") return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">Admin</Badge>;
    return null;
  };

  // Post detail view
  if (viewingPost) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewingPost(null)}>
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Retour aux sujets
        </Button>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">{viewingPost.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{viewingPost.authorName}</span>
                  <RoleBadge role={viewingPost.authorRole} />
                  <span className="text-xs text-muted-foreground">{formatPostDate(viewingPost.createdAt)}</span>
                </div>
              </div>
              {user?.id === viewingPost.authorId && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePostMutation.mutate(viewingPost.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="text-sm whitespace-pre-wrap border-t pt-3">{viewingPost.content}</div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{replies.length} reponse(s)</h4>
          {repliesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            replies.map((reply) => (
              <Card key={reply.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{reply.authorName}</span>
                      <RoleBadge role={reply.authorRole} />
                      <span className="text-xs text-muted-foreground">{formatPostDate(reply.createdAt)}</span>
                    </div>
                    {user?.id === reply.authorId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteReplyMutation.mutate(reply.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Reply form */}
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Ecrire une reponse..."
                className="resize-none min-h-[60px] flex-1"
              />
              <Button
                size="sm"
                disabled={!replyContent.trim() || createReplyMutation.isPending}
                onClick={() => createReplyMutation.mutate({ postId: viewingPost.id, content: replyContent })}
              >
                {createReplyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session selector + mute */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Select value={selectedSession || "none"} onValueChange={(v) => setSelectedSession(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choisir une session</SelectItem>
              {enrolledSessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSession && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleMuteMutation.mutate()}
              disabled={toggleMuteMutation.isPending}
              title={muteStatus?.muted ? "Reactiver les notifications" : "Mettre en sourdine"}
            >
              {muteStatus?.muted ? (
                <><EyeOff className="w-4 h-4 mr-1" /> Sourdine</>
              ) : (
                <><Eye className="w-4 h-4 mr-1" /> Actif</>
              )}
            </Button>
            <Button size="sm" onClick={() => setNewPostDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nouveau sujet
            </Button>
          </>
        )}
      </div>

      {/* Posts list */}
      {!selectedSession ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Espace collaboratif</h3>
          <p className="text-sm text-muted-foreground">
            Selectionnez une session pour acceder au forum de discussion.
          </p>
        </div>
      ) : postsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Aucun sujet pour cette session. Soyez le premier a en creer un !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setViewingPost(post)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">
                      {post.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {post.pinned && <Badge variant="secondary" className="text-xs">Epingle</Badge>}
                      <h4 className="text-sm font-medium truncate">{post.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{post.authorName}</span>
                      <RoleBadge role={post.authorRole} />
                      <span className="text-xs text-muted-foreground">{formatPostDate(post.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.content}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New post dialog */}
      <Dialog open={newPostDialogOpen} onOpenChange={setNewPostDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau sujet de discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Sujet de votre message..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Ecrivez votre message..."
                className="resize-none min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewPostDialogOpen(false)}>Annuler</Button>
              <Button
                disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
                onClick={() => createPostMutation.mutate({ sessionId: selectedSession, title: newPostTitle, content: newPostContent })}
              >
                {createPostMutation.isPending ? "Publication..." : "Publier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// VISIOCONFÉRENCE TAB
// ============================================================

function LearnerVisioTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const mySessionIds = enrollments.map(e => e.sessionId);
  const mySessions = sessions.filter(s => mySessionIds.includes(s.id));
  const visioSessions = mySessions.filter(s => (s as any).virtualClassUrl);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <VideoIcon className="w-5 h-5" />
            Classes virtuelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visioSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <VideoIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune classe virtuelle planifiée</p>
              <p className="text-xs mt-1">Les sessions avec visioconférence apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visioSessions.map(session => {
                const now = new Date();
                const start = new Date(session.startDate);
                const end = new Date(session.endDate);
                const isActive = now >= start && now <= end;
                const isPast = now > end;
                const isFuture = now < start;

                return (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{session.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>
                            {new Date(session.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            {" — "}
                            {new Date(session.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <div className="mt-2">
                          {isActive && <Badge className="bg-green-100 text-green-700">En cours</Badge>}
                          {isFuture && <Badge variant="outline">À venir</Badge>}
                          {isPast && <Badge variant="secondary">Terminée</Badge>}
                        </div>
                      </div>
                      <Button
                        disabled={isPast}
                        onClick={() => window.open((session as any).virtualClassUrl, "_blank")}
                      >
                        <VideoIcon className="w-4 h-4 mr-2" />
                        {isActive ? "Rejoindre" : "Lien visio"}
                      </Button>
                    </div>
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
// À PROPOS TAB
// ============================================================

function LearnerAboutTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { data: orgSettings } = useQuery<any[]>({
    queryKey: ["/api/learner/session-info"],
    queryFn: async () => {
      const mySessionIds = enrollments.map(e => e.sessionId);
      if (mySessionIds.length === 0) return [];
      const results = await Promise.all(
        mySessionIds.slice(0, 3).map(sid =>
          apiRequest("GET", `/api/learner/session-info?sessionId=${sid}`)
            .then(r => r.json())
            .catch(() => null)
        )
      );
      return results.filter(Boolean);
    },
    enabled: enrollments.length > 0,
  });

  const mySessionIds = enrollments.map(e => e.sessionId);
  const mySessions = sessions.filter(s => mySessionIds.includes(s.id));
  const locations = Array.from(new Set(mySessions.filter(s => s.location).map(s => s.location)));

  return (
    <div className="space-y-4">
      {/* Guide plateforme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Bienvenue sur SO'SAFE Formation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Formations
              </h4>
              <p className="text-sm text-muted-foreground">
                Consultez vos inscriptions, accédez aux modules e-learning et suivez votre progression dans chaque formation.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <PenTool className="w-4 h-4 text-green-500" /> Signature
              </h4>
              <p className="text-sm text-muted-foreground">
                Signez vos feuilles d'émargement directement en ligne pour chaque session de formation.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <FolderOpen className="w-4 h-4 text-amber-500" /> Documents
              </h4>
              <p className="text-sm text-muted-foreground">
                Retrouvez vos attestations, certificats et documents administratifs liés à vos formations.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-4 h-4 text-purple-500" /> Évaluations
              </h4>
              <p className="text-sm text-muted-foreground">
                Remplissez vos enquêtes de satisfaction et évaluations pour améliorer nos formations.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CalendarCheck className="w-4 h-4 text-cyan-500" /> Calendrier
              </h4>
              <p className="text-sm text-muted-foreground">
                Visualisez vos sessions planifiées et les échéances à venir dans votre calendrier personnel.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> Forum
              </h4>
              <p className="text-sm text-muted-foreground">
                Échangez avec les autres apprenants et votre formateur sur le forum de votre session.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lieux de formation */}
      {mySessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Lieux de formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mySessions.map(session => (
                <div key={session.id} className="border rounded-lg p-4">
                  <h4 className="font-medium">{session.title}</h4>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {session.location && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> {session.location}
                      </p>
                    )}
                    {(session as any).locationAddress && (
                      <p className="ml-5">{(session as any).locationAddress}</p>
                    )}
                    {(session as any).locationRoom && (
                      <p className="ml-5">Salle : {(session as any).locationRoom}</p>
                    )}
                    <p className="flex items-center gap-2">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Du {new Date(session.startDate).toLocaleDateString("fr-FR")} au {new Date(session.endDate).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.modality === "presentiel" ? "Présentiel" :
                         session.modality === "distanciel" ? "Distanciel" : "Mixte"}
                      </Badge>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact & Assistance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Pour toute question concernant votre formation, n'hésitez pas à contacter l'équipe administrative
              via la messagerie intégrée ou aux coordonnées ci-dessous.
            </p>
            <div className="border rounded-lg p-4 space-y-2">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">contact@sosafe-formation.fr</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">01 23 45 67 89</span>
              </p>
            </div>
          </div>
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
    <PageLayout>
      {/* Header */}
      <PageHeader
        title="Portail Apprenant"
        subtitle="Votre espace de formation personnalisé"
      />

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
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarCheck className="w-4 h-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="forum" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Forum
            </TabsTrigger>
            <TabsTrigger value="visio" className="gap-2">
              <VideoIcon className="w-4 h-4" />
              Visio
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <Info className="w-4 h-4" />
              À propos
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

          <TabsContent value="calendar">
            <LearnerCalendarTab
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="forum">
            <LearnerForumTab
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="visio">
            <LearnerVisioTab
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="about">
            <LearnerAboutTab
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>
        </Tabs>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </PageLayout>
  );
}
