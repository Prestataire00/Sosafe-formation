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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Variable,
} from "lucide-react";
import type { EmailTemplate, InsertEmailTemplate } from "@shared/schema";
import {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_TYPES,
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

export default function EmailTemplates() {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Templates d'emails</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos modèles d'emails pour les communications SO'SAFE
          </p>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
    </div>
  );
}
