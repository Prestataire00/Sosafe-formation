import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/rich-text-editor";
import { getDefaultTemplate } from "@/lib/document-templates-defaults";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
  Printer,
  Eye,
  FileCheck,
  Share2,
  Lock,
  Globe,
  Users,
  Mail,
  Download,
  PenTool,
  CheckCircle,
  Clock,
  Check,
  Stamp,
  Sparkles,
  Upload,
  FileUp,
  Loader2,
  Wand2,
  Copy,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  DocumentTemplate,
  InsertDocumentTemplate,
  GeneratedDocument,
  Session,
  Trainee,
  Trainer,
  Enterprise,
} from "@shared/schema";
import { DOCUMENT_TYPES, TEMPLATE_VARIABLES } from "@shared/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shared PDF download helper — reused by PreviewDialog & dropdown menu */
async function downloadPdfFromHtml(content: string, title: string) {
  const html2pdf = (await import("html2pdf.js")).default;
  const container = window.document.createElement("div");
  container.innerHTML = content;
  container.style.cssText =
    "font-family:Arial,sans-serif;color:#1a1a1a;font-size:13px;line-height:1.7;";
  container.querySelectorAll("table").forEach((t) => {
    t.style.borderCollapse = "collapse";
    t.style.width = "100%";
  });
  container.querySelectorAll("td,th").forEach((c) => {
    (c as HTMLElement).style.border = "1px solid #ccc";
    (c as HTMLElement).style.padding = "6px 10px";
  });
  container.querySelectorAll("th").forEach((h) => {
    (h as HTMLElement).style.background = "#f5f5f5";
    (h as HTMLElement).style.fontWeight = "600";
  });

  window.document.body.appendChild(container);

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `${title.replace(/[^a-zA-Z0-9àâéèêëïôùûüÀÂÉÈÊËÏÔÙÛÜçÇ -]/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    } as any)
    .from(container)
    .save();

  window.document.body.removeChild(container);
}

/** Shared print helper — opens a print-ready window */
function printDocumentHtml(content: string, title: string) {
  const printStyles = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 20px; background: #fff; font-family: Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.7; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #f5f5f5; font-weight: 600; }
    h1 { font-size: 18px; } h2 { font-size: 15px; } h3 { font-size: 13px; }
    img { max-width: 100%; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 15mm; size: A4; }
    }`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${title}</title><style>${printStyles}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  }
}

