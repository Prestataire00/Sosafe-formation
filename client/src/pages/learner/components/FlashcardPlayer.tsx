import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, RotateCcw } from "lucide-react";
import type { ElearningBlock } from "@shared/schema";

export function FlashcardPlayer({
  block,
  traineeId,
  moduleId,
  isCompleted,
  onMarkComplete,
  isPending,
}: {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  isCompleted: boolean;
  onMarkComplete: () => void;
  isPending: boolean;
}) {
  const cards = ((block as any).flashcards as Array<{ front: string; back: string }>) || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Aucune flashcard disponible.</p>;
  }

  const card = cards[currentIdx];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Carte {currentIdx + 1}/{cards.length}
        </span>
        <Progress value={((currentIdx + 1) / cards.length) * 100} className="flex-1 mx-3 h-2" />
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className={`cursor-pointer rounded-xl border-2 p-8 text-center min-h-[160px] flex items-center justify-center transition-all ${
          flipped
            ? "bg-pink-50 border-pink-300 dark:bg-pink-900/20 dark:border-pink-700"
            : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 hover:border-pink-300"
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {flipped ? "Réponse" : "Question"}
          </p>
          <p className="text-lg font-medium">{flipped ? card.back : card.front}</p>
          <p className="text-xs text-muted-foreground mt-3">
            <RotateCcw className="w-3 h-3 inline mr-1" />
            Cliquez pour {flipped ? "voir la question" : "révéler la réponse"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === 0}
          onClick={() => { setCurrentIdx(currentIdx - 1); setFlipped(false); }}
        >
          Précédente
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIdx === cards.length - 1}
          onClick={() => { setCurrentIdx(currentIdx + 1); setFlipped(false); }}
        >
          Suivante
        </Button>
      </div>

      {!isCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkComplete}
          disabled={isPending}
        >
          <CheckCircle className="w-3 h-3 mr-2" />
          Marquer comme étudié
        </Button>
      )}
    </div>
  );
}
