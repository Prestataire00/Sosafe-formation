import { useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  MapPin,
  CheckCircle,
  PenTool,
  Receipt,
  Upload,
  Eye,
  Download,
  Plus,
  ChevronDown,
  Users,
  BookOpen,
  CreditCard,
  Award,
  AlertTriangle,
  TrendingUp,
  ClipboardCheck,
  BarChart3,
  MonitorPlay,
  Maximize2,
  Play,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Session, TrainerDocument, ExpenseNote, TrainerInvoice, Program, Trainee, TrainerCompetency, SessionDate, Enrollment, ElearningModule } from "@shared/schema";
import { ImmersiveModuleViewer } from "@/pages/learner/components/ImmersiveModuleViewer";
import { DocumentSignatureViewer } from "@/pages/learner/components/DocumentSignatureViewer";
import { PageLayout } from "@/components/shared/PageLayout";
import { Progress } from "@/components/ui/progress";
import {
  TRAINER_DOCUMENT_TYPES,
  TRAINER_DOCUMENT_STATUSES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  TRAINER_INVOICE_STATUSES,
  COMPETENCY_LEVELS,
  COMPETENCY_STATUSES,
} from "@shared/schema";

// ============================================================
// HELPERS
// ============================================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SessionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    ongoing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels: Record<string, string> = {
    planned: "Planifiee",
    ongoing: "En cours",
    completed: "Terminee",
    cancelled: "Annulee",
  };
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

