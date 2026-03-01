import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Building2, Users, FileText, ClipboardList, AlertCircle, AlertTriangle, Loader2, Upload, Eye, Download, UserPlus, Pencil, Trash2, ChevronDown, ChevronRight, ShieldAlert, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import type { Enterprise, Enrollment, Session, Trainee, Quote, Invoice, EnterpriseContact, Program, GeneratedDocument, TraineeCertification } from "@shared/schema";
import { ENTERPRISE_CONTACT_ROLES, ENTERPRISE_DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "@shared/schema";

// ============================================================
// HELPERS
// ============================================================

interface UserDocument {
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EnrollmentStatusBadge({ status }: { status: string }) {
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

function DocumentTypeBadge({ type }: { type: string }) {
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
    politique_confidentialite: "Confidentialité",
    devis: "Devis",
    devis_sous_traitance: "Devis sous-traitance",
    facture: "Facture",
    facture_blended: "Facture blended",
    facture_specifique: "Facture spécifique",
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

// ============================================================
// CERTIFICATION TYPES & HELPERS
// ============================================================

interface EnterpriseCertification extends TraineeCertification {
  traineeFirstName: string;
  traineeLastName: string;
  traineeEmail: string;
  programTitle: string | null;
  recyclingMonths: number | null;
  certifying: boolean;
  computedExpiresAt: string | null;
}

type RecyclingStatus = "expired" | "critical" | "warning" | "ok";

function getRecyclingStatus(expiresAt: string | null): { status: RecyclingStatus; remainingDays: number | null; label: string } {
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

function RecyclingStatusBadge({ expiresAt }: { expiresAt: string | null }) {
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

function DocumentPreviewDialog({
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

function UploadDocumentDialog({
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

function ContactFormPortal({
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

// ============================================================
// MAIN PAGE
// ============================================================

export default function EnterprisePortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("formations");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string | null; fileName: string | null; mimeType: string | null; htmlContent?: string | null } | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<EnterpriseContact | undefined>();
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const enterpriseId = user?.enterpriseId;

  // Fetch enterprise details by ID (not the full list)
  const { data: enterprise, isLoading: enterpriseLoading } = useQuery<Enterprise>({
    queryKey: [`/api/enterprises/${enterpriseId}`],
    enabled: !!enterpriseId,
  });

  // Fetch enrollments for this enterprise
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/enrollments`],
    enabled: !!enterpriseId,
  });

  // Fetch enterprise-scoped sessions
  const { data: sessions } = useQuery<Session[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/sessions`],
    enabled: !!enterpriseId,
  });

  // Fetch enterprise-scoped trainees
  const { data: trainees, isLoading: traineesLoading } = useQuery<Trainee[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/trainees`],
    enabled: !!enterpriseId,
  });

  // Fetch enterprise-scoped programs
  const { data: programs } = useQuery<Program[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/programs`],
    enabled: !!enterpriseId,
  });

  // Fetch generated documents for enterprise
  const { data: generatedDocs } = useQuery<GeneratedDocument[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/generated-documents`],
    enabled: !!enterpriseId,
  });

  // Fetch user documents for enterprise
  const { data: documents, isLoading: documentsLoading } = useQuery<UserDocument[]>({
    queryKey: [`/api/user-documents?ownerId=${enterpriseId}&ownerType=enterprise`],
    enabled: !!enterpriseId,
  });

  // Fetch enterprise contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery<EnterpriseContact[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/contacts`],
    enabled: !!enterpriseId,
  });

  // Fetch certifications for all enterprise trainees
  const { data: certifications } = useQuery<EnterpriseCertification[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/certifications`],
    enabled: !!enterpriseId,
  });

  // Fetch enterprise quotes
  const { data: enterpriseQuotes } = useQuery<Quote[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/quotes`],
    enabled: !!enterpriseId,
  });

  // Fetch enterprise invoices
  const { data: enterpriseInvoices } = useQuery<Invoice[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/invoices`],
    enabled: !!enterpriseId,
  });

  // Contact mutations
  const { toast } = useToast();

  const roleLabels: Record<string, string> = {};
  ENTERPRISE_CONTACT_ROLES.forEach((r) => { roleLabels[r.value] = r.label; });

  const createContactMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", `/api/enterprises/${enterpriseId}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterpriseId}/contacts`] });
      setContactDialogOpen(false);
      toast({ title: "Contact ajoute" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/enterprise-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterpriseId}/contacts`] });
      setContactDialogOpen(false);
      setEditContact(undefined);
      toast({ title: "Contact modifie" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enterprise-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterpriseId}/contacts`] });
      toast({ title: "Contact supprime" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-documents?ownerId=${enterpriseId}&ownerType=enterprise`] });
      setDeleteDocId(null);
      toast({ title: "Document supprime" });
    },
  });

  // Build lookup maps
  const sessionMap = useMemo(() => {
    const map = new Map<string, Session>();
    if (sessions) sessions.forEach((s) => map.set(s.id, s));
    return map;
  }, [sessions]);

  const traineeMap = useMemo(() => {
    const map = new Map<string, Trainee>();
    if (trainees) trainees.forEach((t) => map.set(t.id, t));
    return map;
  }, [trainees]);

  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    if (programs) programs.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  // Calculate available years from sessions
  const availableYears = useMemo(() => {
    if (!enrollments || !sessions) return [];
    const years = new Set<string>();
    enrollments.forEach((enrollment) => {
      const session = sessionMap.get(enrollment.sessionId);
      if (session) {
        years.add(new Date(session.startDate).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [enrollments, sessions, sessionMap]);

  // Filter enrollments by year and search
  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    let filtered = enrollments;
    if (yearFilter !== "all") {
      filtered = filtered.filter((enrollment) => {
        const session = sessionMap.get(enrollment.sessionId);
        if (!session) return false;
        return new Date(session.startDate).getFullYear().toString() === yearFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((enrollment) => {
        const session = sessionMap.get(enrollment.sessionId);
        const trainee = traineeMap.get(enrollment.traineeId);
        const program = session ? programMap.get(session.programId) : undefined;
        const traineeName = trainee ? `${trainee.firstName} ${trainee.lastName}`.toLowerCase() : "";
        const sessionTitle = session?.title?.toLowerCase() || "";
        const programTitle = program?.title?.toLowerCase() || "";
        return traineeName.includes(q) || sessionTitle.includes(q) || programTitle.includes(q);
      });
    }
    return filtered;
  }, [enrollments, yearFilter, searchQuery, sessionMap, traineeMap, programMap]);

  // Employee enrollment counts & last session
  const employeeStats = useMemo(() => {
    const stats = new Map<string, { count: number; lastDate: string | null; enrollments: Enrollment[] }>();
    if (!enrollments) return stats;
    enrollments.forEach((e) => {
      const existing = stats.get(e.traineeId) || { count: 0, lastDate: null, enrollments: [] };
      existing.count++;
      existing.enrollments.push(e);
      const session = sessionMap.get(e.sessionId);
      if (session) {
        if (!existing.lastDate || session.startDate > existing.lastDate) {
          existing.lastDate = session.startDate;
        }
      }
      stats.set(e.traineeId, existing);
    });
    return stats;
  }, [enrollments, sessionMap]);

  // Stats
  const totalEmployeesEnrolled = useMemo(() => {
    if (!enrollments) return 0;
    return new Set(enrollments.map((e) => e.traineeId)).size;
  }, [enrollments]);

  const activeSessions = useMemo(() => {
    if (!enrollments) return 0;
    return enrollments.filter((e) => e.status !== "completed" && e.status !== "cancelled").length;
  }, [enrollments]);

  const completedFormations = useMemo(() => {
    if (!enrollments) return 0;
    return enrollments.filter((e) => e.status === "completed").length;
  }, [enrollments]);

  // Recycling alerts: certifications that are expired or expiring within 6 months
  const recyclingAlerts = useMemo(() => {
    if (!certifications) return { expired: 0, critical: 0, warning: 0, total: 0 };
    let expired = 0;
    let critical = 0;
    let warning = 0;
    for (const cert of certifications) {
      if (!cert.computedExpiresAt) continue;
      const { status } = getRecyclingStatus(cert.computedExpiresAt);
      if (status === "expired") expired++;
      else if (status === "critical") critical++;
      else if (status === "warning") warning++;
    }
    return { expired, critical, warning, total: expired + critical + warning };
  }, [certifications]);

  const isLoading = enrollmentsLoading || enterpriseLoading;

  // Not authenticated
  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Acces non autorise</h3>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour acceder a votre espace entreprise.
          </p>
        </div>
      </div>
    );
  }

  const quoteStatusLabel: Record<string, string> = {
    draft: "Brouillon", sent: "Envoye", accepted: "Accepte", rejected: "Refuse", expired: "Expire",
  };
  const invoiceStatusLabel: Record<string, string> = {
    draft: "Brouillon", sent: "Envoyee", paid: "Payee", partial: "Partielle", overdue: "En retard", cancelled: "Annulee",
  };

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader
        title="Portail Entreprise"
        subtitle="Suivi des formations de vos collaborateurs"
      />

      {/* Warning if no enterprise linked */}
      {!isLoading && !enterpriseId && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Profil entreprise non associe</p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre compte utilisateur n'est pas encore lie a une entreprise.
                Contactez votre administrateur pour qu'il associe votre compte.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEmployeesEnrolled}</p>
              <p className="text-xs text-muted-foreground">Employes inscrits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSessions}</p>
              <p className="text-xs text-muted-foreground">Sessions en cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedFormations}</p>
              <p className="text-xs text-muted-foreground">Formations terminees</p>
            </div>
          </CardContent>
        </Card>
        <Card className={recyclingAlerts.total > 0 ? "border-orange-300 dark:border-orange-700" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${recyclingAlerts.total > 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-gray-50 dark:bg-gray-900/20"}`}>
              <RefreshCw className={`w-5 h-5 ${recyclingAlerts.total > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{recyclingAlerts.total}</p>
              <p className="text-xs text-muted-foreground">Recyclages a planifier</p>
            </div>
            {recyclingAlerts.expired > 0 && (
              <Badge variant="outline" className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                {recyclingAlerts.expired} expire{recyclingAlerts.expired > 1 ? "s" : ""}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recycling alert banner */}
      {recyclingAlerts.expired > 0 && (
        <Card className="border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {recyclingAlerts.expired} certification{recyclingAlerts.expired > 1 ? "s expiree" : " expiree"}{recyclingAlerts.expired > 1 ? "s" : ""} — recyclage requis
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                Des employes ont des certifications expirees (AFGSU, Certibiocide, etc.) necessitant un recyclage.
                Consultez l'onglet Recyclage pour plus de details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : enterpriseId ? (
        /* Tabs */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="formations">
              <ClipboardList className="w-4 h-4 mr-2" />
              Formations
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <UserPlus className="w-4 h-4 mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="employes">
              <Users className="w-4 h-4 mr-2" />
              Employes
            </TabsTrigger>
            <TabsTrigger value="recyclage" className="relative">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recyclage
              {recyclingAlerts.total > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-orange-500 text-white">
                  {recyclingAlerts.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* Tab: Formations (enriched with employee + program + search) */}
          {/* ============================================ */}
          <TabsContent value="formations" className="mt-4">
            {!enrollments || enrollments.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium mb-1">Aucune inscription</h3>
                <p className="text-sm text-muted-foreground">
                  Aucun employe n'est inscrit a une session de formation pour le moment.
                </p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-lg">Inscriptions aux formations</CardTitle>
                    <div className="flex items-center gap-2">
                      <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Rechercher..."
                        className="w-[220px]"
                      />
                      {availableYears.length > 0 && (
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Filtrer par annee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les annees</SelectItem>
                            {availableYears.map((year) => (
                              <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employe</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Formation</TableHead>
                        <TableHead>Date de debut</TableHead>
                        <TableHead>Date de fin</TableHead>
                        <TableHead>Lieu</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnrollments.map((enrollment) => {
                        const session = sessionMap.get(enrollment.sessionId);
                        const trainee = traineeMap.get(enrollment.traineeId);
                        const program = session ? programMap.get(session.programId) : undefined;
                        return (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">
                              {trainee ? `${trainee.firstName} ${trainee.lastName}` : "-"}
                            </TableCell>
                            <TableCell>
                              {session?.title || "Session inconnue"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {program?.title || "-"}
                            </TableCell>
                            <TableCell>
                              {session ? formatDate(session.startDate) : "-"}
                            </TableCell>
                            <TableCell>
                              {session ? formatDate(session.endDate) : "-"}
                            </TableCell>
                            <TableCell>
                              {session?.location || "-"}
                            </TableCell>
                            <TableCell>
                              <EnrollmentStatusBadge status={enrollment.status} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredEnrollments.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Aucun resultat pour "{searchQuery}"
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* Tab: Documents (enriched with generated docs + extended categories + delete) */}
          {/* ============================================ */}
          <TabsContent value="documents" className="mt-4 space-y-6">
            {/* Devis section */}
            {enterpriseQuotes && enterpriseQuotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Devis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Montant TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enterpriseQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-mono text-sm">{quote.number}</TableCell>
                          <TableCell className="font-medium">{quote.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{quoteStatusLabel[quote.status] || quote.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{(quote.total / 100).toFixed(2)} EUR</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Factures section */}
            {enterpriseInvoices && enterpriseInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Factures</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paye</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enterpriseInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.number}</TableCell>
                          <TableCell className="font-medium">{invoice.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invoiceStatusLabel[invoice.status] || invoice.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{(invoice.total / 100).toFixed(2)} EUR</TableCell>
                          <TableCell className="text-right">{(invoice.paidAmount / 100).toFixed(2)} EUR</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* GED - Documents générés (Conventions, Attestations, etc.) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Gestion documentaire
                    {generatedDocs && generatedDocs.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{generatedDocs.length}</Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!generatedDocs || generatedDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun document disponible. Les conventions seront générées automatiquement après la signature des devis.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedDocs.map((doc) => {
                        const session = doc.sessionId ? sessionMap.get(doc.sessionId) : undefined;
                        const statusInfo = DOCUMENT_STATUSES.find(s => s.value === doc.status);
                        const statusColor = doc.status === "signed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : doc.status === "shared" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : doc.status === "sent" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {doc.title}
                                {doc.quoteId && (
                                  <Badge variant="outline" className="text-xs">Devis</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DocumentTypeBadge type={doc.type} />
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColor}>
                                {doc.status === "signed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {statusInfo?.label || doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {session?.title || "-"}
                            </TableCell>
                            <TableCell>
                              {doc.createdAt ? formatDate(doc.createdAt as unknown as string) : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewDoc({
                                  fileUrl: null,
                                  fileName: doc.title,
                                  mimeType: null,
                                  htmlContent: doc.content,
                                })}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Documents deposes (with delete) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Documents deposes</CardTitle>
                  <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Deposer un document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !documents || documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucun document depose pour le moment.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Nom du fichier</TableHead>
                        <TableHead>Date d'ajout</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => {
                        const catLabel = ENTERPRISE_DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category || "Autre";
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{catLabel}</Badge>
                            </TableCell>
                            <TableCell>{doc.fileName || "-"}</TableCell>
                            <TableCell>
                              {doc.uploadedAt ? formatDate(doc.uploadedAt) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {doc.fileUrl && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setPreviewDoc({ fileUrl: doc.fileUrl, fileName: doc.fileName, mimeType: doc.mimeType })}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setDeleteDocId(doc.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================ */}
          {/* Tab: Contacts */}
          {/* ============================================ */}
          <TabsContent value="contacts" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contacts de l'entreprise</CardTitle>
                <Button size="sm" onClick={() => { setEditContact(undefined); setContactDialogOpen(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" />Ajouter un contact
                </Button>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !contacts || contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun contact enregistre</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telephone</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.firstName} {c.lastName}
                            {c.isPrimary && <Badge variant="outline" className="ml-2 text-xs">Principal</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.email || "\u2014"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.phone || "\u2014"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.department || "\u2014"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{roleLabels[c.role] || c.role}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditContact(c); setContactDialogOpen(true); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteContactMutation.mutate(c.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={contactDialogOpen} onOpenChange={(open) => { setContactDialogOpen(open); if (!open) setEditContact(undefined); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editContact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
                </DialogHeader>
                <ContactFormPortal
                  contact={editContact}
                  onSubmit={(data) =>
                    editContact
                      ? updateContactMutation.mutate({ id: editContact.id, data })
                      : createContactMutation.mutate(data)
                  }
                  isPending={createContactMutation.isPending || updateContactMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ============================================ */}
          {/* Tab: Employes (enriched with training count + expandable rows) */}
          {/* ============================================ */}
          <TabsContent value="employes" className="mt-4">
            {traineesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !trainees || trainees.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium mb-1">Aucun employe</h3>
                <p className="text-sm text-muted-foreground">
                  Aucun employe n'est rattache a votre entreprise pour le moment.
                </p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employes rattaches</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prenom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Formations</TableHead>
                        <TableHead>Derniere session</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainees.map((trainee) => {
                        const stats = employeeStats.get(trainee.id);
                        const isExpanded = expandedEmployee === trainee.id;
                        return (
                          <>
                            <TableRow
                              key={trainee.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedEmployee(isExpanded ? null : trainee.id)}
                            >
                              <TableCell>
                                {stats && stats.count > 0 ? (
                                  isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )
                                ) : null}
                              </TableCell>
                              <TableCell className="font-medium">{trainee.lastName}</TableCell>
                              <TableCell>{trainee.firstName}</TableCell>
                              <TableCell>{trainee.email}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{stats?.count || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {stats?.lastDate ? formatDate(stats.lastDate) : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    trainee.status === "active"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  }
                                >
                                  {trainee.status === "active" ? "Actif" : "Inactif"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            {isExpanded && stats && stats.enrollments.length > 0 && (
                              <TableRow key={`${trainee.id}-detail`}>
                                <TableCell colSpan={7} className="bg-muted/30 p-0">
                                  <div className="px-8 py-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Historique des formations</p>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs">Session</TableHead>
                                          <TableHead className="text-xs">Formation</TableHead>
                                          <TableHead className="text-xs">Date</TableHead>
                                          <TableHead className="text-xs">Statut</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {stats.enrollments.map((enr) => {
                                          const session = sessionMap.get(enr.sessionId);
                                          const program = session ? programMap.get(session.programId) : undefined;
                                          return (
                                            <TableRow key={enr.id}>
                                              <TableCell className="text-sm">{session?.title || "-"}</TableCell>
                                              <TableCell className="text-sm text-muted-foreground">{program?.title || "-"}</TableCell>
                                              <TableCell className="text-sm">{session ? formatDate(session.startDate) : "-"}</TableCell>
                                              <TableCell><EnrollmentStatusBadge status={enr.status} /></TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* Tab: Recyclage */}
          {/* ============================================ */}
          <TabsContent value="recyclage" className="mt-4">
            {!certifications || certifications.length === 0 ? (
              <div className="text-center py-16">
                <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium mb-1">Aucune certification</h3>
                <p className="text-sm text-muted-foreground">
                  Aucune certification n'est enregistree pour vos employes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className={recyclingAlerts.expired > 0 ? "border-red-300 dark:border-red-700" : ""}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <AlertTriangle className={`w-4 h-4 ${recyclingAlerts.expired > 0 ? "text-red-500" : "text-muted-foreground/40"}`} />
                      <div>
                        <p className="text-lg font-bold">{recyclingAlerts.expired}</p>
                        <p className="text-xs text-muted-foreground">Certifications expirees</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={recyclingAlerts.critical > 0 ? "border-orange-300 dark:border-orange-700" : ""}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Clock className={`w-4 h-4 ${recyclingAlerts.critical > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
                      <div>
                        <p className="text-lg font-bold">{recyclingAlerts.critical}</p>
                        <p className="text-xs text-muted-foreground">Expirent sous 3 mois</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Clock className={`w-4 h-4 ${recyclingAlerts.warning > 0 ? "text-amber-500" : "text-muted-foreground/40"}`} />
                      <div>
                        <p className="text-lg font-bold">{recyclingAlerts.warning}</p>
                        <p className="text-xs text-muted-foreground">Expirent sous 6 mois</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Certifications table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Suivi des certifications et recyclages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employe</TableHead>
                          <TableHead>Certification</TableHead>
                          <TableHead>Formation</TableHead>
                          <TableHead>Obtenue le</TableHead>
                          <TableHead>Echeance</TableHead>
                          <TableHead>Statut recyclage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {certifications
                          .filter((c) => c.computedExpiresAt)
                          .sort((a, b) => {
                            // Sort: expired first, then by expiry date ascending
                            const da = a.computedExpiresAt ? new Date(a.computedExpiresAt).getTime() : Infinity;
                            const db = b.computedExpiresAt ? new Date(b.computedExpiresAt).getTime() : Infinity;
                            return da - db;
                          })
                          .map((cert) => (
                            <TableRow key={cert.id}>
                              <TableCell className="font-medium">
                                {cert.traineeFirstName} {cert.traineeLastName}
                              </TableCell>
                              <TableCell>{cert.label}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {cert.programTitle || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(cert.obtainedAt)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {cert.computedExpiresAt ? formatDate(cert.computedExpiresAt) : "-"}
                              </TableCell>
                              <TableCell>
                                <RecyclingStatusBadge expiresAt={cert.computedExpiresAt} />
                              </TableCell>
                            </TableRow>
                          ))}
                        {certifications.filter((c) => !c.computedExpiresAt).length > 0 && (
                          <>
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/30 text-xs font-medium text-muted-foreground py-2">
                                Certifications sans echeance de recyclage
                              </TableCell>
                            </TableRow>
                            {certifications
                              .filter((c) => !c.computedExpiresAt)
                              .map((cert) => (
                                <TableRow key={cert.id} className="opacity-60">
                                  <TableCell className="font-medium">
                                    {cert.traineeFirstName} {cert.traineeLastName}
                                  </TableCell>
                                  <TableCell>{cert.label}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {cert.programTitle || "-"}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDate(cert.obtainedAt)}
                                  </TableCell>
                                  <TableCell className="text-sm">-</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                      Non soumis
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : null}

      {/* Upload dialog */}
      {enterpriseId && (
        <UploadDocumentDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          ownerId={enterpriseId}
          ownerType="enterprise"
        />
      )}

      {/* Delete document confirmation dialog */}
      <Dialog open={!!deleteDocId} onOpenChange={(open) => { if (!open) setDeleteDocId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Etes-vous sur de vouloir supprimer ce document ? Cette action est irreversible.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteDocId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteDocId) deleteDocMutation.mutate(deleteDocId); }}
              disabled={deleteDocMutation.isPending}
            >
              {deleteDocMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document preview dialog */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        fileUrl={previewDoc?.fileUrl || null}
        fileName={previewDoc?.fileName || null}
        mimeType={previewDoc?.mimeType || null}
        htmlContent={previewDoc?.htmlContent}
      />
    </PageLayout>
  );
}
