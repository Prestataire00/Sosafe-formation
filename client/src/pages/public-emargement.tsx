import { useState, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { CheckCircle, PenLine, Loader2, Video } from "lucide-react";

interface EmargementInfo {
  traineeName: string;
  sessionTitle: string;
  date: string;
  period: string;
  modality: string;
  alreadySigned: boolean;
}

export default function PublicEmargement() {
  const [, params] = useRoute("/emargement/:token");
  const token = params?.token;

  const { data, isLoading, error } = useQuery<EmargementInfo>({
    queryKey: [`/api/public/emargement/${token}`],
    enabled: !!token,
    queryFn: async () => {
      const resp = await fetch(`/api/public/emargement/${token}`);
      if (!resp.ok) throw new Error("Lien invalide");
      return resp.json();
    },
  });

  const [signed, setSigned] = useState(false);

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
    mutationFn: async (signatureData?: string) => {
      const resp = await fetch(`/api/public/emargement/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: signatureData || null }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message);
      }
      return resp.json();
    },
    onSuccess: () => setSigned(true),
  });

  const handleSign = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    signMutation.mutate(canvas.toDataURL("image/png"));
  };

  const handleVisioSign = () => {
    signMutation.mutate(undefined);
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
            <p className="text-red-600 font-medium">Lien d'emargement invalide ou expire.</p>
            <p className="text-sm text-muted-foreground mt-2">Veuillez contacter votre formateur.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.alreadySigned || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Emargement enregistre</h2>
            <p className="text-muted-foreground">
              Votre presence a ete confirmee pour :
            </p>
            <div className="bg-green-50 rounded-lg p-4 text-left space-y-1">
              <p className="text-sm"><strong>Formation :</strong> {data.sessionTitle}</p>
              <p className="text-sm"><strong>Date :</strong> {data.date ? new Date(data.date).toLocaleDateString("fr-FR") : "-"}</p>
              <p className="text-sm"><strong>Periode :</strong> {data.period}</p>
            </div>
            <p className="text-xs text-muted-foreground">Vous pouvez fermer cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVisio = data.modality === "distanciel";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <PageLayout className="max-w-lg w-full p-0">
        <PageHeader title="Emargement de présence" subtitle="Signez pour confirmer votre présence" />
        <Card className="w-full">
          <CardContent className="space-y-4 pt-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-sm"><strong>Stagiaire :</strong> {data.traineeName}</p>
            <p className="text-sm"><strong>Formation :</strong> {data.sessionTitle}</p>
            <p className="text-sm"><strong>Date :</strong> {data.date ? new Date(data.date).toLocaleDateString("fr-FR") : "-"}</p>
            <p className="text-sm"><strong>Periode :</strong> {data.period}</p>
          </div>

          {isVisio ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-700">
                  Session en visioconference — cliquez sur le bouton ci-dessous pour confirmer votre presence.
                </p>
              </div>
              <Button
                onClick={handleVisioSign}
                disabled={signMutation.isPending}
                className="w-full"
                size="lg"
              >
                {signMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Video className="w-4 h-4 mr-2" />
                )}
                {signMutation.isPending ? "Confirmation..." : "Confirmer ma presence"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Tracez votre signature ci-dessous :</p>
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
                <Button onClick={handleSign} disabled={!hasSignature || signMutation.isPending}>
                  {signMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PenLine className="w-4 h-4 mr-2" />
                  )}
                  {signMutation.isPending ? "Enregistrement..." : "Valider mon emargement"}
                </Button>
              </div>
            </div>
          )}

          {signMutation.isError && (
            <p className="text-sm text-red-600 text-center">
              {(signMutation.error as Error).message || "Erreur lors de l'emargement"}
            </p>
          )}
        </CardContent>
      </Card>
      </PageLayout>
    </div>
  );
}
