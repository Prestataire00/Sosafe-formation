import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Calendar,
  MapPin,
  Globe,
  Info,
  Timer,
  Video,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EnrollmentStatusBadge } from "../components/EnrollmentStatusBadge";
import { formatDate } from "../helpers";
import type { LearnerSessionData } from "../helpers";
import type { Session } from "@shared/schema";

export function LearnerSessionsTab({ traineeId }: { traineeId: string }) {
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
        <p className="text-sm text-muted-foreground">
          Vous n'avez aucune session de formation confirmée pour le moment.
        </p>
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

              {/* Virtual class link */}
              {session.virtualClassUrl && !isPast && (
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
