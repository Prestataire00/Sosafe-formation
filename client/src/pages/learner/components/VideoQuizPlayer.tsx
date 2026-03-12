import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock } from "lucide-react";
import { getVideoEmbedUrl } from "../helpers";
import { QuizPlayer } from "./QuizPlayer";
import type { ElearningBlock, LearnerProgress } from "@shared/schema";

export function VideoQuizPlayer({
  block,
  blockId,
  traineeId,
  moduleId,
  existingProgress,
}: {
  block: ElearningBlock;
  blockId: string;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const [videoWatched, setVideoWatched] = useState(!!existingProgress?.completed);
  const [canProceed, setCanProceed] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(15);
  const videoUrl = block.videoUrl || "";
  const config = (block.quizConfig as any) || {};

  // Minimum wait before allowing to proceed (encourages actually watching)
  useEffect(() => {
    if (videoWatched || existingProgress?.completed) return;
    const timer = setInterval(() => {
      setWaitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanProceed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [videoWatched, existingProgress?.completed]);

  if (!videoWatched) {
    return (
      <div className="space-y-4">
        {videoUrl && (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {getVideoEmbedUrl(videoUrl) ? (
              <iframe
                src={getVideoEmbedUrl(videoUrl)!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={videoUrl} controls className="w-full h-full" />
            )}
          </div>
        )}
        <Button onClick={() => setVideoWatched(true)} className="w-full" disabled={!canProceed}>
          {canProceed ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              J'ai terminé la vidéo — Passer aux questions
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 mr-2 animate-pulse" />
              Visionnez la vidéo ({waitSeconds}s)
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Vidéo terminée — Répondez aux questions</span>
      </div>
      <QuizPlayer
        blockId={blockId}
        traineeId={traineeId}
        moduleId={moduleId}
        existingProgress={existingProgress}
        quizConfig={config}
      />
    </div>
  );
}
