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
import { Building2, Users, FileText, ClipboardList, AlertCircle, Loader2, Upload, Eye, Download, X, UserPlus, Pencil, Trash2 } from "lucide-react";
import type { Enterprise, Enrollment, Session, Trainee, Quote, Invoice, EnterpriseContact } from "@shared/schema";
import { ENTERPRISE_CONTACT_ROLES } from "@shared/schema";

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
          <DialogTitle className="flex items-center justify-between">
            <span>{fileName || "Apercu du document"}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={fileName || "PDF"}
            />
          ) : isImage ? (
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
              <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Telecharger le fichier
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
                <SelectItem value="convention">Convention</SelectItem>
                <SelectItem value="attestation">Attestation</SelectItem>
                <SelectItem value="facture">Facture</SelectItem>
                <SelectItem value="administratif">Administratif</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
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
  onSubmit: (data: { firstName: string; lastName: string; email: string | null; phone: string | null; role: string; isPrimary: boolean }) => void;
  isPending: boolean;
}) {
  const [firstName, setFirstName] = useState(contact?.firstName || "");
  const [lastName, setLastName] = useState(contact?.lastName || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [role, setRole] = useState(contact?.role || "general");
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary || false);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ firstName, lastName, email: email || null, phone: phone || null, role, isPrimary }); }} className="space-y-4">
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
        <div className="space-y-2 flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="accent-primary" />
            <span className="text-sm">Contact principal</span>
          </label>
        </div>
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
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<EnterpriseContact | undefined>();

  const enterpriseId = user?.enterpriseId;

  // Fetch enterprise details
  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const enterprise = useMemo(() => {
    if (!enterprises || !enterpriseId) return null;
    return enterprises.find((e) => e.id === enterpriseId) || null;
  }, [enterprises, enterpriseId]);

  // Fetch enrollments for this enterprise
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/enrollments`],
    enabled: !!enterpriseId,
  });

  // Fetch sessions for enrollment details
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Fetch trainees to list employees
  const { data: trainees, isLoading: traineesLoading } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
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
      toast({ title: "Contact ajouté" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/enterprise-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterpriseId}/contacts`] });
      setContactDialogOpen(false);
      setEditContact(undefined);
      toast({ title: "Contact modifié" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enterprise-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterpriseId}/contacts`] });
      toast({ title: "Contact supprimé" });
    },
  });

  // Filter trainees linked to this enterprise
  const enterpriseTrainees = useMemo(() => {
    if (!trainees || !enterpriseId) return [];
    return trainees.filter((t) => t.enterpriseId === enterpriseId);
  }, [trainees, enterpriseId]);

  // Build session lookup map
  const sessionMap = useMemo(() => {
    const map = new Map<string, Session>();
    if (sessions) {
      sessions.forEach((s) => map.set(s.id, s));
    }
    return map;
  }, [sessions]);

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

  // Filter enrollments by year
  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    if (yearFilter === "all") return enrollments;
    return enrollments.filter((enrollment) => {
      const session = sessionMap.get(enrollment.sessionId);
      if (!session) return false;
      return new Date(session.startDate).getFullYear().toString() === yearFilter;
    });
  }, [enrollments, yearFilter, sessionMap]);

  // Stats
  const totalEmployeesEnrolled = useMemo(() => {
    if (!enrollments) return 0;
    const uniqueTrainees = new Set(enrollments.map((e) => e.traineeId));
    return uniqueTrainees.size;
  }, [enrollments]);

  const activeSessions = useMemo(() => {
    if (!enrollments) return 0;
    return enrollments.filter(
      (e) => e.status !== "completed" && e.status !== "cancelled"
    ).length;
  }, [enrollments]);

  const completedFormations = useMemo(() => {
    if (!enrollments) return 0;
    return enrollments.filter((e) => e.status === "completed").length;
  }, [enrollments]);

  const isLoading = enrollmentsLoading || !enterprises;

  // Not authenticated
  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">
            Acces non autorise
          </h3>
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Building2 className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Portail Entreprise</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          {enterprise
            ? `Bienvenue, ${enterprise.name}. Gerez vos formations et suivez vos employes.`
            : `Bienvenue, ${user.firstName} ${user.lastName}. Gerez vos formations et suivez vos employes.`}
        </p>
      </div>

      {/* Warning if no enterprise linked */}
      {!isLoading && !enterpriseId && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                Profil entreprise non associe
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre compte utilisateur n'est pas encore lie a une entreprise.
                Contactez votre administrateur pour qu'il associe votre compte.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEmployeesEnrolled}</p>
              <p className="text-xs text-muted-foreground">
                Employes inscrits
              </p>
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
              <p className="text-xs text-muted-foreground">
                Sessions en cours
              </p>
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
              <p className="text-xs text-muted-foreground">
                Formations terminees
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
          </TabsList>

          {/* Tab: Formations with year filter */}
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Inscriptions aux formations</CardTitle>
                    {availableYears.length > 0 && (
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-[180px]">
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
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Date de debut</TableHead>
                        <TableHead>Date de fin</TableHead>
                        <TableHead>Lieu</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnrollments.map((enrollment) => {
                        const session = sessionMap.get(enrollment.sessionId);
                        return (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">
                              {session?.title || "Session inconnue"}
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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Documents with cross-referencing and upload */}
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

            {/* Documents deposes */}
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
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {doc.category || "Autre"}
                            </Badge>
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
                                    onClick={() => setPreviewDoc(doc)}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Contacts */}
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
                          <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
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

          {/* Tab: Employes */}
          <TabsContent value="employes" className="mt-4">
            {traineesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : enterpriseTrainees.length === 0 ? (
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
                        <TableHead>Nom</TableHead>
                        <TableHead>Prenom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telephone</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enterpriseTrainees.map((trainee) => (
                        <TableRow key={trainee.id}>
                          <TableCell className="font-medium">{trainee.lastName}</TableCell>
                          <TableCell>{trainee.firstName}</TableCell>
                          <TableCell>{trainee.email}</TableCell>
                          <TableCell>{trainee.phone || "-"}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
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

      {/* Document preview dialog */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        fileUrl={previewDoc?.fileUrl || null}
        fileName={previewDoc?.fileName || null}
        mimeType={previewDoc?.mimeType || null}
      />
    </div>
  );
}
