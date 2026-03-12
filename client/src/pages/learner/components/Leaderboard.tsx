import { useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Zap, Crown } from "lucide-react";
import confetti from "canvas-confetti";

interface LeaderboardEntry {
  traineeId: string;
  traineeName: string;
  totalXP: number;
  badgeCount: number;
}

interface LeaderboardProps {
  sessionId?: string;
  moduleId?: string;
  currentTraineeId: string;
  showPodium?: boolean;
}

const PODIUM_COLORS = [
  { bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-400", text: "text-yellow-600", icon: Crown },
  { bg: "bg-slate-100 dark:bg-slate-800/30", border: "border-slate-400", text: "text-slate-500", icon: Medal },
  { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-600", text: "text-amber-700", icon: Award },
];

const PODIUM_HEIGHTS = ["h-32", "h-24", "h-20"];
const PODIUM_ORDER = [1, 0, 2]; // silver, gold, bronze (display order for podium)

function getInitials(name: string) {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Leaderboard({ sessionId, moduleId, currentTraineeId, showPodium = true }: LeaderboardProps) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (moduleId) params.set("moduleId", moduleId);

  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", sessionId, moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const currentRank = leaderboard.findIndex(e => e.traineeId === currentTraineeId) + 1;

  // Confetti for #1
  useEffect(() => {
    if (showPodium && currentRank === 1 && leaderboard.length > 1) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });
    }
  }, [currentRank, showPodium, leaderboard.length]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Chargement du classement...
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Aucun classement disponible pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(showPodium ? 3 : 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        Classement
      </h3>

      {/* Podium */}
      {showPodium && top3.length >= 2 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-end justify-center gap-3">
              {PODIUM_ORDER.map((rank, displayIdx) => {
                const entry = top3[rank];
                if (!entry) return <div key={rank} className="w-24" />;
                const style = PODIUM_COLORS[rank];
                const Icon = style.icon;
                const isCurrent = entry.traineeId === currentTraineeId;

                return (
                  <motion.div
                    key={entry.traineeId}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: displayIdx * 0.15, type: "spring", stiffness: 200 }}
                    className="flex flex-col items-center"
                  >
                    {/* Avatar */}
                    <div className={`relative mb-2 ${rank === 0 ? "scale-110" : ""}`}>
                      <div className={`w-14 h-14 rounded-full ${style.bg} ${style.border} border-2 flex items-center justify-center font-bold ${style.text} ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                        {getInitials(entry.traineeName)}
                      </div>
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-background border-2 ${style.border} flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${style.text}`} />
                      </div>
                    </div>

                    {/* Name */}
                    <p className={`text-xs font-medium text-center mb-1 max-w-[80px] truncate ${isCurrent ? "text-primary font-bold" : ""}`}>
                      {entry.traineeName.split(" ")[0]}
                    </p>

                    {/* XP */}
                    <Badge variant="outline" className="text-xs gap-1 mb-2">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {entry.totalXP}
                    </Badge>

                    {/* Podium bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      transition={{ delay: displayIdx * 0.15 + 0.2, type: "spring" }}
                      className={`w-20 ${PODIUM_HEIGHTS[rank]} ${style.bg} ${style.border} border-2 rounded-t-lg flex items-start justify-center pt-2`}
                    >
                      <span className={`text-2xl font-bold ${style.text}`}>{rank + 1}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {rest.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {rest.map((entry, idx) => {
                const rank = showPodium ? idx + 4 : idx + 1;
                const isCurrent = entry.traineeId === currentTraineeId;

                return (
                  <motion.div
                    key={entry.traineeId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center gap-3 px-4 py-3 ${isCurrent ? "bg-primary/5" : ""}`}
                  >
                    <span className={`w-8 text-center font-bold text-sm ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      #{rank}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {getInitials(entry.traineeName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isCurrent ? "font-bold text-primary" : "font-medium"}`}>
                        {entry.traineeName}
                        {isCurrent && <span className="text-xs ml-1">(vous)</span>}
                      </p>
                      {entry.badgeCount > 0 && (
                        <p className="text-xs text-muted-foreground">{entry.badgeCount} badge{entry.badgeCount > 1 ? "s" : ""}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {entry.totalXP}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current position reminder */}
      {currentRank > 3 && showPodium && (
        <div className="text-center text-sm text-muted-foreground">
          Vous etes en <span className="font-bold text-primary">#{currentRank}</span> position
        </div>
      )}
    </div>
  );
}
