import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUp, ArrowDown, Check, X, RotateCcw, Trophy, Lightbulb,
  GripVertical, Link2, MousePointerClick, PenLine, Gamepad2
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ElearningBlock, LearnerProgress } from "@shared/schema";

// Internal normalized types
interface NormalizedOrderingItem {
  id: string;
  text: string;
  correctPosition: number;
}

interface NormalizedMatchingPair {
  id: string;
  left: string;
  right: string;
}

interface NormalizedFillBlankAnswer {
  blankIndex: number;
  correctAnswer: string;
  alternatives?: string[];
}

interface SimulationConfig {
  subType: "ordering" | "matching" | "fill_blank" | "hotspot";
  instructions: string;
  // Can be either format from AI or from admin editor
  orderingItems?: any;
  matchingPairs?: any;
  fillBlankText?: string;
  fillBlankAnswers?: any;
  wordBank?: string[];
  hotspotImageUrl?: string;
  hotspotZones?: Array<{ id: string; x: number; y: number; width: number; height: number; label: string; isCorrect: boolean }>;
  maxScore?: number;
  passingScore?: number;
  allowRetry?: boolean;
  showHintsAfterFail?: boolean;
}

// Normalize ordering items from either AI format (string[]) or admin format ({id, text, correctPosition}[])
function normalizeOrderingItems(raw: any): NormalizedOrderingItem[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
  // If items are strings, convert to objects
  if (typeof raw[0] === "string") {
    return raw.map((text: string, idx: number) => ({
      id: `item-${idx}`,
      text,
      correctPosition: idx,
    }));
  }
  // If items are objects with text but no id/correctPosition
  return raw.map((item: any, idx: number) => ({
    id: item.id || `item-${idx}`,
    text: item.text || String(item),
    correctPosition: typeof item.correctPosition === "number" ? item.correctPosition : idx,
  }));
}

// Normalize matching pairs from either AI format ({left, right}[]) or admin format ({id, left, right}[])
function normalizeMatchingPairs(raw: any): NormalizedMatchingPair[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((pair: any, idx: number) => ({
    id: pair.id || `pair-${idx}`,
    left: pair.left || "",
    right: pair.right || "",
  }));
}

// Normalize fill blank answers from either AI format (Record<string, string>) or admin format (Array<{blankIndex, correctAnswer}>)
function normalizeFillBlankAnswers(raw: any): NormalizedFillBlankAnswer[] {
  if (!raw) return [];
  // Already an array of objects
  if (Array.isArray(raw)) {
    return raw.map((a: any, idx: number) => ({
      blankIndex: typeof a.blankIndex === "number" ? a.blankIndex : idx,
      correctAnswer: a.correctAnswer || String(a),
      alternatives: a.alternatives,
    }));
  }
  // Record<string, string> format from AI like {"blank1": "mot1", "blank2": "mot2"}
  if (typeof raw === "object") {
    const entries = Object.entries(raw);
    return entries.map(([key, value], idx) => ({
      blankIndex: idx,
      correctAnswer: String(value),
    }));
  }
  return [];
}

// Normalize fill blank text: convert {key} patterns to {blank} for rendering
function normalizeFillBlankText(text: string, answers: any): string {
  if (!text) return "";
  // If the text already uses {blank}, keep as-is
  if (text.includes("{blank}")) return text;
  // Otherwise replace named placeholders like {blank1}, {key_name} with {blank}
  if (typeof answers === "object" && !Array.isArray(answers)) {
    let normalized = text;
    for (const key of Object.keys(answers)) {
      normalized = normalized.replace(new RegExp(`\\{${key}\\}`, "g"), "{blank}");
    }
    return normalized;
  }
  return text;
}

interface SimulationPlayerProps {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}

