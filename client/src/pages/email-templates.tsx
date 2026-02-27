import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Variable,
  MailOpen,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  BarChart3,
} from "lucide-react";
import type { EmailTemplate, InsertEmailTemplate, EmailLog, EmailTrackingEvent, SmsTemplate, InsertSmsTemplate, SmsLog } from "@shared/schema";
import {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_TYPES,
  SMS_TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLES,
} from "@shared/schema";


function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {};
  EMAIL_TEMPLATE_CATEGORIES.forEach((c) => {
    labels[c.value] = c.label;
  });
  const colors: Record<string, string> = {
    convocation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    confirmation: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rappel: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    suivi: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    facturation: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    general: "bg-accent text-accent-foreground",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[category] || ""}`}>
      {labels[category] || category}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {};
  EMAIL_TEMPLATE_TYPES.forEach((t) => {
    labels[t.value] = t.label;
  });
  const colors: Record<string, string> = {
    manual: "bg-muted text-muted-foreground",
    automatic: "bg-primary/10 text-primary dark:bg-primary/20",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[type] || ""}`}>
      {labels[type] || type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    pending: { label: "En attente", icon: <Clock className="w-3 h-3" />, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    sent: { label: "Envoyé", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    failed: { label: "Échoué", icon: <XCircle className="w-3 h-3" />, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };
  const c = config[status] || { label: status, icon: null, className: "" };
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${c.className}`}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

const VARIABLE_GROUPS = [
  { key: "apprenant" as const, label: "Apprenant" },
  { key: "session" as const, label: "Session" },
  { key: "formation" as const, label: "Formation" },
  { key: "organisme" as const, label: "Organisme" },
];

function VariableInserter({
  textareaRef,
  onInsert,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (variable: string) => void;
}) {
  const handleInsert = (variable: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + variable + value.substring(end);
      onInsert(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = start + variable.length;
        textarea.selectionEnd = start + variable.length;
      });
    } else {
      onInsert(variable);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Variable className="w-4 h-4" />
        Variables disponibles
      </div>
      {VARIABLE_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.label}</p>
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARIABLES[group.key].map((v) => (
              <Button
                key={v.key}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleInsert(v.key)}
                title={v.label}
              >
                {v.key}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateForm({
  template,
  onSubmit,
  isPending,
}: {
  template?: EmailTemplate;
  onSubmit: (data: InsertEmailTemplate) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [category, setCategory] = useState(template?.category || EMAIL_TEMPLATE_CATEGORIES[0].value);
  const [type, setType] = useState(template?.type || EMAIL_TEMPLATE_TYPES[0].value);
  const [body, setBody] = useState(template?.body || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      subject,
      category,
      type,
      body,
      variables: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">Nom du template</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Convocation session AFGSU"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-subject">Objet de l'email</Label>
        <Input
          id="template-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Convocation - {session_title}"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TEMPLATE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-body">Corps du message</Label>
        <Textarea
          id="template-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bonjour {learner_first_name},&#10;&#10;Nous avons le plaisir de vous confirmer votre inscription..."
          className="resize-none min-h-[200px] font-mono text-sm"
          required
        />
      </div>
      <VariableInserter
        textareaRef={textareaRef}
        onInsert={(newValue) => setBody(newValue)}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : template ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TemplatesContent() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<EmailTemplate | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertEmailTemplate) =>
      apiRequest("POST", "/api/email-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setDialogOpen(false);
      toast({ title: "Template créé avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertEmailTemplate }) =>
      apiRequest("PATCH", `/api/email-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setDialogOpen(false);
      setEditItem(undefined);
      toast({ title: "Template modifié avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template supprimé" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const handlePreview = async (template: EmailTemplate) => {
    setPreviewLoading(true);
    setPreviewContent(null);
    setPreviewOpen(true);
    try {
      const res = await apiRequest("POST", `/api/email-templates/${template.id}/preview`);
      const data = await res.json();
      setPreviewContent(data);
    } catch {
      toast({ title: "Erreur lors de la prévisualisation", variant: "destructive" });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const filtered =
    templates?.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditItem(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun template</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "Aucun résultat pour votre recherche"
              : "Créez votre premier modèle d'email"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template.id} className="hover-elevate">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {template.subject}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditItem(template);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreview(template)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Prévisualiser
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {template.body}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={template.category} />
                  <TypeBadge type={template.type} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditItem(undefined);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Modifier le template" : "Nouveau template"}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editItem}
            onSubmit={(data) =>
              editItem
                ? updateMutation.mutate({ id: editItem.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Prévisualisation</SheetTitle>
            <SheetDescription>
              Aperçu du template avec des données d'exemple
            </SheetDescription>
          </SheetHeader>
          {previewLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : previewContent ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Objet</p>
                <p className="text-sm font-semibold">{previewContent.subject}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Corps</p>
                <div className="rounded-md border p-4 bg-muted/20 text-sm whitespace-pre-wrap">
                  {previewContent.body}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function EmailLogsTab() {
  const [trackingSheetOpen, setTrackingSheetOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<EmailLog[]>({
    queryKey: ["/api/email-logs"],
  });

  const { data: trackingEvents, isLoading: trackingLoading } = useQuery<EmailTrackingEvent[]>({
    queryKey: ["/api/email-logs", selectedLogId, "tracking"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/email-logs/${selectedLogId}/tracking`);
      return res.json();
    },
    enabled: !!selectedLogId,
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/email-logs/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      toast({ title: "Email renvoyé" });
    },
    onError: () =>
      toast({ title: "Erreur lors du renvoi", variant: "destructive" }),
  });

  const openTrackingSheet = (logId: string) => {
    setSelectedLogId(logId);
    setTrackingSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-16">
        <Send className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucun envoi</h3>
        <p className="text-sm text-muted-foreground">
          Les emails envoyés apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Destinataire</th>
                <th className="text-left p-3 font-medium">Objet</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Envoyé le</th>
                <th className="text-left p-3 font-medium">Ouvert</th>
                <th className="text-left p-3 font-medium">Nb ouvertures</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{log.recipient}</td>
                  <td className="p-3 text-muted-foreground max-w-[200px] truncate">{log.subject}</td>
                  <td className="p-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(log.sentAt)}</td>
                  <td className="p-3">
                    {log.openedAt ? (
                      <Badge variant="outline" className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <MailOpen className="w-3 h-3" />
                        {formatDate(log.openedAt)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non ouvert</span>
                    )}
                  </td>
                  <td className="p-3 text-center">{log.openCount || 0}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openTrackingSheet(log.id)}
                        title="Détails tracking"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      {log.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => resendMutation.mutate(log.id)}
                          disabled={resendMutation.isPending}
                          title="Renvoyer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet
        open={trackingSheetOpen}
        onOpenChange={(open) => {
          setTrackingSheetOpen(open);
          if (!open) setSelectedLogId(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détails de tracking</SheetTitle>
            <SheetDescription>
              Historique des ouvertures de cet email
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {trackingLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !trackingEvents || trackingEvents.length === 0 ? (
              <div className="text-center py-8">
                <MailOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Aucune ouverture enregistrée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trackingEvents.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <MailOpen className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">{formatDate(event.openedAt)}</span>
                      </div>
                      {event.ipAddress && (
                        <p className="text-xs text-muted-foreground">
                          IP: {event.ipAddress}
                        </p>
                      )}
                      {event.userAgent && (
                        <p className="text-xs text-muted-foreground truncate" title={event.userAgent}>
                          UA: {event.userAgent}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SmsCategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {};
  SMS_TEMPLATE_CATEGORIES.forEach((c) => {
    labels[c.value] = c.label;
  });
  const colors: Record<string, string> = {
    convocation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    confirmation: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rappel: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    general: "bg-accent text-accent-foreground",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[category] || ""}`}>
      {labels[category] || category}
    </Badge>
  );
}

function SmsTemplateForm({
  template,
  onSubmit,
  isPending,
}: {
  template?: SmsTemplate;
  onSubmit: (data: InsertSmsTemplate) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState(template?.category || SMS_TEMPLATE_CATEGORIES[0].value);
  const [type, setType] = useState(template?.type || "manual");
  const [body, setBody] = useState(template?.body || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = body.length;
  const segmentCount = Math.max(1, Math.ceil(charCount / 160));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      type,
      body,
      variables: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sms-template-name">Nom du template</Label>
        <Input
          id="sms-template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Rappel session J-1"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SMS_TEMPLATE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manuel</SelectItem>
              <SelectItem value="automatic">Automatique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="sms-template-body">Corps du message</Label>
          <span className="text-xs text-muted-foreground">
            {charCount} car. / {segmentCount} segment{segmentCount > 1 ? "s" : ""}
          </span>
        </div>
        <Textarea
          id="sms-template-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bonjour {prenom_apprenant}, rappel : votre session {titre_session} commence le {date_debut}."
          className="resize-none min-h-[120px] font-mono text-sm"
          required
        />
      </div>
      <VariableInserter
        textareaRef={textareaRef}
        onInsert={(newValue) => setBody(newValue)}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : template ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function SmsTemplatesContent() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<SmsTemplate | undefined>();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSmsTemplate) =>
      apiRequest("POST", "/api/sms-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      setDialogOpen(false);
      toast({ title: "Template SMS créé avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertSmsTemplate }) =>
      apiRequest("PATCH", `/api/sms-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      setDialogOpen(false);
      setEditItem(undefined);
      toast({ title: "Template SMS modifié avec succès" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/sms-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      toast({ title: "Template SMS supprimé" });
    },
    onError: () =>
      toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered =
    templates?.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template SMS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditItem(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau template SMS
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun template SMS</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "Aucun résultat pour votre recherche"
              : "Créez votre premier modèle de SMS"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un template SMS
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template.id} className="hover-elevate">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{template.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditItem(template);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {template.body}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <SmsCategoryBadge category={template.category} />
                  <TypeBadge type={template.type} />
                  <span className="text-xs text-muted-foreground">
                    {template.body.length} car.
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditItem(undefined);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Modifier le template SMS" : "Nouveau template SMS"}
            </DialogTitle>
          </DialogHeader>
          <SmsTemplateForm
            template={editItem}
            onSubmit={(data) =>
              editItem
                ? updateMutation.mutate({ id: editItem.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SmsLogsTab() {
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<SmsLog[]>({
    queryKey: ["/api/sms-logs"],
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/sms-logs/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-logs"] });
      toast({ title: "SMS renvoyé" });
    },
    onError: () =>
      toast({ title: "Erreur lors du renvoi", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucun envoi SMS</h3>
        <p className="text-sm text-muted-foreground">
          Les SMS envoyés apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Destinataire</th>
              <th className="text-left p-3 font-medium">Corps</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-left p-3 font-medium">Envoyé le</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="p-3 font-medium">{log.recipient}</td>
                <td className="p-3 text-muted-foreground max-w-[300px] truncate">{log.body}</td>
                <td className="p-3">
                  <StatusBadge status={log.status} />
                </td>
                <td className="p-3 text-muted-foreground text-xs">{formatDate(log.sentAt)}</td>
                <td className="p-3">
                  {log.status === "failed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => resendMutation.mutate(log.id)}
                      disabled={resendMutation.isPending}
                      title="Renvoyer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EmailTemplates() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-muted-foreground mt-1">
          Gérez vos modèles d'emails et SMS, et suivez vos envois
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">
            <Mail className="w-4 h-4 mr-2" />
            Templates Email
          </TabsTrigger>
          <TabsTrigger value="sms-templates">
            <MessageSquare className="w-4 h-4 mr-2" />
            Templates SMS
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Send className="w-4 h-4 mr-2" />
            Historique Emails
          </TabsTrigger>
          <TabsTrigger value="sms-logs">
            <MessageSquare className="w-4 h-4 mr-2" />
            Historique SMS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <TemplatesContent />
        </TabsContent>

        <TabsContent value="sms-templates" className="space-y-6 mt-6">
          <SmsTemplatesContent />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 mt-6">
          <EmailLogsTab />
        </TabsContent>

        <TabsContent value="sms-logs" className="space-y-6 mt-6">
          <SmsLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
