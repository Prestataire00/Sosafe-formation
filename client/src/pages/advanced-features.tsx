import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Brain,
  FileCheck,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Send,
  Download,
  FileSpreadsheet,
  Users,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AI_DOCUMENT_ANALYSIS_STATUSES,
  AI_VALIDATION_RESULTS,
  CESU_SUBMISSION_STATUSES,
  ANALYZABLE_DOCUMENT_TYPES,
} from "@shared/schema";

function getStatusBadge(value: string, statuses: readonly { value: string; label: string; color: string }[]) {
  const s = statuses.find((st) => st.value === value);
  if (!s) return <Badge variant="outline">{value}</Badge>;
  return <Badge className={s.color}>{s.label}</Badge>;
}

// ==========================================
// TAB 1: AI Document Analysis
// ==========================================

function AiAnalysisTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["/api/ai-document-analyses"],
    queryFn: () => apiRequest("GET", "/api/ai-document-analyses").then((r) => r.json()),
  });

  const { data: trainees = [] } = useQuery({
    queryKey: ["/api/trainees"],
    queryFn: () => apiRequest("GET", "/api/trainees").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ai-document-analyses", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-document-analyses"] });
      setShowCreateDialog(false);
      toast({ title: "Document soumis pour analyse IA" });
      // Refresh after 3 seconds to see result
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/ai-document-analyses"] });
      }, 3000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/ai-document-analyses/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-document-analyses"] });
      toast({ title: "Analyse mise à jour" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai-document-analyses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-document-analyses"] });
      toast({ title: "Analyse supprimée" });
    },
  });

  const filtered = analyses.filter((a: any) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.documentName?.toLowerCase().includes(q) ||
        a.traineeName?.toLowerCase().includes(q) ||
        a.trainerName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const total = analyses.length;
  const completed = analyses.filter((a: any) => a.status === "completed").length;
  const pending = analyses.filter((a: any) => a.status === "pending" || a.status === "processing").length;
  const manualReview = analyses.filter((a: any) => a.status === "manual_review").length;

  const getValidationIcon = (result: string) => {
    switch (result) {
      case "valid": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "expired": return <XCircle className="h-4 w-4 text-red-600" />;
      case "invalid": return <XCircle className="h-4 w-4 text-red-600" />;
      case "inconclusive": return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default: return <HelpCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return <div className="space-y-4 p-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-sm text-muted-foreground">Terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{manualReview}</p>
                <p className="text-sm text-muted-foreground">Vérif. manuelle</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {AI_DOCUMENT_ANALYSIS_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Upload className="h-4 w-4 mr-2" /> Analyser un document
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Confiance</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead>Date validité</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune analyse trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.documentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ANALYZABLE_DOCUMENT_TYPES.find((t) => t.value === a.documentType)?.label || a.documentType}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.traineeName || a.trainerName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(a.status, AI_DOCUMENT_ANALYSIS_STATUSES)}</TableCell>
                    <TableCell>
                      {a.confidence > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress value={a.confidence} className="w-16 h-2" />
                          <span className="text-sm">{a.confidence}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.validationResult ? (
                        <div className="flex items-center gap-1">
                          {getValidationIcon(a.validationResult)}
                          <span className="text-sm">
                            {AI_VALIDATION_RESULTS.find((v) => v.value === a.validationResult)?.label || a.validationResult}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.extractedData?.validityDate || "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedAnalysis(a); setShowDetailDialog(true); }}>
                            <Eye className="h-4 w-4 mr-2" /> Voir détails
                          </DropdownMenuItem>
                          {a.status === "manual_review" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: a.id,
                                  data: { manualOverride: true, status: "completed", prerequisiteValidated: true },
                                })
                              }
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" /> Valider manuellement
                            </DropdownMenuItem>
                          )}
                          {(a.status === "pending" || a.status === "processing") && (
                            <DropdownMenuItem
                              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/ai-document-analyses"] })}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(a.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analyser un document</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const traineeId = fd.get("traineeId") as string;
              const trainee = trainees.find((t: any) => t.id === traineeId);
              createMutation.mutate({
                documentType: fd.get("documentType"),
                documentName: fd.get("documentName"),
                traineeId: traineeId || undefined,
                traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nom du document *</Label>
              <Input name="documentName" required placeholder="Ex: AFGSU2_Dupont_2024.pdf" />
            </div>
            <div className="space-y-2">
              <Label>Type de document *</Label>
              <Select name="documentType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {ANALYZABLE_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Apprenant concerné</Label>
              <Select name="traineeId">
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un apprenant" />
                </SelectTrigger>
                <SelectContent>
                  {trainees.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <Brain className="h-4 w-4 inline mr-1" />
              L'IA analysera le document pour extraire automatiquement les dates de validité, le titulaire
              et les informations de certification. Le traitement prend quelques secondes.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Lancer l'analyse
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'analyse</DialogTitle>
          </DialogHeader>
          {selectedAnalysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Document</p>
                  <p className="font-medium">{selectedAnalysis.documentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p>
                    {ANALYZABLE_DOCUMENT_TYPES.find((t) => t.value === selectedAnalysis.documentType)?.label || selectedAnalysis.documentType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Personne</p>
                  <p>{selectedAnalysis.traineeName || selectedAnalysis.trainerName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedAnalysis.status, AI_DOCUMENT_ANALYSIS_STATUSES)}
                </div>
              </div>

              {selectedAnalysis.confidence > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Niveau de confiance</p>
                  <div className="flex items-center gap-3">
                    <Progress value={selectedAnalysis.confidence} className="flex-1 h-3" />
                    <span className="text-lg font-bold">{selectedAnalysis.confidence}%</span>
                  </div>
                </div>
              )}

              {selectedAnalysis.validationResult && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  {getValidationIcon(selectedAnalysis.validationResult)}
                  <span className="font-medium">
                    Résultat : {AI_VALIDATION_RESULTS.find((v) => v.value === selectedAnalysis.validationResult)?.label}
                  </span>
                  {selectedAnalysis.prerequisiteValidated && (
                    <Badge className="ml-auto bg-green-100 text-green-700">Prérequis validé</Badge>
                  )}
                </div>
              )}

              {selectedAnalysis.extractedData && (
                <div>
                  <p className="text-sm font-medium mb-2">Données extraites par l'IA</p>
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    {selectedAnalysis.extractedData.holderName && (
                      <p><span className="text-muted-foreground">Titulaire :</span> {selectedAnalysis.extractedData.holderName}</p>
                    )}
                    {selectedAnalysis.extractedData.issueDate && (
                      <p><span className="text-muted-foreground">Date émission :</span> {selectedAnalysis.extractedData.issueDate}</p>
                    )}
                    {selectedAnalysis.extractedData.validityDate && (
                      <p><span className="text-muted-foreground">Date validité :</span> {selectedAnalysis.extractedData.validityDate}</p>
                    )}
                    {selectedAnalysis.extractedData.certificationNumber && (
                      <p><span className="text-muted-foreground">N° certification :</span> {selectedAnalysis.extractedData.certificationNumber}</p>
                    )}
                    {selectedAnalysis.extractedData.issuingOrganization && (
                      <p><span className="text-muted-foreground">Organisme :</span> {selectedAnalysis.extractedData.issuingOrganization}</p>
                    )}
                    {selectedAnalysis.extractedData.certificationLevel && (
                      <p><span className="text-muted-foreground">Niveau :</span> {selectedAnalysis.extractedData.certificationLevel}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedAnalysis.manualOverride && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-sm">
                  <ShieldCheck className="h-4 w-4 inline mr-1 text-amber-600" />
                  Validé manuellement
                  {selectedAnalysis.manualOverrideReason && (
                    <span> — {selectedAnalysis.manualOverrideReason}</span>
                  )}
                </div>
              )}

              {selectedAnalysis.errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <XCircle className="h-4 w-4 inline mr-1" />
                  {selectedAnalysis.errorMessage}
                </div>
              )}

              {selectedAnalysis.status === "manual_review" && !selectedAnalysis.manualOverride && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      updateMutation.mutate({
                        id: selectedAnalysis.id,
                        data: { manualOverride: true, status: "completed", prerequisiteValidated: true, validationResult: "valid" },
                      });
                      setShowDetailDialog(false);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Valider manuellement
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      updateMutation.mutate({
                        id: selectedAnalysis.id,
                        data: { manualOverride: true, status: "completed", prerequisiteValidated: false, validationResult: "invalid" },
                      });
                      setShowDetailDialog(false);
                    }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Rejeter
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Créé le : {selectedAnalysis.createdAt ? new Date(selectedAnalysis.createdAt).toLocaleString("fr-FR") : "-"}
                {selectedAnalysis.processedAt && (
                  <> | Traité le : {new Date(selectedAnalysis.processedAt).toLocaleString("fr-FR")}</>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// TAB 2: CESU Submissions
// ==========================================

function CesuTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCompileDialog, setShowCompileDialog] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/cesu-submissions"],
    queryFn: () => apiRequest("GET", "/api/cesu-submissions").then((r) => r.json()),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then((r) => r.json()),
  });

  const compileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cesu-submissions/compile", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cesu-submissions"] });
      setShowCompileDialog(false);
      setSelectedSessionId("");
      toast({ title: "Données CESU compilées avec succès" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/cesu-submissions/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cesu-submissions"] });
      toast({ title: "Envoi CESU mis à jour" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cesu-submissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cesu-submissions"] });
      toast({ title: "Envoi CESU supprimé" });
    },
  });

  const filtered = submissions.filter((s: any) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const total = submissions.length;
  const drafts = submissions.filter((s: any) => s.status === "draft").length;
  const submitted = submissions.filter((s: any) => s.status === "submitted").length;
  const confirmed = submissions.filter((s: any) => s.status === "confirmed").length;

  const handleExport = async (id: string) => {
    try {
      const res = await apiRequest("GET", `/api/cesu-submissions/${id}/export`);
      const data = await res.json();
      // Generate CSV from export data
      if (data.data && data.data.length > 0) {
        const headers = Object.keys(data.data[0]);
        const bom = "\uFEFF";
        const csv = bom + headers.join(";") + "\n" + data.data.map((row: any) => headers.map((h) => row[h] || "").join(";")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cesu_${data.session}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Export CSV téléchargé" });
      }
    } catch {
      toast({ title: "Erreur lors de l'export", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="space-y-4 p-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total envois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{drafts}</p>
                <p className="text-sm text-muted-foreground">Brouillons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submitted}</p>
                <p className="text-sm text-muted-foreground">Envoyés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmed}</p>
                <p className="text-sm text-muted-foreground">Confirmés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {CESU_SUBMISSION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCompileDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Compiler les données CESU
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Apprenants</TableHead>
                <TableHead>Présence moy.</TableHead>
                <TableHead>Diplômes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun envoi CESU trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s: any) => {
                  const attendance = s.attendanceSummary as any;
                  const diplomas = Array.isArray(s.diplomaDocuments) ? s.diplomaDocuments : [];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.sessionTitle}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {s.traineeCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        {attendance?.averageAttendance != null ? (
                          <div className="flex items-center gap-2">
                            <Progress value={attendance.averageAttendance} className="w-16 h-2" />
                            <span className="text-sm">{attendance.averageAttendance}%</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {diplomas.filter((d: any) => d.isValid).length}/{diplomas.length}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(s.status, CESU_SUBMISSION_STATUSES)}</TableCell>
                      <TableCell className="text-sm">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedSubmission(s); setShowDetailDialog(true); }}>
                              <Eye className="h-4 w-4 mr-2" /> Voir détails
                            </DropdownMenuItem>
                            {s.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => updateMutation.mutate({ id: s.id, data: { status: "ready" } })}
                              >
                                <FileCheck className="h-4 w-4 mr-2" /> Marquer prêt
                              </DropdownMenuItem>
                            )}
                            {(s.status === "draft" || s.status === "ready") && (
                              <DropdownMenuItem
                                onClick={() => updateMutation.mutate({ id: s.id, data: { status: "submitted" } })}
                              >
                                <Send className="h-4 w-4 mr-2" /> Marquer envoyé
                              </DropdownMenuItem>
                            )}
                            {s.status === "submitted" && (
                              <DropdownMenuItem
                                onClick={() => updateMutation.mutate({ id: s.id, data: { status: "confirmed" } })}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" /> Confirmer réception
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleExport(s.id)}>
                              <Download className="h-4 w-4 mr-2" /> Exporter CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate(s.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Compile Dialog */}
      <Dialog open={showCompileDialog} onOpenChange={setShowCompileDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compiler les données CESU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Session *</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <FileSpreadsheet className="h-4 w-4 inline mr-1" />
              La compilation va rassembler automatiquement : les données des apprenants inscrits,
              les rapports de présence (émargement), les copies de diplômes validés par l'IA,
              et générer un récapitulatif prêt à envoyer au CESU.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCompileDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => compileMutation.mutate({ sessionId: selectedSessionId })}
                disabled={!selectedSessionId || compileMutation.isPending}
              >
                {compileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Compiler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'envoi CESU</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Session</p>
                  <p className="font-medium">{selectedSubmission.sessionTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedSubmission.status, CESU_SUBMISSION_STATUSES)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre d'apprenants</p>
                  <p className="font-medium">{selectedSubmission.traineeCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compilé par</p>
                  <p>{selectedSubmission.submittedByName || "-"}</p>
                </div>
              </div>

              {/* Attendance summary */}
              {selectedSubmission.attendanceSummary && (
                <div>
                  <p className="text-sm font-medium mb-2">Résumé de présence</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <p className="text-lg font-bold">{(selectedSubmission.attendanceSummary as any).totalSlots}</p>
                      <p className="text-xs text-muted-foreground">Créneaux total</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <p className="text-lg font-bold">{(selectedSubmission.attendanceSummary as any).presentCount}</p>
                      <p className="text-xs text-muted-foreground">Présences</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <p className="text-lg font-bold">{(selectedSubmission.attendanceSummary as any).absentCount}</p>
                      <p className="text-xs text-muted-foreground">Absences</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <p className="text-lg font-bold">{(selectedSubmission.attendanceSummary as any).averageAttendance}%</p>
                      <p className="text-xs text-muted-foreground">Taux moyen</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trainees table */}
              {Array.isArray(selectedSubmission.trainees) && selectedSubmission.trainees.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Liste des apprenants</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Diplôme</TableHead>
                        <TableHead>Présence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedSubmission.trainees as any[]).map((t: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-sm">{t.email ? <a href={`mailto:${t.email}`} className="text-primary hover:underline">{t.email}</a> : "-"}</TableCell>
                          <TableCell>
                            {t.diplomaValid ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" /> {t.diplomaType || "Validé"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Non vérifié</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {t.attendancePercent != null ? (
                              <div className="flex items-center gap-2">
                                <Progress value={t.attendancePercent} className="w-12 h-2" />
                                <span className="text-sm">{t.attendancePercent}%</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Diploma documents */}
              {Array.isArray(selectedSubmission.diplomaDocuments) && selectedSubmission.diplomaDocuments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Documents diplômes</p>
                  <div className="space-y-2">
                    {(selectedSubmission.diplomaDocuments as any[]).map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">{d.traineeName}</p>
                            <p className="text-xs text-muted-foreground">{d.documentName} — {d.documentType}</p>
                          </div>
                        </div>
                        {d.validityDate && (
                          <span className="text-xs text-muted-foreground">Valide jusqu'au {d.validityDate}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubmission.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedSubmission.notes}</p>
                </div>
              )}

              {selectedSubmission.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <XCircle className="h-4 w-4 inline mr-1" />
                  Motif de rejet : {selectedSubmission.rejectionReason}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {selectedSubmission.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({ id: selectedSubmission.id, data: { status: "ready" } });
                      setShowDetailDialog(false);
                    }}
                  >
                    <FileCheck className="h-4 w-4 mr-2" /> Marquer prêt
                  </Button>
                )}
                {(selectedSubmission.status === "draft" || selectedSubmission.status === "ready") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({ id: selectedSubmission.id, data: { status: "submitted" } });
                      setShowDetailDialog(false);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" /> Marquer envoyé
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => handleExport(selectedSubmission.id)}>
                  <Download className="h-4 w-4 mr-2" /> Exporter CSV
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Créé le : {selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt).toLocaleString("fr-FR") : "-"}
                {selectedSubmission.submissionDate && (
                  <> | Envoyé le : {new Date(selectedSubmission.submissionDate).toLocaleString("fr-FR")}</>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function AdvancedFeatures() {
  return (
    <PageLayout>
      <PageHeader
        title="Fonctionnalités Avancées"
        subtitle="Intelligence artificielle et gestion des données CESU"
      />

      <Tabs defaultValue="ai-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai-analysis" className="gap-2">
            <Brain className="h-4 w-4" /> IA - Analyse de documents
          </TabsTrigger>
          <TabsTrigger value="cesu" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Envoi CESU
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analysis">
          <AiAnalysisTab />
        </TabsContent>

        <TabsContent value="cesu">
          <CesuTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
