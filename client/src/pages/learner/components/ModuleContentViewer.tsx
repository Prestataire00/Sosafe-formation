import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Play,
  ExternalLink,
  Loader2,
  Lock,
  Clock,
  MonitorPlay,
  Download,
  Image,
} from "lucide-react";
import { getVideoEmbedUrl } from "../helpers";
import { BlockTypeIcon, BlockTypeLabel } from "./BlockTypeIcon";
import { QuizPlayer } from "./QuizPlayer";
import { VideoQuizPlayer } from "./VideoQuizPlayer";
import { ScormPlayer } from "./ScormPlayer";
import { AssignmentSubmitter } from "./AssignmentSubmitter";
import { FlashcardPlayer } from "./FlashcardPlayer";
import { ScenarioPlayer } from "./ScenarioPlayer";
import { SimulationPlayer } from "./SimulationPlayer";
import type { ElearningBlock, LearnerProgress } from "@shared/schema";

export function ModuleContentViewer({
  moduleId,
  traineeId,
  progressData,
  requireSequential = true,
}: {
  moduleId: string;
  traineeId: string;
  progressData: LearnerProgress[];
  requireSequential?: boolean;
}) {
  const { toast } = useToast();

  const { data: blocks, isLoading } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${moduleId}`],
  });

  const markCompleteMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      const encouragements = [
        "Bien joué ! Continuez comme ça 💪",
        "Excellent travail ! Un pas de plus 🎯",
        "Bravo, bloc terminé avec succès ! ✅",
        "Super progression ! On avance bien 🚀",
      ];
      toast({ title: encouragements[Math.floor(Math.random() * encouragements.length)] });
    },
    onError: () =>
      toast({
        title: "Erreur lors de la mise à jour",
        variant: "destructive",
      }),
  });

  const sortedBlocks = useMemo(
    () => blocks?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [blocks]
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Chargement du contenu...</span>
      </div>
    );
  }

  if (sortedBlocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucun contenu disponible pour ce module.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {sortedBlocks.map((block, blockIndex) => {
        const blockProgress = progressData.find(
          (p) => p.blockId === block.id
        );
        const isCompleted = blockProgress?.completed;

        let isLocked = false;
        if (requireSequential && blockIndex > 0) {
          for (let i = 0; i < blockIndex; i++) {
            const prevBlock = sortedBlocks[i];
            const prevProgress = progressData.find((p) => p.blockId === prevBlock.id);
            if (!prevProgress?.completed) {
              isLocked = true;
              break;
            }
          }
        }

        return (
          <AccordionItem key={block.id} value={block.id} disabled={isLocked}>
            <AccordionTrigger className={`hover:no-underline ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`} disabled={isLocked}>
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                {isLocked ? (
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <BlockTypeIcon type={block.type} />
                )}
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {block.title}
                </span>
                {isLocked ? (
                  <span className="text-xs text-muted-foreground shrink-0">Terminez le bloc précédent</span>
                ) : (
                  <BlockTypeLabel type={block.type} />
                )}
                {isCompleted && (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                )}
              </div>
            </AccordionTrigger>
            {!isLocked && (
            <AccordionContent>
              <div className="pl-7 space-y-3">
                {block.type === "text" && (
                  <div className="space-y-3">
                    {block.content && (
                      block.content.includes("<") ? (
                        <div
                          className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: block.content }}
                        />
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {block.content}
                        </div>
                      )
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                )}

                {block.type === "video" && (
                  <div className="space-y-3">
                    {block.videoUrl ? (
                      getVideoEmbedUrl(block.videoUrl) ? (
                        <div className="aspect-video rounded-lg overflow-hidden bg-black border">
                          <iframe
                            src={getVideoEmbedUrl(block.videoUrl)!}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={block.title}
                          />
                        </div>
                      ) : block.videoUrl.match(/\.(mp4|webm|ogg)/) ? (
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <video src={block.videoUrl} controls className="w-full h-full" />
                        </div>
                      ) : (
                        <a
                          href={block.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Regarder la vidéo
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune vidéo disponible.
                      </p>
                    )}
                    {block.content && (
                      <p className="text-sm text-muted-foreground">
                        {block.content}
                      </p>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme visionné
                      </Button>
                    )}
                  </div>
                )}

                {block.type === "quiz" && (
                  <QuizPlayer
                    blockId={block.id}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                    quizConfig={(block.quizConfig as any) || undefined}
                  />
                )}

                {block.type === "video_quiz" && (
                  <VideoQuizPlayer
                    block={block}
                    blockId={block.id}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {block.type === "scorm" && (
                  <ScormPlayer
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {block.type === "assignment" && (
                  <AssignmentSubmitter
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {block.type === "flashcard" && (
                  <FlashcardPlayer
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    isCompleted={!!isCompleted}
                    onMarkComplete={() =>
                      markCompleteMutation.mutate({
                        traineeId,
                        moduleId,
                        blockId: block.id,
                        completed: true,
                        score: null,
                      })
                    }
                    isPending={markCompleteMutation.isPending}
                  />
                )}

                {block.type === "resource_web" && (
                  <div className="space-y-3">
                    {(block as any).embedCode ? (
                      <div
                        className="rounded-lg overflow-hidden border"
                        dangerouslySetInnerHTML={{ __html: (block as any).embedCode }}
                      />
                    ) : (block as any).embedUrl ? (
                      <div className="rounded-lg overflow-hidden border">
                        <iframe
                          src={(block as any).embedUrl}
                          className="w-full"
                          style={{ minHeight: "500px" }}
                          allow="fullscreen"
                          title={block.title}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune ressource web configurée.</p>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme terminé
                      </Button>
                    )}
                  </div>
                )}

                {block.type === "virtual_class" && (
                  <div className="space-y-3">
                    {(block as any).virtualClassDate && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {new Date((block as any).virtualClassDate).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    {(block as any).virtualClassUrl ? (
                      <a
                        href={(block as any).virtualClassUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm font-medium"
                      >
                        <MonitorPlay className="w-4 h-4" />
                        Rejoindre la classe virtuelle
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Lien non encore disponible.</p>
                    )}
                    {block.content && (
                      <p className="text-sm text-muted-foreground">{block.content}</p>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        J'ai participé
                      </Button>
                    )}
                  </div>
                )}

                {block.type === "document" && (
                  <div className="space-y-3">
                    {(block as any).fileUrl ? (
                      <a
                        href={(block as any).fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger {(block as any).fileName || "le document"}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Document non disponible.</p>
                    )}
                    {block.content && (
                      <p className="text-sm text-muted-foreground">{block.content}</p>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                )}

                {block.type === "image" && (
                  <div className="space-y-3">
                    {(block as any).imageUrls && ((block as any).imageUrls as string[]).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {((block as any).imageUrls as string[]).map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`${block.title} - ${idx + 1}`}
                              className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune image disponible.</p>
                    )}
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          markCompleteMutation.mutate({
                            traineeId,
                            moduleId,
                            blockId: block.id,
                            completed: true,
                            score: null,
                          })
                        }
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Marquer comme vu
                      </Button>
                    )}
                  </div>
                )}

                {block.type === "survey" && (
                  <QuizPlayer
                    blockId={block.id}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                    quizConfig={(block.quizConfig as any) || undefined}
                    isSurvey
                  />
                )}

                {block.type === "scenario" && (
                  <ScenarioPlayer
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {block.type === "simulation" && (
                  <SimulationPlayer
                    block={block}
                    traineeId={traineeId}
                    moduleId={moduleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}
              </div>
            </AccordionContent>
            )}
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
