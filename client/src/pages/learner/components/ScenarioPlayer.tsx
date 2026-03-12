import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, RotateCcw, Trophy, Target, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ElearningBlock, LearnerProgress } from "@shared/schema";

interface ScenarioNode {
  id: string;
  situation: string;
  imageUrl?: string;
  choices: Array<{
    id: string;
    text: string;
    feedback: string;
    points: number;
    nextNodeId: string | null;
  }>;
}

interface ScenarioConfig {
  startNodeId: string;
  nodes: ScenarioNode[];
}

interface PathEntry {
  nodeId: string;
  choiceId: string;
  choiceText: string;
  feedback: string;
  points: number;
  maxPoints: number;
}

interface ScenarioPlayerProps {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}

export function ScenarioPlayer({ block, traineeId, moduleId, existingProgress }: ScenarioPlayerProps) {
  const config = block.scenarioConfig as ScenarioConfig | null;
  const queryClient = useQueryClient();

  const [currentNodeId, setCurrentNodeId] = useState<string>(config?.startNodeId || "");
  const [choicePath, setChoicePath] = useState<PathEntry[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFinished, setIsFinished] = useState(!!existingProgress?.completed);
  const [showResults, setShowResults] = useState(!!existingProgress?.completed);

  const currentNode = useMemo(() => {
    return config?.nodes.find(n => n.id === currentNodeId) || null;
  }, [config, currentNodeId]);

  const maxPossibleScore = useMemo(() => {
    if (!config) return 0;
    let total = 0;
    const visited = new Set<string>();
    let nodeId: string | null = config.startNodeId;
    while (nodeId && !visited.has(nodeId)) {
      visited.add(nodeId);
      const node = config.nodes.find(n => n.id === nodeId);
      if (!node) break;
      const maxChoice = node.choices.reduce((best, c) => c.points > best.points ? c : best, node.choices[0]);
      total += maxChoice?.points || 0;
      nodeId = maxChoice?.nextNodeId || null;
    }
    return total;
  }, [config]);

  const totalPoints = useMemo(() => choicePath.reduce((sum, p) => sum + p.points, 0), [choicePath]);
  const scorePercent = maxPossibleScore > 0 ? Math.round((totalPoints / maxPossibleScore) * 100) : 0;

  const progressMutation = useMutation({
    mutationFn: async (data: { score: number; scenarioPath: PathEntry[] }) => {
      const res = await fetch("/api/learner-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traineeId,
          moduleId,
          blockId: block.id,
          completed: true,
          score: data.score,
          completedAt: new Date().toISOString(),
          scenarioPath: data.scenarioPath.map(p => ({ nodeId: p.nodeId, choiceId: p.choiceId, points: p.points })),
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification-points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learner/my-stats"] });
    },
  });

  const handleChoiceSelect = useCallback((choice: ScenarioNode["choices"][0]) => {
    if (!currentNode) return;
    setSelectedChoice(choice.id);
    setShowFeedback(true);

    const maxNodePoints = Math.max(...currentNode.choices.map(c => c.points));
    const entry: PathEntry = {
      nodeId: currentNode.id,
      choiceId: choice.id,
      choiceText: choice.text,
      feedback: choice.feedback,
      points: choice.points,
      maxPoints: maxNodePoints,
    };

    setChoicePath(prev => [...prev, entry]);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedChoice(null);
      if (choice.nextNodeId) {
        setCurrentNodeId(choice.nextNodeId);
      } else {
        const newPath = [...choicePath, entry];
        const total = newPath.reduce((s, p) => s + p.points, 0);
        const score = maxPossibleScore > 0 ? Math.round((total / maxPossibleScore) * 100) : 100;
        setIsFinished(true);
        setShowResults(true);
        progressMutation.mutate({ score, scenarioPath: newPath });
      }
    }, 2500);
  }, [currentNode, choicePath, maxPossibleScore, progressMutation]);

  const handleRestart = () => {
    setCurrentNodeId(config?.startNodeId || "");
    setChoicePath([]);
    setSelectedChoice(null);
    setShowFeedback(false);
    setIsFinished(false);
    setShowResults(false);
  };

  if (!config || !config.nodes.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Aucun scénario configuré pour ce bloc.</p>
      </div>
    );
  }

  if (showResults) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Score Header */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Scénario terminé !</h3>
            <div className="text-4xl font-bold text-primary mb-2">{scorePercent}%</div>
            <p className="text-muted-foreground">
              {totalPoints} / {maxPossibleScore} points
            </p>
            <div className="mt-4">
              {scorePercent >= 80 ? (
                <Badge className="bg-green-500 text-white">Excellent parcours !</Badge>
              ) : scorePercent >= 50 ? (
                <Badge className="bg-amber-500 text-white">Bon parcours</Badge>
              ) : (
                <Badge className="bg-red-500 text-white">Peut mieux faire</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Path Timeline */}
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4">Votre parcours</h4>
            <div className="space-y-4">
              {choicePath.map((entry, idx) => {
                const node = config.nodes.find(n => n.id === entry.nodeId);
                const isOptimal = entry.points === entry.maxPoints;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className="flex gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        isOptimal ? "bg-green-500" : entry.points > 0 ? "bg-amber-500" : "bg-red-500"
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < choicePath.length - 1 && <div className="w-0.5 h-8 bg-muted mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {node?.situation?.substring(0, 80)}...
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        {isOptimal ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : entry.points > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">{entry.choiceText}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          +{entry.points} pts
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{entry.feedback}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {!existingProgress?.completed && (
          <Button variant="outline" onClick={handleRestart} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" />
            Recommencer le scénario
          </Button>
        )}
      </motion.div>
    );
  }

  // Progress indicator
  const visitedCount = choicePath.length;
  const totalNodes = config.nodes.length;
  const progressPercent = Math.round((visitedCount / totalNodes) * 100);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Target className="w-4 h-4" />
        <span>Étape {visitedCount + 1} / {totalNodes}</span>
        <Progress value={progressPercent} className="flex-1 h-2" />
        <span className="font-medium text-primary">{totalPoints} pts</span>
      </div>

      {/* Current Node */}
      <AnimatePresence mode="wait">
        {currentNode && (
          <motion.div
            key={currentNodeId}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <Card className="border-2">
              <CardContent className="p-6">
                {currentNode.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img src={currentNode.imageUrl} alt="" className="w-full h-48 object-cover" />
                  </div>
                )}
                <p className="text-lg leading-relaxed mb-6 whitespace-pre-wrap">{currentNode.situation}</p>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Que faites-vous ?
                  </p>
                  {currentNode.choices.map((choice, idx) => {
                    const isSelected = selectedChoice === choice.id;
                    const feedbackColor = isSelected
                      ? choice.points >= Math.max(...currentNode.choices.map(c => c.points))
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : choice.points > 0
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                        : "border-red-500 bg-red-50 dark:bg-red-950/30"
                      : "";

                    return (
                      <motion.div key={choice.id} layout>
                        <Button
                          variant="outline"
                          className={`w-full text-left justify-start h-auto py-3 px-4 whitespace-normal ${
                            isSelected ? feedbackColor : ""
                          } ${showFeedback && !isSelected ? "opacity-40" : ""}`}
                          disabled={showFeedback}
                          onClick={() => handleChoiceSelect(choice)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{choice.text}</span>
                            {isSelected && <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" />}
                          </div>
                        </Button>

                        {/* Feedback overlay */}
                        <AnimatePresence>
                          {isSelected && showFeedback && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 ml-10 p-3 rounded-lg bg-muted/50 border"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {choice.points >= Math.max(...currentNode.choices.map(c => c.points)) ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : choice.points > 0 ? (
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-sm font-semibold">+{choice.points} points</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{choice.feedback}</p>
                              {choice.nextNodeId && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                                  <ArrowRight className="w-3 h-3" />
                                  <span>Suite du scénario...</span>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
