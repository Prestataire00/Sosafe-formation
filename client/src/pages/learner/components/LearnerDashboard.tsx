import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Award,
  Trophy,
  CalendarCheck,
  PenTool,
  ClipboardList,
  Play,
  ChevronRight,
  Flame,
  Target,
  Medal,
  Zap,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "../helpers";
import { LevelProgressBar } from "./LevelProgressBar";
import type {
  Enrollment,
  Session,
  Program,
  ElearningModule,
  LearnerProgress,
  BadgeAward,
  DigitalBadge,
} from "@shared/schema";

interface LearnerDashboardProps {
  traineeId: string;
  enrollments: Enrollment[];
  sessions: Session[];
  programs: Program[];
  modules: ElearningModule[];
  progressData: LearnerProgress[];
  pendingSignatureCount: number;
  pendingEvalCount: number;
  onChangeTab: (tab: string) => void;
  onEnterImmersive: (enrollmentId: string, sessionId: string, moduleId: string, blockIndex?: number) => void;
}

interface MyStats {
  quizAvg: number | null;
  blocksCompleted: number;
  totalMinutes: number;
  streak: number;
  totalXP: number;
  level: string;
  nextLevelXP: number | null;
  nextLevelName: string | null;
}

export default function LearnerDashboard({
  traineeId,
  enrollments,
  sessions,
  programs,
  modules,
  progressData,
  pendingSignatureCount,
  pendingEvalCount,
  onChangeTab,
  onEnterImmersive,
}: LearnerDashboardProps) {
  // Fetch personal stats
  const { data: stats } = useQuery<MyStats>({
    queryKey: ["/api/learner/my-stats"],
  });

  // Fetch badge awards
  const { data: badgeAwards } = useQuery<BadgeAward[]>({
    queryKey: [`/api/badge-awards?traineeId=${traineeId}`],
    enabled: !!traineeId,
  });
  const { data: allBadges } = useQuery<DigitalBadge[]>({
    queryKey: ["/api/digital-badges"],
  });

  // Find "continue learning" — the enrollment with most recent incomplete progress
  const continueLearning = useMemo(() => {
    if (!enrollments.length || !sessions.length || !modules.length) return null;

    const activeEnrollments = enrollments.filter(
      (e) => e.status !== "completed" && e.status !== "cancelled"
    );

    for (const enrollment of activeEnrollments) {
      const session = sessions.find((s) => s.id === enrollment.sessionId);
      if (!session) continue;
      const sessionModules = modules.filter(
        (m) =>
          (m as any).status === "published" &&
          (m.sessionId === session.id || (m.programId === session.programId && !m.sessionId))
      );
      if (sessionModules.length === 0) continue;

      // Find the first incomplete module
      const moduleProgress = sessionModules.map((mod) => {
        const modBlocks = progressData.filter((p) => p.moduleId === mod.id);
        const total = (mod as any).blocks?.length || 0;
        const completed = modBlocks.filter((p) => p.completed).length;
        return { mod, total, completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
      });

      const incompleteModule = moduleProgress.find((mp) => mp.progress < 100);
      if (!incompleteModule) continue;

      const program = programs.find((p) => p.id === session.programId);
      const overallCompleted = moduleProgress.reduce((s, m) => s + m.completed, 0);
      const overallTotal = moduleProgress.reduce((s, m) => s + m.total, 0);

      return {
        enrollment,
        session,
        program,
        currentModule: incompleteModule.mod,
        moduleProgress: incompleteModule.progress,
        overallProgress: overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0,
        nextBlockIndex: incompleteModule.completed,
      };
    }
    return null;
  }, [enrollments, sessions, modules, programs, progressData]);

  // Upcoming sessions
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    const enrolledSessionIds = new Set(enrollments.map((e) => e.sessionId));
    return sessions
      .filter((s) => enrolledSessionIds.has(s.id) && new Date(s.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [sessions, enrollments]);

  // Recent badges
  const recentBadges = useMemo(() => {
    if (!badgeAwards || !allBadges) return [];
    return badgeAwards
      .sort((a, b) => new Date(b.awardedAt!).getTime() - new Date(a.awardedAt!).getTime())
      .slice(0, 3)
      .map((award) => ({
        ...award,
        badge: allBadges.find((b) => b.id === award.badgeId),
      }));
  }, [badgeAwards, allBadges]);

  const pendingTotal = pendingSignatureCount + pendingEvalCount;

  return (
    <div className="space-y-6">
      {/* CONTINUE LEARNING — Hero card */}
      {continueLearning && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 shrink-0">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                    Reprendre ma formation
                  </p>
                  <h3 className="text-lg font-bold truncate">
                    {continueLearning.session.title}
                  </h3>
                  {continueLearning.program && (
                    <p className="text-sm text-muted-foreground truncate">
                      {continueLearning.program.title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        Module : {continueLearning.currentModule.title}
                      </span>
                      <span className="text-xs font-medium">{continueLearning.overallProgress}%</span>
                    </div>
                    <Progress value={continueLearning.overallProgress} className="h-2" />
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() =>
                      onEnterImmersive(
                        continueLearning.enrollment.id,
                        continueLearning.session.id,
                        continueLearning.currentModule.id,
                        continueLearning.nextBlockIndex
                      )
                    }
                  >
                    Continuer
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PENDING ACTIONS */}
      {pendingTotal > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                Actions en attente ({pendingTotal})
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingSignatureCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={() => onChangeTab("documents")}
                >
                  <PenTool className="w-3.5 h-3.5 text-amber-600" />
                  {pendingSignatureCount} signature{pendingSignatureCount > 1 ? "s" : ""} en attente
                </Button>
              )}
              {pendingEvalCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  onClick={() => onChangeTab("evaluations")}
                >
                  <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                  {pendingEvalCount} évaluation{pendingEvalCount > 1 ? "s" : ""} à compléter
                </Button>
              )}
              {upcomingSessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={() => onChangeTab("calendar")}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                  {upcomingSessions.length} session{upcomingSessions.length > 1 ? "s" : ""} à venir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {enrollments.filter((e) => e.status !== "completed" && e.status !== "cancelled").length}
              </p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.blocksCompleted ?? 0}</p>
              <p className="text-xs text-muted-foreground">Blocs terminés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.quizAvg != null ? `${stats.quizAvg}%` : "—"}</p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              <Flame className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.streak ?? 0}</p>
              <p className="text-xs text-muted-foreground">Jours consécutifs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* XP / LEVEL PROGRESS */}
      {stats && (
        <Card>
          <CardContent className="p-4">
            <LevelProgressBar
              totalXP={stats.totalXP ?? 0}
              level={stats.level ?? "Débutant"}
              nextLevelXP={stats.nextLevelXP ?? 200}
              nextLevelName={stats.nextLevelName ?? "Apprenti"}
            />
          </CardContent>
        </Card>
      )}

      {/* TWO COLUMNS — Upcoming events + Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming events */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                Prochains événements
              </h4>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onChangeTab("calendar")}>
                Voir tout
              </Button>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune session à venir
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0 text-primary">
                      <span className="text-[10px] font-medium leading-none">
                        {new Date(s.startDate).toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {new Date(s.startDate).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(s.startDate)}</span>
                        {s.location && (
                          <>
                            <MapPin className="w-3 h-3 ml-1" />
                            <span className="truncate">{s.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Medal className="w-4 h-4 text-muted-foreground" />
                Badges obtenus
              </h4>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onChangeTab("badges")}>
                Voir tout
              </Button>
            </div>
            {recentBadges.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <Trophy className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Complétez des modules pour gagner des badges !
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBadges.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        item.badge?.level === "gold"
                          ? "bg-amber-100 text-amber-600"
                          : item.badge?.level === "silver"
                          ? "bg-gray-100 text-gray-600"
                          : item.badge?.level === "platinum"
                          ? "bg-violet-100 text-violet-600"
                          : "bg-orange-100 text-orange-600"
                      )}
                    >
                      <Medal className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.badge?.title || "Badge"}</p>
                      <p className="text-xs text-muted-foreground">
                        Obtenu le {item.awardedAt ? new Date(item.awardedAt).toLocaleDateString("fr-FR") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
