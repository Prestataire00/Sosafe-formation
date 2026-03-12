import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  Play,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Lock,
  PanelLeftClose,
  PanelLeft,
  Download,
  MonitorPlay,
  Video,
  Trophy,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getVideoEmbedUrl, formatDate } from "../helpers";
import { BlockTypeIcon, BlockTypeLabel } from "./BlockTypeIcon";
import { QuizPlayer } from "./QuizPlayer";
import { VideoQuizPlayer } from "./VideoQuizPlayer";
import { ScormPlayer } from "./ScormPlayer";
import { AssignmentSubmitter } from "./AssignmentSubmitter";
import { FlashcardPlayer } from "./FlashcardPlayer";
import { ScenarioPlayer } from "./ScenarioPlayer";
import { SimulationPlayer } from "./SimulationPlayer";
import { Leaderboard } from "./Leaderboard";
import { XPNotification } from "./XPNotification";
import type {
  ElearningModule,
  ElearningBlock,
  LearnerProgress,
  QuizQuestion,
  ScormPackage,
} from "@shared/schema";

export function ImmersiveModuleViewer({
  initialModuleId,
  initialBlockIndex,
  modules,
  progressData,
  traineeId,
  onExit,
  previewMode = false,
}: {
  initialModuleId: string;
  initialBlockIndex: number;
  modules: ElearningModule[];
  progressData: LearnerProgress[];
  traineeId?: string;
  onExit: () => void;
  previewMode?: boolean;
}) {
  const { toast } = useToast();
  const [currentModuleId, setCurrentModuleId] = useState(initialModuleId);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(initialBlockIndex);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [readingTimeLeft, setReadingTimeLeft] = useState(0);

  const sortedModules = useMemo(
    () => modules.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [modules]
  );
  const currentModule = sortedModules.find((m) => m.id === currentModuleId);

  // Fetch blocks for the current module
  const { data: blocks } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${currentModuleId}`],
    enabled: !!currentModuleId,
  });

  // Fetch quiz questions for quiz blocks
  const { data: quizQuestions } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz-questions"],
  });

  // Fetch SCORM packages
  const { data: scormPackages } = useQuery<ScormPackage[]>({
    queryKey: ["/api/scorm-packages"],
  });

  const sortedBlocks = useMemo(
    () => blocks?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [],
    [blocks]
  );

  const currentBlock = sortedBlocks[currentBlockIndex];
  const hasNext = currentBlockIndex < sortedBlocks.length - 1;
  const hasPrevious = currentBlockIndex > 0;

  // Overall progress for the current module
  const moduleProgress = useMemo(() => {
    const relevant = progressData.filter((p) => p.moduleId === currentModuleId);
    const completed = relevant.filter((p) => p.completed).length;
    const total = sortedBlocks.length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [progressData, currentModuleId, sortedBlocks]);

  // Sequential locking (disabled in preview mode)
  const isBlockLocked = useCallback(
    (blockIndex: number) => {
      if (previewMode) return false;
      if (blockIndex === 0) return false;
      for (let i = 0; i < blockIndex; i++) {
        const prevBlock = sortedBlocks[i];
        const prevProgress = progressData.find((p) => p.blockId === prevBlock.id && p.moduleId === currentModuleId);
        if (!prevProgress?.completed) return true;
      }
      return false;
    },
    [sortedBlocks, progressData, currentModuleId, previewMode]
  );

  const blockProgress = currentBlock
    ? progressData.find((p) => p.blockId === currentBlock.id && p.moduleId === currentModuleId)
    : undefined;
  const isCurrentCompleted = blockProgress?.completed ?? false;
  const isCurrentLocked = currentBlock ? isBlockLocked(currentBlockIndex) : false;

  // Mark block complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        if (hasNext) setCurrentBlockIndex((i) => i + 1);
      }, 1200);
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Minimum reading time for text/document/image blocks (based on content length)
  useEffect(() => {
    if (!currentBlock || isCurrentCompleted || previewMode) {
      setReadingTimeLeft(0);
      return;
    }
    const passiveTypes = ["text", "document", "image", "resource_web", "virtual_class", "survey"];
    if (!passiveTypes.includes(currentBlock.type)) {
      setReadingTimeLeft(0);
      return;
    }
    // Calculate minimum reading time: ~200 words per minute, minimum 10 seconds, max 60
    const contentLength = (currentBlock.content || "").length + (currentBlock.title || "").length;
    const wordCount = Math.max(contentLength / 5, 50); // approximate word count
    const readingSeconds = Math.min(60, Math.max(10, Math.round((wordCount / 200) * 60)));
    setReadingTimeLeft(readingSeconds);

    const interval = setInterval(() => {
      setReadingTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentBlock?.id, isCurrentCompleted, previewMode]);

  const canGoNext = previewMode || isCurrentCompleted;
  const goToNextBlock = () => {
    if (hasNext && canGoNext) setCurrentBlockIndex((i) => i + 1);
  };
  const goToPreviousBlock = () => {
    if (hasPrevious) setCurrentBlockIndex((i) => i - 1);
  };

  const handleMarkComplete = () => {
    if (!currentBlock) return;
    if (previewMode) {
      // In preview mode, just simulate completion animation and move to next
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        if (hasNext) setCurrentBlockIndex((i) => i + 1);
      }, 800);
      return;
    }
    markCompleteMutation.mutate({
      traineeId: traineeId!,
      moduleId: currentModuleId,
      blockId: currentBlock.id,
      completed: true,
      score: null,
    });
  };

  // When QuizPlayer or other self-completing components finish, detect via progress data change
  const prevProgressRef = useRef(progressData);
  useEffect(() => {
    if (!currentBlock) return;
    const wasCompleted = prevProgressRef.current.find(
      (p) => p.blockId === currentBlock.id && p.moduleId === currentModuleId
    )?.completed;
    const nowCompleted = progressData.find(
      (p) => p.blockId === currentBlock.id && p.moduleId === currentModuleId
    )?.completed;
    if (!wasCompleted && nowCompleted) {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        if (hasNext) setCurrentBlockIndex((i) => i + 1);
      }, 1200);
    }
    prevProgressRef.current = progressData;
  }, [progressData, currentBlock, currentModuleId, hasNext]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in duration-200">
      {/* PREVIEW MODE BANNER */}
      {previewMode && (
        <div className="h-8 bg-amber-500 text-white flex items-center justify-center gap-2 text-xs font-medium shrink-0">
          <Eye className="w-3.5 h-3.5" />
          Mode aperçu — La progression n'est pas enregistrée
        </div>
      )}
      {/* TOP BAR */}
      <div className="h-14 border-b flex items-center px-4 gap-4 shrink-0 bg-background">
        <Button variant="ghost" size="sm" onClick={onExit} className="gap-2 shrink-0">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Retour</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentModule?.title}</p>
          <p className="text-xs text-muted-foreground">
            Bloc {currentBlockIndex + 1} / {sortedBlocks.length}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Progress value={moduleProgress.percent} className="w-24 sm:w-32 h-2" />
          <span className="text-xs font-medium tabular-nums">{moduleProgress.percent}%</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onExit} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR */}
        <div
          className={cn(
            "border-r bg-muted/30 shrink-0 flex flex-col transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Contenu du module
              </p>
              {sortedBlocks.map((block, idx) => {
                const bp = progressData.find((p) => p.blockId === block.id && p.moduleId === currentModuleId);
                const isActive = idx === currentBlockIndex;
                const isComplete = bp?.completed;
                const locked = isBlockLocked(idx);

                return (
                  <button
                    key={block.id}
                    onClick={() => !locked && setCurrentBlockIndex(idx)}
                    disabled={locked}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors",
                      isActive && "bg-primary/10 text-primary font-medium",
                      !isActive && !locked && "hover:bg-accent/50",
                      locked && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : locked ? (
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <BlockTypeIcon type={block.type} />
                    )}
                    <span className="truncate flex-1">{block.title}</span>
                    {isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Module switcher */}
          {sortedModules.length > 1 && (
            <div className="border-t p-3">
              <Select
                value={currentModuleId}
                onValueChange={(id) => {
                  setCurrentModuleId(id);
                  setCurrentBlockIndex(0);
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Changer de module" />
                </SelectTrigger>
                <SelectContent>
                  {sortedModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto">
          {!currentBlock ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Selectionnez un bloc pour commencer</p>
              </div>
            </div>
          ) : isCurrentLocked ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Bloc verrouillé</p>
                <p className="text-sm mt-1">Terminez le bloc précédent pour débloquer celui-ci.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8">
              {/* Block header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <BlockTypeIcon type={currentBlock.type} />
                  <BlockTypeLabel type={currentBlock.type} />
                  {isCurrentCompleted && (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Terminé
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold">{currentBlock.title}</h2>
              </div>

              {/* Block content */}
              <div className="space-y-6">
                {/* TEXT */}
                {currentBlock.type === "text" && (
                  <div className="space-y-4">
                    {currentBlock.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-base leading-relaxed">
                        {currentBlock.content}
                      </div>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps de lecture restant : <strong>{readingTimeLeft}s</strong></span>
                          <Progress value={Math.max(0, 100 - (readingTimeLeft / 60) * 100)} className="flex-1 h-2 max-w-[200px]" />
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme lu
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* VIDEO */}
                {currentBlock.type === "video" && (
                  <div className="space-y-4">
                    {currentBlock.videoUrl ? (
                      getVideoEmbedUrl(currentBlock.videoUrl) ? (
                        <div className="aspect-video rounded-xl overflow-hidden bg-black border">
                          <iframe
                            src={getVideoEmbedUrl(currentBlock.videoUrl)!}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={currentBlock.title}
                          />
                        </div>
                      ) : currentBlock.videoUrl.match(/\.(mp4|webm|ogg)/) ? (
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                          <video src={currentBlock.videoUrl} controls className="w-full h-full" />
                        </div>
                      ) : (
                        <a
                          href={currentBlock.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                        >
                          <Play className="w-5 h-5" />
                          Regarder la vidéo
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )
                    ) : (
                      <p className="text-muted-foreground">Aucune vidéo disponible.</p>
                    )}
                    {currentBlock.content && (
                      <p className="text-muted-foreground">{currentBlock.content}</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme visionne
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* QUIZ */}
                {currentBlock.type === "quiz" && (
                  <QuizPlayer
                    blockId={currentBlock.id}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                    quizConfig={(currentBlock.quizConfig as any) || undefined}
                  />
                )}

                {/* VIDEO + QUIZ */}
                {currentBlock.type === "video_quiz" && (
                  <VideoQuizPlayer
                    block={currentBlock}
                    blockId={currentBlock.id}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* SCORM */}
                {currentBlock.type === "scorm" && currentBlock.scormPackageId && (
                  <ScormPlayer
                    block={currentBlock}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* ASSIGNMENT */}
                {currentBlock.type === "assignment" && (
                  <AssignmentSubmitter
                    block={currentBlock}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* FLASHCARD */}
                {currentBlock.type === "flashcard" && (
                  <FlashcardPlayer
                    block={currentBlock}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    isCompleted={isCurrentCompleted}
                    onMarkComplete={handleMarkComplete}
                    isPending={markCompleteMutation.isPending}
                  />
                )}

                {/* RESOURCE WEB / IFRAME */}
                {currentBlock.type === "resource_web" && (
                  <div className="space-y-4">
                    {currentBlock.embedCode ? (
                      <div
                        className="rounded-xl overflow-hidden border"
                        dangerouslySetInnerHTML={{ __html: currentBlock.embedCode }}
                      />
                    ) : currentBlock.embedUrl ? (
                      <div className="aspect-video rounded-xl overflow-hidden border">
                        <iframe
                          src={currentBlock.embedUrl}
                          className="w-full h-full"
                          allowFullScreen
                          title={currentBlock.title}
                        />
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune ressource disponible.</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme termine
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* VIRTUAL CLASS */}
                {currentBlock.type === "virtual_class" && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                            <MonitorPlay className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">Classe virtuelle</p>
                            {currentBlock.virtualClassDate && (
                              <p className="text-sm text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatDate(currentBlock.virtualClassDate)}
                              </p>
                            )}
                          </div>
                        </div>
                        {currentBlock.virtualClassUrl && (
                          <Button asChild className="mt-4 w-full">
                            <a href={currentBlock.virtualClassUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="w-4 h-4 mr-2" />
                              Rejoindre la classe
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* DOCUMENT */}
                {currentBlock.type === "document" && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-900/20">
                          <Download className="w-6 h-6 text-sky-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{currentBlock.fileName || "Document"}</p>
                          {currentBlock.fileSize && (
                            <p className="text-xs text-muted-foreground">
                              {(currentBlock.fileSize / 1024).toFixed(0)} Ko
                            </p>
                          )}
                        </div>
                        {currentBlock.fileUrl && (
                          <Button asChild variant="outline">
                            <a href={currentBlock.fileUrl} download>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    {currentBlock.content && (
                      <p className="text-muted-foreground whitespace-pre-wrap">{currentBlock.content}</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme consulte
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* IMAGE / GALLERY */}
                {currentBlock.type === "image" && (
                  <div className="space-y-4">
                    {currentBlock.imageUrls && currentBlock.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentBlock.imageUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`${currentBlock.title} - ${idx + 1}`}
                            className="w-full rounded-xl border object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune image disponible.</p>
                    )}
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme vu
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* SURVEY */}
                {currentBlock.type === "survey" && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">{currentBlock.content || "Sondage"}</p>
                    {!isCurrentCompleted && (
                      readingTimeLeft > 0 ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Temps restant : <strong>{readingTimeLeft}s</strong></span>
                        </div>
                      ) : (
                        <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme complete
                        </Button>
                      )
                    )}
                  </div>
                )}

                {/* SCENARIO */}
                {currentBlock.type === "scenario" && (
                  <ScenarioPlayer
                    block={currentBlock}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}

                {/* SIMULATION */}
                {currentBlock.type === "simulation" && (
                  <SimulationPlayer
                    block={currentBlock}
                    traineeId={traineeId || ""}
                    moduleId={currentModuleId}
                    existingProgress={blockProgress || undefined}
                  />
                )}
              </div>

              {/* NAVIGATION FOOTER */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={goToPreviousBlock}
                  disabled={!hasPrevious}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                {hasNext ? (
                  <div className="flex flex-col items-end gap-1">
                    <Button onClick={goToNextBlock} disabled={!canGoNext} className="gap-2">
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    {!canGoNext && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Completez ce bloc pour continuer
                      </span>
                    )}
                  </div>
                ) : moduleProgress.percent === 100 ? (
                  <div className="space-y-4">
                    <Leaderboard
                      sessionId={currentModule?.sessionId || undefined}
                      moduleId={currentModuleId}
                      currentTraineeId={traineeId || ""}
                      showPodium={true}
                    />
                    <Button variant="outline" onClick={onExit} className="gap-2 w-full">
                      <CheckCircle className="w-4 h-4" />
                      Quitter le module
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={onExit} className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Terminer
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CELEBRATION OVERLAY */}
        {showCelebration && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 animate-in fade-in duration-300 pointer-events-none">
            <div className="text-center space-y-3 animate-in zoom-in-75 duration-300">
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>
              <p className="text-xl font-bold">Bravo !</p>
              <p className="text-sm text-muted-foreground">Bloc terminé avec succès</p>
              <XPNotification points={10} label="Bloc complété" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