// ========== ORDERING EXERCISE ==========
function OrderingExercise({ items, instructions, onComplete }: { items: NormalizedOrderingItem[]; instructions: string; onComplete: (score: number) => void }) {
  const [order, setOrder] = useState(() => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const moveItem = (fromIdx: number, direction: "up" | "down") => {
    if (submitted) return;
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= order.length) return;
    const newOrder = [...order];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    setOrder(newOrder);
  };

  const handleSubmit = () => {
    const res = order.map((item, idx) => item.correctPosition === idx);
    setResults(res);
    setSubmitted(true);
    const correct = res.filter(Boolean).length;
    const score = Math.round((correct / items.length) * 100);
    onComplete(score);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <GripVertical className="w-4 h-4" />
        {instructions || "Remettez les elements dans le bon ordre"}
      </p>
      {order.map((item, idx) => (
        <motion.div
          key={item.id}
          layout
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            submitted
              ? results[idx]
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-red-500 bg-red-50 dark:bg-red-950/20"
              : "border-border bg-card"
          }`}
        >
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {idx + 1}
          </span>
          <span className="flex-1 text-sm">{item.text}</span>
          {submitted ? (
            results[idx] ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />
          ) : (
            <div className="flex flex-col gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(idx, "up")} disabled={idx === 0}>
                <ArrowUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(idx, "down")} disabled={idx === order.length - 1}>
                <ArrowDown className="w-3 h-3" />
              </Button>
            </div>
          )}
        </motion.div>
      ))}
      {!submitted && (
        <Button onClick={handleSubmit} className="w-full gap-2">
          <Check className="w-4 h-4" /> Valider l'ordre
        </Button>
      )}
      {submitted && (
        <div className="text-sm text-muted-foreground mt-2">
          <p className="font-medium mb-1">Ordre correct :</p>
          {items.map((item, idx) => (
            <p key={item.id} className="text-xs">{idx + 1}. {item.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== MATCHING EXERCISE ==========
function MatchingExercise({ pairs, instructions, onComplete }: { pairs: NormalizedMatchingPair[]; instructions: string; onComplete: (score: number) => void }) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Map<string, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Map<string, boolean>>(new Map());

  const shuffledRight = useMemo(() => {
    const items = pairs.map(p => ({ id: p.id, text: p.right }));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [pairs]);

  const handleLeftClick = (id: string) => {
    if (submitted) return;
    setSelectedLeft(selectedLeft === id ? null : id);
  };

  const handleRightClick = (rightId: string) => {
    if (submitted || !selectedLeft) return;
    const newMatches = new Map(matches);
    Array.from(newMatches.entries()).forEach(([k, v]) => {
      if (k === selectedLeft || v === rightId) newMatches.delete(k);
    });
    newMatches.set(selectedLeft, rightId);
    setMatches(newMatches);
    setSelectedLeft(null);
  };

  const handleSubmit = () => {
    const res = new Map<string, boolean>();
    for (const pair of pairs) {
      const matchedRight = matches.get(pair.id);
      res.set(pair.id, matchedRight === pair.id);
    }
    setResults(res);
    setSubmitted(true);
    const correct = Array.from(res.values()).filter(Boolean).length;
    onComplete(Math.round((correct / pairs.length) * 100));
  };

  const getMatchColor = (id: string) => {
    const colors = ["bg-blue-100 border-blue-400", "bg-purple-100 border-purple-400", "bg-emerald-100 border-emerald-400", "bg-amber-100 border-amber-400", "bg-pink-100 border-pink-400", "bg-cyan-100 border-cyan-400"];
    const keys = Array.from(matches.keys());
    const idx = keys.indexOf(id);
    return idx >= 0 ? colors[idx % colors.length] : "";
  };

  const getRightMatchColor = (rightId: string) => {
    const found = Array.from(matches.entries()).find(([, rId]) => rId === rightId);
    return found ? getMatchColor(found[0]) : "";
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        {instructions || "Cliquez sur un element a gauche, puis sur son correspondant a droite"}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Elements</p>
          {pairs.map(pair => {
            const isMatched = matches.has(pair.id);
            const isCorrect = results.get(pair.id);
            return (
              <motion.div
                key={pair.id}
                whileTap={{ scale: 0.97 }}
                className={`p-3 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                  submitted
                    ? isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : selectedLeft === pair.id
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : isMatched
                    ? `border-2 ${getMatchColor(pair.id)}`
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleLeftClick(pair.id)}
              >
                {pair.left}
                {submitted && (isCorrect ? <Check className="w-4 h-4 text-green-500 inline ml-2" /> : <X className="w-4 h-4 text-red-500 inline ml-2" />)}
              </motion.div>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Correspondances</p>
          {shuffledRight.map(item => {
            const isMatchedRight = Array.from(matches.values()).includes(item.id);
            return (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.97 }}
                className={`p-3 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                  submitted
                    ? "border-border"
                    : isMatchedRight
                    ? `border-2 ${getRightMatchColor(item.id)}`
                    : selectedLeft
                    ? "border-dashed border-primary/50 hover:bg-primary/5"
                    : "border-border"
                }`}
                onClick={() => handleRightClick(item.id)}
              >
                {item.text}
              </motion.div>
            );
          })}
        </div>
      </div>
      {!submitted && (
        <Button onClick={handleSubmit} className="w-full gap-2" disabled={matches.size < pairs.length}>
          <Check className="w-4 h-4" /> Valider les correspondances ({matches.size}/{pairs.length})
        </Button>
      )}
    </div>
  );
}

