import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
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
  Lock,
  X,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  User,
  Calendar,
  Medal,
  Shield,
  Sparkles,
  Share2,
  Zap,
  Star,
  ArrowRight,
  ArrowLeft,
  Flame,
  Target,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScenarioPlayer } from "@/pages/learner/components/ScenarioPlayer";
import { SimulationPlayer } from "@/pages/learner/components/SimulationPlayer";
import type {
  Enrollment,
  Session,
  Program,
  ElearningModule,
  ElearningBlock,
  QuizQuestion,
  LearnerProgress,
  GeneratedDocument,
  AttendanceSheet,
  AttendanceRecord,
  SessionResource,
  ScormPackage,
  FormativeSubmission,
  TraineeCertification,
  DigitalBadge,
  BadgeAward,
} from "@shared/schema";

// ============================================================
// CONFETTI & CELEBRATION HELPERS
// ============================================================

function fireConfettiSmall() {
  confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, gravity: 1.2, scalar: 0.8 });
}

function fireConfettiMedium() {
  confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 40, spread: 90, origin: { y: 0.7 } }), 200);
}

function fireConfettiBig() {
  const end = Date.now() + 800;
  const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function fireConfettiEpic() {
  const end = Date.now() + 2000;
  const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"];
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 80, origin: { x: 0, y: 0.5 }, colors, gravity: 0.8 });
    confetti({ particleCount: 6, angle: 120, spread: 80, origin: { x: 1, y: 0.5 }, colors, gravity: 0.8 });
    confetti({ particleCount: 3, angle: 90, spread: 120, origin: { x: 0.5, y: 0 }, colors, gravity: 0.6 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ============================================================
// HELPERS
// ============================================================

/** Extract YouTube/Vimeo embed URL, or return null for other video types */
function getVideoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

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

    // Advance after delay (longer if explanation exists)
    const delay = q.explanation ? 3000 : 1500;
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
    }, delay);
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

    // Fire confetti proportional to score
    if (computedScore >= 90) fireConfettiBig();
    else if (computedScore >= (config.passingScore ?? 70)) fireConfettiMedium();

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

        {/* Explanation after answer */}
        {showFeedback && q.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Explication</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{q.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}
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

  if (!videoWatched) {
    return (
      <div className="space-y-4">
        {videoUrl && (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {getVideoEmbedUrl(videoUrl) ? (
              <iframe
                src={getVideoEmbedUrl(videoUrl)!}
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
  const [knewIt, setKnewIt] = useState<Record<number, boolean>>({});
  const totalReviewed = Object.keys(knewIt).length;
  const knewCount = Object.values(knewIt).filter(Boolean).length;

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Aucune flashcard disponible.</p>;
  }

  const card = cards[currentIdx];
  const allReviewed = totalReviewed === cards.length;

  const handleKnew = (knew: boolean) => {
    setKnewIt((prev) => ({ ...prev, [currentIdx]: knew }));
    if (knew) fireConfettiSmall();
    setTimeout(() => {
      setFlipped(false);
      if (currentIdx < cards.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else if (!isCompleted && Object.keys({ ...knewIt, [currentIdx]: knew }).length === cards.length) {
        onMarkComplete();
      }
    }, 400);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Carte {currentIdx + 1}/{cards.length}
        </span>
        <div className="flex items-center gap-2 flex-1 mx-3">
          <Progress value={((totalReviewed) / cards.length) * 100} className="flex-1 h-2" />
          {totalReviewed > 0 && (
            <span className="text-xs text-green-600 font-medium">{knewCount}/{totalReviewed}</span>
          )}
        </div>
      </div>

      {/* 3D Flip Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative min-h-[200px]"
        >
          {/* Front */}
          <div
            className={`absolute inset-0 rounded-xl border-2 p-8 text-center flex items-center justify-center backface-hidden transition-colors ${
              knewIt[currentIdx] === true
                ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700"
                : knewIt[currentIdx] === false
                  ? "bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700"
                  : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 hover:border-pink-300"
            }`}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Question</p>
              <p className="text-lg font-medium">{card.front}</p>
              <p className="text-xs text-muted-foreground mt-3">
                <RotateCcw className="w-3 h-3 inline mr-1" />
                Cliquez pour révéler la réponse
              </p>
            </div>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl border-2 p-8 text-center flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 border-pink-300 dark:from-pink-900/20 dark:to-purple-900/20 dark:border-pink-700"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Réponse</p>
              <p className="text-lg font-medium">{card.back}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spaced repetition buttons — shown when flipped */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 justify-center"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={(e) => { e.stopPropagation(); handleKnew(false); }}
            >
              <X className="w-4 h-4" />
              Je ne savais pas
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => { e.stopPropagation(); handleKnew(true); }}
            >
              <CheckCircle className="w-4 h-4" />
              Je savais !
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === 0}
          onClick={() => { setCurrentIdx(currentIdx - 1); setFlipped(false); }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Précédente
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === cards.length - 1}
          onClick={() => { setCurrentIdx(currentIdx + 1); setFlipped(false); }}
        >
          Suivante
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Summary when all reviewed */}
      {allReviewed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
        >
          <p className="font-bold text-green-700 dark:text-green-300">
            {knewCount}/{cards.length} cartes maîtrisées
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {knewCount === cards.length ? "Parfait ! Vous maîtrisez toutes les cartes." : "Révisez les cartes manquées pour consolider vos acquis."}
          </p>
          {knewCount < cards.length && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                const firstMissed = Object.entries(knewIt).find(([, v]) => !v);
                if (firstMissed) { setCurrentIdx(Number(firstMissed[0])); setFlipped(false); }
              }}
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Revoir les cartes manquées
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// VIDEO BLOCK PLAYER — with auto-completion on watch progress
// ============================================================

function VideoBlockPlayer({
  block,
  isCompleted,
  onMarkComplete,
  isPending,
}: {
  block: ElearningBlock;
  isCompleted: boolean;
  onMarkComplete: () => void;
  isPending: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watchPercent, setWatchPercent] = useState(0);
  const [autoCompleted, setAutoCompleted] = useState(false);
  const minPercent = block.minViewPercent || 80;

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const percent = Math.round((el.currentTime / el.duration) * 100);
    setWatchPercent(percent);
    if (percent >= minPercent && !isCompleted && !autoCompleted) {
      setAutoCompleted(true);
      onMarkComplete();
    }
  }, [isCompleted, autoCompleted, minPercent, onMarkComplete]);

  const handleEnded = useCallback(() => {
    if (!isCompleted && !autoCompleted) {
      setAutoCompleted(true);
      onMarkComplete();
    }
  }, [isCompleted, autoCompleted, onMarkComplete]);

  const isNativeVideo = block.videoUrl?.match(/\.(mp4|webm|ogg)/);
  const embedUrl = block.videoUrl ? getVideoEmbedUrl(block.videoUrl) : null;

  return (
    <div className="space-y-4">
      {block.videoUrl ? (
        embedUrl ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-black border">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={block.title}
            />
          </div>
        ) : isNativeVideo ? (
          <div className="space-y-2">
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={block.videoUrl}
                controls
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
            </div>
            {!isCompleted && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progression de la vidéo</span>
                  <span className={watchPercent >= minPercent ? "text-green-600 font-medium" : ""}>
                    {watchPercent}% / {minPercent}% requis
                  </span>
                </div>
                <Progress value={watchPercent} className="h-1.5" />
              </div>
            )}
          </div>
        ) : (
          <a
            href={block.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-colors"
          >
            <Play className="w-5 h-5" />
            Regarder la vidéo
            <ExternalLink className="w-4 h-4" />
          </a>
        )
      ) : (
        <p className="text-muted-foreground">Aucune vidéo disponible.</p>
      )}
      {block.content && (
        <p className="text-muted-foreground">{block.content}</p>
      )}
      {!isCompleted && !isNativeVideo && (
        <Button onClick={onMarkComplete} disabled={isPending}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Marquer comme visionné
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
  requireSequential = true,
}: {
  moduleId: string;
  traineeId: string;
  progressData: LearnerProgress[];
  requireSequential?: boolean;
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
      {sortedBlocks.map((block, blockIndex) => {
        const blockProgress = progressData.find(
          (p) => p.blockId === block.id
        );
        const isCompleted = blockProgress?.completed;

        // Sequential locking: check if all previous blocks are completed
        let isLocked = false;
        if (requireSequential && blockIndex > 0) {
          for (let i = 0; i < blockIndex; i++) {
            const prevBlock = sortedBlocks[i];
            const prevProgress = progressData.find((p) => p.blockId === prevBlock.id);
            if (!prevProgress?.completed) {
              isLocked = true;
              break;
            }
          }
        }

        return (
          <AccordionItem key={block.id} value={block.id} disabled={isLocked}>
            <AccordionTrigger className={`hover:no-underline ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`} disabled={isLocked}>
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                {isLocked ? (
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <BlockTypeIcon type={block.type} />
                )}
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {block.title}
                </span>
                {isLocked ? (
                  <span className="text-xs text-muted-foreground shrink-0">Terminez le bloc précédent</span>
                ) : (
                  <BlockTypeLabel type={block.type} />
                )}
                {isCompleted && (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                )}
              </div>
            </AccordionTrigger>
            {!isLocked && (
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
                      getVideoEmbedUrl(block.videoUrl) ? (
                        <div className="aspect-video rounded-lg overflow-hidden bg-black border">
                          <iframe
                            src={getVideoEmbedUrl(block.videoUrl)!}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={block.title}
                          />
                        </div>
                      ) : block.videoUrl.match(/\.(mp4|webm|ogg)/) ? (
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <video src={block.videoUrl} controls className="w-full h-full" />
                        </div>
                      ) : (
                        <a
                          href={block.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Regarder la vidéo
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )
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
            )}
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
  onEnterImmersive,
}: {
  enrollment: Enrollment;
  session: Session;
  program?: Program;
  modules: ElearningModule[];
  progressData: LearnerProgress[];
  traineeId: string;
  onEnterImmersive: (moduleId: string, blockIndex?: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isValidated = ["confirmed", "attended", "completed"].includes(enrollment.status);

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

        {/* Module count and path type badges */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
          <BookOpen className="w-4 h-4" />
          <span>
            {modules.length} module{modules.length !== 1 ? "s" : ""}
          </span>
          {(() => {
            const learningCount = modules.filter((m) => (m as any).pathType === "learning").length;
            const assessmentCount = modules.filter((m) => (m as any).pathType === "assessment").length;
            return (
              <>
                {learningCount > 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px] px-1.5 py-0">
                    <BookOpen className="w-3 h-3 mr-1" />{learningCount} apprentissage
                  </Badge>
                )}
                {assessmentCount > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-[10px] px-1.5 py-0">
                    <Target className="w-3 h-3 mr-1" />{assessmentCount} évaluation
                  </Badge>
                )}
              </>
            );
          })()}
        </div>

        {/* Pending validation banner */}
        {!isValidated && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Votre inscription est en attente de validation par l'administrateur. Vous pourrez accéder au contenu une fois confirmée.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {modules.length > 0 && (
            <Button
              size="sm"
              className="flex-1 gap-2"
              disabled={!isValidated}
              onClick={() => {
                const sorted = modules.slice().sort((a, b) => a.orderIndex - b.orderIndex);
                const firstIncomplete = sorted.find((mod) => {
                  const modProgress = progressData.filter((p) => p.moduleId === mod.id);
                  return modProgress.length === 0 || modProgress.some((p) => !p.completed);
                });
                onEnterImmersive(firstIncomplete?.id || sorted[0]?.id || "");
              }}
            >
              {isValidated ? <Play className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isValidated
                ? (progressPercent > 0 ? "Continuer la formation" : "Commencer la formation")
                : "En attente de validation"
              }
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            {expanded ? "Masquer" : "Détails"}
            <ChevronRight
              className={`w-4 h-4 ml-1 transition-transform ${expanded ? "rotate-90" : ""}`}
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
              (() => {
                const sorted = modules.slice().sort((a, b) => a.orderIndex - b.orderIndex);
                const learningMods = sorted.filter((m) => (m as any).pathType === "learning");
                const assessmentMods = sorted.filter((m) => (m as any).pathType === "assessment");
                const combinedMods = sorted.filter((m) => !(m as any).pathType || (m as any).pathType === "combined");
                const hasMultipleTypes = [learningMods.length > 0, assessmentMods.length > 0, combinedMods.length > 0].filter(Boolean).length > 1;

                const renderModuleGroup = (mods: typeof modules, groupLabel?: string, groupIcon?: React.ReactNode, groupColor?: string) => (
                  <div key={groupLabel || "all"}>
                    {groupLabel && hasMultipleTypes && (
                      <div className={`flex items-center gap-2 mb-2 px-1 ${groupColor || ""}`}>
                        {groupIcon}
                        <span className="text-sm font-semibold">{groupLabel}</span>
                        <span className="text-xs text-muted-foreground">({mods.length})</span>
                      </div>
                    )}
                    <Accordion type="multiple" className="w-full">
                      {mods.map((mod) => {
                        const moduleProgress = progressData.filter((p) => p.moduleId === mod.id);
                        const moduleCompletedCount = moduleProgress.filter((p) => p.completed).length;
                        const moduleTotalCount = moduleProgress.length;
                        const modulePercent = moduleTotalCount > 0 ? Math.round((moduleCompletedCount / moduleTotalCount) * 100) : 0;
                        const pt = (mod as any).pathType || "combined";
                        const ptIcon = pt === "learning" ? <BookOpen className="w-4 h-4 text-green-600 shrink-0" /> : pt === "assessment" ? <Target className="w-4 h-4 text-orange-600 shrink-0" /> : <BookOpen className="w-4 h-4 text-primary shrink-0" />;

                        return (
                          <AccordionItem key={mod.id} value={mod.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                {ptIcon}
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-medium truncate">{mod.title}</p>
                                  {mod.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{mod.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Progress value={modulePercent} className="h-1.5 w-16" />
                                  <span className="text-xs text-muted-foreground w-8 text-right">{modulePercent}%</span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {isValidated ? (
                                <ModuleContentViewer moduleId={mod.id} traineeId={traineeId} progressData={moduleProgress} requireSequential={(mod as any).requireSequential !== false} />
                              ) : (
                                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                                  <Lock className="w-4 h-4" />
                                  <span>Contenu verrouillé — en attente de validation par l'administrateur.</span>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                );

                return (
                  <div className="space-y-4">
                    {learningMods.length > 0 && renderModuleGroup(learningMods, "Apprentissage", <BookOpen className="w-4 h-4 text-green-600" />, "text-green-700 dark:text-green-400")}
                    {assessmentMods.length > 0 && renderModuleGroup(assessmentMods, "Évaluation", <Target className="w-4 h-4 text-orange-600" />, "text-orange-700 dark:text-orange-400")}
                    {combinedMods.length > 0 && renderModuleGroup(combinedMods, "Combiné", <Layers className="w-4 h-4 text-blue-600" />, "text-blue-700 dark:text-blue-400")}
                  </div>
                );
              })()
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
                              <Mail className="w-3 h-3" />
                              {sessionInfo.trainer.email}
                            </a>
                          )}
                          {sessionInfo.trainer.phone && (
                            <a href={`tel:${sessionInfo.trainer.phone}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {sessionInfo.trainer.phone}
                            </a>
                          )}
                        </div>
                        <a href="/messaging" className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-primary hover:underline">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Envoyer un message au formateur
                        </a>
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

// ============================================================
// SESSIONS TAB
// ============================================================

interface LearnerSessionData {
  session: Session;
  program: { id: string; title: string; description: string; duration: number; modality: string; level: string } | null;
  trainer: { firstName: string; lastName: string; email: string; specialty: string } | null;
  enrollmentStatus: string;
}

function LearnerSessionsTab({ traineeId }: { traineeId: string }) {
  const { data: sessionData, isLoading } = useQuery<LearnerSessionData[]>({
    queryKey: ["/api/learner/my-sessions"],
    enabled: !!traineeId,
  });

  const modalityLabels: Record<string, string> = {
    presentiel: "Présentiel",
    distanciel: "Distanciel",
    hybride: "Hybride",
    elearning: "E-learning",
  };

  const levelLabels: Record<string, string> = {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionData || sessionData.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucune session</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Vous n'avez aucune session de formation pour le moment.
        </p>
        <Button variant="outline" asChild>
          <a href="/inscription">
            <BookOpen className="w-4 h-4 mr-2" />
            Découvrir les formations disponibles
          </a>
        </Button>
      </div>
    );
  }

  // Sort by start date (upcoming first)
  const sorted = [...sessionData].sort(
    (a, b) => new Date(a.session.startDate).getTime() - new Date(b.session.startDate).getTime()
  );

  const now = new Date();

  return (
    <div className="space-y-4">
      {sorted.map(({ session, program, trainer, enrollmentStatus }) => {
        const start = new Date(session.startDate);
        const end = new Date(session.endDate);
        const isPast = end < now;
        const isOngoing = start <= now && end >= now;
        const isSessionValidated = ["confirmed", "attended", "completed"].includes(enrollmentStatus);

        return (
          <Card key={session.id} className={cn(isPast && "opacity-70")}>
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
                    <EnrollmentStatusBadge status={enrollmentStatus} />
                    {isOngoing && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        En cours
                      </Badge>
                    )}
                    {isPast && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Terminée
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>
                    {formatDate(session.startDate)} &mdash; {formatDate(session.endDate)}
                  </span>
                </div>

                {/* Location */}
                {session.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{session.location}</span>
                  </div>
                )}

                {/* Modality */}
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{modalityLabels[session.modality] || session.modality}</span>
                </div>

                {/* Room */}
                {session.locationRoom && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Salle : {session.locationRoom}</span>
                  </div>
                )}
              </div>

              {/* Trainer */}
              {trainer && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {trainer.firstName} {trainer.lastName}
                    </p>
                    {trainer.specialty && (
                      <p className="text-xs text-muted-foreground">{trainer.specialty}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Program details */}
              {program && (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {program.duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {program.duration}h de formation
                      </span>
                    )}
                    {program.level && (
                      <span>Niveau : {levelLabels[program.level] || program.level}</span>
                    )}
                  </div>
                  {program.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {program.description}
                    </p>
                  )}
                </div>
              )}

              {/* Pending validation banner */}
              {!isSessionValidated && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Inscription en attente de validation — l'accès au contenu sera débloqué après confirmation par l'administrateur.
                  </p>
                </div>
              )}

              {/* Virtual class link */}
              {session.virtualClassUrl && !isPast && isSessionValidated && (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={session.virtualClassUrl} target="_blank" rel="noopener noreferrer">
                    <Video className="w-4 h-4" />
                    Rejoindre la classe virtuelle
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

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

  // Fetch intervention dates for all enrolled sessions
  const { data: allSessionDates } = useQuery<any[]>({
    queryKey: ["/api/session-dates"],
  });

  // Filter intervention dates to only enrolled sessions
  const interventionDates = useMemo(() => {
    if (!allSessionDates) return [];
    return allSessionDates.filter((sd: any) => enrolledSessionIds.has(sd.sessionId));
  }, [allSessionDates, enrolledSessionIds]);

  // Check if a date has intervention or session
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];

    // Check intervention dates first (specific days)
    const interventions = interventionDates.filter((sd: any) => sd.date === dateStr);

    // Check general session ranges
    const sessionMatches = enrolledSessions.filter((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });

    return { interventions, sessions: sessionMatches };
  };

  const hasEvent = (day: number) => {
    const date = new Date(year, month, day);
    const events = getEventsForDate(date);
    return events.interventions.length > 0 || events.sessions.length > 0;
  };

  const hasIntervention = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split("T")[0];
    return interventionDates.some((sd: any) => sd.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const selectedEvents = selectedDay ? getEventsForDate(selectedDay) : { interventions: [], sessions: [] };

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  // Build calendar grid cells
  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const hasSess = hasEvent(day);
    const hasInterv = hasIntervention(day);
    const today = isToday(day);
    const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month && selectedDay?.getFullYear() === year;

    cells.push(
      <button
        key={day}
        type="button"
        onClick={() => setSelectedDay(new Date(year, month, day))}
        className={cn(
          "h-10 rounded-lg text-sm font-medium transition-colors relative",
          today && "ring-2 ring-primary",
          isSelected
            ? "bg-primary text-primary-foreground"
            : hasInterv
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200"
            : hasSess
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200"
            : "hover:bg-accent"
        )}
      >
        {day}
        {hasSess && !isSelected && (
          <span className={cn(
            "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
            hasInterv ? "bg-emerald-500" : "bg-blue-500"
          )} />
        )}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
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

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Jour d'intervention
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Période de session
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" />
              Aujourd'hui
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Right sidebar: selected day + upcoming */}
      <div className="space-y-4">
        {/* Selected day events */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 capitalize">
              {selectedDay
                ? selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                : "Sélectionnez un jour"}
            </h4>
            {selectedDay && selectedEvents.interventions.length === 0 && selectedEvents.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement ce jour.</p>
            ) : (
              <div className="space-y-2">
                {/* Intervention dates with times */}
                {selectedEvents.interventions.map((sd: any) => {
                  const sess = enrolledSessions.find((s) => s.id === sd.sessionId);
                  return (
                    <div key={sd.id} className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="text-sm font-medium truncate">{sess?.title || "Session"}</p>
                      </div>
                      {(sd.startTime || sd.endTime) && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ml-6">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {sd.startTime || "—"} → {sd.endTime || "—"}
                        </p>
                      )}
                      {sd.notes && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{sd.notes}</p>
                      )}
                    </div>
                  );
                })}

                {/* General session matches (only if no specific intervention) */}
                {selectedEvents.sessions
                  .filter((s) => !selectedEvents.interventions.some((sd: any) => sd.sessionId === s.id))
                  .map((s) => (
                    <div key={s.id} className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        <p className="text-sm font-medium truncate">{s.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {formatDate(s.startDate)} — {formatDate(s.endDate)}
                      </p>
                      {s.location && (
                        <p className="text-xs text-muted-foreground ml-6">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {s.location}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming sessions summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Prochaines échéances
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
              <p className="text-sm text-muted-foreground">Aucune session à venir.</p>
            )}
          </CardContent>
        </Card>
      </div>
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
      toast({ title: "Sujet supprimé" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (post: ForumPost) => apiRequest("PATCH", `/api/learner/forum-posts/${post.id}`, { pinned: !post.pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-posts"] });
      toast({ title: "Post mis à jour" });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: (data: { postId: string; content: string }) =>
      apiRequest("POST", "/api/learner/forum-replies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/forum-replies"] });
      setReplyContent("");
      toast({ title: "Réponse ajoutée" });
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
              <div className="flex items-center gap-1">
                {(user?.role === "admin" || user?.role === "trainer") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => togglePinMutation.mutate(viewingPost)}
                  >
                    {viewingPost.pinned ? "Désépingler" : "Épingler"}
                  </Button>
                )}
                {(user?.id === viewingPost.authorId || user?.role === "admin") && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePostMutation.mutate(viewingPost.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="text-sm whitespace-pre-wrap border-t pt-3">{viewingPost.content}</div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{replies.length} réponse(s)</h4>
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
            Sélectionnez une session pour accéder au forum de discussion.
          </p>
        </div>
      ) : postsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Aucun sujet pour cette session. Soyez le premier à en créer un !</p>
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
                      {post.pinned && <Badge variant="secondary" className="text-xs">Épinglé</Badge>}
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

  const now = new Date();

  // Sort: active first, then upcoming, then past
  const sortedVisio = [...visioSessions].sort((a, b) => {
    const aStart = new Date(a.startDate);
    const aEnd = new Date(a.endDate);
    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);
    const aActive = now >= aStart && now <= aEnd;
    const bActive = now >= bStart && now <= bEnd;
    const aFuture = now < aStart;
    const bFuture = now < bStart;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    return aStart.getTime() - bStart.getTime();
  });

  // Find next upcoming visio
  const nextVisio = sortedVisio.find((s) => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return now >= start && now <= end; // active first
  }) || sortedVisio.find((s) => new Date(s.startDate) > now);

  return (
    <div className="space-y-4">
      {/* Highlighted next class */}
      {nextVisio && (() => {
        const start = new Date(nextVisio.startDate);
        const end = new Date(nextVisio.endDate);
        const isActive = now >= start && now <= end;
        const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return (
          <Card className={isActive ? "border-green-400 bg-green-50/50 dark:bg-green-900/10" : "border-primary/20 bg-primary/5"}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-4 rounded-full",
                  isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
                )}>
                  <VideoIcon className={cn(
                    "w-8 h-8",
                    isActive ? "text-green-600" : "text-primary"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {isActive ? "En cours maintenant" : "Prochaine classe virtuelle"}
                  </p>
                  <p className="text-lg font-bold truncate">{nextVisio.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      {" — "}
                      {end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    {!isActive && daysUntil > 0 && (
                      <Badge variant="outline" className="text-xs">
                        dans {daysUntil} jour{daysUntil > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="lg"
                  className={isActive ? "bg-green-600 hover:bg-green-700" : ""}
                  onClick={() => window.open((nextVisio as any).virtualClassUrl, "_blank")}
                >
                  <VideoIcon className="w-5 h-5 mr-2" />
                  {isActive ? "Rejoindre maintenant" : "Accéder au lien"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* All visio sessions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <VideoIcon className="w-5 h-5" />
            Toutes les classes virtuelles
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
              {sortedVisio.map(session => {
                const start = new Date(session.startDate);
                const end = new Date(session.endDate);
                const isActive = now >= start && now <= end;
                const isPast = now > end;
                const isFuture = now < start;
                const isNext = session.id === nextVisio?.id;

                return (
                  <div
                    key={session.id}
                    className={cn(
                      "border rounded-lg p-4 transition-colors",
                      isActive && "border-green-300 bg-green-50/30 dark:bg-green-900/5",
                      isPast && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{session.title}</h4>
                          {isActive && (
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>
                            {start.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            {" — "}
                            {end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <div className="mt-2">
                          {isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">En cours</Badge>}
                          {isFuture && <Badge variant="outline">À venir</Badge>}
                          {isPast && <Badge variant="secondary">Terminée</Badge>}
                        </div>
                      </div>
                      <Button
                        disabled={isPast}
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "bg-green-600 hover:bg-green-700" : ""}
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
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const orgName = settings?.org_name || "SO'SAFE Formation";
  const orgEmail = settings?.org_email || settings?.smtp_from_email || "contact@sosafe-formation.fr";
  const orgPhone = settings?.org_phone || "01 23 45 67 89";
  const orgAddress = settings?.org_address || "";

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
            Bienvenue sur {orgName}
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
                <a href={`mailto:${orgEmail}`} className="font-medium text-primary hover:underline">{orgEmail}</a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${orgPhone}`} className="font-medium text-primary hover:underline">{orgPhone}</a>
              </p>
              {orgAddress && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{orgAddress}</span>
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href="/messaging">
                <MessageSquare className="w-4 h-4" />
                Envoyer un message à l'équipe
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// LEARNER BADGES & CERTIFICATIONS TAB
// ============================================================

function LearnerBadgesTab({ traineeId, progressData, modules }: { traineeId: string; progressData: LearnerProgress[]; modules: ElearningModule[] }) {
  // Fetch certifications
  const { data: certifications } = useQuery<TraineeCertification[]>({
    queryKey: [`/api/trainees/${traineeId}/certifications`],
  });

  // Fetch badge awards for this trainee
  const { data: badgeAwards } = useQuery<BadgeAward[]>({
    queryKey: ["/api/badge-awards"],
  });

  // Fetch all digital badges for metadata
  const { data: badges } = useQuery<DigitalBadge[]>({
    queryKey: ["/api/digital-badges"],
  });

  // Fetch blocks for all modules to identify quiz blocks
  const { data: allBlocks } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", modules.map((m) => m.id).join(",")],
    queryFn: async () => {
      const results: ElearningBlock[] = [];
      for (const mod of modules) {
        const res = await fetch(`/api/elearning-blocks?moduleId=${mod.id}`, { credentials: "include" });
        if (res.ok) {
          const blocks = await res.json();
          results.push(...blocks);
        }
      }
      return results;
    },
    enabled: modules.length > 0,
  });

  // Build quiz score history from progress + quiz blocks
  const quizHistory = useMemo(() => {
    if (!allBlocks || !progressData) return [];
    const quizBlocks = allBlocks.filter((b) => b.type === "quiz");
    const quizBlockIds = new Set(quizBlocks.map((b) => b.id));
    return progressData
      .filter((p) => p.blockId && quizBlockIds.has(p.blockId) && p.completed && p.score !== null && p.score !== undefined)
      .map((p) => {
        const block = quizBlocks.find((b) => b.id === p.blockId);
        const mod = modules.find((m) => m.id === p.moduleId);
        return {
          ...p,
          blockTitle: block?.title || "Quiz",
          moduleTitle: mod?.title || "Module",
          passingScore: block?.quizConfig?.passingScore || 50,
        };
      })
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [allBlocks, progressData, modules]);

  const myBadgeAwards = useMemo(
    () => (badgeAwards || []).filter((ba) => ba.traineeId === traineeId && ba.status === "active"),
    [badgeAwards, traineeId]
  );

  const activeCerts = (certifications || []).filter((c) => c.status === "valid" || c.status === "active");
  const expiredCerts = (certifications || []).filter((c) => c.status !== "valid" && c.status !== "active");

  const levelColors: Record<string, string> = {
    bronze: "from-amber-600 to-amber-800",
    silver: "from-gray-400 to-gray-600",
    gold: "from-yellow-400 to-yellow-600",
    platinum: "from-indigo-400 to-purple-600",
  };

  const levelLabels: Record<string, string> = {
    bronze: "Bronze",
    silver: "Argent",
    gold: "Or",
    platinum: "Platine",
  };

  return (
    <div className="space-y-6">
      {/* Badges section */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Medal className="w-5 h-5 text-amber-500" />
          Mes Badges
          {myBadgeAwards.length > 0 && (
            <Badge variant="secondary" className="text-xs">{myBadgeAwards.length}</Badge>
          )}
        </h3>
        {myBadgeAwards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Medal className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Aucun badge obtenu</p>
              <p className="text-sm mt-1">Complétez vos formations pour obtenir des badges de réussite.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBadgeAwards.map((award) => {
              const badge = badges?.find((b) => b.id === award.badgeId);
              if (!badge) return null;
              const level = badge.level || "bronze";

              return (
                <Card key={award.id} className="overflow-hidden">
                  <div className={cn("h-2 bg-gradient-to-r", levelColors[level] || levelColors.bronze)} />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br text-white",
                        levelColors[level] || levelColors.bronze
                      )}>
                        {badge.imageUrl ? (
                          <img src={badge.imageUrl} alt={badge.title} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <Medal className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{badge.title}</p>
                        {badge.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{badge.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {levelLabels[level] || level}
                          </Badge>
                          {award.awardedAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(new Date(award.awardedAt).toISOString())}
                            </span>
                          )}
                        </div>
                        {award.sessionTitle && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Session : {award.sessionTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {badge.linkedinShareable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 text-xs gap-1.5"
                        onClick={() => {
                          if (award.linkedinShareUrl) {
                            window.open(award.linkedinShareUrl, "_blank");
                          }
                        }}
                        disabled={!award.linkedinShareUrl}
                      >
                        <Share2 className="w-3 h-3" />
                        Partager sur LinkedIn
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz score history */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Historique des Quiz
          {quizHistory.length > 0 && (
            <Badge variant="secondary" className="text-xs">{quizHistory.length}</Badge>
          )}
        </h3>
        {quizHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Aucun quiz complété</p>
              <p className="text-sm mt-1">Vos résultats de quiz apparaîtront ici après avoir complété des évaluations.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {quizHistory.map((q, i) => {
              const passed = (q.score || 0) >= q.passingScore;
              return (
                <Card key={`${q.id}-${i}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "p-2.5 rounded-full shrink-0",
                      passed ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
                    )}>
                      {passed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{q.blockTitle}</p>
                      <p className="text-xs text-muted-foreground">{q.moduleTitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-lg font-bold",
                        passed ? "text-green-600" : "text-red-500"
                      )}>
                        {q.score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Seuil : {q.passingScore}%
                      </p>
                    </div>
                    {q.completedAt && (
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {formatDate(new Date(q.completedAt).toISOString())}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Certifications section */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-500" />
          Mes Certifications
          {activeCerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeCerts.length}</Badge>
          )}
        </h3>
        {activeCerts.length === 0 && expiredCerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Aucune certification</p>
              <p className="text-sm mt-1">Vos certifications obtenues apparaîtront ici.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeCerts.map((cert) => (
              <Card key={cert.id} className="border-green-200 dark:border-green-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-green-100 dark:bg-green-900/20 shrink-0">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{cert.label}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {cert.type && <Badge variant="outline" className="text-xs">{cert.type}</Badge>}
                      <span>Obtenue le {formatDate(cert.obtainedAt)}</span>
                      {cert.expiresAt && (
                        <span className={cn(
                          new Date(cert.expiresAt) < new Date() ? "text-red-500" : "text-muted-foreground"
                        )}>
                          Expire le {formatDate(cert.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                    Valide
                  </Badge>
                  {cert.documentUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={cert.documentUrl} download>
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {expiredCerts.length > 0 && (
              <>
                <p className="text-sm font-medium text-muted-foreground mt-4">Certifications expirées</p>
                {expiredCerts.map((cert) => (
                  <Card key={cert.id} className="opacity-60">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Shield className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{cert.label}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Obtenue le {formatDate(cert.obtainedAt)}</span>
                          {cert.expiresAt && (
                            <span className="text-red-500">Expirée le {formatDate(cert.expiresAt)}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">Expirée</Badge>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// IMMERSIVE MODULE VIEWER
// ============================================================

function ImmersiveModuleViewer({
  initialModuleId,
  initialBlockIndex,
  modules,
  progressData,
  traineeId,
  onExit,
}: {
  initialModuleId: string;
  initialBlockIndex: number;
  modules: ElearningModule[];
  progressData: LearnerProgress[];
  traineeId: string;
  onExit: () => void;
}) {
  const { toast } = useToast();
  const [currentModuleId, setCurrentModuleId] = useState(initialModuleId);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(initialBlockIndex);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<"block" | "quiz" | "module">("block");
  const [showModuleComplete, setShowModuleComplete] = useState(false);

  const sortedModules = useMemo(
    () => modules.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [modules]
  );
  const currentModule = sortedModules.find((m) => m.id === currentModuleId);

  // Fetch blocks for the current module
  const { data: blocks } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${currentModuleId}`],
    enabled: !!currentModuleId,
  });

  // Fetch quiz questions for quiz blocks
  const { data: quizQuestions } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz-questions"],
  });

  // Fetch SCORM packages
  const { data: scormPackages } = useQuery<ScormPackage[]>({
    queryKey: ["/api/scorm-packages"],
  });

  const sortedBlocks = useMemo(
    () => blocks?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [blocks]
  );

  const currentBlock = sortedBlocks[currentBlockIndex];
  const hasNext = currentBlockIndex < sortedBlocks.length - 1;
  const hasPrevious = currentBlockIndex > 0;

  // Overall progress for the current module
  const moduleProgress = useMemo(() => {
    const relevant = progressData.filter((p) => p.moduleId === currentModuleId);
    const completed = relevant.filter((p) => p.completed).length;
    const total = sortedBlocks.length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [progressData, currentModuleId, sortedBlocks]);

  // Sequential locking
  const isBlockLocked = useCallback(
    (blockIndex: number) => {
      if (blockIndex === 0) return false;
      for (let i = 0; i < blockIndex; i++) {
        const prevBlock = sortedBlocks[i];
        const prevProgress = progressData.find((p) => p.blockId === prevBlock.id && p.moduleId === currentModuleId);
        if (!prevProgress?.completed) return true;
      }
      return false;
    },
    [sortedBlocks, progressData, currentModuleId]
  );

  const blockProgress = currentBlock
    ? progressData.find((p) => p.blockId === currentBlock.id && p.moduleId === currentModuleId)
    : undefined;
  const isCurrentCompleted = blockProgress?.completed ?? false;
  const isCurrentLocked = currentBlock ? isBlockLocked(currentBlockIndex) : false;

  // Reading timer for passive blocks
  const [readingTimeLeft, setReadingTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentBlock || isCurrentCompleted) {
      setReadingTimeLeft(0);
      return;
    }
    const passiveTypes = ["text", "document", "image", "resource_web", "virtual_class", "survey"];
    if (!passiveTypes.includes(currentBlock.type)) {
      setReadingTimeLeft(0);
      return;
    }
    const contentLength = (currentBlock.content || "").length + (currentBlock.title || "").length;
    const wordCount = Math.max(contentLength / 5, 50);
    const readingSeconds = Math.min(60, Math.max(10, Math.round((wordCount / 200) * 60)));
    setReadingTimeLeft(readingSeconds);

    const interval = setInterval(() => {
      setReadingTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = interval;
    return () => { clearInterval(interval); };
  }, [currentBlock?.id, isCurrentCompleted]);

  const canGoNext = isCurrentCompleted;

  // Mark block complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      // Check if this was the last block → module complete
      const completedCount = progressData.filter((p) => p.moduleId === currentModuleId && p.completed).length + 1;
      const isLastBlock = completedCount >= sortedBlocks.length;
      if (isLastBlock) {
        setCelebrationType("module");
        fireConfettiEpic();
        setShowCelebration(true);
        setTimeout(() => { setShowCelebration(false); setShowModuleComplete(true); }, 2000);
      } else {
        setCelebrationType("block");
        fireConfettiSmall();
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          if (hasNext) setCurrentBlockIndex((i) => i + 1);
        }, 1200);
      }
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight" && hasNext && canGoNext && !showCelebration && !showModuleComplete) goToNextBlock();
      if (e.key === "ArrowLeft" && hasPrevious && !showCelebration && !showModuleComplete) goToPreviousBlock();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit, hasNext, hasPrevious, canGoNext, showCelebration, showModuleComplete]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const goToNextBlock = () => {
    if (hasNext && canGoNext) setCurrentBlockIndex((i) => i + 1);
  };
  const goToPreviousBlock = () => {
    if (hasPrevious) setCurrentBlockIndex((i) => i - 1);
  };

  const handleMarkComplete = () => {
    if (!currentBlock) return;
    markCompleteMutation.mutate({
      traineeId,
      moduleId: currentModuleId,
      blockId: currentBlock.id,
      completed: true,
      score: null,
    });
  };

  // When QuizPlayer or other self-completing components finish, detect via progress data change
  const prevProgressRef = useRef(progressData);
  useEffect(() => {
    if (!currentBlock) return;
    const wasCompleted = prevProgressRef.current.find(
      (p) => p.blockId === currentBlock.id && p.moduleId === currentModuleId
    )?.completed;
    const nowCompleted = progressData.find(
      (p) => p.blockId === currentBlock.id && p.moduleId === currentModuleId
    )?.completed;
    if (!wasCompleted && nowCompleted) {
      const completedCount = progressData.filter((p) => p.moduleId === currentModuleId && p.completed).length;
      const isLastBlock = completedCount >= sortedBlocks.length;
      if (isLastBlock) {
        setCelebrationType("module");
        fireConfettiEpic();
        setShowCelebration(true);
        setTimeout(() => { setShowCelebration(false); setShowModuleComplete(true); }, 2000);
      } else {
        const isQuiz = currentBlock.type === "quiz" || currentBlock.type === "video_quiz";
        if (isQuiz) {
          setCelebrationType("quiz");
          fireConfettiMedium();
        } else {
          setCelebrationType("block");
          fireConfettiSmall();
        }
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          if (hasNext) setCurrentBlockIndex((i) => i + 1);
        }, 1500);
      }
    }
    prevProgressRef.current = progressData;
  }, [progressData, currentBlock, currentModuleId, hasNext, sortedBlocks]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in duration-200">
      {/* TOP BAR */}
      <div className="h-14 border-b flex items-center px-4 gap-4 shrink-0 bg-background">
        <Button variant="ghost" size="sm" onClick={onExit} className="gap-2 shrink-0">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Retour</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{currentModule?.title}</p>
            {(() => {
              const pt = (currentModule as any)?.pathType;
              if (pt === "learning") return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px] px-1.5 py-0 shrink-0">Apprentissage</Badge>;
              if (pt === "assessment") return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-[10px] px-1.5 py-0 shrink-0">Évaluation</Badge>;
              return null;
            })()}
          </div>
          <p className="text-xs text-muted-foreground">
            Bloc {currentBlockIndex + 1} / {sortedBlocks.length}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Progress value={moduleProgress.percent} className="w-24 sm:w-32 h-2" />
          <span className="text-xs font-medium tabular-nums">{moduleProgress.percent}%</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onExit} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR */}
        <div
          className={cn(
            "border-r bg-muted/30 shrink-0 flex flex-col transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Contenu du module
              </p>
              {sortedBlocks.map((block, idx) => {
                const bp = progressData.find((p) => p.blockId === block.id && p.moduleId === currentModuleId);
                const isActive = idx === currentBlockIndex;
                const isComplete = bp?.completed;
                const locked = isBlockLocked(idx);

                return (
                  <button
                    key={block.id}
                    onClick={() => !locked && setCurrentBlockIndex(idx)}
                    disabled={locked}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors",
                      isActive && "bg-primary/10 text-primary font-medium",
                      !isActive && !locked && "hover:bg-accent/50",
                      locked && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : locked ? (
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <BlockTypeIcon type={block.type} />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{block.title}</span>
                      {block.duration && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          ~{block.duration} min
                        </span>
                      )}
                    </div>
                    {isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Module switcher — grouped by pathType */}
          {sortedModules.length > 1 && (
            <div className="border-t p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Modules</p>
              {(() => {
                const learningMods = sortedModules.filter((m) => (m as any).pathType === "learning");
                const assessmentMods = sortedModules.filter((m) => (m as any).pathType === "assessment");
                const combinedMods = sortedModules.filter((m) => !(m as any).pathType || (m as any).pathType === "combined");
                const hasMultiple = [learningMods.length > 0, assessmentMods.length > 0, combinedMods.length > 0].filter(Boolean).length > 1;

                const renderGroup = (mods: typeof sortedModules, label: string, color: string) => (
                  <div key={label}>
                    {hasMultiple && <p className={`text-[10px] font-semibold mt-1 mb-0.5 ${color}`}>{label}</p>}
                    {mods.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setCurrentModuleId(m.id); setCurrentBlockIndex(0); }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors",
                          m.id === currentModuleId ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent/50 text-muted-foreground"
                        )}
                      >
                        <span className="truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                );

                return (
                  <>
                    {learningMods.length > 0 && renderGroup(learningMods, "Apprentissage", "text-green-600")}
                    {assessmentMods.length > 0 && renderGroup(assessmentMods, "Évaluation", "text-orange-600")}
                    {combinedMods.length > 0 && renderGroup(combinedMods, "Combiné", "text-blue-600")}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto">
          {!currentBlock ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Sélectionnez un bloc pour commencer</p>
              </div>
            </div>
          ) : isCurrentLocked ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Bloc verrouillé</p>
                <p className="text-sm mt-1">Terminez le bloc précédent pour débloquer celui-ci.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8">
              {/* Block header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <BlockTypeIcon type={currentBlock.type} />
                  <BlockTypeLabel type={currentBlock.type} />
                  {currentBlock.duration && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{currentBlock.duration} min
                    </span>
                  )}
                  {isCurrentCompleted && (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Terminé
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold">{currentBlock.title}</h2>
              </div>

              {/* Block content */}
              <div className="space-y-6">
                {/* TEXT */}
                {currentBlock.type === "text" && (
                  <div className="space-y-4">
                    {currentBlock.content && (
                      currentBlock.content.includes("<") ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: currentBlock.content }}
                        />
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-base leading-relaxed">
                          {currentBlock.content}
                        </div>
                      )
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps de lecture restant : <strong>{readingTimeLeft}s</strong></span>
                          <Progress value={Math.max(0, 100 - (readingTimeLeft / 60) * 100)} className="flex-1 h-2 max-w-[200px]" />
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme lu
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* VIDEO */}
                {currentBlock.type === "video" && (
                  <VideoBlockPlayer
                    block={currentBlock}
                    isCompleted={isCurrentCompleted}
                    onMarkComplete={handleMarkComplete}
                    isPending={markCompleteMutation.isPending}
                  />
                )}

                {/* QUIZ */}
                {currentBlock.type === "quiz" && (
                  <QuizPlayer
                    blockId={currentBlock.id}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                    quizConfig={(currentBlock.quizConfig as any) || undefined}
                  />
                )}

                {/* VIDEO + QUIZ */}
                {currentBlock.type === "video_quiz" && (
                  <VideoQuizPlayer
                    block={currentBlock}
                    blockId={currentBlock.id}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* SCORM */}
                {currentBlock.type === "scorm" && currentBlock.scormPackageId && (
                  <ScormPlayer
                    block={currentBlock}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* ASSIGNMENT */}
                {currentBlock.type === "assignment" && (
                  <AssignmentSubmitter
                    block={currentBlock}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* FLASHCARD */}
                {currentBlock.type === "flashcard" && (
                  <FlashcardPlayer
                    block={currentBlock}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    isCompleted={isCurrentCompleted}
                    onMarkComplete={handleMarkComplete}
                    isPending={markCompleteMutation.isPending}
                  />
                )}

                {/* RESOURCE WEB / IFRAME */}
                {currentBlock.type === "resource_web" && (
                  <div className="space-y-4">
                    {currentBlock.embedCode ? (
                      <div
                        className="rounded-xl overflow-hidden border"
                        dangerouslySetInnerHTML={{ __html: currentBlock.embedCode }}
                      />
                    ) : currentBlock.embedUrl ? (
                      <div className="aspect-video rounded-xl overflow-hidden border">
                        <iframe
                          src={currentBlock.embedUrl}
                          className="w-full h-full"
                          allowFullScreen
                          title={currentBlock.title}
                        />
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune ressource disponible.</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                          <Progress value={Math.max(0, 100 - (readingTimeLeft / 60) * 100)} className="flex-1 h-2 max-w-[200px]" />
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme terminé
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* VIRTUAL CLASS */}
                {currentBlock.type === "virtual_class" && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                            <MonitorPlay className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">Classe virtuelle</p>
                            {currentBlock.virtualClassDate && (
                              <p className="text-sm text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatDate(currentBlock.virtualClassDate)}
                              </p>
                            )}
                          </div>
                        </div>
                        {currentBlock.virtualClassUrl && (
                          <Button asChild className="mt-4 w-full">
                            <a href={currentBlock.virtualClassUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="w-4 h-4 mr-2" />
                              Rejoindre la classe
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* DOCUMENT */}
                {currentBlock.type === "document" && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-900/20">
                          <Download className="w-6 h-6 text-sky-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{currentBlock.fileName || "Document"}</p>
                          {currentBlock.fileSize && (
                            <p className="text-xs text-muted-foreground">
                              {(currentBlock.fileSize / 1024).toFixed(0)} Ko
                            </p>
                          )}
                        </div>
                        {currentBlock.fileUrl && (
                          <Button asChild variant="outline">
                            <a href={currentBlock.fileUrl} download>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    {currentBlock.content && (
                      <p className="text-muted-foreground whitespace-pre-wrap">{currentBlock.content}</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                          <Progress value={Math.max(0, 100 - (readingTimeLeft / 60) * 100)} className="flex-1 h-2 max-w-[200px]" />
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme consulté
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* IMAGE / GALLERY */}
                {currentBlock.type === "image" && (
                  <div className="space-y-4">
                    {currentBlock.imageUrls && currentBlock.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentBlock.imageUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`${currentBlock.title} - ${idx + 1}`}
                            className="w-full rounded-xl border object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune image disponible.</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                          <Progress value={Math.max(0, 100 - (readingTimeLeft / 60) * 100)} className="flex-1 h-2 max-w-[200px]" />
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme vu
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* SURVEY */}
                {currentBlock.type === "survey" && (
                  <div className="space-y-4">
                    {currentBlock.content && (
                      <p className="text-muted-foreground mb-4">{currentBlock.content}</p>
                    )}
                    <QuizPlayer
                      blockId={currentBlock.id}
                      traineeId={traineeId}
                      moduleId={currentModuleId}
                      existingProgress={blockProgress || undefined}
                      quizConfig={(currentBlock.quizConfig as any) || undefined}
                      isSurvey
                    />
                  </div>
                )}

                {/* SCENARIO */}
                {currentBlock.type === "scenario" && (
                  <ScenarioPlayer
                    block={currentBlock}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* SIMULATION */}
                {currentBlock.type === "simulation" && (
                  <SimulationPlayer
                    block={currentBlock}
                    traineeId={traineeId}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}
              </div>

              {/* NAVIGATION FOOTER */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPreviousBlock}
                    disabled={!hasPrevious}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                  </Button>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">←</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] ml-1">→</kbd>
                  </span>
                </div>
                {hasNext ? (
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={goToNextBlock} disabled={!canGoNext} className="gap-2">
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    {!canGoNext && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Complétez ce bloc pour continuer
                      </span>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" onClick={onExit} className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Terminer
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CELEBRATION OVERLAY — proportional to achievement */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-center space-y-3"
              >
                {celebrationType === "module" ? (
                  <>
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 to-yellow-400 dark:from-amber-800 dark:to-yellow-600 flex items-center justify-center shadow-lg"
                    >
                      <Star className="w-12 h-12 text-amber-700 dark:text-amber-200" />
                    </motion.div>
                    <p className="text-2xl font-bold">Module terminé !</p>
                    <p className="text-sm text-muted-foreground">Félicitations, continuez comme ça !</p>
                  </>
                ) : celebrationType === "quiz" ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-200 to-emerald-400 dark:from-green-800 dark:to-emerald-600 flex items-center justify-center"
                    >
                      <Zap className="w-10 h-10 text-green-700 dark:text-green-200" />
                    </motion.div>
                    <p className="text-xl font-bold">Quiz réussi !</p>
                    <p className="text-sm text-muted-foreground">Excellent travail</p>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.3 }}
                      className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
                    >
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </motion.div>
                    <p className="text-lg font-bold">Bravo !</p>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODULE COMPLETE SCREEN */}
        <AnimatePresence>
          {showModuleComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background z-20"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="text-center space-y-6 max-w-md mx-auto px-6"
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                  className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-amber-200 via-yellow-300 to-orange-300 dark:from-amber-700 dark:via-yellow-600 dark:to-orange-600 flex items-center justify-center shadow-xl"
                >
                  <Trophy className="w-14 h-14 text-amber-700 dark:text-amber-200" />
                </motion.div>

                <div>
                  <h2 className="text-3xl font-bold mb-2">Module terminé !</h2>
                  <p className="text-muted-foreground">
                    Vous avez complété <span className="font-semibold text-foreground">{currentModule?.title}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{moduleProgress.completed}</p>
                      <p className="text-xs text-muted-foreground">blocs complétés</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">100%</p>
                      <p className="text-xs text-muted-foreground">progression</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quiz scores summary */}
                {(() => {
                  const quizScores = progressData.filter(
                    (p) => p.moduleId === currentModuleId && p.score !== null && p.score !== undefined
                  );
                  if (quizScores.length === 0) return null;
                  const avg = Math.round(quizScores.reduce((s, p) => s + (p.score || 0), 0) / quizScores.length);
                  return (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Target className="w-5 h-5 mx-auto text-primary mb-1" />
                        <p className="text-2xl font-bold">{avg}%</p>
                        <p className="text-xs text-muted-foreground">score moyen aux quiz</p>
                      </CardContent>
                    </Card>
                  );
                })()}

                <div className="flex flex-col gap-2 pt-2">
                  {sortedModules.length > 1 && (() => {
                    const currentIdx = sortedModules.findIndex((m) => m.id === currentModuleId);
                    const nextModule = sortedModules[currentIdx + 1];
                    if (!nextModule) return null;
                    return (
                      <Button
                        onClick={() => {
                          setCurrentModuleId(nextModule.id);
                          setCurrentBlockIndex(0);
                          setShowModuleComplete(false);
                        }}
                        className="gap-2"
                      >
                        Module suivant : {nextModule.title}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    );
                  })()}
                  <Button variant="outline" onClick={onExit} className="gap-2">
                    Retour au tableau de bord
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function LearnerPortal() {
  const { user } = useAuth();

  // Use traineeId directly from the authenticated user
  const traineeId = user?.traineeId;

  // Fetch only validated enrollments for the current learner (server-side filtered)
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<
    Enrollment[]
  >({
    queryKey: ["/api/learner/my-enrollments"],
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

  // Enrollments are already filtered server-side by traineeId and validated status
  const myEnrollments = enrollments || [];

  // Fetch pending signatures for badge count
  const { data: pendingSignatures } = useQuery<any[]>({
    queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`],
    enabled: !!traineeId,
  });

  // Fetch evaluation assignments for badge count
  const { data: evalAssignments } = useQuery<any[]>({
    queryKey: [`/api/evaluation-assignments?traineeId=${traineeId}`],
    enabled: !!traineeId,
  });

  // Stats
  const completedSessions = myEnrollments.filter(
    (e) => e.status === "completed"
  ).length;
  const activeSessions = myEnrollments.filter(
    (e) => e.status !== "completed" && e.status !== "cancelled"
  ).length;

  // Global progress across all modules
  const globalProgress = useMemo(() => {
    if (!modules || !progressData || !sessions || myEnrollments.length === 0) return 0;
    const enrolledSessionIds = new Set(myEnrollments.map((e) => e.sessionId));
    const enrolledSessions = sessions.filter((s) => enrolledSessionIds.has(s.id));
    const relevantModules = (modules || []).filter((m) =>
      (m as any).status === "published" &&
      enrolledSessions.some(
        (s) => m.sessionId === s.id || (m.programId === s.programId && !m.sessionId)
      )
    );
    if (relevantModules.length === 0) return 0;
    const moduleIds = new Set(relevantModules.map((m) => m.id));
    const relevant = progressData.filter((p) => moduleIds.has(p.moduleId));
    if (relevant.length === 0) return 0;
    const completed = relevant.filter((p) => p.completed).length;
    return Math.round((completed / relevant.length) * 100);
  }, [modules, progressData, sessions, myEnrollments]);

  // Pending actions counts
  const pendingSignatureCount = pendingSignatures?.filter((ps: any) => !ps.signedAt)?.length || 0;
  const pendingEvalCount = evalAssignments?.filter((ea: any) => !ea.completedAt)?.length || 0;

  // Next upcoming session
  const nextSession = useMemo(() => {
    if (!sessions || myEnrollments.length === 0) return null;
    const now = new Date();
    const enrolledSessionIds = new Set(myEnrollments.map((e) => e.sessionId));
    return sessions
      .filter((s) => enrolledSessionIds.has(s.id) && new Date(s.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
  }, [sessions, myEnrollments]);

  // All upcoming/ongoing sessions for quick access
  const upcomingSessions = useMemo(() => {
    if (!sessions || myEnrollments.length === 0) return [];
    const now = new Date();
    const enrolledSessionIds = new Set(myEnrollments.map((e) => e.sessionId));
    return sessions
      .filter((s) => enrolledSessionIds.has(s.id) && new Date(s.endDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [sessions, myEnrollments]);

  const [activeTab, setActiveTab] = useState("formations");

  const isLoading = enrollmentsLoading;

  // Learner stats (XP, streak)
  const { data: learnerStats } = useQuery<{
    quizAvg: number | null;
    blocksCompleted: number;
    totalMinutes: number;
    streak: number;
  }>({
    queryKey: ["/api/learner/my-stats"],
  });

  // XP calculation: 10 XP per block completed + bonus for quiz scores
  const totalXP = useMemo(() => {
    if (!progressData) return 0;
    let xp = 0;
    for (const p of progressData) {
      if (p.completed) {
        xp += 10; // base XP per block
        if (p.score !== null && p.score !== undefined) {
          xp += Math.round(p.score / 10); // bonus for quiz score
        }
      }
    }
    return xp;
  }, [progressData]);

  // Immersive mode state
  const [immersiveState, setImmersiveState] = useState<{
    enrollmentId: string;
    sessionId: string;
    moduleId: string;
    blockIndex: number;
  } | null>(null);

  const enterImmersiveMode = useCallback(
    (enrollmentId: string, sessionId: string, moduleId: string, blockIndex?: number) => {
      setImmersiveState({ enrollmentId, sessionId, moduleId, blockIndex: blockIndex ?? 0 });
    },
    []
  );

  const exitImmersiveMode = useCallback(() => {
    setImmersiveState(null);
  }, []);

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
    <>
    <PageLayout>
      {/* Personalized welcome */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo-sosafe.png" alt="SO'SAFE" className="h-10 object-contain dark:hidden" />
          <img src="/logo-sosafe-white.png" alt="SO'SAFE" className="h-10 object-contain hidden dark:block" />
          <div>
            <h1 className="text-2xl font-bold">
              Bonjour {user.firstName} {user.lastName} !
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeSessions > 0
                ? `Vous avez ${activeSessions} formation${activeSessions > 1 ? "s" : ""} en cours`
                : completedSessions > 0
                ? "Toutes vos formations sont terminées"
                : "Bienvenue sur votre espace de formation"}
            </p>
          </div>
        </div>
        {globalProgress > 0 && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progression globale</p>
              <p className="text-lg font-bold">{globalProgress}%</p>
            </div>
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted/30" />
                <circle
                  cx="28" cy="28" r="24"
                  stroke="currentColor" strokeWidth="4" fill="none"
                  className="text-primary"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - globalProgress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myEnrollments.length}</p>
              <p className="text-xs text-muted-foreground">Formations</p>
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
              <p className="text-xs text-muted-foreground">En cours</p>
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
              <p className="text-xs text-muted-foreground">Terminées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{globalProgress}%</p>
              <p className="text-xs text-muted-foreground">Progression</p>
            </div>
          </CardContent>
        </Card>
        {/* XP */}
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{totalXP}</p>
              <p className="text-xs text-muted-foreground">XP gagnés</p>
            </div>
          </CardContent>
        </Card>
        {/* Streak */}
        <Card className={learnerStats?.streak && learnerStats.streak > 0 ? "border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/10 dark:to-red-900/10" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${learnerStats?.streak && learnerStats.streak > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-gray-50 dark:bg-gray-900/20"}`}>
              <Flame className={`w-5 h-5 ${learnerStats?.streak && learnerStats.streak > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${learnerStats?.streak && learnerStats.streak > 0 ? "text-orange-700 dark:text-orange-400" : ""}`}>
                {learnerStats?.streak || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                jour{(learnerStats?.streak || 0) > 1 ? "s" : ""} d'affilée
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mes Sessions — prominent section */}
      {upcomingSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Mes sessions
            </h2>
            {upcomingSessions.length > 3 && (
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("sessions")} className="text-xs gap-1">
                Tout voir
                <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingSessions.slice(0, 3).map((session) => {
              const enrollment = myEnrollments.find((e) => e.sessionId === session.id);
              const program = programs?.find((p) => p.id === session.programId);
              const start = new Date(session.startDate);
              const end = new Date(session.endDate);
              const now = new Date();
              const isOngoing = start <= now && end >= now;
              const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <Card
                  key={session.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
                    isOngoing && "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10"
                  )}
                  onClick={() => setActiveTab("sessions")}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Status bar */}
                    <div className="flex items-center gap-2">
                      {isOngoing ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          En cours
                        </Badge>
                      ) : daysUntil <= 7 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-xs">
                          Dans {daysUntil} jour{daysUntil > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {formatDate(session.startDate)}
                        </Badge>
                      )}
                      {enrollment && (
                        <EnrollmentStatusBadge status={enrollment.status} />
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      {program && (
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {program.title}
                        </p>
                      )}
                      <p className="font-semibold text-sm mt-0.5 line-clamp-2">{session.title}</p>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.startDate)}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {session.location}
                        </span>
                      )}
                      {session.modality && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {session.modality === "presentiel" ? "Présentiel" : session.modality === "distanciel" ? "Distanciel" : session.modality === "elearning" ? "E-learning" : session.modality}
                        </span>
                      )}
                    </div>

                    {/* Virtual class quick access */}
                    {isOngoing && session.virtualClassUrl && (
                      <Button
                        size="sm"
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(session.virtualClassUrl!, "_blank");
                        }}
                      >
                        <Video className="w-4 h-4" />
                        Rejoindre la classe virtuelle
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pending actions banner */}
          {(pendingSignatureCount > 0 || pendingEvalCount > 0) && (
            <div className="flex items-center gap-3 flex-wrap">
              {pendingSignatureCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("signature")}
                  className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 gap-2"
                >
                  <PenTool className="w-4 h-4" />
                  {pendingSignatureCount} signature{pendingSignatureCount > 1 ? "s" : ""} en attente
                </Button>
              )}
              {pendingEvalCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("evaluations")}
                  className="text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  {pendingEvalCount} évaluation{pendingEvalCount > 1 ? "s" : ""} en attente
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs for Formations, Signature, Documents, Evaluations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="formations" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Formations
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2 relative">
              <Calendar className="w-4 h-4" />
              Sessions
              {upcomingSessions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {upcomingSessions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2 relative">
              <PenTool className="w-4 h-4" />
              Signature
              {pendingSignatureCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingSignatureCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2 relative">
              <ClipboardList className="w-4 h-4" />
              Évaluations
              {pendingEvalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingEvalCount}
                </span>
              )}
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
            <TabsTrigger value="badges" className="gap-2">
              <Medal className="w-4 h-4" />
              Badges
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
                      onEnterImmersive={(moduleId, blockIndex) =>
                        enterImmersiveMode(enrollment.id, session.id, moduleId, blockIndex)
                      }
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions">
            <LearnerSessionsTab traineeId={traineeId!} />
          </TabsContent>

          <TabsContent value="signature">
            <LearnerSignatureTab
              traineeId={traineeId || ""}
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="documents">
            <LearnerDocumentsTab
              traineeId={traineeId || ""}
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>

          <TabsContent value="evaluations">
            <LearnerEvaluationsTab traineeId={traineeId || ""} />
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

          <TabsContent value="badges">
            {traineeId && (
              <LearnerBadgesTab
                traineeId={traineeId}
                progressData={progressData || []}
                modules={modules || []}
              />
            )}
          </TabsContent>

          <TabsContent value="about">
            <LearnerAboutTab
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          </TabsContent>
        </Tabs>
    </PageLayout>

    {/* Immersive module viewer portal */}
    {immersiveState && (() => {
      const enrollment = myEnrollments.find((e) => e.id === immersiveState.enrollmentId);
      const session = sessions?.find((s) => s.id === immersiveState.sessionId);
      if (!enrollment || !session) return null;
      if (!["confirmed", "attended", "completed"].includes(enrollment.status)) return null;
      const sessionModules = (modules || []).filter(
        (m) =>
          (m as any).status === "published" &&
          (m.sessionId === session.id ||
            (m.programId === session.programId && !m.sessionId))
      );
      return createPortal(
        <ImmersiveModuleViewer
          initialModuleId={immersiveState.moduleId}
          initialBlockIndex={immersiveState.blockIndex}
          modules={sessionModules}
          progressData={progressData || []}
          traineeId={traineeId!}
          onExit={exitImmersiveMode}
        />,
        document.body
      );
    })()}
    </>
  );
}
