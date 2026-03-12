import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { CheckCircle, Play, Loader2 } from "lucide-react";
import type { ElearningBlock, LearnerProgress, ScormPackage } from "@shared/schema";

export function ScormPlayer({
  block,
  traineeId,
  moduleId,
  existingProgress,
}: {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [launched, setLaunched] = useState(false);
  const [completed, setCompleted] = useState(!!existingProgress?.completed);

  const { data: scormPackage } = useQuery<ScormPackage>({
    queryKey: [`/api/scorm-packages/${block.scormPackageId}`],
    enabled: !!block.scormPackageId,
  });

  const submitProgress = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/learner-progress", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      setCompleted(true);
    },
  });

  useEffect(() => {
    if (!launched || !scormPackage) return;

    const scormData: Record<string, string> = {};
    const api = {
      LMSInitialize: () => "true",
      LMSFinish: () => {
        const scoreRaw = parseFloat(scormData["cmi.core.score.raw"] || "0");
        const lessonStatus = scormData["cmi.core.lesson_status"] || "";
        const isCompleted = ["completed", "passed"].includes(lessonStatus);
        if (isCompleted || lessonStatus) {
          submitProgress.mutate({
            traineeId,
            moduleId,
            blockId: block.id,
            completed: isCompleted,
            score: isNaN(scoreRaw) ? null : Math.round(scoreRaw),
          });
        }
        return "true";
      },
      LMSGetValue: (key: string) => scormData[key] || "",
      LMSSetValue: (key: string, value: string) => { scormData[key] = value; return "true"; },
      LMSCommit: () => "true",
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => "",
      Initialize: () => api.LMSInitialize(),
      Terminate: () => api.LMSFinish(),
      GetValue: (key: string) => api.LMSGetValue(key),
      SetValue: (key: string, value: string) => api.LMSSetValue(key, value),
      Commit: () => api.LMSCommit(),
      GetLastError: () => api.LMSGetLastError(),
      GetErrorString: () => api.LMSGetErrorString(),
      GetDiagnostic: () => api.LMSGetDiagnostic(),
    };

    (window as any).API = api;
    (window as any).API_1484_11 = api;
    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [launched, scormPackage]);

  if (!block.scormPackageId) {
    return <p className="text-sm text-muted-foreground">Aucun package SCORM associe.</p>;
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Module SCORM termine</span>
      </div>
    );
  }

  if (!launched) {
    return (
      <Button onClick={() => setLaunched(true)} className="w-full">
        <Play className="w-4 h-4 mr-2" />
        Lancer le module SCORM
      </Button>
    );
  }

  const launchUrl = scormPackage
    ? `${scormPackage.extractPath}${scormPackage.entryPoint}`
    : null;

  return (
    <div className="space-y-2">
      {launchUrl ? (
        <iframe
          ref={iframeRef}
          src={launchUrl}
          className="w-full border rounded-lg"
          style={{ height: "600px" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Chargement du module SCORM...</span>
        </div>
      )}
    </div>
  );
}
