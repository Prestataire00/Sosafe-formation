import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Session, TrainerDocument, ExpenseNote, TrainerInvoice, Program, Trainee, TrainerCompetency } from "@shared/schema";
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

  return (
    <div className="space-y-4">
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
                      <span className="text-xs text-muted-foreground ml-auto">{trainee.email}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun stagiaire inscrit</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function TrainerPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; title: string; mimeType?: string } | null>(null);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mon espace formateur</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue, {user.firstName} {user.lastName}. Retrouvez ici vos
          sessions, documents et informations pratiques.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Sessions totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground">Sessions a venir</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Sessions terminees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trainer not linked warning */}
      {!isLoading && !trainerId && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Profil formateur non associe</p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre compte utilisateur n'est pas encore lie a un profil formateur.
                Contactez votre administrateur pour qu'il associe votre compte.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && trainerId && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Tabbed content */}
      {!isLoading && trainerId && (
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions" className="gap-2">
              <Calendar className="w-4 h-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2">
              <PenTool className="w-4 h-4" />
              Signature
            </TabsTrigger>
            <TabsTrigger value="competences" className="gap-2">
              <Award className="w-4 h-4" />
              Competences
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="w-4 h-4" />
              Notes de frais
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Factures
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            {sessions && sessions.length > 0 ? (
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
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
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
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature">
            <TrainerSignaturePad trainerId={trainerId} />
          </TabsContent>

          {/* Competences Tab */}
          <TabsContent value="competences">
            <CompetenciesTab trainerId={trainerId} />
          </TabsContent>

          {/* Expense Notes Tab */}
          <TabsContent value="expenses">
            <ExpenseNotesTab trainerId={trainerId} />
          </TabsContent>

          {/* Trainer Invoices Tab */}
          <TabsContent value="invoices">
            <TrainerInvoicesTab trainerId={trainerId} />
          </TabsContent>
        </Tabs>
      )}

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
    </div>
  );
}
