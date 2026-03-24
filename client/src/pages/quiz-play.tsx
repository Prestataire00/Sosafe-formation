import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Users,
  Timer,
  CheckCircle,
  XCircle,
  Trophy,
  Crown,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Color palette matching presenter
const OPTION_COLORS = [
  "bg-red-500 hover:bg-red-600 active:bg-red-700",
  "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
  "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700",
  "bg-green-500 hover:bg-green-600 active:bg-green-700",
  "bg-purple-500 hover:bg-purple-600 active:bg-purple-700",
  "bg-orange-500 hover:bg-orange-600 active:bg-orange-700",
];

// ============================================================
// Join Screen
// ============================================================

function JoinScreen({ onJoin }: { onJoin: (code: string, pseudo: string) => void }) {
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!code || !pseudo.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/public/quiz/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), pseudo: pseudo.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast({ title: data.message || "Erreur", variant: "destructive" });
        setLoading(false);
        return;
      }
      // Save participant info
      localStorage.setItem("quiz_participant_id", data.participant.id);
      localStorage.setItem("quiz_session_id", data.quizSessionId);
      localStorage.setItem("quiz_pseudo", pseudo.trim());
      onJoin(data.quizSessionId, data.participant.id);
    } catch {
      toast({ title: "Erreur de connexion", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6">
      <Zap className="w-16 h-16 text-yellow-400 mb-4" />
      <h1 className="text-4xl font-black mb-8">Rejoindre le quiz</h1>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-sm space-y-4">
        <div>
          <label className="text-sm text-purple-200 mb-1 block">Code du quiz</label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="text-center text-3xl font-mono font-bold tracking-[0.3em] h-16 bg-white/10 border-white/20 text-white placeholder:text-white/30"
            maxLength={6}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="text-sm text-purple-200 mb-1 block">Votre pseudo</label>
          <Input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Choisissez un pseudo..."
            className="text-center text-lg h-12 bg-white/10 border-white/20 text-white placeholder:text-white/30"
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>
        <Button
          className="w-full h-14 text-xl bg-green-500 hover:bg-green-600 rounded-full font-bold"
          onClick={handleJoin}
          disabled={loading || code.length < 6 || !pseudo.trim()}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rejoindre !"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Waiting for start
// ============================================================

function WaitingForStart({ pseudo, participantCount }: { pseudo: string; participantCount: number }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6">
      <div className="animate-pulse mb-6">
        <Zap className="w-16 h-16 text-yellow-400" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Bienvenue, {pseudo} !</h1>
      <p className="text-lg text-purple-200 mb-6">En attente du lancement du quiz...</p>
      <div className="bg-white/10 rounded-full px-6 py-3 flex items-center gap-2">
        <Users className="w-5 h-5" />
        <span>{participantCount} participant(s) connecte(s)</span>
      </div>
    </div>
  );
}

// ============================================================
// Answer Screen
// ============================================================

function AnswerScreen({
  question,
  questionIndex,
  totalQuestions,
  timeLeft,
  onAnswer,
  answered,
  lastResult,
}: {
  question: any;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  onAnswer: (idx: number) => void;
  answered: boolean;
  lastResult: { isCorrect: boolean; points: number } | null;
}) {
  if (answered && lastResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6">
        {lastResult.isCorrect ? (
          <>
            <CheckCircle className="w-20 h-20 text-green-400 mb-4" />
            <h2 className="text-3xl font-bold mb-2">Correct !</h2>
            <p className="text-2xl text-green-300 font-bold">+{lastResult.points} points</p>
          </>
        ) : (
          <>
            <XCircle className="w-20 h-20 text-red-400 mb-4" />
            <h2 className="text-3xl font-bold mb-2">Mauvaise reponse</h2>
            <p className="text-lg text-red-300">+0 point</p>
          </>
        )}
        <p className="text-sm text-purple-300 mt-6">En attente de la question suivante...</p>
      </div>
    );
  }

  if (answered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-12 h-12 animate-spin text-purple-300 mb-4" />
        <p className="text-lg">Reponse envoyee !</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-white/20 text-white">
          {questionIndex + 1} / {totalQuestions}
        </Badge>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 ${timeLeft <= 5 ? "bg-red-500/80 animate-pulse" : "bg-white/10"}`}>
          <Timer className="w-4 h-4" />
          <span className="font-bold font-mono">{timeLeft}s</span>
        </div>
      </div>

      <Progress value={(timeLeft / (question.timeLimit || 20)) * 100} className="h-1.5 mb-4" />

      {/* Question */}
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">{question.question}</h2>
      </div>

      {/* Options - full height buttons */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            onClick={() => onAnswer(idx)}
            className={`${OPTION_COLORS[idx]} rounded-xl p-6 text-white text-lg md:text-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center min-h-[80px]`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Leaderboard Screen (between questions / final)
// ============================================================

function LeaderboardScreen({
  participants,
  pseudo,
  isFinal,
  quizTitle,
}: {
  participants: any[];
  pseudo: string;
  isFinal: boolean;
  quizTitle: string;
}) {
  const myRank = participants.findIndex((p) => p.pseudo === pseudo) + 1;
  const myScore = participants.find((p) => p.pseudo === pseudo)?.score || 0;

  if (isFinal) {
    const top3 = participants.slice(0, 3);
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600 flex flex-col items-center justify-center text-white p-6">
        <Trophy className="w-16 h-16 text-yellow-300 mb-4" />
        <h1 className="text-3xl font-black mb-2">Quiz termine !</h1>
        <p className="text-xl text-yellow-200 mb-6">{quizTitle}</p>

        <div className="bg-white/10 backdrop-blur rounded-xl p-6 w-full max-w-sm mb-6 text-center">
          <p className="text-lg text-yellow-200">Votre classement</p>
          <p className="text-5xl font-black">{myRank > 0 ? `#${myRank}` : "-"}</p>
          <p className="text-2xl font-bold mt-1">{myScore} points</p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          {participants.slice(0, 10).map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-lg p-3 ${p.pseudo === pseudo ? "bg-yellow-400/30 border border-yellow-300" : "bg-white/10"}`}
            >
              <span className="text-lg font-bold w-8 text-center">
                {idx === 0 ? <Crown className="w-5 h-5 text-yellow-400 inline" /> : idx + 1}
              </span>
              <span className="flex-1 font-semibold">{p.pseudo}</span>
              <span className="font-mono font-bold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white p-6">
      <BarChart className="w-12 h-12 text-purple-300 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Classement intermediaire</h2>
      <div className="bg-white/10 rounded-xl p-4 w-full max-w-sm mb-4 text-center">
        <p className="text-purple-200">Vous etes</p>
        <p className="text-4xl font-black">{myRank > 0 ? `#${myRank}` : "-"}</p>
        <p className="text-xl font-bold">{myScore} pts</p>
      </div>
      <p className="text-sm text-purple-300 animate-pulse">Question suivante bientot...</p>
    </div>
  );
}

// Missing import fix
function BarChart({ className }: { className?: string }) {
  return <Trophy className={className} />;
}

// ============================================================
// Main Quiz Play Component
// ============================================================

export default function QuizPlay() {
  const [quizSessionId, setQuizSessionId] = useState<string | null>(
    localStorage.getItem("quiz_session_id")
  );
  const [participantId, setParticipantId] = useState<string | null>(
    localStorage.getItem("quiz_participant_id")
  );
  const [pseudo] = useState(localStorage.getItem("quiz_pseudo") || "");
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Poll session data
  const { data: session } = useQuery({
    queryKey: ["/api/public/quiz/session", quizSessionId],
    queryFn: async () => {
      const resp = await fetch(`/api/public/quiz/session/${quizSessionId}`);
      return resp.json();
    },
    refetchInterval: 1500,
    enabled: !!quizSessionId,
  });

  // Reset answered state when question changes
  useEffect(() => {
    if (session?.status === "active") {
      const currentQ = session.questions?.[session.currentQuestionIndex];
      if (currentQ && currentQ.id !== lastQuestionId) {
        setAnswered(false);
        setLastResult(null);
        setLastQuestionId(currentQ.id);
      }
    }
  }, [session?.currentQuestionIndex, session?.status, session?.questions, lastQuestionId]);

  const handleJoin = (sessionId: string, partId: string) => {
    setQuizSessionId(sessionId);
    setParticipantId(partId);
  };

  const handleAnswer = async (answerIdx: number) => {
    if (answered || !session || !participantId) return;
    setAnswered(true);

    const currentQ = session.questions?.[session.currentQuestionIndex];
    if (!currentQ) return;

    try {
      const resp = await fetch("/api/public/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizSessionId,
          questionId: currentQ.id,
          participantId,
          answer: answerIdx,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setLastResult({ isCorrect: data.isCorrect, points: data.points });
      } else {
        toast({ title: data.message || "Erreur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur de connexion", variant: "destructive" });
    }
  };

  // Not joined yet
  if (!quizSessionId || !participantId) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  // Waiting
  if (session.status === "waiting") {
    return <WaitingForStart pseudo={pseudo} participantCount={session.participants?.length || 0} />;
  }

  // Finished
  if (session.status === "finished") {
    // Clear stored data
    return (
      <LeaderboardScreen
        participants={session.participants || []}
        pseudo={pseudo}
        isFinal={true}
        quizTitle={session.quizTitle || ""}
      />
    );
  }

  // Active question
  if (session.status === "active") {
    const currentQ = session.questions?.[session.currentQuestionIndex];
    if (!currentQ) return null;

    const timeLimit = currentQ.timeLimit || 20;
    const startedAt = session.questionStartedAt ? new Date(session.questionStartedAt).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const timeLeft = Math.max(0, timeLimit - elapsed);

    return (
      <AnswerScreen
        question={currentQ}
        questionIndex={session.currentQuestionIndex}
        totalQuestions={session.totalQuestions || session.questions?.length || 0}
        timeLeft={timeLeft}
        onAnswer={handleAnswer}
        answered={answered}
        lastResult={lastResult}
      />
    );
  }

  // Showing results
  if (session.status === "showing_results") {
    return (
      <LeaderboardScreen
        participants={session.participants || []}
        pseudo={pseudo}
        isFinal={false}
        quizTitle={session.quizTitle || ""}
      />
    );
  }

  return null;
}