function ModalityBadge({ modality }: { modality: string }) {
  const labels: Record<string, string> = {
    presentiel: "Presentiel",
    distanciel: "Distanciel",
    blended: "Blended Learning",
  };
  return (
    <Badge variant="secondary" className="text-xs">
      {labels[modality] || modality}
    </Badge>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  const found = TRAINER_DOCUMENT_STATUSES.find((s) => s.value === status);
  return (
    <Badge variant="outline" className={found?.color || ""}>
      {found?.label || status}
    </Badge>
  );
}

function documentTypeLabel(type: string): string {
  const found = TRAINER_DOCUMENT_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

// ============================================================
// DOCUMENT PREVIEW DIALOG
// ============================================================

function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  mimeType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
}) {
  if (!fileUrl) return null;
  const isPdf = mimeType === "application/pdf" || /\.pdf(\?|$)/i.test(fileUrl);
  const isImage = mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(fileUrl);
  const isOffice = /\.(doc|docx|xls|xlsx)(\?|$)/i.test(fileUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{fileName || "Apercu du document"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 mt-2">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-[70vh] rounded-lg border" title={fileName || "PDF"} />
          ) : isImage ? (
            <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
              <img src={fileUrl} alt={fileName || "Image"} className="max-w-full max-h-[65vh] rounded-lg object-contain" />
            </div>
          ) : isOffice ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              className="w-full h-[70vh] rounded-lg border"
              title={fileName || "Document"}
            />
          ) : (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">L'apercu n'est pas disponible pour ce type de fichier.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t mt-3">
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Telecharger
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// SIGNATURE PAD COMPONENT
// ============================================================

function TrainerSignaturePad({ trainerId }: { trainerId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<"draw" | "auto">("draw");
  const [selectedFont, setSelectedFont] = useState("Dancing Script");

  const fonts = [
    { name: "Dancing Script", label: "Cursive" },
    { name: "Great Vibes", label: "Elegante" },
    { name: "Caveat", label: "Manuscrite" },
    { name: "Satisfy", label: "Fluide" },
  ];

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";

  interface SignatureRecord {
    id: string;
    signerId: string;
    signerType: string;
    documentType: string;
    relatedId: string | null;
    signatureData: string | null;
    signedAt: string | null;
    ipAddress: string | null;
  }

  const { data: existingSignatures } = useQuery<SignatureRecord[]>({
    queryKey: [`/api/signatures?signerId=${trainerId}`],
    enabled: !!trainerId,
  });

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, [getCtx, mode]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== "draw") return;
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
  }, [isDrawing, getCtx, mode]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  }, []);

  const generateAutoSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fullName) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `italic 48px '${selectedFont}', cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fullName, canvas.width / 2, canvas.height / 2);
    setHasSignature(true);
  }, [fullName, selectedFont]);

  const submitSignatureMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/signatures", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${trainerId}`] });
      toast({ title: "Signature enregistree avec succes" });
      clearCanvas();
    },
    onError: () =>
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" }),
  });

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const signatureData = canvas.toDataURL("image/png");
    submitSignatureMutation.mutate({
      signerId: trainerId,
      signerType: "trainer",
      documentType: "contrat",
      relatedId: null,
      signatureData,
    });
  };

  // --- Pending document signatures ---
  const { data: pendingDocs } = useQuery<Array<{ id: string; title: string; type: string; content: string }>>({
    queryKey: [`/api/pending-signatures?signerId=${trainerId}&signerType=trainer`],
    enabled: !!trainerId,
  });

  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [previewDocContent, setPreviewDocContent] = useState<{ title: string; content: string } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ id: string; title: string; type: string; content: string } | null>(null);

  const signDocumentMutation = useMutation({
    mutationFn: (data: { documentId: string; signatureData: string }) =>
      apiRequest("POST", `/api/pending-signatures/${data.documentId}/sign`, {
        signerId: trainerId,
        signerType: "trainer",
        signatureData: data.signatureData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pending-signatures?signerId=${trainerId}&signerType=trainer`] });
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${trainerId}`] });
      toast({ title: "Document signé et retourné à l'administrateur" });
      setSigningDocId(null);
      setViewingDoc(null);
    },
    onError: () => toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  const batchSignDocsMutation = useMutation({
    mutationFn: (data: { documentIds: string[]; signatureData: string }) =>
      apiRequest("POST", "/api/pending-signatures/batch-sign", {
        documentIds: data.documentIds,
        signerId: trainerId,
        signerType: "trainer",
        signatureData: data.signatureData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pending-signatures?signerId=${trainerId}&signerType=trainer`] });
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${trainerId}`] });
      toast({ title: "Tous les documents ont ete signes" });
    },
    onError: () => toast({ title: "Erreur lors de la signature en lot", variant: "destructive" }),
  });

  const [showBatchSign, setShowBatchSign] = useState(false);

  // --- Reusable simple signature canvas for document signing ---
  const docCanvasRef = useRef<HTMLCanvasElement>(null);
  const [docHasSignature, setDocHasSignature] = useState(false);
  const [docIsDrawing, setDocIsDrawing] = useState(false);

  const docStartDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = docCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setDocIsDrawing(true);
    setDocHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, []);

  const docDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!docIsDrawing) return;
    const canvas = docCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }, [docIsDrawing]);

  const docEndDraw = useCallback(() => setDocIsDrawing(false), []);

  const clearDocCanvas = useCallback(() => {
    const canvas = docCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDocHasSignature(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Pending document signatures */}
      {pendingDocs && pendingDocs.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                Documents a signer ({pendingDocs.length})
              </CardTitle>
              {pendingDocs.length > 1 && !showBatchSign && (
                <Button size="sm" onClick={() => setShowBatchSign(true)}>
                  Tout signer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showBatchSign && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                <p className="text-sm font-medium">Signer les {pendingDocs.length} documents en une fois</p>
                <div className="border rounded-lg p-1 bg-white dark:bg-gray-950">
                  <canvas
                    ref={docCanvasRef}
                    width={500}
                    height={200}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={docStartDraw}
                    onMouseMove={docDraw}
                    onMouseUp={docEndDraw}
                    onMouseLeave={docEndDraw}
                    onTouchStart={docStartDraw}
                    onTouchMove={docDraw}
                    onTouchEnd={docEndDraw}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={clearDocCanvas}>
                    Effacer
                  </Button>
                  <Button
                    size="sm"
                    disabled={!docHasSignature || batchSignDocsMutation.isPending}
                    onClick={() => {
                      const canvas = docCanvasRef.current;
                      if (!canvas || !docHasSignature) return;
                      batchSignDocsMutation.mutate({
                        documentIds: pendingDocs.map((d) => d.id),
                        signatureData: canvas.toDataURL("image/png"),
                      });
                    }}
                  >
                    {batchSignDocsMutation.isPending ? "Envoi..." : "Signer tous les documents"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowBatchSign(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
            {!showBatchSign &&
              pendingDocs.map((doc) => {
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setViewingDoc(doc)}
                      className="gap-2 shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                      Consulter et signer
                    </Button>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Document preview dialog */}
      {previewDocContent && (
        <Dialog open={!!previewDocContent} onOpenChange={(open) => { if (!open) setPreviewDocContent(null); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b">
              <DialogTitle>{previewDocContent.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto bg-neutral-100 p-6">
              <div className="shadow-md bg-white rounded min-h-[400px]">
                <div dangerouslySetInnerHTML={{ __html: previewDocContent.content }} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Load Google Fonts for auto-signature */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Caveat&family=Satisfy&display=swap" rel="stylesheet" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Signature electronique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez votre mode de signature pour les contrats et documents.
          </p>

          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => { setMode("draw"); clearCanvas(); }}
            >
              <PenTool className="w-4 h-4 mr-2" />
              Dessiner
            </Button>
            <Button
              variant={mode === "auto" ? "default" : "outline"}
              size="sm"
              onClick={() => { setMode("auto"); clearCanvas(); }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Generer automatiquement
            </Button>
          </div>

          {/* Auto-generate options */}
          {mode === "auto" && (
            <div className="space-y-3">
              <Label className="text-sm">Style de signature</Label>
              <div className="grid grid-cols-2 gap-2">
                {fonts.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setSelectedFont(f.name)}
                    className={`p-3 rounded-lg border text-center transition-colors ${selectedFont === f.name ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"}`}
                  >
                    <span style={{ fontFamily: `'${f.name}', cursive`, fontSize: "22px" }}>{fullName || "Prenom Nom"}</span>
                    <p className="text-xs text-muted-foreground mt-1">{f.label}</p>
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={generateAutoSignature} disabled={!fullName}>
                Appliquer sur le canevas
              </Button>
            </div>
          )}

          {/* Canvas */}
          <div className="border rounded-lg p-1 bg-white dark:bg-gray-950">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className={`w-full touch-none ${mode === "draw" ? "cursor-crosshair" : "cursor-default"}`}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              Effacer
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!hasSignature || submitSignatureMutation.isPending}
            >
              {submitSignatureMutation.isPending ? "Envoi..." : "Valider la signature"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing signatures */}
      {existingSignatures && existingSignatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signatures precedentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingSignatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {sig.signatureData && (
                      <img src={sig.signatureData} alt="Signature" className="h-10 w-auto rounded border bg-white" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {sig.documentType === "contrat" ? "Contrat" : sig.documentType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Signe le {sig.signedAt ? formatDate(sig.signedAt) : "—"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Signee
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Full-screen document viewer with signature */}
      {viewingDoc &&
        createPortal(
          <DocumentSignatureViewer
            title={viewingDoc.title}
            type={viewingDoc.type}
            content={viewingDoc.content}
            onSign={(sig) => signDocumentMutation.mutate({ documentId: viewingDoc.id, signatureData: sig })}
            onClose={() => setViewingDoc(null)}
            isPending={signDocumentMutation.isPending}
          />,
          document.body
        )}
    </div>
  );
}

// ============================================================
// EXPENSE NOTES TAB
// ============================================================

function ExpenseNotesTab({ trainerId }: { trainerId: string }) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("deplacement");
  const [customCategory, setCustomCategory] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expenseNotes, isLoading } = useQuery<ExpenseNote[]>({
    queryKey: [`/api/trainers/${trainerId}/expense-notes`],
    enabled: !!trainerId,
  });

  const handleCreate = async () => {
    if (!title || !amount || !date) return;
    setIsSubmitting(true);
    try {
      let fileUrl = null;
      if (file) {
        const uploaded = await uploadFile(file);
        fileUrl = uploaded.fileUrl;
      }
      await apiRequest("POST", `/api/trainers/${trainerId}/expense-notes`, {
        title,
        amount: Math.round(parseFloat(amount) * 100),
        category: category === "autre" && customCategory ? customCategory : category,
        date,
        notes: notes || null,
        fileUrl,
        status: "submitted",
        reviewedBy: null,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/expense-notes`] });
      toast({ title: "Note de frais creee avec succes" });
      setTitle("");
      setAmount("");
      setCategory("deplacement");
      setCustomCategory("");
      setDate("");
      setNotes("");
      setFile(null);
      setShowCreateDialog(false);
    } catch {
      toast({ title: "Erreur lors de la creation", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  const getStatusInfo = (status: string) => {
    return EXPENSE_STATUSES.find((s) => s.value === status) || { label: status, color: "" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Notes de frais
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle note de frais
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!expenseNotes || expenseNotes.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune note de frais soumise pour le moment.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Piece jointe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseNotes.map((note) => {
                  const statusInfo = getStatusInfo(note.status);
                  return (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.title}</TableCell>
                      <TableCell>{(note.amount / 100).toFixed(2)} EUR</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(note.category)}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(note.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {note.fileUrl ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={note.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create expense note dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle note de frais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Deplacement Paris-Lyon" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant (EUR)</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); if (v !== "autre") setCustomCategory(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {category === "autre" && (
              <div className="space-y-2">
                <Label>Preciser la categorie</Label>
                <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Ex: Fournitures, Impression..." required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details supplementaires..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Piece jointe (optionnel)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleCreate} disabled={!title || !amount || !date || (category === "autre" && !customCategory) || isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creation en cours...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Creer la note de frais
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// TRAINER INVOICES TAB
// ============================================================

function TrainerInvoicesTab({ trainerId }: { trainerId: string }) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [amountHt, setAmountHt] = useState("");
  const [taxRate, setTaxRate] = useState("20");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: trainerInvoices, isLoading } = useQuery<TrainerInvoice[]>({
    queryKey: [`/api/trainers/${trainerId}/invoices`],
    enabled: !!trainerId,
  });

  const computedTax = useMemo(() => {
    const ht = Math.round(parseFloat(amountHt || "0") * 100);
    const rate = parseInt(taxRate || "20", 10);
    const taxAmount = Math.round(ht * rate / 100);
    const totalTtc = ht + taxAmount;
    return { ht, rate: rate * 100, taxAmount, totalTtc };
  }, [amountHt, taxRate]);

  const handleCreate = async () => {
    if (!title || !number || !amountHt || !file) return;
    setIsSubmitting(true);
    try {
      const uploaded = await uploadFile(file);
      await apiRequest("POST", `/api/trainers/${trainerId}/invoices`, {
        number,
        title,
        amount: computedTax.ht,
        taxRate: computedTax.rate,
        taxAmount: computedTax.taxAmount,
        totalTtc: computedTax.totalTtc,
        fileUrl: uploaded.fileUrl,
        status: "submitted",
        paidAt: null,
        notes: notes || null,
        reviewedBy: null,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/invoices`] });
      toast({ title: "Facture soumise avec succes" });
      setTitle(""); setNumber(""); setAmountHt(""); setTaxRate("20"); setNotes(""); setFile(null);
      setShowCreateDialog(false);
    } catch {
      toast({ title: "Erreur lors de la soumission", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return TRAINER_INVOICE_STATUSES.find((s) => s.value === status) || { label: status, color: "" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Factures de prestation
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!trainerInvoices || trainerInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune facture soumise pour le moment.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead className="text-right">Montant HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">TTC</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainerInvoices.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                      <TableCell className="font-medium">{inv.title}</TableCell>
                      <TableCell className="text-right">{(inv.amount / 100).toFixed(2)} EUR</TableCell>
                      <TableCell className="text-right">{(inv.taxAmount / 100).toFixed(2)} EUR</TableCell>
                      <TableCell className="text-right font-medium">{(inv.totalTtc / 100).toFixed(2)} EUR</TableCell>
                      <TableCell>{inv.submittedAt ? formatDate(inv.submittedAt as unknown as string) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inv.fileUrl ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create invoice dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soumettre une facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° de reference</Label>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="FAC-2026-001" />
              </div>
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prestation session AFGSU" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant HT (EUR)</Label>
                <Input type="number" step="0.01" min="0" value={amountHt} onChange={(e) => setAmountHt(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Taux TVA (%)</Label>
                <Select value={taxRate} onValueChange={setTaxRate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5.5">5.5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {amountHt && parseFloat(amountHt) > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Montant HT</span>
                  <span>{(computedTax.ht / 100).toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA ({taxRate}%)</span>
                  <span>{(computedTax.taxAmount / 100).toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total TTC</span>
                  <span>{(computedTax.totalTtc / 100).toFixed(2)} EUR</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details supplementaires..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Fichier PDF (obligatoire)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleCreate} disabled={!title || !number || !amountHt || !file || isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Soumettre la facture
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// COMPETENCIES TAB (read-only)
// ============================================================

type SatisfactionStats = {
  avgRating: number;
  totalResponses: number;
  satisfactionScore: number;
  perYear: { year: number; avgRating: number; count: number }[];
};

// ============================================================
// PLANNING / DISPONIBILITES TAB — Vue calendrier
// ============================================================

function PlanningTab({ trainerId }: { trainerId: string }) {
  const { toast } = useToast();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [paintMode, setPaintMode] = useState<"available" | "unavailable" | null>(null);
  const [reasonDialog, setReasonDialog] = useState<{ date: string; type: string; existingId?: string } | null>(null);
  const [reason, setReason] = useState("");

  const { data: availabilities, isLoading } = useQuery<any[]>({
    queryKey: [`/api/trainers/${trainerId}/availabilities`],
    enabled: !!trainerId,
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: [`/api/trainers/${trainerId}/sessions`],
    enabled: !!trainerId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/trainers/${trainerId}/availabilities`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/availabilities`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/trainer-availabilities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/availabilities`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/trainer-availabilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/availabilities`] });
    },
  });

  // Build a map: dateStr -> { type, id, reason }
  const dateMap = useMemo(() => {
    const map = new Map<string, { type: string; id: string; reason: string | null }>();
    for (const a of availabilities || []) {
      const start = new Date(a.startDate + "T00:00:00");
      const end = new Date(a.endDate + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        map.set(key, { type: a.type, id: a.id, reason: a.reason });
      }
    }
    return map;
  }, [availabilities]);

  // Session days map
  const sessionDays = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions || []) {
      const start = new Date(s.startDate + "T00:00:00");
      const end = new Date(s.endDate + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        map.set(d.toISOString().split("T")[0], s.title);
      }
    }
    return map;
  }, [sessions]);

  // Calendar generation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const handleCellClick = (dateStr: string) => {
    const existing = dateMap.get(dateStr);

    if (paintMode) {
      // Quick paint mode
      if (existing && existing.type === paintMode) {
        // Same type: remove
        deleteMutation.mutate(existing.id);
        return;
      }
      if (existing) {
        // Different type: switch
        deleteMutation.mutate(existing.id);
      }
      if (paintMode === "unavailable") {
        // Ask for reason
        setReasonDialog({ date: dateStr, type: "unavailable" });
        setReason("");
      } else {
        createMutation.mutate({
          type: "available",
          startDate: dateStr,
          endDate: dateStr,
          createdBy: "trainer",
        });
      }
      return;
    }

    // No paint mode: show details or toggle
    if (existing) {
      setSelectedDate(dateStr);
    } else {
      setSelectedDate(dateStr);
    }
  };

  const handleReasonSubmit = () => {
    if (reasonDialog) {
      createMutation.mutate({
        type: reasonDialog.type,
        startDate: reasonDialog.date,
        endDate: reasonDialog.date,
        reason: reason || null,
        createdBy: "trainer",
      });
      setReasonDialog(null);
      setReason("");
    }
  };

  const handleQuickSet = (type: "available" | "unavailable") => {
    if (!selectedDate) return;
    const existing = dateMap.get(selectedDate);
    if (existing) {
      deleteMutation.mutate(existing.id);
    }
    if (type === "unavailable") {
      setReasonDialog({ date: selectedDate, type: "unavailable" });
      setReason("");
      setSelectedDate(null);
    } else {
      createMutation.mutate({
        type: "available",
        startDate: selectedDate,
        endDate: selectedDate,
        createdBy: "trainer",
      });
      setSelectedDate(null);
    }
  };

  const handleRemove = () => {
    if (!selectedDate) return;
    const existing = dateMap.get(selectedDate);
    if (existing) deleteMutation.mutate(existing.id);
    setSelectedDate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedInfo = selectedDate ? dateMap.get(selectedDate) : null;
  const selectedSession = selectedDate ? sessionDays.get(selectedDate) : null;

  return (
    <div className="space-y-4">
      {/* Légende + mode peinture */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span>Indisponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span>Session planifiée</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mode peinture :</span>
              <Button
                size="sm"
                variant={paintMode === "available" ? "default" : "outline"}
                className={paintMode === "available" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                onClick={() => setPaintMode(paintMode === "available" ? null : "available")}
              >
                Dispo
              </Button>
              <Button
                size="sm"
                variant={paintMode === "unavailable" ? "default" : "outline"}
                className={paintMode === "unavailable" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setPaintMode(paintMode === "unavailable" ? null : "unavailable")}
              >
                Indispo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendrier */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronDown className="w-4 h-4 rotate-90" />
            </Button>
            <CardTitle className="text-lg capitalize">{monthName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {/* Cellules vides avant le 1er */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Jours du mois */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const info = dateMap.get(dateStr);
              const session = sessionDays.get(dateStr);
              const isToday = dateStr === today.toISOString().split("T")[0];
              const isWeekend = ((firstDayOfWeek + i) % 7) >= 5;
              const isSelected = selectedDate === dateStr;

              let bgClass = "bg-muted/30 hover:bg-muted/60";
              if (info?.type === "available") bgClass = "bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60";
              if (info?.type === "unavailable") bgClass = "bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60";
              if (isWeekend && !info) bgClass = "bg-muted/10 hover:bg-muted/30";

              return (
                <button
                  key={day}
                  onClick={() => handleCellClick(dateStr)}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-sm
                    ${bgClass}
                    ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                    ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                    ${paintMode ? "cursor-pointer" : "cursor-pointer"}
                  `}
                >
                  <span className={`font-medium ${isToday ? "text-primary" : ""} ${info?.type === "unavailable" ? "text-red-700 dark:text-red-300" : ""} ${info?.type === "available" ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                    {day}
                  </span>
                  {session && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                  {info?.reason && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Détail du jour sélectionné */}
      {selectedDate && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                {selectedInfo && (
                  <p className="text-sm mt-1">
                    <Badge variant={selectedInfo.type === "available" ? "default" : "destructive"} className={selectedInfo.type === "available" ? "bg-emerald-600" : ""}>
                      {selectedInfo.type === "available" ? "Disponible" : "Indisponible"}
                    </Badge>
                    {selectedInfo.reason && <span className="ml-2 text-muted-foreground">— {selectedInfo.reason}</span>}
                  </p>
                )}
                {selectedSession && (
                  <p className="text-sm mt-1 text-blue-600">Session : {selectedSession}</p>
                )}
                {!selectedInfo && !selectedSession && (
                  <p className="text-sm text-muted-foreground mt-1">Aucun statut défini</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleQuickSet("available")}>
                  Dispo
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleQuickSet("unavailable")}>
                  Indispo
                </Button>
                {selectedInfo && (
                  <Button size="sm" variant="outline" onClick={handleRemove}>
                    Effacer
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog motif indisponibilité */}
      <Dialog open={!!reasonDialog} onOpenChange={(open) => { if (!open) setReasonDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motif d'indisponibilité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {reasonDialog && new Date(reasonDialog.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="space-y-2">
              <Label>Motif (optionnel)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Congés, RDV médical, formation personnelle..."
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleReasonSubmit(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReasonDialog(null)}>Annuler</Button>
              <Button variant="destructive" onClick={handleReasonSubmit}>
                Marquer indisponible
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompetenciesTab({ trainerId }: { trainerId: string }) {
  const { data: competencies, isLoading } = useQuery<TrainerCompetency[]>({
    queryKey: [`/api/trainers/${trainerId}/competencies`],
    enabled: !!trainerId,
  });

  const { data: satisfaction } = useQuery<SatisfactionStats>({
    queryKey: [`/api/trainers/${trainerId}/satisfaction-stats`],
    enabled: !!trainerId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeComps = competencies?.filter((c) => c.status === "active") || [];
  const expiredComps = competencies?.filter((c) => c.status === "expired") || [];
  const renewalComps = competencies?.filter((c) => c.status === "renewal") || [];

  return (
    <div className="space-y-4">
      {/* Satisfaction summary */}
      {satisfaction && satisfaction.totalResponses > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Satisfaction des apprenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{satisfaction.avgRating}/5</p>
                <p className="text-xs text-muted-foreground">Note moyenne</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{satisfaction.satisfactionScore}%</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{satisfaction.totalResponses}</p>
                <p className="text-xs text-muted-foreground">Reponses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {(expiredComps.length > 0 || renewalComps.length > 0) && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Alertes de competences</p>
              <p className="text-xs text-muted-foreground mt-1">
                {expiredComps.length > 0 && `${expiredComps.length} competence(s) expiree(s). `}
                {renewalComps.length > 0 && `${renewalComps.length} en cours de renouvellement.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competencies list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5" />
            Mes competences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!competencies || competencies.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune competence enregistree dans votre profil.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Libelle</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Obtention</TableHead>
                  <TableHead>Expiration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competencies.map((comp) => {
                  const levelInfo = COMPETENCY_LEVELS.find((l) => l.value === comp.level) || COMPETENCY_LEVELS[0];
                  const statusInfo = COMPETENCY_STATUSES.find((s) => s.value === comp.status) || COMPETENCY_STATUSES[0];
                  return (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{comp.domain}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{comp.competencyLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${levelInfo.color}`}>{levelInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {comp.obtainedAt ? formatDate(comp.obtainedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {comp.expiresAt ? formatDate(comp.expiresAt) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// ENRICHED SESSION CARD
// ============================================================

function EnrichedSessionCard({ session }: { session: Session }) {
  const [traineesOpen, setTraineesOpen] = useState(false);
  const [addTraineeOpen, setAddTraineeOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const { toast } = useToast();

  const addTraineeMutation = useMutation({
    mutationFn: async () => {
      // 1. Create trainee
      const trainee = await apiRequest("POST", "/api/trainees", {
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        phone: newPhone || null,
        status: "active",
      });
      const traineeData = await trainee.json();
      // 2. Enroll in session
      await apiRequest("POST", "/api/enrollments", {
        sessionId: session.id,
        traineeId: traineeData.id,
        status: "confirmed",
      });
      return traineeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session.id}/trainees`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${session.id}/enrollment-count`] });
      setAddTraineeOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      toast({ title: "Stagiaire ajouté et inscrit à la session" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Erreur";
      toast({ title: msg.includes("unique") || msg.includes("existe") ? "Un stagiaire avec cet email existe déjà" : msg, variant: "destructive" });
    },
  });

  const { data: program } = useQuery<Program>({
    queryKey: [`/api/programs/${session.programId}`],
    enabled: !!session.programId,
  });

  const { data: enrollmentCount } = useQuery<{ count: number }>({
    queryKey: [`/api/sessions/${session.id}/enrollment-count`],
  });

  const { data: sessionTrainees, isLoading: traineesLoading } = useQuery<Trainee[]>({
    queryKey: [`/api/sessions/${session.id}/trainees`],
    enabled: traineesOpen,
  });

  const { data: interventionDates } = useQuery<SessionDate[]>({
    queryKey: [`/api/sessions/${session.id}/dates`],
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{session.title}</CardTitle>
          <SessionStatusBadge status={session.status} />
        </div>
        {program && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{program.title}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            {formatDate(session.startDate)} &mdash; {formatDate(session.endDate)}
          </span>
        </div>
        {interventionDates && interventionDates.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{interventionDates.length} jour(s) d'intervention</span>
            </div>
            <div className="flex flex-wrap gap-1 ml-6">
              {interventionDates.map((d) => (
                <Badge key={d.id} variant="outline" className="text-[10px] py-0 px-1.5">
                  {new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {session.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{session.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4 shrink-0" />
          <span>
            {enrollmentCount?.count ?? 0} / {session.maxParticipants} inscrits
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <ModalityBadge modality={session.modality} />
        </div>
        {session.notes && (
          <p className="text-xs text-muted-foreground mt-2 italic">{session.notes}</p>
        )}

        {/* Collapsible trainees list */}
        <Collapsible open={traineesOpen} onOpenChange={setTraineesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between mt-2">
              <span className="text-xs">Voir les stagiaires</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${traineesOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1">
              {traineesLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : sessionTrainees && sessionTrainees.length > 0 ? (
                sessionTrainees.map((trainee) => (
                  <div key={trainee.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span>{trainee.firstName} {trainee.lastName}</span>
                    {trainee.email && (
                      <a href={`mailto:${trainee.email}`} className="text-xs text-primary hover:underline ml-auto">{trainee.email}</a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun stagiaire inscrit</p>
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setAddTraineeOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> Ajouter un stagiaire
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Add trainee dialog */}
        <Dialog open={addTraineeOpen} onOpenChange={setAddTraineeOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Ajouter un stagiaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Prénom <span className="text-red-500">*</span></Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Prénom" />
              </div>
              <div className="space-y-1">
                <Label>Nom <span className="text-red-500">*</span></Label>
                <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Nom" />
              </div>
              <div className="space-y-1">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemple.com" />
              </div>
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="06 00 00 00 00" />
              </div>
              <Button
                className="w-full"
                disabled={!newFirstName || !newLastName || !newEmail || addTraineeMutation.isPending}
                onClick={() => addTraineeMutation.mutate()}
              >
                {addTraineeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Ajouter et inscrire
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ============================================================
// LEARNER PROGRESS TAB
// ============================================================

interface TraineeProgress {
  traineeId: string;
  firstName: string;
  lastName: string;
  email: string;
  enrollmentStatus: string;
  completedBlocks: number;
  totalBlocks: number;
  progressPercent: number;
}

interface SessionProgress {
  sessionId: string;
  sessionTitle: string;
  programTitle: string;
  startDate: string;
  endDate: string;
  moduleCount: number;
  trainees: TraineeProgress[];
}

function TrainerProgressTab() {
  const { data: progressData, isLoading } = useQuery<SessionProgress[]>({
    queryKey: ["/api/trainer/session-progress"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!progressData || progressData.length === 0) {
    return (
      <div className="text-center py-16">
        <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucune donnée</h3>
        <p className="text-sm text-muted-foreground">
          Aucun apprenant inscrit à vos sessions pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {progressData.map((sp) => {
        const avgProgress = sp.trainees.length > 0
          ? Math.round(sp.trainees.reduce((sum, t) => sum + t.progressPercent, 0) / sp.trainees.length)
          : 0;

        return (
          <Card key={sp.sessionId}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {sp.programTitle && (
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                      {sp.programTitle}
                    </p>
                  )}
                  <CardTitle className="text-lg">{sp.sessionTitle}</CardTitle>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(sp.startDate)} — {formatDate(sp.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {sp.trainees.length} apprenant{sp.trainees.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {sp.moduleCount} module{sp.moduleCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className={avgProgress >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : avgProgress >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}>
                  Moy. {avgProgress}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sp.trainees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun apprenant inscrit.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Apprenant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Progression</TableHead>
                        <TableHead className="text-right">Blocs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sp.trainees.map((t) => (
                        <TableRow key={t.traineeId}>
                          <TableCell className="font-medium">{t.firstName} {t.lastName}</TableCell>
                          <TableCell className="text-sm">{t.email ? <a href={`mailto:${t.email}`} className="text-primary hover:underline">{t.email}</a> : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {t.enrollmentStatus === "confirmed" ? "Confirmé" : t.enrollmentStatus === "completed" ? "Terminé" : t.enrollmentStatus === "attended" ? "Présent" : t.enrollmentStatus === "registered" ? "Inscrit" : t.enrollmentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${t.progressPercent >= 80 ? "bg-green-500" : t.progressPercent >= 40 ? "bg-amber-500" : "bg-gray-400"}`}
                                  style={{ width: `${t.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-8 text-right">{t.progressPercent}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {t.completedBlocks}/{t.totalBlocks}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// ATTENDANCE / ÉMARGEMENT TAB
// ============================================================

interface AttendanceSheetData {
  id: string;
  sessionId: string;
  date: string;
  period: string;
  notes: string | null;
}

interface AttendanceRecordData {
  id: string;
  sheetId: string;
  traineeId: string;
  status: string;
  signedAt: string | null;
  signatureData: string | null;
}

function TrainerAttendanceTab({ sessions }: { sessions: Session[] }) {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const { data: sheets, isLoading: sheetsLoading } = useQuery<AttendanceSheetData[]>({
    queryKey: ["/api/trainer/attendance"],
  });

  const sessionSheets = useMemo(() => {
    if (!sheets || !selectedSessionId) return [];
    return sheets.filter((s) => s.sessionId === selectedSessionId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sheets, selectedSessionId]);

  const [selectedSheetId, setSelectedSheetId] = useState<string>("");

  const { data: records } = useQuery<AttendanceRecordData[]>({
    queryKey: ["/api/trainer/attendance-records", { sheetId: selectedSheetId }],
    queryFn: async () => {
      if (!selectedSheetId) return [];
      const resp = await fetch(`/api/trainer/attendance-records?sheetId=${selectedSheetId}`, { credentials: "include" });
      return resp.json();
    },
    enabled: !!selectedSheetId,
  });

  // Fetch enrollments for selected session
  const { data: enrollments } = useQuery<any[]>({
    queryKey: [`/api/enrollments`, { sessionId: selectedSessionId }],
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const resp = await fetch(`/api/enrollments?sessionId=${selectedSessionId}`, { credentials: "include" });
      return resp.json();
    },
    enabled: !!selectedSessionId,
  });

  // Fetch trainees
  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  const activeEnrollments = useMemo(() => {
    if (!enrollments) return [];
    return enrollments.filter((e: any) => e.status !== "cancelled");
  }, [enrollments]);

  const periodLabels: Record<string, string> = {
    matin: "Matin",
    "apres-midi": "Après-midi",
    journee: "Journée entière",
  };

  const statusLabels: Record<string, string> = {
    present: "Présent",
    absent: "Absent",
    late: "Retard",
    excused: "Excusé",
  };

  const statusColors: Record<string, string> = {
    present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    excused: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  // Create sheet mutation
  const createSheetMutation = useMutation({
    mutationFn: async (data: { sessionId: string; date: string; period: string }) => {
      const resp = await apiRequest("POST", "/api/trainer/attendance", data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/attendance"] });
      toast({ title: "Feuille de présence créée" });
    },
  });

  // Upsert record mutation
  const upsertRecordMutation = useMutation({
    mutationFn: async ({ recordId, traineeId, sheetId, status }: { recordId?: string; traineeId: string; sheetId: string; status: string }) => {
      if (recordId) {
        const resp = await apiRequest("PATCH", `/api/trainer/attendance-records/${recordId}`, { status, signedAt: new Date().toISOString() });
        return resp.json();
      } else {
        const resp = await apiRequest("POST", "/api/trainer/attendance-records", { sheetId, traineeId, status, signedAt: new Date().toISOString() });
        return resp.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/attendance-records"] });
    },
  });

  const handleCreateSheet = () => {
    if (!selectedSessionId) return;
    const today = new Date().toISOString().split("T")[0];
    createSheetMutation.mutate({ sessionId: selectedSessionId, date: today, period: "journee" });
  };

  const findRecord = (traineeId: string) => {
    return records?.find((r) => r.traineeId === traineeId);
  };

  const getTrainee = (traineeId: string) => {
    return trainees?.find((t) => t.id === traineeId);
  };

  if (sheetsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm mb-1 block">Session</Label>
              <Select value={selectedSessionId} onValueChange={(v) => { setSelectedSessionId(v); setSelectedSheetId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title} ({formatDate(s.startDate)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSessionId && (
              <Button size="sm" className="mt-5" onClick={handleCreateSheet} disabled={createSheetMutation.isPending}>
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle feuille
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sheet selector */}
      {selectedSessionId && sessionSheets.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm mb-1 block">Feuille de présence</Label>
            <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une feuille" />
              </SelectTrigger>
              <SelectContent>
                {sessionSheets.map((sh) => (
                  <SelectItem key={sh.id} value={sh.id}>
                    {formatDate(sh.date)} — {periodLabels[sh.period] || sh.period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedSessionId && sessionSheets.length === 0 && (
        <div className="text-center py-8">
          <PenTool className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune feuille de présence pour cette session. Créez-en une pour commencer l'émargement.
          </p>
        </div>
      )}

      {/* Attendance grid */}
      {selectedSheetId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Émargement</CardTitle>
          </CardHeader>
          <CardContent>
            {activeEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun apprenant inscrit à cette session.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apprenant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Signé</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEnrollments.map((enrollment: any) => {
                      const trainee = getTrainee(enrollment.traineeId);
                      const record = findRecord(enrollment.traineeId);
                      if (!trainee) return null;

                      return (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {trainee.firstName} {trainee.lastName}
                          </TableCell>
                          <TableCell>
                            {record ? (
                              <Badge variant="outline" className={statusColors[record.status] || ""}>
                                {statusLabels[record.status] || record.status}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record?.signedAt ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {new Date(record.signedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Non signé</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(["present", "absent", "late", "excused"] as const).map((status) => (
                                <Button
                                  key={status}
                                  variant={record?.status === status ? "default" : "outline"}
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => upsertRecordMutation.mutate({
                                    recordId: record?.id,
                                    traineeId: enrollment.traineeId,
                                    sheetId: selectedSheetId,
                                    status,
                                  })}
                                  disabled={upsertRecordMutation.isPending}
                                >
                                  {status === "present" ? "P" : status === "absent" ? "A" : status === "late" ? "R" : "E"}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// EVALUATIONS TAB
// ============================================================

interface TrainerEvalData {
  sessionId: string;
  sessionTitle: string;
  programTitle: string;
  startDate: string;
  assignments: {
    id: string;
    traineeId: string;
    respondentName: string;
    respondentType: string;
    status: string;
    completedAt: string | null;
  }[];
}

function TrainerEvaluationsTab() {
  const { data: evalData, isLoading } = useQuery<TrainerEvalData[]>({
    queryKey: ["/api/trainer/evaluations"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!evalData || evalData.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucune évaluation</h3>
        <p className="text-sm text-muted-foreground">
          Aucune évaluation n'a été assignée pour vos sessions.
        </p>
      </div>
    );
  }

  const respondentTypeLabels: Record<string, string> = {
    trainee: "Apprenant",
    manager: "Manager",
    enterprise: "Entreprise",
    trainer: "Formateur",
  };

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    sent: "Envoyée",
    completed: "Complétée",
    expired: "Expirée",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      {evalData.map((ed) => {
        const completed = ed.assignments.filter((a) => a.status === "completed").length;
        const total = ed.assignments.length;

        return (
          <Card key={ed.sessionId}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {ed.programTitle && (
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                      {ed.programTitle}
                    </p>
                  )}
                  <CardTitle className="text-lg">{ed.sessionTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(ed.startDate)}
                  </p>
                </div>
                <Badge variant="outline">
                  {completed}/{total} complétée{completed !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Répondant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Complétée le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ed.assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.respondentName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {respondentTypeLabels[a.respondentType] || a.respondentType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[a.status] || ""}>
                            {statusLabels[a.status] || a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.completedAt ? formatDate(a.completedAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function TrainerPortal({ params }: { params?: { section?: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; title: string; mimeType?: string } | null>(null);
  const [immersiveModuleId, setImmersiveModuleId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("autre");
  const [uploadFile_, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const trainerId = user?.trainerId;

  // Fetch sessions assigned to this trainer
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: [`/api/trainers/${trainerId}/sessions`],
    enabled: !!trainerId,
  });

  // Fetch e-learning modules for this trainer's sessions
  const { data: elearningModules } = useQuery<ElearningModule[]>({
    queryKey: ["/api/elearning-modules"],
    enabled: !!trainerId,
  });

  // Fetch trainer documents
  const { data: documents, isLoading: documentsLoading } = useQuery<TrainerDocument[]>({
    queryKey: [`/api/trainers/${trainerId}/documents`],
    enabled: !!trainerId,
  });

  // Compute stats
  const stats = useMemo(() => {
    if (!sessions) return { total: 0, upcoming: 0, completed: 0 };
    const now = new Date();
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    const upcoming = sessions.filter((s) => {
      const start = new Date(s.startDate);
      return start > now && s.status !== "cancelled";
    }).length;
    return { total, upcoming, completed };
  }, [sessions]);

  const isLoading = sessionsLoading || documentsLoading;

  const handleDocUpload = async () => {
    if (!uploadFile_ || !uploadTitle || !trainerId) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(uploadFile_);
      await apiRequest("POST", `/api/trainers/${trainerId}/documents`, {
        title: uploadTitle,
        type: uploadType,
        fileUrl: uploaded.fileUrl,
        fileContent: null,
        status: "pending",
        validatedBy: null,
        expiresAt: null,
        notes: null,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/documents`] });
      toast({ title: "Document depose avec succes" });
      setUploadTitle("");
      setUploadType("autre");
      setUploadFile(null);
      setShowUploadDialog(false);
    } catch {
      toast({ title: "Erreur lors du depot", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // Not authenticated
  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Acces non autorise</h3>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour acceder a votre espace formateur.
          </p>
        </div>
      </div>
    );
  }

  const activeSection = params?.section || "sessions";

  return (
    <>
    <PageLayout>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (<>

          {/* Sessions */}
          {activeSection === "sessions" && (
            sessions && sessions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sessions.map((session) => (
                  <EnrichedSessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium mb-1">Aucune session</h3>
                <p className="text-sm text-muted-foreground">
                  Vous n'avez aucune session assignee pour le moment.
                </p>
              </div>
            )
          )}

          {/* Progress */}
          {activeSection === "progress" && <TrainerProgressTab />}

          {/* Attendance */}
          {activeSection === "attendance" && <TrainerAttendanceTab sessions={sessions || []} />}

          {/* Evaluations */}
          {activeSection === "evaluations" && <TrainerEvaluationsTab />}

          {/* E-Learning */}
          {activeSection === "elearning" && (() => {
              const sessionIds = new Set((sessions || []).map((s) => s.id));
              const programIds = new Set((sessions || []).map((s) => s.programId));
              const myModules = (elearningModules || []).filter(
                (m) =>
                  (m as any).status === "published" &&
                  (sessionIds.has(m.sessionId || "") || programIds.has(m.programId || ""))
              );
              if (myModules.length === 0) {
                return (
                  <div className="text-center py-16">
                    <MonitorPlay className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-lg font-medium mb-1">Aucun module e-learning</h3>
                    <p className="text-sm text-muted-foreground">
                      Aucun module publie pour vos sessions.
                    </p>
                  </div>
                );
              }
              // Group modules by session
              const grouped = new Map<string, { session: Session; modules: ElearningModule[] }>();
              for (const mod of myModules) {
                const session = (sessions || []).find(
                  (s) => s.id === mod.sessionId || s.programId === mod.programId
                );
                if (!session) continue;
                const entry = grouped.get(session.id) || { session, modules: [] };
                entry.modules.push(mod);
                grouped.set(session.id, entry);
              }
              return (
                <div className="space-y-4">
                  {Array.from(grouped.values()).map(({ session, modules: mods }) => (
                    <Card key={session.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{session.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {mods.length} module{mods.length > 1 ? "s" : ""} e-learning
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {mods
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((mod) => (
                            <div
                              key={mod.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                  <MonitorPlay className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{mod.title}</p>
                                  {mod.description && (
                                    <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 shrink-0"
                                onClick={() => setImmersiveModuleId(mod.id)}
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                Visualiser
                              </Button>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}

          {/* Documents */}
          {activeSection === "documents" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mes documents</CardTitle>
                  <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Deposer un document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">Titre</th>
                          <th className="text-left p-3 font-medium">Statut</th>
                          <th className="text-left p-3 font-medium">Date d'expiration</th>
                          <th className="text-left p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id} className="border-b last:border-b-0">
                            <td className="p-3">
                              <Badge variant="secondary" className="text-xs">
                                {documentTypeLabel(doc.type)}
                              </Badge>
                            </td>
                            <td className="p-3 font-medium">{doc.title}</td>
                            <td className="p-3">
                              <DocumentStatusBadge status={doc.status} />
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {doc.expiresAt ? formatDate(doc.expiresAt) : "—"}
                            </td>
                            <td className="p-3">
                              {doc.fileUrl ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewDoc({ fileUrl: doc.fileUrl!, title: doc.title })}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Visualiser
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Aucun fichier</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucun document associe a votre profil formateur.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Signature */}
          {activeSection === "signature" && <TrainerSignaturePad trainerId={trainerId || ""} />}

          {/* Compétences */}
          {activeSection === "competences" && <CompetenciesTab trainerId={trainerId || ""} />}

          {/* Planning / Disponibilités */}
          {activeSection === "planning" && <PlanningTab trainerId={trainerId || ""} />}

          {/* Notes de frais */}
          {activeSection === "expenses" && <ExpenseNotesTab trainerId={trainerId || ""} />}

          {/* Factures */}
          {activeSection === "invoices" && <TrainerInvoicesTab trainerId={trainerId || ""} />}

      </>)}

      {/* Upload document dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposer un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  {TRAINER_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titre du document</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Ex: CV 2026, Diplome IDE..." />
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Formats acceptes : PDF, images (JPG, PNG, GIF), Word, Excel. Max 10 Mo.
              </p>
            </div>
            {uploadFile_ && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{uploadFile_.name}</span>
                <span className="text-muted-foreground ml-auto shrink-0">
                  {(uploadFile_.size / 1024).toFixed(0)} Ko
                </span>
              </div>
            )}
            <Button onClick={handleDocUpload} disabled={!uploadFile_ || !uploadTitle || isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Deposer le document
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document preview */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        fileUrl={previewDoc?.fileUrl || null}
        fileName={previewDoc?.title || null}
        mimeType={previewDoc?.mimeType || null}
      />
    </PageLayout>

    {/* Immersive e-learning preview */}
    {immersiveModuleId && (() => {
      const mod = (elearningModules || []).find((m) => m.id === immersiveModuleId);
      if (!mod) return null;
      return createPortal(
        <ImmersiveModuleViewer
          initialModuleId={immersiveModuleId}
          initialBlockIndex={0}
          modules={[mod]}
          progressData={[]}
          previewMode={true}
          onExit={() => setImmersiveModuleId(null)}
        />,
        document.body
      );
    })()}
    </>
  );
}
