import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Play,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Download,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";
import { ModuleContentViewer } from "./ModuleContentViewer";
import { formatDate } from "../helpers";
import type {
  Enrollment,
  Session,
  Program,
  ElearningModule,
  LearnerProgress,
  SessionResource,
} from "@shared/schema";

export function EnrollmentCard({
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

        {/* Module count and actions */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <BookOpen className="w-4 h-4" />
          <span>
            {modules.length} module{modules.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {modules.length > 0 && (
            <Button
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                const sorted = modules.slice().sort((a, b) => a.orderIndex - b.orderIndex);
                const firstIncomplete = sorted.find((mod) => {
                  const modProgress = progressData.filter((p) => p.moduleId === mod.id);
                  return modProgress.length === 0 || modProgress.some((p) => !p.completed);
                });
                onEnterImmersive(firstIncomplete?.id || sorted[0]?.id || "");
              }}
            >
              <Play className="w-4 h-4" />
              {progressPercent > 0 ? "Continuer la formation" : "Commencer la formation"}
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
          {enrollment.status === "completed" && (
            <a href="/inscription">
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
                Se réinscrire
              </Button>
            </a>
          )}
        </div>

        {/* Expanded modules list */}
        {expanded && (
          <div className="border-t pt-4 space-y-3">
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun module disponible pour cette session.
              </p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {modules
                  .slice()
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((mod) => {
                    const moduleProgress = progressData.filter(
                      (p) => p.moduleId === mod.id
                    );
                    const moduleCompletedCount = moduleProgress.filter(
                      (p) => p.completed
                    ).length;
                    const moduleTotalCount = moduleProgress.length;
                    const modulePercent =
                      moduleTotalCount > 0
                        ? Math.round(
                            (moduleCompletedCount / moduleTotalCount) * 100
                          )
                        : 0;

                    return (
                      <AccordionItem key={mod.id} value={mod.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                            <BookOpen className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium truncate">
                                {mod.title}
                              </p>
                              {mod.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {mod.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Progress
                                value={modulePercent}
                                className="h-1.5 w-16"
                              />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {modulePercent}%
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ModuleContentViewer
                            moduleId={mod.id}
                            traineeId={traineeId}
                            progressData={moduleProgress}
                            requireSequential={(mod as any).requireSequential !== false}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
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
