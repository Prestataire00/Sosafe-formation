import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  HelpCircle,
  Loader2,
  Timer,
  Trophy,
  ThumbsUp,
  Smile,
} from "lucide-react";
import { KAHOOT_COLORS } from "../helpers";
import type { QuizQuestion, LearnerProgress } from "@shared/schema";

export function QuizPlayer({
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
      toast({ title: "Quiz soumis avec succès !" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  const sortedQuestions = useMemo(
    () => questions?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [questions]
  );

  useEffect(() => {
    if (!oneAtATime || !timerSec || submitted || showFeedback) return;
    setTimeLeft(timerSec);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
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

    setTimeout(() => {
      setShowFeedback(false);
      if (currentIndex < sortedQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
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

  if (submitted) {
    if (isSurvey) {
      return (
        <div className="text-center p-6 rounded-xl border-2 bg-violet-50 border-violet-300 dark:bg-violet-900/20 dark:border-violet-700">
          <CheckCircle className="w-12 h-12 mx-auto text-violet-500 mb-2" />
          <p className="text-lg font-bold mb-1">Merci pour vos réponses !</p>
          <p className="text-sm text-muted-foreground">
            Votre sondage a été enregistré avec succès.
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
              ? "Félicitations, vous avez réussi ce quiz !"
              : `Vous n'avez pas atteint le seuil de ${passingScore}%. Courage !`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {Object.values(questionResults).filter(Boolean).length}/{sortedQuestions.length} réponses correctes
          </p>
        </div>
        {config.allowRetry && (
          <Button variant="outline" onClick={handleRetry} className="w-full">
            Réessayer le quiz
          </Button>
        )}
      </div>
    );
  }

  if (oneAtATime) {
    const q = sortedQuestions[currentIndex];
    const options = (q.options as string[]) || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Question {currentIndex + 1}/{sortedQuestions.length}
          </span>
          <Progress value={((currentIndex) / sortedQuestions.length) * 100} className="flex-1 h-2" />
        </div>

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

        <div className="text-center py-4">
          <p className="text-lg font-semibold">{q.question}</p>
          <Badge variant="secondary" className="text-xs mt-2">
            {q.type === "vrai_faux" ? "Vrai/Faux" : "QCM"}
          </Badge>
        </div>

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
