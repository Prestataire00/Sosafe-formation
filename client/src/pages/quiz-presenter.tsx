import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  SkipForward,
  Trophy,
  Users,
  Timer,
  Copy,
  BarChart3,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  StopCircle,
} from "lucide-react";
import { useParams } from "wouter";
import { Progress } from "@/components/ui/progress";

// ============================================================
// Types
// ============================================================

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  order: number;
}

interface Participant {
  id: string;
  pseudo: string;
  score: number;
}

interface QuizSessionData {
  id: string;
  status: string;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  quizTitle: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  participants: Participant[];
  quiz?: { title: string; description: string };
}

// Color palette for options
const OPTION_COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
  "bg-purple-500 hover:bg-purple-600",
  "bg-orange-500 hover:bg-orange-600",
];

const OPTION_ICONS = ["triangle", "diamond", "circle", "square", "star", "hexagon"];

// ============================================================
// Waiting Screen
// ============================================================

function WaitingScreen({ session, onStart }: { session: QuizSessionData; onStart: () => void }) {
  const { toast } = useToast();

  const copyCode = () => {
    const qs = session as any;
    const code = qs.code || (qs as any).code;
    navigator.clipboard.writeText(code || "");
    toast({ title: "Code copie !" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black mb-2">Quiz en direct</h1>
        <p className="text-xl text-purple-200">{session.quizTitle || session.quiz?.title}</p>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center mb-8">
        <p className="text-lg text-purple-200 mb-2">Rejoignez avec le code :</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-6xl font-black tracking-[0.3em] font-mono">
            {(session as any).code}
          </span>
          <Button variant="ghost" size="sm" onClick={copyCode} className="text-white hover:bg-white/20">
            <Copy className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-sm text-purple-300 mt-3">
          ou allez sur <span className="font-semibold">{window.location.origin}/quiz/join</span>
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-8 min-w-[300px]">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5" />
          <span className="font-semibold">{session.participants.length} participant(s)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.participants.map((p) => (
            <Badge key={p.id} className="bg-white/20 text-white text-sm py-1 px-3">
              {p.pseudo}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="bg-green-500 hover:bg-green-600 text-white text-xl px-10 py-6 rounded-full shadow-lg"
        onClick={onStart}
        disabled={session.participants.length === 0}
      >
        <Play className="w-6 h-6 mr-3" /> Commencer !
      </Button>
    </div>
  );
}

// ============================================================
// Question Screen (Presenter)
// ============================================================

function QuestionScreen({
  session,
  question,
  questionIndex,
  totalQuestions,
  onShowResults,
  answers,
}: {
  session: QuizSessionData;
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  onShowResults: () => void;
  answers: any[];
}) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit);
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    setTimeLeft(question.timeLimit);
    setTimerDone(false);
  }, [question.id, question.timeLimit]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setTimerDone(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const answeredCount = answers.length;
  const totalParticipants = session.participants.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Badge className="bg-white/20 text-white text-sm">
          Question {questionIndex + 1} / {totalQuestions}
        </Badge>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{answeredCount} / {totalParticipants}</span>
          </div>
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${timeLeft <= 5 ? "bg-red-500/80 animate-pulse" : "bg-white/10"}`}>
            <Timer className="w-4 h-4" />
            <span className="text-lg font-bold font-mono">{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={(timeLeft / question.timeLimit) * 100} className="h-2 mb-6" />

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 max-w-4xl leading-tight">
          {question.question}
        </h2>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
          {question.options.map((opt, idx) => (
            <div
              key={idx}
              className={`${OPTION_COLORS[idx]} rounded-xl p-6 text-center text-white text-xl font-semibold shadow-lg transition-transform`}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>

      {/* Show results button */}
      {(timerDone || answeredCount >= totalParticipants) && (
        <div className="flex justify-center mt-6">
          <Button
            size="lg"
            className="bg-white text-purple-900 hover:bg-purple-100 text-lg px-8 py-5 rounded-full shadow-lg"
            onClick={onShowResults}
          >
            <BarChart3 className="w-5 h-5 mr-2" /> Voir les resultats
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Results Screen
// ============================================================

function ResultsScreen({
  question,
  questionIndex,
  totalQuestions,
  answers,
  participants,
  onNext,
  isLastQuestion,
}: {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  answers: any[];
  participants: Participant[];
  onNext: () => void;
  isLastQuestion: boolean;
}) {
  // Count answers per option
  const answerCounts = question.options.map((_, idx) =>
    answers.filter((a) => a.answer === idx).length
  );
  const maxCount = Math.max(...answerCounts, 1);
  const correctCount = answers.filter((a) => a.isCorrect).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <Badge className="bg-white/20 text-white text-sm">
          Resultats — Question {questionIndex + 1} / {totalQuestions}
        </Badge>
        <Badge className="bg-green-500/80 text-white text-sm">
          {correctCount} / {answers.length} correct(s)
        </Badge>
      </div>

      <h2 className="text-2xl font-bold text-center mb-8">{question.question}</h2>

      {/* Bar chart of answers */}
      <div className="flex-1 flex items-end justify-center gap-4 max-w-4xl mx-auto w-full mb-8">
        {question.options.map((opt, idx) => {
          const count = answerCounts[idx];
          const isCorrect = idx === question.correctAnswer;
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col items-center" style={{ height: "300px", justifyContent: "flex-end" }}>
                <span className="text-2xl font-bold mb-2">{count}</span>
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ${isCorrect ? "bg-green-500" : OPTION_COLORS[idx].split(" ")[0]}`}
                  style={{ height: `${Math.max(height, 5)}%`, minHeight: "20px" }}
                />
              </div>
              <div className={`w-full p-3 rounded-b-lg text-center ${isCorrect ? "bg-green-500" : OPTION_COLORS[idx].split(" ")[0]}`}>
                <div className="flex items-center justify-center gap-1">
                  {isCorrect && <CheckCircle className="w-4 h-4" />}
                  <span className="text-sm font-semibold truncate">{opt}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top 5 leaderboard */}
      <div className="max-w-md mx-auto w-full mb-6">
        <h3 className="text-lg font-bold text-center mb-3">Classement</h3>
        {participants.slice(0, 5).map((p, idx) => (
          <div key={p.id} className="flex items-center gap-3 bg-white/10 rounded-lg p-3 mb-2">
            <span className="text-2xl font-bold w-8">
              {idx === 0 ? <Crown className="w-6 h-6 text-yellow-400" /> : `${idx + 1}`}
            </span>
            <span className="flex-1 font-semibold">{p.pseudo}</span>
            <span className="font-mono font-bold">{p.score} pts</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="bg-white text-purple-900 hover:bg-purple-100 text-lg px-8 py-5 rounded-full shadow-lg"
          onClick={onNext}
        >
          {isLastQuestion ? (
            <><Trophy className="w-5 h-5 mr-2" /> Voir le podium</>
          ) : (
            <><SkipForward className="w-5 h-5 mr-2" /> Question suivante</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Final Podium
// ============================================================

function PodiumScreen({ participants, quizTitle }: { participants: Participant[]; quizTitle: string }) {
  const top3 = participants.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600 flex flex-col items-center justify-center text-white p-6">
      <Trophy className="w-16 h-16 text-yellow-300 mb-4 animate-bounce" />
      <h1 className="text-4xl font-black mb-2">Classement final</h1>
      <p className="text-xl text-yellow-200 mb-10">{quizTitle}</p>

      <div className="flex items-end gap-6 mb-10">
        {/* 2nd place */}
        {top3.length >= 2 && (
          <div className="flex flex-col items-center">
            <span className="text-6xl mb-2">🥈</span>
            <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center min-w-[140px]">
              <p className="text-xl font-bold">{top3[1].pseudo}</p>
              <p className="text-2xl font-black mt-1">{top3[1].score}</p>
              <p className="text-xs text-yellow-200">points</p>
            </div>
          </div>
        )}
        {/* 1st place */}
        {top3.length >= 1 && (
          <div className="flex flex-col items-center -mt-8">
            <span className="text-8xl mb-2">🥇</span>
            <div className="bg-yellow-400/30 backdrop-blur border-2 border-yellow-300 rounded-xl p-8 text-center min-w-[160px]">
              <p className="text-2xl font-bold">{top3[0].pseudo}</p>
              <p className="text-4xl font-black mt-1">{top3[0].score}</p>
              <p className="text-sm text-yellow-200">points</p>
            </div>
          </div>
        )}
        {/* 3rd place */}
        {top3.length >= 3 && (
          <div className="flex flex-col items-center">
            <span className="text-6xl mb-2">🥉</span>
            <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center min-w-[140px]">
              <p className="text-xl font-bold">{top3[2].pseudo}</p>
              <p className="text-2xl font-black mt-1">{top3[2].score}</p>
              <p className="text-xs text-yellow-200">points</p>
            </div>
          </div>
        )}
      </div>

      {/* Full leaderboard */}
      {participants.length > 3 && (
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 w-full max-w-md">
          {participants.slice(3).map((p, idx) => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
              <span className="text-lg font-bold w-8 text-center">{idx + 4}</span>
              <span className="flex-1">{p.pseudo}</span>
              <span className="font-mono font-bold">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Presenter Component
// ============================================================

export default function QuizPresenter() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Poll session data every 2 seconds
  const { data: session } = useQuery<QuizSessionData>({
    queryKey: ["/api/quiz-sessions", id, "presenter"],
    queryFn: async () => {
      const resp = await fetch(`/api/quiz-sessions/${id}`, { credentials: "include" });
      return resp.json();
    },
    refetchInterval: 2000,
    enabled: !!id,
  });

  // Get answers for current question
  const currentQuestion = session?.questions?.[session?.currentQuestionIndex ?? -1];
  const { data: answers } = useQuery<any[]>({
    queryKey: ["/api/quiz-sessions", id, "answers", currentQuestion?.id],
    queryFn: async () => {
      const resp = await fetch(`/api/quiz-sessions/${id}/answers?questionId=${currentQuestion?.id}`, { credentials: "include" });
      return resp.json();
    },
    refetchInterval: 1500,
    enabled: !!id && !!currentQuestion?.id,
  });

  const nextMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/quiz-sessions/${id}/next`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/quiz-sessions", id] }),
  });

  const showResultsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/quiz-sessions/${id}/show-results`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/quiz-sessions", id] }),
  });

  const finishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/quiz-sessions/${id}/finish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/quiz-sessions", id] }),
  });

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  // Waiting
  if (session.status === "waiting") {
    return <WaitingScreen session={session} onStart={() => nextMutation.mutate()} />;
  }

  // Finished
  if (session.status === "finished") {
    return <PodiumScreen participants={session.participants} quizTitle={session.quizTitle || session.quiz?.title || ""} />;
  }

  // Active question
  if (session.status === "active" && currentQuestion) {
    return (
      <QuestionScreen
        session={session}
        question={currentQuestion}
        questionIndex={session.currentQuestionIndex}
        totalQuestions={session.totalQuestions || session.questions.length}
        onShowResults={() => showResultsMutation.mutate()}
        answers={answers || []}
      />
    );
  }

  // Showing results
  if (session.status === "showing_results" && currentQuestion) {
    const isLast = session.currentQuestionIndex >= (session.totalQuestions || session.questions.length) - 1;
    return (
      <ResultsScreen
        question={currentQuestion}
        questionIndex={session.currentQuestionIndex}
        totalQuestions={session.totalQuestions || session.questions.length}
        answers={answers || []}
        participants={session.participants}
        onNext={() => isLast ? finishMutation.mutate() : nextMutation.mutate()}
        isLastQuestion={isLast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center text-white">
      <p>Chargement...</p>
    </div>
  );
}
