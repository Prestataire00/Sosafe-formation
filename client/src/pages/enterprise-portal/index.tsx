import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Users,
  FileText,
  ClipboardList,
  AlertCircle,
  Loader2,
  UserPlus,
  RefreshCw,
  ShieldAlert,
  LayoutDashboard,
  Euro,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import type {
  Enterprise,
  Enrollment,
  Session,
  Trainee,
  Quote,
  Invoice,
  EnterpriseContact,
  Program,
  GeneratedDocument,
} from "@shared/schema";

import {
  type EnterpriseCertification,
  type UserDocument,
  getRecyclingStatus,
  DocumentPreviewDialog,
  UploadDocumentDialog,
} from "./helpers";
import EnterpriseDashboardTab from "./EnterpriseDashboardTab";
import EnterpriseFormationsTab from "./EnterpriseFormationsTab";
import EnterpriseDocumentsTab from "./EnterpriseDocumentsTab";
import EnterpriseContactsTab from "./EnterpriseContactsTab";
import EnterpriseEmployesTab from "./EnterpriseEmployesTab";
import EnterpriseFacturationTab from "./EnterpriseFacturationTab";
import EnterpriseRecyclageTab from "./EnterpriseRecyclageTab";

export default function EnterprisePortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    fileUrl: string | null;
    fileName: string | null;
    mimeType: string | null;
    htmlContent?: string | null;
  } | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<EnterpriseContact | undefined>();
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const enterpriseId = user?.enterpriseId;

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const { data: enterprise, isLoading: enterpriseLoading } = useQuery<Enterprise>({
    queryKey: [`/api/enterprises/${enterpriseId}`],
    enabled: !!enterpriseId,
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/enrollments`],
    enabled: !!enterpriseId,
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/sessions`],
    enabled: !!enterpriseId,
  });

  const { data: trainees, isLoading: traineesLoading } = useQuery<Trainee[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/trainees`],
    enabled: !!enterpriseId,
  });

  const { data: programs } = useQuery<Program[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/programs`],
    enabled: !!enterpriseId,
  });

  const { data: generatedDocs } = useQuery<GeneratedDocument[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/generated-documents`],
    enabled: !!enterpriseId,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<UserDocument[]>({
    queryKey: [`/api/user-documents?ownerId=${enterpriseId}&ownerType=enterprise`],
    enabled: !!enterpriseId,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery<EnterpriseContact[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/contacts`],
    enabled: !!enterpriseId,
  });

  const { data: certifications } = useQuery<EnterpriseCertification[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/certifications`],
    enabled: !!enterpriseId,
  });

  const { data: enterpriseQuotes } = useQuery<Quote[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/quotes`],
    enabled: !!enterpriseId,
  });

  const { data: enterpriseInvoices } = useQuery<Invoice[]>({
    queryKey: [`/api/enterprises/${enterpriseId}/invoices`],
    enabled: !!enterpriseId,
  });

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createContactMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", `/api/enterprises/${enterpriseId}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterpriseId}/contacts`] });
      setContactDialogOpen(false);
      toast({ title: "Contact ajoute" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/enterprise-contacts/${id}`, data),
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
      queryClient.invalidateQueries({
        queryKey: [`/api/user-documents?ownerId=${enterpriseId}&ownerType=enterprise`],
      });
      setDeleteDocId(null);
      toast({ title: "Document supprime" });
    },
  });

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

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

  // ============================================================
  // RENDER
  // ============================================================

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

  return (
    <PageLayout>
      <PageHeader
        title="Portail Client"
        subtitle={enterprise?.name ? `Espace de ${enterprise.name}` : "Suivi des formations de vos collaborateurs"}
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
                Des employes ont des certifications expirees necessitant un recyclage.
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="formations">
              <ClipboardList className="w-4 h-4 mr-2" />
              Formations
            </TabsTrigger>
            <TabsTrigger value="employes">
              <Users className="w-4 h-4 mr-2" />
              Employes
            </TabsTrigger>
            <TabsTrigger value="facturation">
              <Euro className="w-4 h-4 mr-2" />
              Facturation
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <UserPlus className="w-4 h-4 mr-2" />
              Contacts
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

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-4">
            <EnterpriseDashboardTab
              enrollments={enrollments || []}
              sessions={sessions || []}
              trainees={trainees || []}
              programs={programs || []}
              certifications={certifications || []}
              invoices={enterpriseInvoices || []}
              sessionMap={sessionMap}
              traineeMap={traineeMap}
              programMap={programMap}
            />
          </TabsContent>

          {/* Formations Tab */}
          <TabsContent value="formations" className="mt-4">
            <EnterpriseFormationsTab
              enrollments={enrollments}
              filteredEnrollments={filteredEnrollments}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              yearFilter={yearFilter}
              onYearFilterChange={setYearFilter}
              availableYears={availableYears}
              sessionMap={sessionMap}
              traineeMap={traineeMap}
              programMap={programMap}
            />
          </TabsContent>

          {/* Employes Tab */}
          <TabsContent value="employes" className="mt-4">
            <EnterpriseEmployesTab
              trainees={trainees}
              traineesLoading={traineesLoading}
              enrollments={enrollments}
              certifications={certifications}
              employeeStats={employeeStats}
              expandedEmployee={expandedEmployee}
              onExpandEmployee={setExpandedEmployee}
              sessionMap={sessionMap}
              programMap={programMap}
            />
          </TabsContent>

          {/* Facturation Tab */}
          <TabsContent value="facturation" className="mt-4">
            <EnterpriseFacturationTab
              enterpriseId={enterpriseId}
              invoices={enterpriseInvoices || []}
              quotes={enterpriseQuotes || []}
            />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4 space-y-6">
            <EnterpriseDocumentsTab
              enterpriseId={enterpriseId}
              generatedDocs={generatedDocs}
              documents={documents}
              documentsLoading={documentsLoading}
              sessionMap={sessionMap}
              onPreview={setPreviewDoc}
              onUpload={() => setShowUploadDialog(true)}
              onDelete={setDeleteDocId}
            />
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-4">
            <EnterpriseContactsTab
              contacts={contacts}
              contactsLoading={contactsLoading}
              contactDialogOpen={contactDialogOpen}
              onContactDialogChange={(open) => {
                setContactDialogOpen(open);
                if (!open) setEditContact(undefined);
              }}
              editContact={editContact}
              onEditContact={setEditContact}
              onCreateContact={(data) => createContactMutation.mutate(data)}
              onUpdateContact={(params) => updateContactMutation.mutate(params)}
              onDeleteContact={(id) => deleteContactMutation.mutate(id)}
              createPending={createContactMutation.isPending}
              updatePending={updateContactMutation.isPending}
            />
          </TabsContent>

          {/* Recyclage Tab */}
          <TabsContent value="recyclage" className="mt-4">
            <EnterpriseRecyclageTab
              certifications={certifications}
              recyclingAlerts={recyclingAlerts}
            />
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
