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
} from "lucide-react";
import type { Session, TrainerDocument, ExpenseNote } from "@shared/schema";
import {
  TRAINER_DOCUMENT_TYPES,
  TRAINER_DOCUMENT_STATUSES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
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
  const isPdf = mimeType === "application/pdf" || fileUrl.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{fileName || "Apercu du document"}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-[70vh] rounded-lg border" title={fileName || "PDF"} />
          ) : isImage ? (
            <div className="flex items-center justify-center">
              <img src={fileUrl} alt={fileName || "Image"} className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">L'apercu n'est pas disponible pour ce type de fichier.</p>
              <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Telecharger
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// SIGNATURE PAD COMPONENT
// ============================================================

function TrainerSignaturePad({ trainerId }: { trainerId: string }) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

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
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, [getCtx]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
  }, [isDrawing, getCtx]);

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Signature electronique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilisez cette zone pour signer les contrats et documents de formation.
          </p>
          <div className="border rounded-lg p-1 bg-white dark:bg-gray-950">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
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
                  <div>
                    <p className="text-sm font-medium">
                      {sig.documentType === "contrat" ? "Contrat" : sig.documentType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Signe le {sig.signedAt ? formatDate(sig.signedAt) : "—"}
                    </p>
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
        category,
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
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <Button onClick={handleCreate} disabled={!title || !amount || !date || isSubmitting} className="w-full">
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
// MAIN PAGE
// ============================================================

export default function TrainerPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; title: string; mimeType?: string } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
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
        type: "autre",
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
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="w-4 h-4" />
              Notes de frais
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            {sessions && sessions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base">{session.title}</CardTitle>
                        <SessionStatusBadge status={session.status} />
                      </div>
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
                      <div className="flex items-center gap-2 pt-1">
                        <ModalityBadge modality={session.modality} />
                      </div>
                    </CardContent>
                  </Card>
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
                              {doc.fileUrl && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewDoc({ fileUrl: doc.fileUrl!, title: doc.title })}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </div>
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

          {/* Expense Notes Tab */}
          <TabsContent value="expenses">
            <ExpenseNotesTab trainerId={trainerId} />
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
              <Label>Titre du document</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Ex: CV, Diplome..." />
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleDocUpload} disabled={!uploadFile_ || !uploadTitle || isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Deposer
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
