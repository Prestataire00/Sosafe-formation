import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Medal,
  Shield,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Share2,
  Download,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "../helpers";
import { Leaderboard } from "../components/Leaderboard";
import type {
  LearnerProgress,
  ElearningModule,
  ElearningBlock,
  TraineeCertification,
  DigitalBadge,
  BadgeAward,
} from "@shared/schema";

export default function LearnerBadgesTab({ traineeId, progressData, modules }: { traineeId: string; progressData: LearnerProgress[]; modules: ElearningModule[] }) {
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

      {/* Leaderboard section */}
      <div className="mt-8">
        <Leaderboard
          currentTraineeId={traineeId}
          showPodium={false}
        />
      </div>
    </div>
  );
}
