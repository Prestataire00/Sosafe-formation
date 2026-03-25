import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Zap,
  Users,
  Save,
  Plus,
  Pencil,
  Trash2,
  Play,
  History,
  Shield,
  ShieldAlert,
  Settings as SettingsIcon,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Globe,
  Landmark,
  PenTool,
  Video,
  FileSearch,
  Download,
  UserX,
  ClipboardList,
  Eye,
  Upload,
  Calculator,
  RefreshCw,
  Database,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type {
  AutomationRule,
  InsertAutomationRule,
  EmailTemplate,
  SmsTemplate,
  DocumentTemplate,
  User,
  Trainer,
  Trainee,
  Enterprise,
  Session,
  AutomationLog,
  Program,
} from "@shared/schema";
import {
  AUTOMATION_EVENTS,
  AUTOMATION_ACTIONS,
  TRAINEE_PROFILE_TYPES,
  USER_ROLES,
  ADMIN_PERMISSIONS,
  TEMPLATE_VARIABLES,
} from "@shared/schema";

// ============================================================
// Tab: Organisme
// ============================================================

function OrganismeTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    org_name: "",
    org_address: "",
    org_siret: "",
    org_email: "",
    org_phone: "",
    org_logo_url: "",
  });

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setForm({
        org_name: settings.org_name || "",
        org_address: settings.org_address || "",
        org_siret: settings.org_siret || "",
        org_email: settings.org_email || "",
        org_phone: settings.org_phone || "",
        org_logo_url: settings.org_logo_url || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Paramètres enregistrés avec succès" });
    },
    onError: () =>
      toast({
        title: "Erreur lors de l'enregistrement",
        variant: "destructive",
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Informations de l'organisme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org_name">Nom de l'organisme</Label>
              <Input
                id="org_name"
                value={form.org_name}
                onChange={(e) => updateField("org_name", e.target.value)}
                placeholder="SO'SAFE Formation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_siret">SIRET</Label>
              <Input
                id="org_siret"
                value={form.org_siret}
                onChange={(e) => updateField("org_siret", e.target.value)}
                placeholder="123 456 789 00012"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_address">Adresse</Label>
            <Input
              id="org_address"
              value={form.org_address}
              onChange={(e) => updateField("org_address", e.target.value)}
              placeholder="123 rue de la Formation, 75001 Paris"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org_email">Email</Label>
              <Input
                id="org_email"
                type="email"
                value={form.org_email}
                onChange={(e) => updateField("org_email", e.target.value)}
                placeholder="contact@sosafe.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_phone">Téléphone</Label>
              <Input
                id="org_phone"
                value={form.org_phone}
                onChange={(e) => updateField("org_phone", e.target.value)}
                placeholder="01 23 45 67 89"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo de l'entreprise</Label>
            {form.org_logo_url && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <img
                  src={form.org_logo_url}
                  alt="Logo"
                  className="h-12 max-w-[200px] object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateField("org_logo_url", "")}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                id="org_logo_url"
                value={form.org_logo_url}
                onChange={(e) => updateField("org_logo_url", e.target.value)}
                placeholder="https://example.com/logo.png ou téléverser →"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/png,image/jpeg,image/svg+xml";
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const result = await uploadFile(file);
                      updateField("org_logo_url", result.fileUrl);
                    } catch { /* ignore */ }
                  };
                  input.click();
                }}
              >
                <Upload className="w-3.5 h-3.5" /> Téléverser
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ce logo apparaîtra sur tous les documents générés (conventions, attestations, catalogue, factures…)
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <SeedTemplatesCard />
    </>
  );
}

function SeedTemplatesCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/settings/seed-all-templates");
      const data = await res.json();
      toast({
        title: "Modèles chargés avec succès",
        description: `${data.emails} emails, ${data.sms} SMS, ${data.documents} documents, ${data.surveys} évaluations, ${data.automations} automatisations`,
      });
    } catch {
      toast({ title: "Erreur lors du chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-5 h-5" />
          Modèles par défaut (Digiforma)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Chargez tous les modèles pré-configurés : 26 emails, 6 SMS, 28 documents, 6 évaluations et les règles d'automatisation associées.
          Les modèles déjà existants ne seront pas écrasés.
        </p>
        <Button onClick={handleSeed} disabled={loading} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Chargement en cours..." : "Charger tous les modèles Digiforma"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tab: Automatisation
// ============================================================

function EventBadge({ event }: { event: string }) {
  const labels: Record<string, string> = {};
  AUTOMATION_EVENTS.forEach((e) => {
    labels[e.value] = e.label;
  });
  return (
    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {labels[event] || event}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const labels: Record<string, string> = {};
  AUTOMATION_ACTIONS.forEach((a) => {
    labels[a.value] = a.label;
  });
  return (
    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      {labels[action] || action}
    </Badge>
  );
}

function AutomationRuleForm({
  rule,
  templates,
  smsTemplates,
  onSubmit,
  isPending,
}: {
  rule?: AutomationRule;
  templates: EmailTemplate[];
  smsTemplates: SmsTemplate[];
  onSubmit: (data: InsertAutomationRule) => void;
  isPending: boolean;
}) {
  const existingConditions = (rule?.conditions || {}) as Record<string, unknown>;
  const [name, setName] = useState(rule?.name || "");
  const [event, setEvent] = useState(rule?.event || AUTOMATION_EVENTS[0].value);
  const [action, setAction] = useState(rule?.action || AUTOMATION_ACTIONS[0].value);
  const [templateId, setTemplateId] = useState(rule?.templateId || "");
  const [delay, setDelay] = useState(rule?.delay?.toString() || "0");
  const [active, setActive] = useState(rule?.active ?? true);
  const [profileType, setProfileType] = useState((existingConditions.profileType as string) || "__all__");
  const [programCategory, setProgramCategory] = useState((existingConditions.programCategory as string) || "");
  const [emailTemplateId, setEmailTemplateId] = useState((existingConditions.emailTemplateId as string) || "__none__");
  const [programId, setProgramId] = useState((existingConditions.programId as string) || "__all__");
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, string>>(
    (rule?.templateOverrides as Record<string, string>) || {}
  );
  const [showVariablesHelp, setShowVariablesHelp] = useState(false);

  // Fetch document templates for document-related actions
  const { data: documentTemplates } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/document-templates"],
  });

  // Fetch programs for program filter and template overrides
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const isDocumentAction = action === "generate_document" || action === "generate_document_and_send";
  const isEmailAction = action === "send_email" || action === "send_email_enterprise" || action === "send_survey";
  const isSmsAction = action === "send_sms" || action === "send_sms_enterprise";
  const showEmailTemplateCondition = action === "generate_document_and_send";
  const showTemplateOverrides = isEmailAction || action === "generate_document_and_send";

  const handleAddOverride = () => {
    if (!programs || programs.length === 0) return;
    const availableProgram = programs.find((p) => !templateOverrides[p.id]);
    if (availableProgram) {
      setTemplateOverrides({ ...templateOverrides, [availableProgram.id]: "" });
    }
  };

  const handleRemoveOverride = (progId: string) => {
    const next = { ...templateOverrides };
    delete next[progId];
    setTemplateOverrides(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, unknown> = {};
    if (profileType && profileType !== "__all__") conditions.profileType = profileType;
    if (programCategory) conditions.programCategory = programCategory;
    if (programId && programId !== "__all__") conditions.programId = programId;
    if (emailTemplateId && emailTemplateId !== "__none__" && showEmailTemplateCondition) conditions.emailTemplateId = emailTemplateId;

    // Clean template overrides (remove empty values)
    const cleanedOverrides: Record<string, string> = {};
    for (const [k, v] of Object.entries(templateOverrides)) {
      if (v) cleanedOverrides[k] = v;
    }

    onSubmit({
      name,
      event,
      action,
      templateId: templateId || null,
      delay: parseInt(delay) || 0,
      active,
      conditions: Object.keys(conditions).length > 0 ? conditions : null,
      templateOverrides: Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : null,
    });
  };

  const groupLabels: Record<string, string> = {
    apprenant: "Apprenant",
    entreprise: "Entreprise",
    session: "Session",
    formation: "Formation",
    formateur: "Formateur",
    inscription: "Inscription",
    conditionnel: "Conditionnel",
    organisme: "Organisme",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rule-name">Nom de la règle</Label>
        <Input
          id="rule-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Convocation automatique"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Événement déclencheur</Label>
          <Select value={event} onValueChange={setEvent}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_EVENTS.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{isDocumentAction ? "Template document" : isSmsAction ? "Template SMS" : "Template email"}</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger>
            <SelectValue placeholder={isDocumentAction ? "Sélectionner un template document" : isSmsAction ? "Sélectionner un template SMS" : "Sélectionner un template"} />
          </SelectTrigger>
          <SelectContent>
            {isDocumentAction
              ? (documentTemplates || []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              : isSmsAction
              ? smsTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              : templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
      {showEmailTemplateCondition && (
        <div className="space-y-2">
          <Label>Template email associé (envoi après génération)</Label>
          <Select value={emailTemplateId} onValueChange={setEmailTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un template email" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de profil (optionnel)</Label>
          <Select value={profileType} onValueChange={setProfileType}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les profils" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {TRAINEE_PROFILE_TYPES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Catégorie formation (optionnel)</Label>
          <Input
            value={programCategory}
            onChange={(e) => setProgramCategory(e.target.value)}
            placeholder="Ex: AFGSU"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Formation spécifique (optionnel)</Label>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes les formations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les formations</SelectItem>
            {(programs || []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template overrides per program */}
      {showTemplateOverrides && (
        <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Templates par formation</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddOverride}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Utilisez un template différent selon la formation concernée. Si aucune surcharge ne correspond, le template par défaut sera utilisé.
          </p>
          {Object.entries(templateOverrides).map(([progId, tplId]) => (
            <div key={progId} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">Formation</Label>
                <Select
                  value={progId}
                  onValueChange={(newProgId) => {
                    const next = { ...templateOverrides };
                    const val = next[progId];
                    delete next[progId];
                    next[newProgId] = val;
                    setTemplateOverrides(next);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(programs || []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Template alternatif</Label>
                <Select
                  value={tplId}
                  onValueChange={(newTplId) =>
                    setTemplateOverrides({ ...templateOverrides, [progId]: newTplId })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choisir..." />
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleRemoveOverride(progId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="rule-delay">Délai (minutes)</Label>
        <Input
          id="rule-delay"
          type="number"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          min="0"
          placeholder="0"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="rule-active"
          checked={active}
          onCheckedChange={setActive}
        />
        <Label htmlFor="rule-active">Règle active</Label>
      </div>

      {/* Variables help panel */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          className="flex items-center justify-between w-full p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          onClick={() => setShowVariablesHelp(!showVariablesHelp)}
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Variables disponibles
          </span>
          {showVariablesHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showVariablesHelp && (
          <div className="p-3 border-t space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(TEMPLATE_VARIABLES).map(([group, vars]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {groupLabels[group] || group}
                </p>
                <div className="flex flex-wrap gap-1">
                  {vars.map((v) => (
                    <Badge key={v.key} variant="secondary" className="text-[10px] font-mono cursor-help" title={v.label}>
                      {v.key}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Blocs conditionnels</p>
              <p className="text-xs text-muted-foreground">
                Syntaxe : <code className="bg-muted px-1 rounded">{"{{#if nom_variable}}contenu{{/if}}"}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Le contenu est affiché uniquement si la variable est non vide. Utilisez les variables conditionnelles (modalite_presentiel, modalite_distanciel, etc.).
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : rule ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function ExecuteRuleDialog({
  rule,
  open,
  onOpenChange,
}: {
  rule: AutomationRule | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState("");
  const [traineeId, setTraineeId] = useState("");

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    enabled: open,
  });

  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
    enabled: open,
  });

  const executeMutation = useMutation({
    mutationFn: (data: { sessionId?: string; traineeId?: string }) =>
      apiRequest("POST", `/api/automation-rules/${rule?.id}/execute`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-logs"] });
      toast({ title: "Règle exécutée avec succès" });
      onOpenChange(false);
      setSessionId("");
      setTraineeId("");
    },
    onError: () =>
      toast({ title: "Erreur lors de l'exécution", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exécuter : {rule?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une session" />
              </SelectTrigger>
              <SelectContent>
                {sessions?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Apprenant</Label>
            <Select value={traineeId} onValueChange={setTraineeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un apprenant" />
              </SelectTrigger>
              <SelectContent>
                {trainees?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={(!sessionId && !traineeId) || executeMutation.isPending}
            onClick={() =>
              executeMutation.mutate({
                sessionId: sessionId || undefined,
                traineeId: traineeId || undefined,
              })
            }
          >
            <Play className="w-4 h-4 mr-2" />
            {executeMutation.isPending ? "Exécution…" : "Exécuter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutomationLogsPanel({ rules }: { rules: AutomationRule[] }) {
  const { data: logs } = useQuery<AutomationLog[]>({
    queryKey: ["/api/automation-logs"],
    refetchInterval: 30000,
  });

  const ruleNames: Record<string, string> = {};
  rules.forEach((r) => {
    ruleNames[r.id] = r.name;
  });

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <History className="w-5 h-5" />
        Historique des exécutions
      </h3>
      {!logs || logs.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Aucune exécution enregistrée</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Règle</TableHead>
              <TableHead>Événement</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Détails / Erreur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {log.executedAt
                    ? new Date(log.executedAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {ruleNames[log.ruleId] || log.ruleId}
                </TableCell>
                <TableCell>
                  <EventBadge event={log.event} />
                </TableCell>
                <TableCell>
                  <ActionBadge action={log.action} />
                </TableCell>
                <TableCell>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>
                    {log.status === "success" ? "Succès" : "Erreur"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.targetType && log.targetId
                    ? `${log.targetType}:${log.targetId.slice(0, 8)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {log.error || (log.details ? JSON.stringify(log.details) : "—")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function AutomatisationTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | undefined>();
  const [executeRule, setExecuteRule] = useState<AutomationRule | undefined>();

  const { data: rules, isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation-rules"],
  });

  const { data: templates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const { data: smsTemplatesData } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertAutomationRule) =>
      apiRequest("POST", "/api/automation-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      setDialogOpen(false);
      toast({ title: "Règle créée avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertAutomationRule }) =>
      apiRequest("PATCH", `/api/automation-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      setDialogOpen(false);
      setEditRule(undefined);
      toast({ title: "Règle modifiée avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/automation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: "Règle supprimée" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest("PATCH", `/api/automation-rules/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const templateNames: Record<string, string> = {};
  templates?.forEach((t) => {
    templateNames[t.id] = t.name;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Règles d'automatisation
        </CardTitle>
        <Button
          onClick={() => {
            setEditRule(undefined);
            setDialogOpen(true);
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle règle
        </Button>
      </CardHeader>
      <CardContent>
        {!rules || rules.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Aucune règle</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre première règle d'automatisation
            </p>
            <Button
              onClick={() => {
                setEditRule(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une règle
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Délai</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <EventBadge event={rule.event} />
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={rule.action} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rule.templateId
                      ? templateNames[rule.templateId] || "—"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.delay ? `${rule.delay} min` : "Immédiat"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.active ?? false}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          id: rule.id,
                          active: checked,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Exécuter manuellement"
                        onClick={() => setExecuteRule(rule)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditRule(rule);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditRule(undefined);
          }}
        >
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editRule
                  ? "Modifier la règle"
                  : "Nouvelle règle d'automatisation"}
              </DialogTitle>
            </DialogHeader>
            <AutomationRuleForm
              rule={editRule}
              templates={templates || []}
              smsTemplates={smsTemplatesData || []}
              onSubmit={(data) =>
                editRule
                  ? updateMutation.mutate({ id: editRule.id, data })
                  : createMutation.mutate(data)
              }
              isPending={
                createMutation.isPending || updateMutation.isPending
              }
            />
          </DialogContent>
        </Dialog>

        <ExecuteRuleDialog
          rule={executeRule}
          open={!!executeRule}
          onOpenChange={(open) => {
            if (!open) setExecuteRule(undefined);
          }}
        />

        <AutomationLogsPanel rules={rules || []} />
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tab: Utilisateurs
// ============================================================

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {};
  USER_ROLES.forEach((r) => {
    labels[r.value] = r.label;
  });
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    trainer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    trainee: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[role] || ""}`}>
      {labels[role] || role}
    </Badge>
  );
}

const PERM_GROUP_LABELS: Record<string, string> = {
  administration: "Administration",
  contacts: "Contacts",
  formation: "Formation",
  commercial: "Commercial",
  qualite: "Qualité",
};

function UtilisateursTab() {
  const { toast } = useToast();
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PATCH", `/api/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Rôle mis à jour avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour du rôle", variant: "destructive" }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; trainerId?: string | null; traineeId?: string | null; enterpriseId?: string | null }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Profil associé mis à jour" });
    },
    onError: () =>
      toast({ title: "Erreur lors de l'association du profil", variant: "destructive" }),
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      apiRequest("PATCH", `/api/users/${id}`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setPermDialogOpen(false);
      setEditingUser(null);
      toast({ title: "Permissions mises à jour avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la mise à jour des permissions", variant: "destructive" }),
  });

  const openPermDialog = (user: User) => {
    setEditingUser(user);
    setSelectedPerms((user.permissions as string[]) || []);
    setPermDialogOpen(true);
  };

  const togglePerm = (value: string) => {
    setSelectedPerms(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  };

  const allPermValues = Object.values(ADMIN_PERMISSIONS).flat().map(p => p.value);
  const allSelected = allPermValues.length > 0 && allPermValues.every(v => selectedPerms.includes(v));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPerms([]);
    } else {
      setSelectedPerms([...allPermValues]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestion des utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!users || users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Aucun utilisateur</h3>
            <p className="text-sm text-muted-foreground">
              Aucun utilisateur trouvé dans le système
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d'utilisateur</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Modifier le rôle</TableHead>
                <TableHead>Profil associé</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username}
                  </TableCell>
                  <TableCell>{user.firstName}</TableCell>
                  <TableCell>{user.lastName}</TableCell>
                  <TableCell className="text-sm">
                    {user.email ? <a href={`mailto:${user.email}`} className="text-primary hover:underline">{user.email}</a> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) =>
                        updateRoleMutation.mutate({ id: user.id, role })
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.role === "trainer" && (
                      <Select
                        value={user.trainerId || "__none__"}
                        onValueChange={(val) =>
                          updateProfileMutation.mutate({
                            id: user.id,
                            trainerId: val === "__none__" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Non associé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non associé</SelectItem>
                          {trainers?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.firstName} {t.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {user.role === "trainee" && (
                      <Select
                        value={user.traineeId || "__none__"}
                        onValueChange={(val) =>
                          updateProfileMutation.mutate({
                            id: user.id,
                            traineeId: val === "__none__" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Non associé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non associé</SelectItem>
                          {trainees?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.firstName} {t.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {user.role === "enterprise" && (
                      <Select
                        value={user.enterpriseId || "__none__"}
                        onValueChange={(val) =>
                          updateProfileMutation.mutate({
                            id: user.id,
                            enterpriseId: val === "__none__" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Non associé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non associé</SelectItem>
                          {enterprises?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {user.role === "admin" && (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermDialog(user)}
                        title="Gérer les permissions"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={permDialogOpen}
        onOpenChange={(open) => {
          setPermDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissions - {editingUser?.firstName} {editingUser?.lastName}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mb-4">
            Un administrateur sans permissions spécifiques a accès à toutes les fonctionnalités.
          </p>

          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
          </div>

          <div className="space-y-5">
            {(Object.keys(ADMIN_PERMISSIONS) as Array<keyof typeof ADMIN_PERMISSIONS>).map((group) => (
              <div key={group}>
                <h4 className="font-semibold text-sm mb-2">
                  {PERM_GROUP_LABELS[group] || group}
                </h4>
                <div className="space-y-2 ml-1">
                  {ADMIN_PERMISSIONS[group].map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPerms.includes(perm.value)}
                        onCheckedChange={() => togglePerm(perm.value)}
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => {
                if (editingUser) {
                  updatePermsMutation.mutate({
                    id: editingUser.id,
                    permissions: selectedPerms,
                  });
                }
              }}
              disabled={updatePermsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updatePermsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Main Settings Page
// ============================================================

function SmtpTab() {
  const { toast } = useToast();
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const [form, setForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_secure: "false",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_name: "",
    smtp_from_email: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port || "587",
        smtp_secure: settings.smtp_secure || "false",
        smtp_user: settings.smtp_user || "",
        smtp_pass: settings.smtp_pass || "",
        smtp_from_name: settings.smtp_from_name || "",
        smtp_from_email: settings.smtp_from_email || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Configuration SMTP sauvegardée" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    },
  });

  const handleTest = async () => {
    setTestStatus("loading");
    setTestError("");
    try {
      // Save first so the server uses current values
      await saveMutation.mutateAsync(form);
      const res = await apiRequest("POST", "/api/settings/smtp-test");
      const result = await res.json();
      if (result.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(result.error || "Erreur inconnue");
      }
    } catch {
      setTestStatus("error");
      setTestError("Erreur de connexion au serveur");
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Configuration SMTP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_host">Serveur SMTP</Label>
            <Input
              id="smtp_host"
              placeholder="smtp.example.com"
              value={form.smtp_host}
              onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_port">Port</Label>
            <Input
              id="smtp_port"
              placeholder="587"
              value={form.smtp_port}
              onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="smtp_secure"
            checked={form.smtp_secure === "true"}
            onCheckedChange={(checked) => setForm({ ...form, smtp_secure: checked ? "true" : "false" })}
          />
          <Label htmlFor="smtp_secure">Connexion sécurisée (SSL/TLS)</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_user">Identifiant</Label>
            <Input
              id="smtp_user"
              placeholder="user@example.com"
              value={form.smtp_user}
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_pass">Mot de passe</Label>
            <Input
              id="smtp_pass"
              type="password"
              placeholder="••••••••"
              value={form.smtp_pass}
              onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_from_name">Nom de l'expéditeur</Label>
            <Input
              id="smtp_from_name"
              placeholder="SO'SAFE Formation"
              value={form.smtp_from_name}
              onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_from_email">Email de l'expéditeur</Label>
            <Input
              id="smtp_from_email"
              placeholder="noreply@example.com"
              value={form.smtp_from_email}
              onChange={(e) => setForm({ ...form, smtp_from_email: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testStatus === "loading"}>
            {testStatus === "loading" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Tester la connexion
          </Button>
        </div>

        {testStatus === "success" && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
            <CheckCircle className="w-4 h-4" />
            Connexion SMTP réussie
          </div>
        )}
        {testStatus === "error" && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
            <XCircle className="w-4 h-4" />
            Échec de la connexion : {testError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BrevoSmsTab() {
  const { toast } = useToast();
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const [form, setForm] = useState({
    brevo_api_key: "",
    brevo_sms_sender: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brevo_api_key: settings.brevo_api_key || "",
        brevo_sms_sender: settings.brevo_sms_sender || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Configuration Brevo SMS sauvegardée" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    },
  });

  const handleTest = async () => {
    setTestStatus("loading");
    setTestError("");
    try {
      await saveMutation.mutateAsync(form);
      const res = await apiRequest("POST", "/api/settings/brevo-sms-test");
      const result = await res.json();
      if (result.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(result.error || "Erreur inconnue");
      }
    } catch {
      setTestStatus("error");
      setTestError("Erreur de connexion au serveur");
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Configuration SMS Brevo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brevo_api_key">Clé API Brevo</Label>
          <Input
            id="brevo_api_key"
            type="password"
            placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={form.brevo_api_key}
            onChange={(e) => setForm({ ...form, brevo_api_key: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brevo_sms_sender">Nom expéditeur SMS</Label>
          <Input
            id="brevo_sms_sender"
            placeholder="SOSAFE"
            value={form.brevo_sms_sender}
            onChange={(e) => setForm({ ...form, brevo_sms_sender: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nom alphanumérique (max 11 car.) ou numéro de téléphone affiché comme expéditeur
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testStatus === "loading"}>
            {testStatus === "loading" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 mr-2" />
            )}
            Tester la connexion
          </Button>
        </div>

        {testStatus === "success" && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
            <CheckCircle className="w-4 h-4" />
            Connexion Brevo réussie
          </div>
        )}
        {testStatus === "error" && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
            <XCircle className="w-4 h-4" />
            Échec de la connexion : {testError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Integrations Tab (MyPonto, Lexpersona, Visio)
// ============================================================

function IntegrationsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<any[]>({ queryKey: ["/api/organization-settings"] });

  const getValue = (key: string) => {
    const s = settings?.find((s: any) => s.key === key);
    return s?.value || "";
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      await apiRequest("POST", "/api/organization-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization-settings"] });
      toast({ title: "Paramètre enregistré" });
    },
  });

  const [mypontoKey, setMypontoKey] = useState("");
  const [mypontoSecret, setMypontoSecret] = useState("");
  const [lexpersonaKey, setLexpersonaKey] = useState("");
  const [lexpersonaUrl, setLexpersonaUrl] = useState("");
  const [visioProvider, setVisioProvider] = useState("none");
  const [visioApiKey, setVisioApiKey] = useState("");
  const [visioDefaultUrl, setVisioDefaultUrl] = useState("");
  const [tiimeClientId, setTiimeClientId] = useState("");
  const [tiimeClientSecret, setTiimeClientSecret] = useState("");
  const [tiimeCompanyId, setTiimeCompanyId] = useState("");
  const [tiimeBaseUrl, setTiimeBaseUrl] = useState("");
  const [tiimeTesting, setTiimeTesting] = useState(false);
  const [tiimeTestResult, setTiimeTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tiimeSyncing, setTiimeSyncing] = useState("");

  useEffect(() => {
    if (settings) {
      setMypontoKey(getValue("myponto_api_key"));
      setMypontoSecret(getValue("myponto_api_secret"));
      setLexpersonaKey(getValue("lexpersona_api_key"));
      setLexpersonaUrl(getValue("lexpersona_api_url"));
      setVisioProvider(getValue("visio_provider") || "none");
      setVisioApiKey(getValue("visio_api_key"));
      setVisioDefaultUrl(getValue("visio_default_url"));
      setTiimeClientId(getValue("tiime_client_id"));
      setTiimeClientSecret(getValue("tiime_client_secret"));
      setTiimeCompanyId(getValue("tiime_company_id"));
      setTiimeBaseUrl(getValue("tiime_base_url"));
    }
  }, [settings]);

  const saveAll = () => {
    const pairs = [
      { key: "myponto_api_key", value: mypontoKey },
      { key: "myponto_api_secret", value: mypontoSecret },
      { key: "lexpersona_api_key", value: lexpersonaKey },
      { key: "lexpersona_api_url", value: lexpersonaUrl },
      { key: "visio_provider", value: visioProvider },
      { key: "visio_api_key", value: visioApiKey },
      { key: "visio_default_url", value: visioDefaultUrl },
      { key: "tiime_client_id", value: tiimeClientId },
      { key: "tiime_client_secret", value: tiimeClientSecret },
      { key: "tiime_company_id", value: tiimeCompanyId },
      { key: "tiime_base_url", value: tiimeBaseUrl },
    ];
    pairs.forEach((p) => {
      if (p.value) saveMutation.mutate(p);
    });
  };

  return (
    <div className="space-y-6">
      {/* MyPonto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="w-5 h-5" />
            MyPonto (Banque)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Intégration avec MyPonto pour la synchronisation bancaire et le rapprochement des paiements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Clé API MyPonto</Label>
              <Input
                type="password"
                placeholder="pk_live_..."
                value={mypontoKey}
                onChange={(e) => setMypontoKey(e.target.value)}
              />
            </div>
            <div>
              <Label>Secret API MyPonto</Label>
              <Input
                type="password"
                placeholder="sk_live_..."
                value={mypontoSecret}
                onChange={(e) => setMypontoSecret(e.target.value)}
              />
            </div>
          </div>
          <Badge variant={mypontoKey ? "default" : "secondary"}>
            {mypontoKey ? "Configuré" : "Non configuré"}
          </Badge>
        </CardContent>
      </Card>

      {/* Lexpersona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PenTool className="w-5 h-5" />
            Lexpersona (Signature électronique)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Intégration avec Lexpersona pour la signature électronique des conventions, contrats et attestations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Clé API Lexpersona</Label>
              <Input
                type="password"
                placeholder="lxp_..."
                value={lexpersonaKey}
                onChange={(e) => setLexpersonaKey(e.target.value)}
              />
            </div>
            <div>
              <Label>URL API Lexpersona</Label>
              <Input
                placeholder="https://api.lexpersona.com/v1"
                value={lexpersonaUrl}
                onChange={(e) => setLexpersonaUrl(e.target.value)}
              />
            </div>
          </div>
          <Badge variant={lexpersonaKey ? "default" : "secondary"}>
            {lexpersonaKey ? "Configuré" : "Non configuré"}
          </Badge>
        </CardContent>
      </Card>

      {/* Visio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="w-5 h-5" />
            Visioconférence (Meet / Zoom)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configuration de la visioconférence pour les sessions à distance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fournisseur</Label>
              <Select value={visioProvider} onValueChange={setVisioProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (URL manuelle)</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clé API (optionnel)</Label>
              <Input
                type="password"
                placeholder="Clé API du fournisseur"
                value={visioApiKey}
                onChange={(e) => setVisioApiKey(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>URL de visio par défaut</Label>
            <Input
              placeholder="https://meet.google.com/xxx-xxx-xxx"
              value={visioDefaultUrl}
              onChange={(e) => setVisioDefaultUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Utilisée si aucune URL n'est définie sur la session.
            </p>
          </div>
          <Badge variant={visioProvider !== "none" || visioDefaultUrl ? "default" : "secondary"}>
            {visioProvider !== "none" || visioDefaultUrl ? "Configuré" : "Non configuré"}
          </Badge>
        </CardContent>
      </Card>

      {/* TIIME Comptabilité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5" />
            TIIME (Comptabilité)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Synchronisation avec TIIME pour la gestion comptable : clients, factures et devis.
            L'accès API nécessite un partenariat avec TIIME (partnership@tiime.fr).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client ID</Label>
              <Input
                type="password"
                placeholder="Votre Client ID TIIME"
                value={tiimeClientId}
                onChange={(e) => setTiimeClientId(e.target.value)}
              />
            </div>
            <div>
              <Label>Client Secret</Label>
              <Input
                type="password"
                placeholder="Votre Client Secret TIIME"
                value={tiimeClientSecret}
                onChange={(e) => setTiimeClientSecret(e.target.value)}
              />
            </div>
            <div>
              <Label>Company ID (optionnel)</Label>
              <Input
                placeholder="ID de l'entreprise dans TIIME"
                value={tiimeCompanyId}
                onChange={(e) => setTiimeCompanyId(e.target.value)}
              />
            </div>
            <div>
              <Label>URL API (optionnel)</Label>
              <Input
                placeholder="https://api.tiime.fr"
                value={tiimeBaseUrl}
                onChange={(e) => setTiimeBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Laissez vide pour utiliser l'URL par défaut.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={tiimeClientId ? "default" : "secondary"}>
              {tiimeClientId ? "Configuré" : "Non configuré"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={!tiimeClientId || tiimeTesting}
              onClick={async () => {
                setTiimeTesting(true);
                setTiimeTestResult(null);
                try {
                  const res = await apiRequest("POST", "/api/settings/tiime-test");
                  const data = await res.json();
                  setTiimeTestResult(data);
                } catch (err: any) {
                  setTiimeTestResult({ success: false, message: err.message });
                } finally {
                  setTiimeTesting(false);
                }
              }}
            >
              {tiimeTesting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Tester la connexion
            </Button>
            {tiimeTestResult && (
              <span className={`text-sm flex items-center gap-1 ${tiimeTestResult.success ? "text-green-600" : "text-red-600"}`}>
                {tiimeTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {tiimeTestResult.message}
              </span>
            )}
          </div>
          {tiimeClientId && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium">Synchronisation</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Sync Clients", endpoint: "/api/integrations/tiime/sync-clients", key: "clients" },
                  { label: "Sync Factures", endpoint: "/api/integrations/tiime/sync-invoices", key: "invoices" },
                  { label: "Sync Devis", endpoint: "/api/integrations/tiime/sync-quotes", key: "quotes" },
                ].map((action) => (
                  <Button
                    key={action.key}
                    variant="outline"
                    size="sm"
                    disabled={tiimeSyncing === action.key}
                    onClick={async () => {
                      setTiimeSyncing(action.key);
                      try {
                        const res = await apiRequest("POST", action.endpoint);
                        const data = await res.json();
                        toast({
                          title: data.success ? "Synchronisation réussie" : "Erreur",
                          description: data.message || `${data.synced || 0} éléments synchronisés`,
                          variant: data.success ? "default" : "destructive",
                        });
                      } catch (err: any) {
                        toast({ title: "Erreur de synchronisation", description: err.message, variant: "destructive" });
                      } finally {
                        setTiimeSyncing("");
                      }
                    }}
                  >
                    {tiimeSyncing === action.key ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les intégrations
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// RGPD & Audit Tab
// ============================================================

function RgpdAuditTab() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "rgpd">("audit");
  const [auditFilters, setAuditFilters] = useState({ entityType: "", action: "", limit: 50, offset: 0 });
  const [showRgpdDialog, setShowRgpdDialog] = useState(false);
  const [rgpdForm, setRgpdForm] = useState({ requestType: "none", targetType: "none", targetId: "none", targetName: "", notes: "" });
  const [exportData, setExportData] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { data: auditData } = useQuery<any>({
    queryKey: ["/api/audit-logs", auditFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditFilters.entityType) params.set("entityType", auditFilters.entityType);
      if (auditFilters.action) params.set("action", auditFilters.action);
      params.set("limit", String(auditFilters.limit));
      params.set("offset", String(auditFilters.offset));
      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const { data: rgpdRequests = [] } = useQuery<any[]>({ queryKey: ["/api/rgpd-requests"] });
  const { data: trainees = [] } = useQuery<any[]>({ queryKey: ["/api/trainees"] });

  const createRgpdMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/rgpd-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rgpd-requests"] });
      setShowRgpdDialog(false);
      toast({ title: "Demande RGPD créée" });
    },
  });

  const updateRgpdMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/rgpd-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rgpd-requests"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (traineeId: string) => {
      const res = await fetch(`/api/rgpd/export-data/${traineeId}`);
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: (data) => {
      setExportData(data);
      setShowExportDialog(true);
    },
  });

  const anonymizeMutation = useMutation({
    mutationFn: async (traineeId: string) => {
      const res = await fetch(`/api/rgpd/anonymize/${traineeId}`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rgpd-requests"] });
      toast({ title: "Données anonymisées" });
    },
  });

  const downloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rgpd_export_${exportData.personalData?.lastName || "data"}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const auditLogs = auditData?.logs || [];
  const auditTotal = auditData?.total || 0;

  const actionLabels: Record<string, string> = {
    create: "Création", update: "Modification", delete: "Suppression",
    login: "Connexion", logout: "Déconnexion", export: "Export",
    print: "Impression", view: "Consultation",
  };

  const rgpdStatusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={activeSubTab === "audit" ? "default" : "outline"}
          onClick={() => setActiveSubTab("audit")}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          Journal d'audit
        </Button>
        <Button
          variant={activeSubTab === "rgpd" ? "default" : "outline"}
          onClick={() => setActiveSubTab("rgpd")}
          className="gap-2"
        >
          <Shield className="w-4 h-4" />
          Conformité RGPD
        </Button>
      </div>

      {activeSubTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Journal d'audit - Traçabilité des actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Select
                value={auditFilters.action || "all"}
                onValueChange={(v) => setAuditFilters((p) => ({ ...p, action: v === "all" ? "" : v, offset: 0 }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="create">Création</SelectItem>
                  <SelectItem value="update">Modification</SelectItem>
                  <SelectItem value="delete">Suppression</SelectItem>
                  <SelectItem value="login">Connexion</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={auditFilters.entityType || "all"}
                onValueChange={(v) => setAuditFilters((p) => ({ ...p, entityType: v === "all" ? "" : v, offset: 0 }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="trainee">Apprenant</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="enrollment">Inscription</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="rgpd_request">Demande RGPD</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground self-center">
                {auditTotal} entrée{auditTotal > 1 ? "s" : ""}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Détail</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucune entrée dans le journal d'audit
                    </TableCell>
                  </TableRow>
                ) : auditLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{log.userName || "Système"}</div>
                      <div className="text-xs text-muted-foreground">{log.userRole}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entityType}</TableCell>
                    <TableCell className="text-sm max-w-48 truncate">{log.entityLabel || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {auditTotal > auditFilters.limit && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditFilters.offset === 0}
                  onClick={() => setAuditFilters((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                >
                  Précédent
                </Button>
                <span className="text-sm self-center text-muted-foreground">
                  Page {Math.floor(auditFilters.offset / auditFilters.limit) + 1} / {Math.ceil(auditTotal / auditFilters.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditFilters.offset + auditFilters.limit >= auditTotal}
                  onClick={() => setAuditFilters((p) => ({ ...p, offset: p.offset + p.limit }))}
                >
                  Suivant
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === "rgpd" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Demandes RGPD
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowRgpdDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle demande
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-sm mb-2">Actions rapides</h4>
                <div className="flex gap-3 flex-wrap">
                  <Select
                    value="none"
                    onValueChange={(traineeId) => {
                      if (traineeId !== "none") exportMutation.mutate(traineeId);
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Exporter les données d'un apprenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Sélectionner un apprenant...</SelectItem>
                      {trainees.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          <Download className="w-3 h-3 inline mr-1" />
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value="none"
                    onValueChange={(traineeId) => {
                      if (traineeId !== "none" && confirm("Confirmer l'anonymisation ? Cette action est irréversible.")) {
                        anonymizeMutation.mutate(traineeId);
                      }
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Anonymiser un apprenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Sélectionner un apprenant...</SelectItem>
                      {trainees.filter((t: any) => t.status !== "inactive").map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          <UserX className="w-3 h-3 inline mr-1" />
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Personne</TableHead>
                    <TableHead>Demandé par</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rgpdRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucune demande RGPD
                      </TableCell>
                    </TableRow>
                  ) : rgpdRequests.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {r.requestType === "export" ? "Export" : r.requestType === "anonymize" ? "Anonymisation" : "Suppression"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.targetName}</TableCell>
                      <TableCell className="text-sm">{r.requestedByName}</TableCell>
                      <TableCell>
                        <Badge className={rgpdStatusColors[r.status] || ""}>
                          {r.status === "pending" ? "En attente" : r.status === "processing" ? "En cours" : r.status === "completed" ? "Terminé" : "Rejeté"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRgpdMutation.mutate({ id: r.id, status: "completed" })}
                            >
                              Valider
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRgpdMutation.mutate({ id: r.id, status: "rejected" })}
                            >
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog: New RGPD request */}
      <Dialog open={showRgpdDialog} onOpenChange={setShowRgpdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle demande RGPD</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Type de demande</Label>
              <Select value={rgpdForm.requestType} onValueChange={(v) => setRgpdForm((p) => ({ ...p, requestType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Sélectionner...</SelectItem>
                  <SelectItem value="export">Export de données</SelectItem>
                  <SelectItem value="anonymize">Anonymisation</SelectItem>
                  <SelectItem value="delete">Suppression complète</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Apprenant concerné</Label>
              <Select value={rgpdForm.targetId} onValueChange={(v) => {
                const t = trainees.find((t: any) => t.id === v);
                setRgpdForm((p) => ({ ...p, targetId: v, targetName: t ? `${t.firstName} ${t.lastName}` : "", targetType: "trainee" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Sélectionner...</SelectItem>
                  {trainees.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                placeholder="Motif de la demande..."
                value={rgpdForm.notes}
                onChange={(e) => setRgpdForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRgpdDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createRgpdMutation.mutate({
                requestType: rgpdForm.requestType,
                targetType: rgpdForm.targetType || "trainee",
                targetId: rgpdForm.targetId,
                targetName: rgpdForm.targetName,
                notes: rgpdForm.notes,
              })}
              disabled={rgpdForm.requestType === "none" || rgpdForm.targetId === "none"}
            >
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Data export viewer */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export des données personnelles</DialogTitle>
          </DialogHeader>
          {exportData && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">Données personnelles</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(exportData.personalData || {}).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key} : </span>
                      <span>{String(val ?? "Non renseigné")}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {exportData.enrollments?.length || 0} inscription(s), {exportData.documents?.length || 0} document(s), {exportData.certifications?.length || 0} certification(s)
              </div>
              <div className="flex justify-end">
                <Button onClick={downloadExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger JSON
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accès réservé aux administrateurs</h1>
        <p className="text-muted-foreground">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Paramètres"
        subtitle="Configurez les paramètres de votre plateforme SO'SAFE"
      />

      <Tabs defaultValue="organisme" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organisme" className="gap-2">
            <Building2 className="w-4 h-4" />
            Organisme
          </TabsTrigger>
          <TabsTrigger value="automatisation" className="gap-2">
            <Zap className="w-4 h-4" />
            Automatisation
          </TabsTrigger>
          <TabsTrigger value="utilisateurs" className="gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="smtp" className="gap-2">
            <Mail className="w-4 h-4" />
            Email SMTP
          </TabsTrigger>
          <TabsTrigger value="brevo-sms" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS Brevo
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="w-4 h-4" />
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="rgpd" className="gap-2">
            <Shield className="w-4 h-4" />
            RGPD & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organisme">
          <OrganismeTab />
        </TabsContent>

        <TabsContent value="automatisation">
          <AutomatisationTab />
        </TabsContent>

        <TabsContent value="utilisateurs">
          <UtilisateursTab />
        </TabsContent>

        <TabsContent value="smtp">
          <SmtpTab />
        </TabsContent>

        <TabsContent value="brevo-sms">
          <BrevoSmsTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="rgpd">
          <RgpdAuditTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
