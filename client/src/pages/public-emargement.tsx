import { useState, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { CheckCircle, PenLine, Loader2, Video, LogIn, LogOut, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmargementInfo {
  traineeName: string;
  sessionTitle: string;
  date: string;
  period: string;
  startTime: string | null;
  endTime: string | null;
  modality: string;
  alreadySigned: boolean;
  entrySignedAt: string | null;
  exitSignedAt: string | null;
}

export default function PublicEmargement() {
  const [, params] = useRoute("/emargement/:token");
  const token = params?.token;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<EmargementInfo>({
    queryKey: [`/api/public/emargement/${token}`],
    enabled: !!token,
    queryFn: async () => {
      const resp = await fetch(`/api/public/emargement/${token}`);
      if (!resp.ok) throw new Error("Lien invalide");
      return resp.json();
    },
  });

  const [signedEntry, setSignedEntry] = useState(false);
  const [signedExit, setSignedExit] = useState(false);

  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const ctx = getCtx();
      if (!ctx) return;
      setIsDrawing(true);
      setHasSignature(true);
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      ctx.beginPath();
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
    },
    [getCtx],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const ctx = getCtx();
      if (!ctx) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
    },
    [isDrawing, getCtx],
  );

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const signMutation = useMutation({
    mutationFn: async ({ signatureData, mode }: { signatureData?: string; mode: "entry" | "exit" }) => {
      const resp = await fetch(`/api/public/emargement/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: signatureData || null, mode }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message);
      }
      return resp.json();
    },
    onSuccess: (_, variables) => {
      if (variables.mode === "entry") setSignedEntry(true);
      if (variables.mode === "exit") setSignedExit(true);
      clearCanvas();
      queryClient.invalidateQueries({ queryKey: [`/api/public/emargement/${token}`] });
    },
  });

  const handleSign = (mode: "entry" | "exit") => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    signMutation.mutate({ signatureData: canvas.toDataURL("image/png"), mode });
  };

  const handleVisioSign = (mode: "entry" | "exit") => {
    signMutation.mutate({ mode });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-medium">Lien d'émargement invalide ou expiré.</p>
            <p className="text-sm text-muted-foreground mt-2">Veuillez contacter votre formateur.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entryDone = !!(data.entrySignedAt || signedEntry);
  const exitDone = !!(data.exitSignedAt || signedExit);
  const allDone = entryDone && exitDone;
  const isVisio = data.modality === "distanciel";

  // Time display
  const timeDisplay = data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : null;

  // All signed — success screen
  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Émargement complet</h2>
            <p className="text-muted-foreground">
              Vos signatures d'entrée et de sortie ont été enregistrées.
            </p>
            <div className="bg-green-50 rounded-lg p-4 text-left space-y-1">
              <p className="text-sm"><strong>Formation :</strong> {data.sessionTitle}</p>
              <p className="text-sm"><strong>Date :</strong> {data.date ? new Date(data.date).toLocaleDateString("fr-FR") : "-"}</p>
              <p className="text-sm"><strong>Période :</strong> {data.period}</p>
              {timeDisplay && <p className="text-sm"><strong>Horaires :</strong> {timeDisplay}</p>}
            </div>
            <div className="flex gap-2 justify-center">
              <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                <LogIn className="w-3 h-3" /> Entrée signée
              </Badge>
              <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                <LogOut className="w-3 h-3" /> Sortie signée
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Vous pouvez fermer cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine current step
  const currentMode: "entry" | "exit" = entryDone ? "exit" : "entry";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <PageLayout className="max-w-lg w-full p-0">
        <PageHeader title="Émargement de présence" subtitle="Signez pour confirmer votre présence" />
        <Card className="w-full">
          <CardContent className="space-y-4 pt-6">
            {/* Session info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="text-sm"><strong>Stagiaire :</strong> {data.traineeName}</p>
              <p className="text-sm"><strong>Formation :</strong> {data.sessionTitle}</p>
              <p className="text-sm"><strong>Date :</strong> {data.date ? new Date(data.date).toLocaleDateString("fr-FR") : "-"}</p>
              <p className="text-sm"><strong>Période :</strong> {data.period}</p>
              {timeDisplay && (
                <p className="text-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <strong>Horaires :</strong> {timeDisplay}
                </p>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-3 justify-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                entryDone ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700 animate-pulse"
              }`}>
                <LogIn className="w-4 h-4" />
                {entryDone ? "Entrée signée" : "1. Signature d'entrée"}
              </div>
              <div className="w-6 h-px bg-border" />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                exitDone ? "bg-green-100 text-green-700" : entryDone ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-muted text-muted-foreground"
              }`}>
                <LogOut className="w-4 h-4" />
                {exitDone ? "Sortie signée" : "2. Signature de sortie"}
              </div>
            </div>

            {/* Signing area */}
            <div className="rounded-lg border-2 border-dashed border-primary/20 p-4">
              <h3 className="text-center font-semibold mb-3">
                {currentMode === "entry" ? "Signature d'entrée" : "Signature de sortie"}
              </h3>

              {isVisio ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-blue-700">
                      Session en visioconférence — cliquez pour confirmer votre {currentMode === "entry" ? "arrivée" : "départ"}.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleVisioSign(currentMode)}
                    disabled={signMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {signMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : currentMode === "entry" ? (
                      <Video className="w-4 h-4 mr-2" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    {signMutation.isPending
                      ? "Confirmation..."
                      : currentMode === "entry"
                        ? "Confirmer mon arrivée"
                        : "Confirmer mon départ"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Tracez votre signature ci-dessous :
                  </p>
                  <div className="border rounded-lg p-1 bg-white">
                    <canvas
                      ref={canvasRef}
                      width={460}
                      height={180}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={endDraw}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      Effacer
                    </Button>
                    <Button
                      onClick={() => handleSign(currentMode)}
                      disabled={!hasSignature || signMutation.isPending}
                    >
                      {signMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : currentMode === "entry" ? (
                        <LogIn className="w-4 h-4 mr-2" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      {signMutation.isPending
                        ? "Enregistrement..."
                        : currentMode === "entry"
                          ? "Signer mon entrée"
                          : "Signer ma sortie"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {signMutation.isError && (
              <p className="text-sm text-red-600 text-center">
                {(signMutation.error as Error).message || "Erreur lors de l'émargement"}
              </p>
            )}
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  );
}
