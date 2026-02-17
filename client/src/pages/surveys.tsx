import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  ClipboardList,
  FileText,
  MessageSquare,
  X,
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
import type { SurveyTemplate, InsertSurveyTemplate, SurveyResponse, Session } from "@shared/schema";

const SURVEY_CATEGORIES = [
  { value: "satisfaction", label: "Satisfaction" },
  { value: "evaluation", label: "Evaluation" },
  { value: "feedback", label: "Retour formateur" },
  { value: "quality", label: "Qualite" },
] as const;

const SURVEY_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Brouillon" },
  { value: "archived", label: "Archivee" },
] as const;

const QUESTION_TYPES = [
  { value: "rating", label: "Note (1-5)" },
  { value: "text", label: "Texte libre" },
  { value: "qcm", label: "QCM" },
] as const;

type QuestionDraft = {
  question: string;
  type: string;
  options?: string[];
};

function SurveyStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    draft: "bg-accent text-accent-foreground",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  const label = SURVEY_STATUSES.find((s) => s.value === status)?.label || status;
  return <Badge variant="outline" className={variants[status] || ""}>{label}</Badge>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">{rating}/5</span>
    </div>
  );
}

function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
}) {
  const addQuestion = () => {
    onChange([...questions, { question: "", type: "rating", options: [] }]);
  };

  const updateQuestion = (index: number, field: keyof QuestionDraft, value: string | string[]) => {
    const updated = [...questions];
    if (field === "options") {
      updated[index] = { ...updated[index], options: value as string[] };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    if (field === "type" && value !== "qcm") {
      updated[index].options = [];
    }
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const options = updated[questionIndex].options || [];
    updated[questionIndex] = { ...updated[questionIndex], options: [...options, ""] };
    onChange(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...(updated[questionIndex].options || [])];
    options[optionIndex] = value;
    updated[questionIndex] = { ...updated[questionIndex], options };
    onChange(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const options = (updated[questionIndex].options || []).filter((_, i) => i !== optionIndex);
    updated[questionIndex] = { ...updated[questionIndex], options };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Questions</Label>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion} data-testid="button-add-question">
          <Plus className="w-3 h-3 mr-1" />
          Ajouter une question
        </Button>
      </div>
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune question. Ajoutez votre premiere question.
        </p>
      )}
      {questions.map((q, qIndex) => (
        <Card key={qIndex} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground mt-1">
              Question {qIndex + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => removeQuestion(qIndex)}
              data-testid={`button-remove-question-${qIndex}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <Input
            value={q.question}
            onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
            placeholder="Texte de la question..."
            data-testid={`input-question-text-${qIndex}`}
          />
          <Select value={q.type} onValueChange={(val) => updateQuestion(qIndex, "type", val)}>
            <SelectTrigger data-testid={`select-question-type-${qIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {q.type === "qcm" && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label className="text-xs text-muted-foreground">Options</Label>
              {(q.options || []).map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder={`Option ${oIndex + 1}`}
                    className="h-8 text-sm"
                    data-testid={`input-option-${qIndex}-${oIndex}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeOption(qIndex, oIndex)}
                    data-testid={`button-remove-option-${qIndex}-${oIndex}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => addOption(qIndex)}
                data-testid={`button-add-option-${qIndex}`}
              >
                <Plus className="w-3 h-3 mr-1" />
                Ajouter une option
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function SurveyTemplateForm({
  template,
  onSubmit,
  isPending,
}: {
  template?: SurveyTemplate;
  onSubmit: (data: InsertSurveyTemplate) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(template?.title || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "satisfaction");
  const [status, setStatus] = useState(template?.status || "active");
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    (template?.questions as QuestionDraft[]) || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      category,
      status,
      questions: questions.filter((q) => q.question.trim() !== ""),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-title">Titre</Label>
        <Input
          id="template-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Enquete de satisfaction post-formation"
          required
          data-testid="input-template-title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-description">Description</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description de l'enquete..."
          className="resize-none"
          data-testid="input-template-description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-template-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SURVEY_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-template-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SURVEY_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <QuestionBuilder questions={questions} onChange={setQuestions} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-template-submit">
          {isPending ? "Enregistrement..." : template ? "Modifier" : "Creer"}
        </Button>
      </div>
    </form>
  );
}

function TemplatesTab() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SurveyTemplate | undefined>();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSurveyTemplate) => apiRequest("POST", "/api/survey-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      setDialogOpen(false);
      toast({ title: "Modele d'enquete cree avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la creation", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertSurveyTemplate }) =>
      apiRequest("PATCH", `/api/survey-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      setDialogOpen(false);
      setEditTemplate(undefined);
      toast({ title: "Modele modifie avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/survey-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      toast({ title: "Modele supprime" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered = templates?.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un modele..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-templates"
          />
        </div>
        <Button
          onClick={() => {
            setEditTemplate(undefined);
            setDialogOpen(true);
          }}
          data-testid="button-create-template"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modele
        </Button>
      </div>

      {isLoading ? (
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun modele d'enquete</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun resultat pour votre recherche" : "Creez votre premier modele d'enquete"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-template">
              <Plus className="w-4 h-4 mr-2" />
              Creer un modele
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const questionsArr = (template.questions as QuestionDraft[]) || [];
            return (
              <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{template.title}</h3>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-template-menu-${template.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditTemplate(template);
                            setDialogOpen(true);
                          }}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(template.id)}
                          data-testid={`button-delete-template-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <SurveyStatusBadge status={template.status} />
                    <Badge variant="outline" className="text-xs">
                      {SURVEY_CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {questionsArr.length} question{questionsArr.length > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTemplate(undefined);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTemplate ? "Modifier le modele" : "Nouveau modele d'enquete"}
            </DialogTitle>
          </DialogHeader>
          <SurveyTemplateForm
            template={editTemplate}
            onSubmit={(data) =>
              editTemplate
                ? updateMutation.mutate({ id: editTemplate.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResponsesTab() {
  const [search, setSearch] = useState("");

  const { data: responses, isLoading: loadingResponses } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses"],
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: templates } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<{
    averageRating: number;
    totalResponses: number;
    completionRate: number;
  }>({
    queryKey: ["/api/survey-responses/stats"],
  });

  const filtered = responses?.filter((r) => {
    const session = sessions?.find((s) => s.id === r.sessionId);
    const template = templates?.find((t) => t.id === r.surveyId);
    return (
      search === "" ||
      (session?.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (template?.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.comments || "").toLowerCase().includes(search.toLowerCase())
    );
  }) || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card data-testid="card-stat-avg-rating">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Note moyenne</CardTitle>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
              <Star className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="card-stat-avg-rating-value">
                  {stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : "-"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sur toutes les enquetes</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-stat-total-responses">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total reponses</CardTitle>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
              <MessageSquare className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="card-stat-total-responses-value">
                  {stats?.totalResponses ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Reponses collectees</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une reponse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-responses"
        />
      </div>

      {loadingResponses ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune reponse</h3>
          <p className="text-sm text-muted-foreground">
            {search ? "Aucun resultat pour votre recherche" : "Les reponses aux enquetes apparaitront ici"}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enquete</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Commentaires</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((response) => {
                  const session = sessions?.find((s) => s.id === response.sessionId);
                  const template = templates?.find((t) => t.id === response.surveyId);
                  return (
                    <TableRow key={response.id} data-testid={`row-response-${response.id}`}>
                      <TableCell>
                        <p className="text-sm font-medium">{template?.title || "Enquete inconnue"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{session?.title || "-"}</p>
                      </TableCell>
                      <TableCell>
                        {response.rating ? (
                          <StarRating rating={response.rating} />
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {response.comments || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {response.createdAt
                            ? new Date(response.createdAt).toLocaleDateString("fr-FR")
                            : "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Surveys() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-surveys-title">Enquetes</h1>
        <p className="text-muted-foreground mt-1">Gerez vos modeles d'enquetes et consultez les reponses</p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="w-4 h-4 mr-2" />
            Modeles
          </TabsTrigger>
          <TabsTrigger value="responses" data-testid="tab-responses">
            <MessageSquare className="w-4 h-4 mr-2" />
            Reponses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="responses">
          <ResponsesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
