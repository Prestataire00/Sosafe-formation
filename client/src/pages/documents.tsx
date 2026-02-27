import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Variable,
  Share2,
  Lock,
  Globe,
  Users,
} from "lucide-react";
import type {
  DocumentTemplate,
  InsertDocumentTemplate,
  GeneratedDocument,
  Session,
  Trainee,
} from "@shared/schema";
import { DOCUMENT_TYPES, TEMPLATE_VARIABLES } from "@shared/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Template Form
// ---------------------------------------------------------------------------

function TemplateForm({
  template,
  onSubmit,
  isPending,
}: {
  template?: DocumentTemplate;
  onSubmit: (data: InsertDocumentTemplate) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState(template?.type || "convention");
  const [content, setContent] = useState(template?.content || "");

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
    });
  };

  const insertVariable = (key: string) => {
    setContent((prev) => prev + key);
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
        <Select value={type} onValueChange={setType}>
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
      <div className="space-y-2">
        <Label htmlFor="template-content">Contenu du modele</Label>
        <Textarea
          id="template-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Saisissez le contenu HTML du modele avec des variables..."
          className="min-h-[200px] font-mono text-sm"
          required
          data-testid="input-template-content"
        />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Variable className="w-4 h-4" />
          Variables disponibles
        </Label>
        <div className="space-y-3 max-h-[200px] overflow-y-auto border rounded-md p-3">
          {Object.entries(TEMPLATE_VARIABLES).map(([category, vars]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                {category}
              </p>
              <div className="flex flex-wrap gap-1">
                {vars.map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => insertVariable(v.key)}
                  >
                    {v.key}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-template-submit">
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
  onSubmit,
  isPending,
}: {
  templates: DocumentTemplate[];
  sessions: Session[];
  trainees: Trainee[];
  onSubmit: (data: { templateId: string; sessionId: string; traineeIds: string[] }) => void;
  isPending: boolean;
}) {
  const [templateId, setTemplateId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);

  const toggleTrainee = (id: string) => {
    setSelectedTrainees((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ templateId, sessionId, traineeIds: selectedTrainees });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Modele de document</Label>
        <Select value={templateId} onValueChange={setTemplateId} required>
          <SelectTrigger data-testid="select-generate-template">
            <SelectValue placeholder="Selectionner un modele" />
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
            <SelectValue placeholder="Selectionner une session" />
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
            {selectedTrainees.length} stagiaire{selectedTrainees.length > 1 ? "s" : ""} selectionne{selectedTrainees.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isPending || !templateId || !sessionId || selectedTrainees.length === 0}
          data-testid="button-generate-submit"
        >
          {isPending ? "Generation..." : "Generer les documents"}
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
  if (!document) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>${document.content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{document.title}</span>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto border rounded-md bg-white p-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Documents() {
  const [searchTemplates, setSearchTemplates] = useState("");
  const [searchDocs, setSearchDocs] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<DocumentTemplate | undefined>();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

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

  // --- Generate Mutations ---

  const generateMutation = useMutation({
    mutationFn: (data: { templateId: string; sessionId: string; traineeIds: string[] }) =>
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
    mutationFn: ({ id, data }: { id: string; data: { visibility?: string; status?: string } }) =>
      apiRequest("PATCH", `/api/generated-documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-documents"] });
      toast({ title: "Document mis a jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise a jour", variant: "destructive" }),
  });

  // --- Filtering ---

  const filteredTemplates =
    templates?.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTemplates.toLowerCase()) ||
        t.type.toLowerCase().includes(searchTemplates.toLowerCase())
    ) || [];

  const filteredDocs =
    generatedDocs?.filter(
      (d) =>
        d.title.toLowerCase().includes(searchDocs.toLowerCase()) ||
        d.type.toLowerCase().includes(searchDocs.toLowerCase())
    ) || [];

  // --- Render ---

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-documents-title">
            Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerez vos modeles et documents generes
          </p>
        </div>
      </div>

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
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un modele..."
                value={searchTemplates}
                onChange={(e) => setSearchTemplates(e.target.value)}
                className="pl-9"
                data-testid="input-search-templates"
              />
            </div>
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
            <div className="text-center py-16">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-medium mb-1">Aucun modele</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTemplates
                  ? "Aucun resultat pour votre recherche"
                  : "Creez votre premier modele de document"}
              </p>
              {!searchTemplates && (
                <Button
                  onClick={() => setTemplateDialogOpen(true)}
                  data-testid="button-create-first-template"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Creer un modele
                </Button>
              )}
            </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                value={searchDocs}
                onChange={(e) => setSearchDocs(e.target.value)}
                className="pl-9"
                data-testid="input-search-generated"
              />
            </div>
            <Button
              onClick={() => setGenerateDialogOpen(true)}
              data-testid="button-generate-documents"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generer des documents
            </Button>
          </div>

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
                      <TableHead>Titre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Session</TableHead>
                      <TableHead className="hidden md:table-cell">Stagiaire</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Statut</TableHead>
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
                                  Apercu
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPreviewDoc(doc);
                                    setPreviewOpen(true);
                                  }}
                                  data-testid={`button-print-doc-${doc.id}`}
                                >
                                  <Printer className="w-4 h-4 mr-2" />
                                  Imprimer
                                </DropdownMenuItem>
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
    </div>
  );
}
