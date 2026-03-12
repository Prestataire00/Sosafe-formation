import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Star } from "lucide-react";

interface LevelProgressBarProps {
  totalXP: number;
  level: string;
  nextLevelXP: number | null;
  nextLevelName: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  "Débutant": "bg-stone-500",
  "Apprenti": "bg-amber-600",
  "Confirmé": "bg-slate-400",
  "Expert": "bg-yellow-500",
  "Maître": "bg-purple-500",
};

const LEVEL_GRADIENTS: Record<string, string> = {
  "Débutant": "from-stone-400 to-stone-600",
  "Apprenti": "from-amber-500 to-amber-700",
  "Confirmé": "from-slate-300 to-slate-500",
  "Expert": "from-yellow-400 to-yellow-600",
  "Maître": "from-purple-400 to-purple-600",
};

export function LevelProgressBar({ totalXP, level, nextLevelXP, nextLevelName }: LevelProgressBarProps) {
  const prevLevelXP = (() => {
    const levels = [0, 200, 500, 1000, 2000];
    const names = ["Débutant", "Apprenti", "Confirmé", "Expert", "Maître"];
    const idx = names.indexOf(level);
    return idx >= 0 ? levels[idx] : 0;
  })();

  const progressPercent = nextLevelXP
    ? Math.min(100, Math.round(((totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100))
    : 100;

  const gradient = LEVEL_GRADIENTS[level] || "from-primary to-primary";
  const badgeColor = LEVEL_COLORS[level] || "bg-primary";

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-bold ${badgeColor}`}>
        <Star className="w-3.5 h-3.5 fill-current" />
        {level}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            {totalXP} XP
          </span>
          {nextLevelName && (
            <span>{nextLevelXP! - totalXP} XP pour {nextLevelName}</span>
          )}
          {!nextLevelName && <span>Niveau maximum atteint !</span>}
        </div>
        <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