function DocTypeBadge({ type }: { type: string }) {
  const found = DOCUMENT_TYPES.find((d) => d.value === type);
  const variants: Record<string, string> = {
    convention: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    contrat_particulier: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    contrat_vae: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    politique_confidentialite: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    devis: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    devis_sous_traitance: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    facture: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    facture_blended: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
    facture_specifique: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    convocation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    attestation: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    certificat: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    bpf: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    programme: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    etiquette_envoi: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    certificat_realisation: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    attestation_assiduite: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    attestation_dpc: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    attestation_fifpl: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    admissibilite_vae: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    autorisation_image: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    reglement: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    autre: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={variants[type] || ""}>
      {found?.label || type}
    </Badge>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    generated: {
      label: "Genere",
      className: "bg-accent text-accent-foreground",
    },
    shared: {
      label: "Partage",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    sent: {
      label: "Envoye",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    signed: {
      label: "Signe",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    archived: {
      label: "Archive",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
  };
  const entry = map[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={entry.className}>
      {entry.label}
    </Badge>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const map: Record<string, { label: string; icon: typeof Lock; className: string }> = {
    admin_only: { label: "Admin", icon: Lock, className: "text-gray-500" },
    enterprise: { label: "Entreprise", icon: Users, className: "text-blue-500" },
    trainee: { label: "Stagiaire", icon: Users, className: "text-indigo-500" },
    all: { label: "Tous", icon: Globe, className: "text-green-500" },
  };
  const entry = map[visibility] || { label: visibility, icon: Lock, className: "" };
  const Icon = entry.icon;
  return (
    <span className={`flex items-center gap-1 text-xs ${entry.className}`}>
      <Icon className="w-3 h-3" />
      {entry.label}
    </span>
  );
}

function SignatureStatusBadge({ doc }: { doc: GeneratedDocument }) {
  const signatureStatus = (doc as any).signatureStatus || "none";
  if (signatureStatus === "none") return null;

  const requestedFor = ((doc as any).signatureRequestedFor || []) as Array<{ signerName: string; status: string; signerType?: string }>;
  const signedCount = requestedFor.filter((r) => r.status === "signed").length;
  const totalCount = requestedFor.length;
  const hasPaper = requestedFor.some((r) => r.signerType === "paper");

  if (signatureStatus === "signed") {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
        {hasPaper ? <Stamp className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
        {totalCount > 0 ? `Signe ${hasPaper ? "(papier)" : ""} (${signedCount}/${totalCount})` : "Signe"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
      <Clock className="w-3 h-3" />
      En attente ({signedCount}/{totalCount})
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Request Signature Dialog
// ---------------------------------------------------------------------------

function RequestSignatureDialog({
  open,
  onOpenChange,
  documentIds,
  trainees,
  trainers,
  enterprises,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
  trainees: Trainee[];
  trainers: Trainer[];
  enterprises: Enterprise[];
  onSubmit: (signers: Array<{ signerId: string; signerType: string; signerName: string }>) => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchSigner, setSearchSigner] = useState("");

  type SignerOption = { id: string; type: string; name: string };
  const allSigners: SignerOption[] = [
    ...trainees.map((t) => ({ id: t.id, type: "trainee", name: `${t.firstName} ${t.lastName}` })),
    ...trainers.map((t) => ({ id: t.id, type: "trainer", name: `${t.firstName} ${t.lastName}` })),
    ...enterprises.map((e) => ({ id: e.id, type: "enterprise", name: e.name })),
  ];

  const filtered = searchSigner
    ? allSigners.filter((s) => s.name.toLowerCase().includes(searchSigner.toLowerCase()))
    : allSigners;

  const toggleSigner = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = () => {
    const signers = allSigners
      .filter((s) => selected.has(`${s.type}:${s.id}`))
      .map((s) => ({ signerId: s.id, signerType: s.type, signerName: s.name }));
    if (signers.length === 0) return;
    onSubmit(signers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Demander signature {documentIds.length > 1 ? `(${documentIds.length} documents)` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un signataire..."
              className="pl-8"
              value={searchSigner}
              onChange={(e) => setSearchSigner(e.target.value)}
            />
          </div>
          <ScrollArea className="flex-1 max-h-[350px] border rounded-md">
            <div className="p-2 space-y-0.5">
              {trainees.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2 pt-2 pb-1">Stagiaires</p>
                  {filtered.filter((s) => s.type === "trainee").map((s) => {
                    const key = `${s.type}:${s.id}`;
                    return (
                      <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                        <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleSigner(key)} />
                        {s.name}
                      </label>
                    );
                  })}
                </>
              )}
              {trainers.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2 pt-2 pb-1">Formateurs</p>
                  {filtered.filter((s) => s.type === "trainer").map((s) => {
                    const key = `${s.type}:${s.id}`;
                    return (
                      <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                        <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleSigner(key)} />
                        {s.name}
                      </label>
                    );
                  })}
                </>
              )}
              {enterprises.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2 pt-2 pb-1">Entreprises</p>
                  {filtered.filter((s) => s.type === "enterprise").map((s) => {
                    const key = `${s.type}:${s.id}`;
                    return (
                      <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                        <Checkbox checked={selected.has(key)} onCheckedChange={() => toggleSigner(key)} />
                        {s.name}
                      </label>
                    );
                  })}
                </>
              )}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun signataire trouve</p>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-xs text-muted-foreground">{selected.size} selectionne(s)</span>
            <Button onClick={handleSubmit} disabled={selected.size === 0 || isPending}>
              <PenTool className="w-4 h-4 mr-2" />
              {isPending ? "Envoi..." : "Envoyer la demande"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sign Document Dialog — Admin signe directement un document
// ---------------------------------------------------------------------------

function SignDocumentDialog({
  document: doc,
  open,
  onOpenChange,
  userId,
  userName,
}: {
  document: GeneratedDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}) {
  const { toast } = useToast();
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
    mutationFn: async (signatureData: string) => {
      // 1. Create the signature record
      await apiRequest("POST", "/api/signatures", {
        signerId: userId,
        signerType: "admin",
        documentType: doc?.type || "autre",
        relatedId: doc?.id || null,
        signatureData,
      });
      // 2. Embed signature image into document content + update status
      if (doc) {
        const signatureImg = `<div style="margin-top:20px;text-align:right;"><p style="margin:0 0 5px 0;font-size:12px;color:#555;">Signature SO'SAFE Formation — ${new Date().toLocaleDateString("fr-FR")}</p><img src="${signatureData}" alt="Signature" style="max-width:200px;height:auto;" /></div>`;
        let updatedContent = doc.content || "";
        if (updatedContent.includes("{signature_organisme}")) {
          updatedContent = updatedContent.replace("{signature_organisme}", signatureImg);
        } else {
          // Append before closing </body> or at the end
          if (updatedContent.includes("</body>")) {
            updatedContent = updatedContent.replace("</body>", signatureImg + "</body>");
          } else {
            updatedContent += signatureImg;
          }
        }
        await apiRequest("PATCH", `/api/generated-documents/${doc.id}`, {
          signatureStatus: "signed",
          content: updatedContent,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signatures"] });
      toast({ title: "Document signe avec succes" });
      onOpenChange(false);
      clearCanvas();
    },
    onError: () => toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    signMutation.mutate(canvas.toDataURL("image/png"));
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Signer le document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{doc.title}</p>
            <p className="text-xs text-muted-foreground capitalize">{doc.type.replace(/_/g, " ")}</p>
          </div>
          <div>
            <Label className="text-sm mb-2 block">Signataire : {userName}</Label>
            <p className="text-xs text-muted-foreground mb-3">Tracez votre signature ci-dessous</p>
            <div className="border rounded-lg p-1 bg-white dark:bg-gray-950">
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
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              Effacer
            </Button>
            <Button onClick={handleSubmit} disabled={!hasSignature || signMutation.isPending}>
              <PenTool className="w-4 h-4 mr-2" />
              {signMutation.isPending ? "Signature..." : "Valider la signature"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Paper Signature Dialog (Alternative papier — 7.2)
// ---------------------------------------------------------------------------

function PaperSignatureDialog({
  document: doc,
  open,
  onOpenChange,
  userName,
}: {
  document: GeneratedDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}) {
  const { toast } = useToast();
  const [signerName, setSignerName] = useState("");
  const [signedDate, setSignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const paperSignMutation = useMutation({
    mutationFn: async () => {
      if (!doc) return;
      await apiRequest("POST", `/api/generated-documents/${doc.id}/mark-paper-signed`, {
        signerName: signerName || userName,
        signedDate,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      toast({ title: "Signature papier enregistree" });
      onOpenChange(false);
      setSignerName("");
      setNotes("");
    },
    onError: () => toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" }),
  });

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signature papier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{doc.title}</p>
            <p className="text-xs text-muted-foreground capitalize">{doc.type.replace(/_/g, " ")}</p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Tracabilite Qualiopi : cette action enregistre que le document a ete signe en version papier avec la date, le nom du signataire et les observations.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm">Nom du signataire</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder={userName}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Date de signature</Label>
              <Input
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Observations (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Original signe en 2 exemplaires, archivage classeur A..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={() => paperSignMutation.mutate()} disabled={paperSignMutation.isPending}>
              <Stamp className="w-4 h-4 mr-2" />
              {paperSignMutation.isPending ? "Enregistrement..." : "Confirmer signature papier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Template Form
// ---------------------------------------------------------------------------

const FONT_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Calibri", label: "Calibri" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
];

function TemplateForm({
  template,
  onSubmit,
  isPending,
}: {
  template?: DocumentTemplate;
  onSubmit: (data: InsertDocumentTemplate) => void;
  isPending: boolean;
}) {
  const isNew = !template;
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState(template?.type || "convention");
  const [content, setContent] = useState(
    template?.content || getDefaultTemplate("convention")
  );
  const [brandColor, setBrandColor] = useState(template?.brandColor || "#1a56db");
  const [fontFamily, setFontFamily] = useState(template?.fontFamily || "Arial");
  const [logoUrl, setLogoUrl] = useState(template?.logoUrl || "");
  const [headerHtml, setHeaderHtml] = useState(template?.headerHtml || "");
  const [footerHtml, setFooterHtml] = useState(template?.footerHtml || "");
  const [showBranding, setShowBranding] = useState(false);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    // Pour un nouveau modèle, on propose le contenu type ; pour l'édition on garde le contenu existant
    if (isNew) {
      const defaultContent = getDefaultTemplate(newType);
      if (defaultContent) {
        setContent(defaultContent);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const usedVars = Object.values(TEMPLATE_VARIABLES)
      .flat()
      .filter((v) => content.includes(v.key))
      .map((v) => v.key);
    onSubmit({
      name,
      type,
      content,
      variables: usedVars,
      brandColor: brandColor || null,
      fontFamily: fontFamily || "Arial",
      logoUrl: logoUrl || null,
      headerHtml: headerHtml || null,
      footerHtml: footerHtml || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">Nom du modele</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Convention standard"
          required
          data-testid="input-template-name"
        />
      </div>
      <div className="space-y-2">
        <Label>Type de document</Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger data-testid="select-template-type">
            <SelectValue placeholder="Selectionner un type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branding panel */}
      <div className="border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBranding((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 text-sm font-medium transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border"
              style={{ backgroundColor: brandColor }}
            />
            Esthétisme & Branding
          </span>
          <span className="text-muted-foreground text-xs">{showBranding ? "▲" : "▼"}</span>
        </button>
        {showBranding && (
          <div className="p-3 space-y-3 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Couleur principale</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="#1a56db"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Police de caractères</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: f.value }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL du logo (lien public)</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-8 text-xs"
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-10 object-contain border rounded p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">En-tête personnalisé (HTML)</Label>
              <Input
                value={headerHtml}
                onChange={(e) => setHeaderHtml(e.target.value)}
                placeholder="<p>Votre en-tête ici...</p>"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pied de page personnalisé (HTML)</Label>
              <Input
                value={footerHtml}
                onChange={(e) => setFooterHtml(e.target.value)}
                placeholder="<p>Votre pied de page ici...</p>"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rich text editor */}
      <div className="space-y-2">
        <Label htmlFor="template-content">Contenu du modele</Label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Rédigez votre modèle de document ici... Utilisez le bouton Variable pour insérer des balises dynamiques."
          brandColor={brandColor}
          fontFamily={fontFamily}
        />
        <p className="text-xs text-muted-foreground">
          Utilisez le bouton <strong>Variable</strong> dans la barre d'outils pour insérer des balises dynamiques comme <code className="text-primary">{"{nom_apprenant}"}</code>.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending || !content} data-testid="button-template-submit">
          {isPending ? "Enregistrement..." : template ? "Modifier" : "Creer"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Generate Form
// ---------------------------------------------------------------------------

function GenerateForm({
  templates,
  sessions,
  trainees,
  enterprises,
  onSubmit,
  isPending,
}: {
  templates: DocumentTemplate[];
  sessions: Session[];
  trainees: Trainee[];
  enterprises: Enterprise[];
  onSubmit: (data: { templateId: string; sessionId: string; traineeIds: string[]; enterpriseId?: string; quoteId?: string; invoiceId?: string }) => void;
  isPending: boolean;
}) {
  const [templateId, setTemplateId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [enterpriseId, setEnterpriseId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);

  // Detect template type for conditional fields
  const selectedTemplate = templates.find(t => t.id === templateId);
  const templateType = selectedTemplate?.type || "";
  const needsEnterprise = ["devis", "convention", "contrat_particulier", "facture", "facture_blended", "facture_specifique", "cgv"].includes(templateType);
  const needsQuote = ["devis", "devis_sous_traitance"].includes(templateType);
  const needsInvoice = ["facture", "facture_blended", "facture_specifique"].includes(templateType);
  const needsTrainees = !["programme", "reglement", "cgv", "bpf"].includes(templateType);

  // Fetch quotes/invoices when needed
  const { data: quotesData } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
    enabled: needsQuote,
  });
  const { data: invoicesData } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    enabled: needsInvoice,
  });

  const toggleTrainee = (id: string) => {
    setSelectedTrainees((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      templateId,
      sessionId,
      traineeIds: selectedTrainees,
      ...(enterpriseId && enterpriseId !== "_none" ? { enterpriseId } : {}),
      ...(quoteId && quoteId !== "_none" ? { quoteId } : {}),
      ...(invoiceId && invoiceId !== "_none" ? { invoiceId } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Modele de document</Label>
        <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setQuoteId(""); setInvoiceId(""); }} required>
          <SelectTrigger data-testid="select-generate-template">
            <SelectValue placeholder="Sélectionner un modèle" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Session</Label>
        <Select value={sessionId} onValueChange={setSessionId} required>
          <SelectTrigger data-testid="select-generate-session">
            <SelectValue placeholder="Sélectionner une session" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Enterprise selector */}
      {needsEnterprise && (
        <div className="space-y-2">
          <Label>Entreprise</Label>
          <Select value={enterpriseId} onValueChange={setEnterpriseId}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-détection depuis l'inscription" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Auto-détection</SelectItem>
              {enterprises.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} {e.siret ? `(${e.siret})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Si non sélectionnée, l'entreprise sera détectée depuis l'inscription du stagiaire.</p>
        </div>
      )}

      {/* Quote selector for devis */}
      {needsQuote && quotesData && quotesData.length > 0 && (
        <div className="space-y-2">
          <Label>Devis associé</Label>
          <Select value={quoteId} onValueChange={setQuoteId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un devis (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Aucun</SelectItem>
              {quotesData.map((q: any) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.number} — {q.title} ({q.total?.toLocaleString("fr-FR")} €)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Invoice selector */}
      {needsInvoice && invoicesData && invoicesData.length > 0 && (
        <div className="space-y-2">
          <Label>Facture associée</Label>
          <Select value={invoiceId} onValueChange={setInvoiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une facture (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Aucune</SelectItem>
              {invoicesData.map((inv: any) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.number} — {inv.title} ({inv.total?.toLocaleString("fr-FR")} €)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Trainees */}
      {needsTrainees && (
        <div className="space-y-2">
          <Label>Stagiaires</Label>
          <div className="border rounded-md max-h-[200px] overflow-y-auto">
            {trainees.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Aucun stagiaire disponible</p>
            ) : (
              trainees.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedTrainees.includes(t.id)}
                    onChange={() => toggleTrainee(t.id)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {t.firstName} {t.lastName}
                  </span>
                  {t.company && (
                    <span className="text-xs text-muted-foreground">({t.company})</span>
                  )}
                </label>
              ))
            )}
          </div>
          {selectedTrainees.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedTrainees.length} stagiaire{selectedTrainees.length > 1 ? "s" : ""} sélectionné{selectedTrainees.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isPending || !templateId || !sessionId || (needsTrainees && selectedTrainees.length === 0)}
          data-testid="button-generate-submit"
        >
          {isPending ? "Génération..." : "Générer les documents"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preview Dialog
// ---------------------------------------------------------------------------

function PreviewDialog({
  document,
  open,
  onOpenChange,
}: {
  document: GeneratedDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [exporting, setExporting] = useState(false);

  if (!document) return null;

  const handlePrint = () => printDocumentHtml(document.content, document.title);

  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      await downloadPdfFromHtml(document.content, document.title);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{document.title}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={exporting} className="gap-1.5">
                <Download className="w-4 h-4" />
                {exporting ? "Export..." : "PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="w-4 h-4" />
                Imprimer
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        {/* Simule une feuille A4 dans un fond gris */}
        <div className="flex-1 overflow-y-auto bg-neutral-100 p-6">
          <div className="shadow-md bg-white rounded min-h-[1000px]">
            <div
              dangerouslySetInnerHTML={{ __html: document.content }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Document Content
// ---------------------------------------------------------------------------

function EditDocumentContent({
  document,
  onSave,
  isPending,
}: {
  document: GeneratedDocument;
  onSave: (content: string) => void;
  isPending: boolean;
}) {
  const [content, setContent] = useState(document.content);

  return (
    <div className="space-y-4">
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Contenu du document..."
      />
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSave(content)} disabled={isPending}>
          {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Documents() {
  const [searchTemplates, setSearchTemplates] = useState("");
  const [searchDocs, setSearchDocs] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [dateFromText, setDateFromText] = useState("");
  const [dateToText, setDateToText] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<DocumentTemplate | undefined>();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editDocState, setEditDocState] = useState<GeneratedDocument | null>(null);
  const [editDocOpen, setEditDocOpen] = useState(false);
  const [signDoc, setSignDoc] = useState<GeneratedDocument | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [paperSignDoc, setPaperSignDoc] = useState<GeneratedDocument | null>(null);
  const [paperSignDialogOpen, setPaperSignDialogOpen] = useState(false);
  const [aiTemplateDialogOpen, setAiTemplateDialogOpen] = useState(false);
  const [aiTemplateType, setAiTemplateType] = useState("convention");
  const [aiTemplateDesc, setAiTemplateDesc] = useState("");
  const [aiTemplateGenerating, setAiTemplateGenerating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("convention");
  const [importName, setImportName] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // --- Queries ---

  const { data: templates, isLoading: loadingTemplates } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/document-templates"],
  });

  const { data: generatedDocs, isLoading: loadingDocs } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/generated-documents"],
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  const { data: trainersData } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const { data: enterprisesData } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  // --- Template Mutations ---

  const createTemplateMutation = useMutation({
    mutationFn: (data: InsertDocumentTemplate) =>
      apiRequest("POST", "/api/document-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      setTemplateDialogOpen(false);
      toast({ title: "Modele cree avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la creation", variant: "destructive" }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertDocumentTemplate }) =>
      apiRequest("PATCH", `/api/document-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      setTemplateDialogOpen(false);
      setEditTemplate(undefined);
      toast({ title: "Modele modifie avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/document-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({ title: "Modele supprime" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiRequest("POST", `/api/document-templates/${id}/duplicate`, {});
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({ title: "Template dupliqué — vous pouvez maintenant le modifier" });
    },
    onError: () => toast({ title: "Erreur lors de la duplication", variant: "destructive" }),
  });

  // --- Generate Mutations ---

  const generateMutation = useMutation({
    mutationFn: (data: { templateId: string; sessionId: string; traineeIds: string[]; enterpriseId?: string; quoteId?: string; invoiceId?: string }) =>
      apiRequest("POST", "/api/documents/generate", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      setGenerateDialogOpen(false);
      toast({ title: "Documents generes avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la generation", variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/generated-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      toast({ title: "Document supprime" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { visibility?: string; status?: string; content?: string } }) =>
      apiRequest("PATCH", `/api/generated-documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      setEditDocOpen(false);
      setEditDocState(null);
      toast({ title: "Document mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const generatePostalLabelMutation = useMutation({
    mutationFn: (traineeId: string) =>
      apiRequest("POST", `/api/trainees/${traineeId}/etiquette-envoi`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      toast({ title: "Etiquette d'envoi postal generee" });
    },
    onError: (err: any) =>
      toast({
        title: err?.message || "Adresse postale manquante pour ce stagiaire",
        variant: "destructive",
      }),
  });

  // --- Signature state & mutations ---

  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureDocIds, setSignatureDocIds] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const requestSignatureMutation = useMutation({
    mutationFn: (data: { documentId: string; signers: Array<{ signerId: string; signerType: string; signerName: string }> }) =>
      apiRequest("POST", `/api/generated-documents/${data.documentId}/request-signature`, { signers: data.signers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      setSignatureDialogOpen(false);
      setSignatureDocIds([]);
      toast({ title: "Demande de signature envoyee" });
    },
    onError: () => toast({ title: "Erreur lors de la demande de signature", variant: "destructive" }),
  });

  const batchRequestSignatureMutation = useMutation({
    mutationFn: (data: { documentIds: string[]; signers: Array<{ signerId: string; signerType: string; signerName: string }> }) =>
      apiRequest("POST", "/api/generated-documents/batch-request-signature", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      setSignatureDialogOpen(false);
      setSignatureDocIds([]);
      setSelectedDocIds(new Set());
      setBatchMode(false);
      toast({ title: "Demandes de signature envoyees en lot" });
    },
    onError: () => toast({ title: "Erreur lors de la demande en lot", variant: "destructive" }),
  });

  const handleRequestSignature = (signers: Array<{ signerId: string; signerType: string; signerName: string }>) => {
    if (signatureDocIds.length === 1) {
      requestSignatureMutation.mutate({ documentId: signatureDocIds[0], signers });
    } else {
      batchRequestSignatureMutation.mutate({ documentIds: signatureDocIds, signers });
    }
  };

  // --- Filtering ---

  const filteredTemplates =
    templates?.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTemplates.toLowerCase()) ||
        t.type.toLowerCase().includes(searchTemplates.toLowerCase())
    ) || [];

  const filteredDocs =
    generatedDocs?.filter((d) => {
      // Text search
      if (searchDocs) {
        const q = searchDocs.toLowerCase();
        const matchText = d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q);
        const trainee = trainees?.find((t) => t.id === d.traineeId);
        const matchTrainee = trainee ? `${trainee.firstName} ${trainee.lastName}`.toLowerCase().includes(q) : false;
        const session = sessions?.find((s) => s.id === d.sessionId);
        const matchSession = session ? session.title.toLowerCase().includes(q) : false;
        if (!matchText && !matchTrainee && !matchSession) return false;
      }
      // Type filter
      if (filterType !== "all" && d.type !== filterType) return false;
      // Status filter
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      // Session filter
      if (filterSession !== "all" && d.sessionId !== filterSession) return false;
      // Visibility filter
      if (filterVisibility !== "all" && (d as any).visibility !== filterVisibility) return false;
      // Date range filter
      if (filterDateFrom && d.createdAt) {
        if (new Date(d.createdAt) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo && d.createdAt) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(d.createdAt) > to) return false;
      }
      return true;
    }) || [];

  const hasActiveFilters = filterType !== "all" || filterStatus !== "all" || filterSession !== "all" || filterVisibility !== "all" || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterSession("all");
    setFilterVisibility("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setDateFromText("");
    setDateToText("");
  };

  // Get unique doc types for filter
  const docTypes = Array.from(new Set(generatedDocs?.map((d) => d.type) || []));
  // Get sessions that have docs
  const docSessionIds = Array.from(new Set(generatedDocs?.map((d) => d.sessionId).filter(Boolean) || []));
  const docSessions = sessions?.filter((s) => docSessionIds.includes(s.id)) || [];

  // --- Render ---

  return (
    <PageLayout>
      <PageHeader
        title="Documents"
        subtitle="Gestion électronique des documents"
      />

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">
            Modeles
          </TabsTrigger>
          <TabsTrigger value="generated" data-testid="tab-generated">
            Documents generes
          </TabsTrigger>
        </TabsList>

        {/* ================================================================
            TAB: Modeles
           ================================================================ */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SearchInput
              value={searchTemplates}
              onChange={setSearchTemplates}
              placeholder="Rechercher un modele..."
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Button>
              <Button
                variant="outline"
                onClick={() => setAiTemplateDialogOpen(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generer avec l'IA
              </Button>
              <Button
                onClick={() => {
                  setEditTemplate(undefined);
                  setTemplateDialogOpen(true);
                }}
                data-testid="button-create-template"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau modele
              </Button>
            </div>
          </div>

          {loadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-6 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun modele"
              description={searchTemplates ? "Aucun resultat pour votre recherche" : "Creez votre premier modele de document"}
              action={!searchTemplates ? (
                <Button
                  onClick={() => setTemplateDialogOpen(true)}
                  data-testid="button-create-first-template"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Creer un modele
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover-elevate"
                  data-testid={`card-template-${template.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{template.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.createdAt
                            ? new Date(template.createdAt).toLocaleDateString("fr-FR")
                            : ""}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-template-menu-${template.id}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditTemplate(template);
                              setTemplateDialogOpen(true);
                            }}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateTemplateMutation.mutate(template.id)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <DocTypeBadge type={template.type} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                      {template.content.substring(0, 120)}
                      {template.content.length > 120 ? "..." : ""}
                    </p>
                    {template.variables && (template.variables as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(template.variables as string[]).slice(0, 3).map((v) => (
                          <Badge key={v} variant="secondary" className="text-[10px]">
                            {v}
                          </Badge>
                        ))}
                        {(template.variables as string[]).length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{(template.variables as string[]).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================================================================
            TAB: Documents generes
           ================================================================ */}
        <TabsContent value="generated" className="space-y-4">
          {/* Search + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SearchInput
              value={searchDocs}
              onChange={setSearchDocs}
              placeholder="Rechercher par titre, stagiaire, session..."
              className="max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                variant={batchMode ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setBatchMode(!batchMode);
                  setSelectedDocIds(new Set());
                }}
              >
                <PenTool className="w-4 h-4 mr-2" />
                {batchMode ? "Annuler" : "Signature en lot"}
              </Button>
              {batchMode && selectedDocIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSignatureDocIds(Array.from(selectedDocIds));
                    setSignatureDialogOpen(true);
                  }}
                >
                  Demander signature ({selectedDocIds.size})
                </Button>
              )}
              <Button
                onClick={() => setGenerateDialogOpen(true)}
                data-testid="button-generate-documents"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generer des documents
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/30 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px] h-8 text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="generated">Généré</SelectItem>
                  <SelectItem value="shared">Partagé</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="signed">Signé</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Session</Label>
              <Select value={filterSession} onValueChange={setFilterSession}>
                <SelectTrigger className="w-[200px] h-8 text-sm">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sessions</SelectItem>
                  {docSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Visibilité</Label>
              <Select value={filterVisibility} onValueChange={setFilterVisibility}>
                <SelectTrigger className="w-[150px] h-8 text-sm">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="admin_only">Admin</SelectItem>
                  <SelectItem value="trainee">Stagiaire</SelectItem>
                  <SelectItem value="enterprise">Entreprise</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Du</Label>
              <div className="flex gap-1.5 items-center">
                <Input
                  type="text"
                  placeholder="JJ/MM/AAAA"
                  className="w-[110px] h-8 text-sm"
                  value={dateFromText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDateFromText(v);
                    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    if (m) {
                      const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
                      if (!isNaN(d.getTime())) setFilterDateFrom(`${m[3]}-${m[2]}-${m[1]}`);
                    }
                    if (!v) setFilterDateFrom("");
                  }}
                />
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    if (e.target.value) {
                      setDateFromText(new Date(e.target.value + "T00:00:00").toLocaleDateString("fr-FR"));
                    } else {
                      setDateFromText("");
                    }
                  }}
                  className="w-[38px] h-8 text-sm px-1 [&::-webkit-calendar-picker-indicator]:mx-0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Au</Label>
              <div className="flex gap-1.5 items-center">
                <Input
                  type="text"
                  placeholder="JJ/MM/AAAA"
                  className="w-[110px] h-8 text-sm"
                  value={dateToText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDateToText(v);
                    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    if (m) {
                      const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
                      if (!isNaN(d.getTime())) setFilterDateTo(`${m[3]}-${m[2]}-${m[1]}`);
                    }
                    if (!v) setFilterDateTo("");
                  }}
                />
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    if (e.target.value) {
                      setDateToText(new Date(e.target.value + "T00:00:00").toLocaleDateString("fr-FR"));
                    } else {
                      setDateToText("");
                    }
                  }}
                  className="w-[38px] h-8 text-sm px-1 [&::-webkit-calendar-picker-indicator]:mx-0"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Active filter count */}
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground">
              {filteredDocs.length} document{filteredDocs.length > 1 ? "s" : ""} trouvé{filteredDocs.length > 1 ? "s" : ""}
            </p>
          )}

          {loadingDocs ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16">
              <FileCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-medium mb-1">Aucun document genere</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchDocs
                  ? "Aucun resultat pour votre recherche"
                  : "Generez vos premiers documents a partir d'un modele"}
              </p>
              {!searchDocs && (
                <Button
                  onClick={() => setGenerateDialogOpen(true)}
                  data-testid="button-generate-first"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generer des documents
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {batchMode && <TableHead className="w-10"></TableHead>}
                      <TableHead>Titre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Session</TableHead>
                      <TableHead className="hidden md:table-cell">Stagiaire</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead>Partage</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc) => {
                      const session = sessions?.find((s) => s.id === doc.sessionId);
                      const trainee = trainees?.find((t) => t.id === doc.traineeId);
                      return (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          {batchMode && (
                            <TableCell>
                              <Checkbox
                                checked={selectedDocIds.has(doc.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedDocIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.add(doc.id);
                                    else next.delete(doc.id);
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{doc.title}</p>
                              {(doc as any).quoteId && (
                                <span className="text-xs text-muted-foreground">Auto-genere (devis)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DocTypeBadge type={doc.type} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm text-muted-foreground">
                              {session?.title || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm text-muted-foreground">
                              {trainee
                                ? `${trainee.firstName} ${trainee.lastName}`
                                : "-"}
                            </p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <p className="text-sm text-muted-foreground">
                              {doc.createdAt
                                ? new Date(doc.createdAt).toLocaleDateString("fr-FR")
                                : "-"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <DocStatusBadge status={doc.status} />
                          </TableCell>
                          <TableCell>
                            <SignatureStatusBadge doc={doc} />
                          </TableCell>
                          <TableCell>
                            <VisibilityBadge visibility={(doc as any).visibility || "admin_only"} />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-doc-menu-${doc.id}`}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPreviewDoc(doc);
                                    setPreviewOpen(true);
                                  }}
                                  data-testid={`button-preview-doc-${doc.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Aperçu
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditDocState(doc);
                                    setEditDocOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Modifier le contenu
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => printDocumentHtml(doc.content, doc.title)}
                                  data-testid={`button-print-doc-${doc.id}`}
                                >
                                  <Printer className="w-4 h-4 mr-2" />
                                  Imprimer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await downloadPdfFromHtml(doc.content, doc.title);
                                    } catch (err) {
                                      console.error("PDF export error:", err);
                                    }
                                  }}
                                  data-testid={`button-pdf-doc-${doc.id}`}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Telecharger PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSignatureDocIds([doc.id]);
                                    setSignatureDialogOpen(true);
                                  }}
                                >
                                  <PenTool className="w-4 h-4 mr-2" />
                                  Demander signature
                                </DropdownMenuItem>
                                {(doc as any).signatureStatus === "signed" ? (
                                  <DropdownMenuItem disabled>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    <span className="text-green-600">Deja signe</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSignDoc(doc);
                                        setSignDialogOpen(true);
                                      }}
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      Signer (electronique)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setPaperSignDoc(doc);
                                        setPaperSignDialogOpen(true);
                                      }}
                                    >
                                      <Stamp className="w-4 h-4 mr-2" />
                                      Signature papier
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => updateDocMutation.mutate({ id: doc.id, data: { visibility: "enterprise", status: "shared" } })}
                                >
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Partager avec l'entreprise
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateDocMutation.mutate({ id: doc.id, data: { visibility: "all", status: "shared" } })}
                                >
                                  <Globe className="w-4 h-4 mr-2" />
                                  Partager avec tous
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateDocMutation.mutate({ id: doc.id, data: { visibility: "admin_only" } })}
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Restreindre (admin)
                                </DropdownMenuItem>
                                {(doc.type === "attestation_fifpl" || doc.type === "fiche_fipl") && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        const resp = await fetch(`/api/generated-documents/${doc.id}/pdf-fillable`);
                                        if (!resp.ok) throw new Error("Erreur PDF");
                                        const blob = await resp.blob();
                                        const url = URL.createObjectURL(blob);
                                        const a = window.document.createElement("a");
                                        a.href = url;
                                        a.download = `${doc.title.replace(/[^a-zA-Z0-9àâéèêëïôùûüÀÂÉÈÊËÏÔÙÛÜçÇ _-]/g, "_")}_remplissable.pdf`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      } catch (err) {
                                        console.error("Fillable PDF error:", err);
                                      }
                                    }}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    PDF remplissable (FIFPL)
                                  </DropdownMenuItem>
                                )}
                                {doc.type === "attestation" && doc.traineeId && (
                                  <DropdownMenuItem
                                    onClick={() => generatePostalLabelMutation.mutate(doc.traineeId!)}
                                    data-testid={`button-postal-label-${doc.id}`}
                                  >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Generer etiquette d'envoi postal
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => updateDocMutation.mutate({ id: doc.id, data: { status: "archived" } })}
                                >
                                  <FileCheck className="w-4 h-4 mr-2" />
                                  Archiver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteDocMutation.mutate(doc.id)}
                                  data-testid={`button-delete-doc-${doc.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* =================================================================
          Dialog: Create / Edit Template
         ================================================================= */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open);
          if (!open) setEditTemplate(undefined);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTemplate ? "Modifier le modele" : "Nouveau modele"}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editTemplate}
            onSubmit={(data) =>
              editTemplate
                ? updateTemplateMutation.mutate({ id: editTemplate.id, data })
                : createTemplateMutation.mutate(data)
            }
            isPending={
              createTemplateMutation.isPending || updateTemplateMutation.isPending
            }
          />
        </DialogContent>
      </Dialog>

      {/* =================================================================
          Dialog: Generate Documents
         ================================================================= */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generer des documents</DialogTitle>
          </DialogHeader>
          <GenerateForm
            templates={templates || []}
            sessions={sessions || []}
            trainees={trainees || []}
            enterprises={enterprisesData || []}
            onSubmit={(data) => generateMutation.mutate(data)}
            isPending={generateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* =================================================================
          Dialog: Preview Document
         ================================================================= */}
      <PreviewDialog
        document={previewDoc}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewDoc(null);
        }}
      />

      {/* =================================================================
          Dialog: Edit Document Content
         ================================================================= */}
      {editDocState && (
        <Dialog open={editDocOpen} onOpenChange={(open) => { setEditDocOpen(open); if (!open) setEditDocState(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Modifier le document : {editDocState.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <EditDocumentContent
                document={editDocState}
                onSave={(content) => {
                  updateDocMutation.mutate({ id: editDocState.id, data: { content } });
                }}
                isPending={updateDocMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =================================================================
          Dialog: Request Signature
         ================================================================= */}
      <RequestSignatureDialog
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          setSignatureDialogOpen(open);
          if (!open) setSignatureDocIds([]);
        }}
        documentIds={signatureDocIds}
        trainees={trainees || []}
        trainers={trainersData || []}
        enterprises={enterprisesData || []}
        onSubmit={handleRequestSignature}
        isPending={requestSignatureMutation.isPending || batchRequestSignatureMutation.isPending}
      />

      {/* =================================================================
          Dialog: Sign Document (Admin)
         ================================================================= */}
      <SignDocumentDialog
        document={signDoc}
        open={signDialogOpen}
        onOpenChange={(open) => {
          setSignDialogOpen(open);
          if (!open) setSignDoc(null);
        }}
        userId={user?.id?.toString() || ""}
        userName={user ? `${user.firstName} ${user.lastName}` : ""}
      />

      {/* =================================================================
          Dialog: Paper Signature (Alternative papier — 7.2)
         ================================================================= */}
      <PaperSignatureDialog
        document={paperSignDoc}
        open={paperSignDialogOpen}
        onOpenChange={(open) => {
          setPaperSignDialogOpen(open);
          if (!open) setPaperSignDoc(null);
        }}
        userName={user ? `${user.firstName} ${user.lastName}` : ""}
      />

      {/* =================================================================
          Dialog: AI Template Generation
         ================================================================= */}
      <Dialog open={aiTemplateDialogOpen} onOpenChange={(open) => { setAiTemplateDialogOpen(open); if (!open) { setAiTemplateDesc(""); setAiTemplateType("convention"); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Generer un modele avec l'IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              L'IA va generer un modele de document professionnel conforme a la reglementation formation, avec les variables dynamiques deja integrees.
            </p>
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={aiTemplateType} onValueChange={setAiTemplateType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instructions supplementaires (optionnel)</Label>
              <Textarea
                value={aiTemplateDesc}
                onChange={(e) => setAiTemplateDesc(e.target.value)}
                placeholder="Ex: Ajouter une clause de confidentialite, mentionner les modalites de paiement en 3 fois..."
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={aiTemplateGenerating}
              onClick={async () => {
                setAiTemplateGenerating(true);
                try {
                  const resp = await fetch("/api/document-templates/generate-ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ type: aiTemplateType, description: aiTemplateDesc }),
                  });
                  if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.message || "Erreur");
                  }
                  const result = await resp.json();
                  // Create the template directly
                  const usedVars = Object.values(TEMPLATE_VARIABLES)
                    .flat()
                    .filter((v) => result.content.includes(v.key))
                    .map((v) => v.key);
                  createTemplateMutation.mutate({
                    name: result.name,
                    type: result.type,
                    content: result.content,
                    variables: usedVars,
                    brandColor: "#1a56db",
                    fontFamily: "Arial",
                    logoUrl: null,
                    headerHtml: null,
                    footerHtml: null,
                  });
                  setAiTemplateDialogOpen(false);
                  setAiTemplateDesc("");
                  toast({ title: "Modele genere avec succes par l'IA" });
                } catch (err) {
                  toast({ title: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
                } finally {
                  setAiTemplateGenerating(false);
                }
              }}
            >
              {aiTemplateGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generation en cours...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generer le modele
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =================================================================
          Dialog: Import Template
         ================================================================= */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportFile(null); setImportName(""); setImportType("convention"); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Importer un modele
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importez un fichier HTML, Word (.docx) ou texte (.txt) pour creer un modele de document.
            </p>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${importFile ? "border-green-400 bg-green-50 dark:bg-green-900/10" : "border-muted-foreground/25 hover:border-primary/50"}`}
                onClick={() => importFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) setImportFile(file);
                }}
              >
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".html,.htm,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                      if (!importName) setImportName(file.name.replace(/\.[^.]+$/, ""));
                    }
                  }}
                />
                {importFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">{importFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(importFile.size / 1024).toFixed(0)} Ko)</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquez ou glissez un fichier HTML, Word ou texte</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom du modele</Label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Nom du modele..."
              />
            </div>
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!importFile || importLoading}
              onClick={async () => {
                if (!importFile) return;
                setImportLoading(true);
                try {
                  const formData = new FormData();
                  formData.append("file", importFile);
                  if (importName) formData.append("name", importName);
                  formData.append("type", importType);

                  const resp = await fetch("/api/document-templates/import", {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                  });
                  if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.message || "Erreur");
                  }
                  const result = await resp.json();
                  // Create the template
                  const usedVars = Object.values(TEMPLATE_VARIABLES)
                    .flat()
                    .filter((v) => result.content.includes(v.key))
                    .map((v) => v.key);
                  createTemplateMutation.mutate({
                    name: result.name,
                    type: result.type,
                    content: result.content,
                    variables: usedVars,
                    brandColor: "#1a56db",
                    fontFamily: "Arial",
                    logoUrl: null,
                    headerHtml: null,
                    footerHtml: null,
                  });
                  setImportDialogOpen(false);
                  setImportFile(null);
                  setImportName("");
                  toast({ title: "Modele importe avec succes" });
                } catch (err) {
                  toast({ title: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
                } finally {
                  setImportLoading(false);
                }
              }}
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer le modele
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
