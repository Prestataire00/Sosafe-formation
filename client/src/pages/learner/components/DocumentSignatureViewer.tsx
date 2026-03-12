import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  ChevronLeft,
  PenTool,
  CheckCircle,
  Eraser,
  Send,
  FileText,
  Printer,
} from "lucide-react";

interface DocumentSignatureViewerProps {
  title: string;
  type: string;
  content: string;
  onSign: (signatureData: string) => void;
  onClose: () => void;
  isPending: boolean;
  isAlreadySigned?: boolean;
}

export function DocumentSignatureViewer({
  title,
  type,
  content,
  onSign,
  onClose,
  isPending,
  isAlreadySigned = false,
}: DocumentSignatureViewerProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      setIsDrawing(true);
      setHasSignature(true);
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      ctx.beginPath();
      ctx.moveTo(clientX - rect.left, clientY - rect.top);
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
    },
    [isDrawing]
  );

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const handleSign = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    onSign(canvas.toDataURL("image/png"));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>${title}</title>
      <style>
        body { margin: 0; padding: 20px; }
        @media print { body { padding: 0; } }
      </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const TYPE_LABELS: Record<string, string> = {
    convention: "Convention de formation",
    convocation: "Convocation",
    attestation: "Attestation",
    programme: "Programme",
    reglement: "Règlement intérieur",
    certificat: "Certificat",
    facture: "Facture",
    devis: "Devis",
    contrat: "Contrat",
    emargement: "Feuille d'émargement",
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="h-14 border-b flex items-center px-4 gap-4 shrink-0 bg-background">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 shrink-0">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Retour</span>
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[type] || type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAlreadySigned ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Signé
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
              <PenTool className="w-3 h-3 mr-1" />
              En attente de signature
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex gap-2">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* DOCUMENT AREA */}
        <ScrollArea className="flex-1">
          <div className="bg-neutral-100 dark:bg-neutral-900 min-h-full py-6 px-4 sm:px-8">
            {/* Paper */}
            <div className="max-w-[850px] mx-auto bg-white dark:bg-gray-950 shadow-lg rounded-sm border">
              <div
                className="document-render"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>

            {/* Signature section - below the document */}
            {!isAlreadySigned && (
              <div className="max-w-[850px] mx-auto mt-6">
                {!showSignaturePad ? (
                  <div className="bg-white dark:bg-gray-950 shadow-lg rounded-sm border p-6 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <PenTool className="w-5 h-5" />
                      <p className="font-medium">Ce document nécessite votre signature</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      En signant, vous confirmez avoir pris connaissance du contenu de ce document
                      et acceptez ses termes. Le document signé sera automatiquement retourné à l'administrateur.
                    </p>
                    <Button size="lg" onClick={() => setShowSignaturePad(true)} className="gap-2">
                      <PenTool className="w-4 h-4" />
                      Signer ce document
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-950 shadow-lg rounded-sm border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-primary" />
                        Votre signature
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowSignaturePad(false); clearCanvas(); }}
                      >
                        Annuler
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dessinez votre signature dans la zone ci-dessous avec la souris ou le doigt.
                    </p>
                    <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-1 bg-white dark:bg-gray-950">
                      <canvas
                        ref={canvasRef}
                        width={750}
                        height={200}
                        className="w-full cursor-crosshair touch-none rounded"
                        style={{ height: "180px" }}
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
                      <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-2">
                        <Eraser className="w-4 h-4" />
                        Effacer
                      </Button>
                      <Button
                        size="lg"
                        disabled={!hasSignature || isPending}
                        onClick={handleSign}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {isPending ? "Envoi en cours..." : "Signer et retourner à l'administrateur"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      En cliquant sur "Signer et retourner", votre signature sera apposée sur le document
                      et celui-ci sera transmis automatiquement à l'organisme de formation.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Already signed confirmation */}
            {isAlreadySigned && (
              <div className="max-w-[850px] mx-auto mt-6">
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-sm p-6 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Document signé et retourné
                  </p>
                  <p className="text-sm text-green-600/70 dark:text-green-400/70">
                    Votre signature a été enregistrée et le document a été transmis à l'administrateur.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
