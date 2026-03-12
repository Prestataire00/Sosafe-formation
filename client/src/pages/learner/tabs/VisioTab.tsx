import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "../helpers";
import type { Enrollment, Session } from "@shared/schema";

export default function LearnerVisioTab({
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
