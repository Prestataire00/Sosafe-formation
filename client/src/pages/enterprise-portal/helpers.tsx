import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { FileText, Loader2, Upload, Download, AlertTriangle, Clock } from "lucide-react";
import type { EnterpriseContact, TraineeCertification } from "@shared/schema";
import { ENTERPRISE_CONTACT_ROLES, ENTERPRISE_DOCUMENT_CATEGORIES } from "@shared/schema";

// ============================================================
// TYPES
// ============================================================

export interface UserDocument {
  id: string;
  ownerId: string;
  ownerType: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

export interface EnterpriseCertification extends TraineeCertification {
  traineeFirstName: string;
  traineeLastName: string;
  traineeEmail: string;
  programTitle: string | null;
  recyclingMonths: number | null;
  certifying: boolean;
  computedExpiresAt: string | null;
}

export type RecyclingStatus = "expired" | "critical" | "warning" | "ok";

// ============================================================
// HELPERS
// ============================================================

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function getRecyclingStatus(expiresAt: string | null): { status: RecyclingStatus; remainingDays: number | null; label: string } {
  if (!expiresAt) return { status: "ok", remainingDays: null, label: "Pas d'echeance" };
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (remainingDays < 0) return { status: "expired", remainingDays, label: "Expire" };
  if (remainingDays <= 90) return { status: "critical", remainingDays, label: `${remainingDays}j restants` };
  if (remainingDays <= 180) return { status: "warning", remainingDays, label: `${Math.floor(remainingDays / 30)} mois restants` };
  return { status: "ok", remainingDays, label: `${Math.floor(remainingDays / 30)} mois restants` };
}

export const quoteStatusLabel: Record<string, string> = {
  draft: "Brouillon", sent: "Envoye", accepted: "Accepte", rejected: "Refuse", expired: "Expire",
};

export const quoteStatusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export const invoiceStatusLabel: Record<string, string> = {
  draft: "Brouillon", sent: "Envoyee", paid: "Payee", partial: "Partielle", overdue: "En retard", cancelled: "Annulee",
};

export const invoiceStatusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export const paymentMethodLabel: Record<string, string> = {
  bank_transfer: "Virement", check: "Cheque", cash: "Especes", card: "Carte", direct_debit: "Prelevement", other: "Autre",
};

// ============================================================
// BADGE COMPONENTS
// ============================================================

export function EnrollmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    registered: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    confirmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    attended: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    no_show: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels: Record<string, string> = {
    pending: "En attente",
    registered: "Inscrit",
    confirmed: "Confirme",
    attended: "Present",
    completed: "Termine",
    cancelled: "Annule",
    no_show: "Absent",
  };
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

export function DocumentTypeBadge({ type }: { type: string }) {
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
    attestation: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    certificat: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    etiquette_envoi: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    bpf: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  const labels: Record<string, string> = {
    convention: "Convention",
    contrat_particulier: "Contrat particulier",
    contrat_vae: "Contrat VAE",
    politique_confidentialite: "Confidentialite",
    devis: "Devis",
    devis_sous_traitance: "Devis sous-traitance",
    facture: "Facture",
    facture_blended: "Facture blended",
    facture_specifique: "Facture specifique",
    attestation: "Attestation",
    certificat: "Certificat",
    etiquette_envoi: "Envoi postal",
    bpf: "BPF",
  };
  return (
    <Badge variant="outline" className={variants[type] || "bg-gray-100 text-gray-700"}>
      {labels[type] || type}
    </Badge>
  );
}

export function RecyclingStatusBadge({ expiresAt }: { expiresAt: string | null }) {
  const { status, label } = getRecyclingStatus(expiresAt);
  const config: Record<RecyclingStatus, { className: string; icon: React.ReactNode }> = {
    expired: {
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    critical: {
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      icon: <Clock className="w-3 h-3" />,
    },
    warning: {
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      icon: <Clock className="w-3 h-3" />,
    },
    ok: {
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: null,
    },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${c.className}`}>
      {c.icon}
      {label}
    </Badge>
  );
}

// ============================================================
// DOCUMENT PREVIEW DIALOG
// ============================================================

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  mimeType,
  htmlContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  htmlContent?: string | null;
}) {
  if (!fileUrl && !htmlContent) return null;

  const isPdf = mimeType === "application/pdf" || fileUrl?.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/") || (fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{fileName || "Apercu du document"}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {htmlContent ? (
            <div
              className="prose prose-sm max-w-none p-4 border rounded-lg max-h-[70vh] overflow-auto bg-white dark:bg-gray-900"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={fileName || "PDF"}
            />
          ) : isImage && fileUrl ? (
            <div className="flex items-center justify-center">
              <img
                src={fileUrl}
                alt={fileName || "Image"}
                className="max-w-full max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">
                L'apercu n'est pas disponible pour ce type de fichier.
              </p>
              {fileUrl && (
                <Button asChild>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Telecharger le fichier
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// UPLOAD DOCUMENT DIALOG
// ============================================================

export function UploadDocumentDialog({
  open,
  onOpenChange,
  ownerId,
  ownerType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  ownerType: string;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("autre");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file);
      await apiRequest("POST", "/api/user-documents", {
        ownerId,
        ownerType,
        title,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        category,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-documents?ownerId=${ownerId}&ownerType=${ownerType}`] });
      toast({ title: "Document depose avec succes" });
      setTitle("");
      setCategory("autre");
      setFile(null);
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur lors du depot", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposer un document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre du document</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Convention de formation" />
          </div>
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTERPRISE_DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fichier</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={handleUpload} disabled={!file || !title || isUploading} className="w-full">
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
  );
}

// ============================================================
// CONTACT FORM (Portal)
// ============================================================

export function ContactFormPortal({
  contact,
  onSubmit,
  isPending,
}: {
  contact?: EnterpriseContact;
  onSubmit: (data: { firstName: string; lastName: string; email: string | null; phone: string | null; role: string; department: string | null; notes: string | null; isPrimary: boolean }) => void;
  isPending: boolean;
}) {
  const [firstName, setFirstName] = useState(contact?.firstName || "");
  const [lastName, setLastName] = useState(contact?.lastName || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [role, setRole] = useState(contact?.role || "general");
  const [department, setDepartment] = useState(contact?.department || "");
  const [notes, setNotes] = useState(contact?.notes || "");
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary || false);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ firstName, lastName, email: email || null, phone: phone || null, role, department: department || null, notes: notes || null, isPrimary }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prenom</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Telephone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTERPRISE_CONTACT_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Service / Departement</Label>
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ex: Comptabilite, RH, Direction..." />
        </div>
      </div>
      <div className="space-y-2 flex items-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="accent-primary" />
          <span className="text-sm">Contact principal</span>
        </label>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complementaires..." />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : contact ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