// ========== FILL IN THE BLANK EXERCISE ==========
function FillBlankExercise({ text, answers, wordBank, instructions, onComplete }: { text: string; answers: NormalizedFillBlankAnswer[]; wordBank: string[]; instructions: string; onComplete: (score: number) => void }) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<number, boolean>>({});

  const parts = text.split(/(\{blank\})/);

  const handleWordBankClick = (word: string) => {
    if (submitted) return;
    const firstEmpty = answers.findIndex((_, idx) => !userAnswers[idx]);
    if (firstEmpty >= 0) {
      setUserAnswers(prev => ({ ...prev, [firstEmpty]: word }));
    }
  };

  const handleSubmit = () => {
    const res: Record<number, boolean> = {};
    for (const answer of answers) {
      const userAns = (userAnswers[answer.blankIndex] || "").trim().toLowerCase();
      const correct = answer.correctAnswer.toLowerCase();
      const alts = (answer.alternatives || []).map(a => a.toLowerCase());
      res[answer.blankIndex] = userAns === correct || alts.includes(userAns);
    }
    setResults(res);
    setSubmitted(true);
    const correct = Object.values(res).filter(Boolean).length;
    onComplete(Math.round((correct / answers.length) * 100));
  };

  let renderBlankIdx = 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <PenLine className="w-4 h-4" />
        {instructions || "Completez le texte avec les bons mots"}
      </p>

      {/* Word Bank */}
      {wordBank.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-xs text-muted-foreground w-full mb-1">Banque de mots :</span>
          {wordBank.map((word, i) => {
            const isUsed = Object.values(userAnswers).includes(word);
            return (
              <Badge
                key={i}
                variant={isUsed ? "secondary" : "outline"}
                className={`cursor-pointer transition-all ${isUsed ? "opacity-40" : "hover:bg-primary/10"}`}
                onClick={() => handleWordBankClick(word)}
              >
                {word}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Text with blanks */}
      <Card>
        <CardContent className="p-4">
          <div className="text-base leading-relaxed">
            {parts.map((part, i) => {
              if (part === "{blank}") {
                const currentBlankIdx = renderBlankIdx++;
                const isCorrect = results[currentBlankIdx];
                return (
                  <span key={i} className="inline-block mx-1 align-middle">
                    <Input
                      value={userAnswers[currentBlankIdx] || ""}
                      onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentBlankIdx]: e.target.value }))}
                      disabled={submitted}
                      className={`w-32 h-8 text-sm inline-block ${
                        submitted
                          ? isCorrect
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700"
                            : "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700"
                          : ""
                      }`}
                      placeholder="..."
                    />
                    {submitted && !isCorrect && (
                      <span className="text-xs text-green-600 ml-1">
                        ({answers.find(a => a.blankIndex === currentBlankIdx)?.correctAnswer})
                      </span>
                    )}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        </CardContent>
      </Card>

      {!submitted && (
        <Button onClick={handleSubmit} className="w-full gap-2" disabled={Object.keys(userAnswers).length < answers.length}>
          <Check className="w-4 h-4" /> Verifier les reponses
        </Button>
      )}
    </div>
  );
}

// ========== HOTSPOT EXERCISE ==========
function HotspotExercise({ config, onComplete }: { config: SimulationConfig; onComplete: (score: number) => void }) {
  const zones = config.hotspotZones || [];
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggleZone = (zoneId: string) => {
    if (submitted) return;
    setSelectedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctZones = zones.filter(z => z.isCorrect);
    const correctlySelected = correctZones.filter(z => selectedZones.has(z.id)).length;
    const falsePositives = zones.filter(z => !z.isCorrect && selectedZones.has(z.id)).length;
    const score = Math.max(0, Math.round(((correctlySelected - falsePositives) / correctZones.length) * 100));
    onComplete(score);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <MousePointerClick className="w-4 h-4" />
        Cliquez sur les zones correctes de l'image
      </p>
      <div className="relative inline-block w-full">
        {config.hotspotImageUrl && (
          <img src={config.hotspotImageUrl} alt="Exercice" className="w-full rounded-lg" />
        )}
        {zones.map(zone => {
          const isSelected = selectedZones.has(zone.id);
          return (
            <div
              key={zone.id}
              className={`absolute cursor-pointer border-2 rounded transition-all ${
                submitted
                  ? zone.isCorrect
                    ? isSelected
                      ? "border-green-500 bg-green-500/30"
                      : "border-green-500 border-dashed bg-green-500/10"
                    : isSelected
                    ? "border-red-500 bg-red-500/30"
                    : "border-transparent"
                  : isSelected
                  ? "border-primary bg-primary/20"
                  : "border-transparent hover:border-primary/40 hover:bg-primary/10"
              }`}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
              }}
              onClick={() => toggleZone(zone.id)}
            >
              {submitted && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Badge variant="outline" className={`text-xs ${zone.isCorrect ? "bg-green-100 text-green-800" : isSelected ? "bg-red-100 text-red-800" : ""}`}>
                    {zone.label}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <Button onClick={handleSubmit} className="w-full gap-2">
          <Check className="w-4 h-4" /> Valider ma selection
        </Button>
      )}
    </div>
  );
}

// ========== MAIN SIMULATION PLAYER ==========
export function SimulationPlayer({ block, traineeId, moduleId, existingProgress }: SimulationPlayerProps) {
  const rawConfig = block.simulationConfig as SimulationConfig | null;
  const queryClient = useQueryClient();
  const [score, setScore] = useState<number | null>(existingProgress?.score ?? null);
  const [isCompleted, setIsCompleted] = useState(!!existingProgress?.completed);
  const [showHint, setShowHint] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Normalize config data from AI or admin editor
  const config = useMemo(() => {
    if (!rawConfig) return null;
    return rawConfig;
  }, [rawConfig]);

  const normalizedOrderingItems = useMemo(() => {
    if (!config || config.subType !== "ordering") return [];
    return normalizeOrderingItems(config.orderingItems);
  }, [config]);

  const normalizedMatchingPairs = useMemo(() => {
    if (!config || config.subType !== "matching") return [];
    return normalizeMatchingPairs(config.matchingPairs);
  }, [config]);

  const normalizedFillBlankText = useMemo(() => {
    if (!config || config.subType !== "fill_blank") return "";
    return normalizeFillBlankText(config.fillBlankText || "", config.fillBlankAnswers);
  }, [config]);

  const normalizedFillBlankAnswers = useMemo(() => {
    if (!config || config.subType !== "fill_blank") return [];
    return normalizeFillBlankAnswers(config.fillBlankAnswers);
  }, [config]);

  const progressMutation = useMutation({
    mutationFn: async (finalScore: number) => {
      const res = await fetch("/api/learner-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traineeId,
          moduleId,
          blockId: block.id,
          completed: true,
          score: finalScore,
          completedAt: new Date().toISOString(),
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

  const handleComplete = useCallback((exerciseScore: number) => {
    setScore(exerciseScore);
    setAttemptCount(prev => prev + 1);
    const passingScore = config?.passingScore || 60;
    if (exerciseScore >= passingScore) {
      setIsCompleted(true);
      progressMutation.mutate(exerciseScore);
    }
  }, [config, progressMutation]);

  const handleRetry = () => {
    setScore(null);
    setShowHint(false);
  };

  if (!config) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Aucun exercice configure pour ce bloc.</p>
      </div>
    );
  }

  // Check if exercise has actual data
  const hasData =
    (config.subType === "ordering" && normalizedOrderingItems.length > 0) ||
    (config.subType === "matching" && normalizedMatchingPairs.length > 0) ||
    (config.subType === "fill_blank" && normalizedFillBlankText && normalizedFillBlankAnswers.length > 0) ||
    (config.subType === "hotspot" && (config.hotspotZones || []).length > 0);

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Exercice mal configure. Aucune donnee trouvee pour le type "{config.subType}".</p>
      </div>
    );
  }

  const passingScore = config.passingScore || 60;
  const passed = score !== null && score >= passingScore;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      {config.instructions && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardContent className="p-4 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">Instructions</p>
            <p>{config.instructions}</p>
            <p className="text-xs mt-2 opacity-70">Score minimum requis : {passingScore}%</p>
          </CardContent>
        </Card>
      )}

      {/* Exercise */}
      {!isCompleted && score === null && (
        <AnimatePresence mode="wait">
          <motion.div key={`attempt-${attemptCount}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {config.subType === "ordering" && (
              <OrderingExercise items={normalizedOrderingItems} instructions={config.instructions} onComplete={handleComplete} />
            )}
            {config.subType === "matching" && (
              <MatchingExercise pairs={normalizedMatchingPairs} instructions={config.instructions} onComplete={handleComplete} />
            )}
            {config.subType === "fill_blank" && (
              <FillBlankExercise
                text={normalizedFillBlankText}
                answers={normalizedFillBlankAnswers}
                wordBank={config.wordBank || []}
                instructions={config.instructions}
                onComplete={handleComplete}
              />
            )}
            {config.subType === "hotspot" && <HotspotExercise config={config} onComplete={handleComplete} />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Results */}
      {score !== null && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className={`border-2 ${passed ? "border-green-500" : "border-amber-500"}`}>
            <CardContent className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                passed ? "bg-green-100 dark:bg-green-950/30" : "bg-amber-100 dark:bg-amber-950/30"
              }`}>
                {passed ? <Trophy className="w-8 h-8 text-green-500" /> : <Gamepad2 className="w-8 h-8 text-amber-500" />}
              </div>
              <div className="text-3xl font-bold mb-1">{score}%</div>
              <p className="text-muted-foreground mb-3">
                {passed ? "Bravo ! Exercice reussi !" : `Score insuffisant. Minimum requis : ${passingScore}%`}
              </p>
              <Progress value={score} className="h-3 mb-4" />

              {!passed && (
                <div className="space-y-2">
                  {(config.allowRetry !== false) && (
                    <Button onClick={handleRetry} variant="outline" className="gap-2">
                      <RotateCcw className="w-4 h-4" /> Reessayer
                    </Button>
                  )}
                  {config.showHintsAfterFail && !showHint && (
                    <Button onClick={() => setShowHint(true)} variant="ghost" className="gap-2">
                      <Lightbulb className="w-4 h-4" /> Voir un indice
                    </Button>
                  )}
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm text-amber-800 dark:text-amber-200 text-left"
                    >
                      <Lightbulb className="w-4 h-4 inline mr-2" />
                      {config.subType === "ordering" && "Pensez a l'ordre chronologique ou logique des etapes."}
                      {config.subType === "matching" && "Cherchez les liens semantiques entre les elements."}
                      {config.subType === "fill_blank" && "Relisez le contexte autour de chaque blanc pour trouver le mot juste."}
                      {config.subType === "hotspot" && "Observez attentivement chaque zone de l'image."}
                    </motion.div>
                  )}
                </div>
              )}

              {passed && (
                <Badge className="bg-green-500 text-white">
                  <Check className="w-3 h-3 mr-1" />
                  Exercice valide — vous pouvez continuer
                </Badge>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
