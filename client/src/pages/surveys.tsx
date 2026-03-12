import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  ClipboardList,
  FileText,
  MessageSquare,
  X,
  Send,
  CheckCircle,
  Clock,
  Mail,
  Users,
  BookOpen,
  User,
  Building2,
  Sparkles,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Globe,
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
import type { SurveyTemplate, InsertSurveyTemplate, SurveyResponse, Session, EvaluationAssignment, Trainee, Enrollment } from "@shared/schema";
import { EVALUATION_TYPES, DEFAULT_EVALUATION_QUESTIONS } from "@shared/schema";
import { useAuth } from "@/lib/auth";

const SURVEY_CATEGORIES = [
  { value: "satisfaction", label: "Satisfaction" },
  { value: "evaluation", label: "Evaluation" },
  { value: "feedback", label: "Retour formateur" },
  { value: "quality", label: "Qualite" },
  { value: "pre_formation", label: "Pre-formation" },
  { value: "satisfaction_hot", label: "Satisfaction a chaud" },
  { value: "evaluation_cold", label: "Evaluation a froid" },
  { value: "trainer_eval", label: "Evaluation intervenant" },
  { value: "manager_eval", label: "Evaluation manager" },
  { value: "commissioner_eval", label: "Evaluation commanditaire" },
] as const;

const RESPONDENT_TYPES = [
  { value: "trainee", label: "Stagiaire" },
  { value: "manager", label: "Manager" },
  { value: "enterprise", label: "Entreprise / Commanditaire" },
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
  const [evaluationType, setEvaluationType] = useState(template?.evaluationType || "");
  const [respondentType, setRespondentType] = useState(template?.respondentType || "trainee");
  const [coldDelayDays, setColdDelayDays] = useState(template?.coldDelayDays || 30);
  const [sections, setSections] = useState<Array<{ title: string; type: "scored" | "open"; questionIndices: number[]; coefficient?: number }>>(
    (template?.sections as any[]) || []
  );
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
      evaluationType: evaluationType || null,
      respondentType,
      coldDelayDays: evaluationType === "evaluation_cold" ? coldDelayDays : null,
      sections: evaluationType === "commissioner_eval" ? sections : [],
      questions: questions.filter((q) => q.question.trim() !== ""),
    } as any);
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type d'evaluation</Label>
          <Select value={evaluationType || "none"} onValueChange={(v) => {
            const newType = v === "none" ? "" : v;
            setEvaluationType(newType);
            if (v === "manager_eval") setRespondentType("manager");
            else if (v === "commissioner_eval") setRespondentType("enterprise");
            else setRespondentType("trainee");
            // Auto-fill questions and title when switching to a type with defaults and no questions yet
            if (newType && DEFAULT_EVALUATION_QUESTIONS[newType] && questions.length === 0) {
              setQuestions(DEFAULT_EVALUATION_QUESTIONS[newType]);
              if (!title) {
                const label = EVALUATION_TYPES.find((t) => t.value === newType)?.label;
                if (label) setTitle(label);
              }
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Aucun (enquete classique)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun (enquete classique)</SelectItem>
              {EVALUATION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {evaluationType && (
          <div className="space-y-2">
            <Label>Type de repondant</Label>
            <Select value={respondentType} onValueChange={setRespondentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONDENT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {evaluationType === "evaluation_cold" && (
        <div className="space-y-2">
          <Label>Delai d'envoi (jours apres la fin de session)</Label>
          <Input
            type="number"
            min={1}
            value={coldDelayDays}
            onChange={(e) => setColdDelayDays(parseInt(e.target.value) || 30)}
          />
        </div>
      )}

      {evaluationType === "commissioner_eval" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Sections (partie notee / ouverte)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSections([...sections, { title: "", type: "scored", questionIndices: [], coefficient: 1 }])}
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter une section
            </Button>
          </div>
          {sections.map((section, si) => (
            <Card key={si} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={section.title}
                  onChange={(e) => {
                    const updated = [...sections];
                    updated[si] = { ...updated[si], title: e.target.value };
                    setSections(updated);
                  }}
                  placeholder="Titre de la section"
                  className="flex-1"
                />
                <Select
                  value={section.type}
                  onValueChange={(v) => {
                    const updated = [...sections];
                    updated[si] = { ...updated[si], type: v as "scored" | "open" };
                    setSections(updated);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scored">Notee</SelectItem>
                    <SelectItem value="open">Ouverte</SelectItem>
                  </SelectContent>
                </Select>
                {section.type === "scored" && (
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={section.coefficient || 1}
                    onChange={(e) => {
                      const updated = [...sections];
                      updated[si] = { ...updated[si], coefficient: parseFloat(e.target.value) || 1 };
                      setSections(updated);
                    }}
                    className="w-20"
                    title="Coefficient"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSections(sections.filter((_, i) => i !== si))}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="pl-2">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Questions dans cette section (indices, ex: 0,1,2)
                </Label>
                <Input
                  value={section.questionIndices.join(",")}
                  onChange={(e) => {
                    const updated = [...sections];
                    updated[si] = {
                      ...updated[si],
                      questionIndices: e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)),
                    };
                    setSections(updated);
                  }}
                  placeholder="0,1,2"
                  className="text-sm"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {evaluationType && DEFAULT_EVALUATION_QUESTIONS[evaluationType] && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setQuestions(DEFAULT_EVALUATION_QUESTIONS[evaluationType]);
            if (!title) {
              const label = EVALUATION_TYPES.find((t) => t.value === evaluationType)?.label;
              if (label) setTitle(label);
            }
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Pre-remplir les questions suggerees ({DEFAULT_EVALUATION_QUESTIONS[evaluationType].length} questions)
        </Button>
      )}

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
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un modele..."
          className="max-w-sm"
        />
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

function ResponseEditDialog({
  response,
  template,
  open,
  onOpenChange,
}: {
  response: SurveyResponse;
  template: SurveyTemplate | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const questions = (template?.questions as Array<{ question: string; type: string; options?: string[] }>) || [];
  const existingAnswers = (response.answers as Array<{ questionIndex: number; answer: string | number }>) || [];

  const [editAnswers, setEditAnswers] = useState<Record<number, string | number>>(() => {
    const map: Record<number, string | number> = {};
    existingAnswers.forEach((a) => { map[a.questionIndex] = a.answer; });
    return map;
  });
  const [editRating, setEditRating] = useState(response.rating || 0);
  const [editComments, setEditComments] = useState(response.comments || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const answersArray = Object.entries(editAnswers).map(([idx, answer]) => ({
        questionIndex: parseInt(idx),
        answer,
      }));
      const resp = await apiRequest("PATCH", `/api/survey-responses/${response.id}`, {
        answers: answersArray,
        rating: editRating || null,
        comments: editComments || null,
      });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-responses"] });
      toast({ title: "Reponse modifiee avec succes" });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const updateAnswer = (questionIndex: number, value: string | number) => {
    setEditAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la reponse — {template?.title || "Evaluation"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-sm font-medium">{q.question}</Label>
              {q.type === "rating" && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateAnswer(i, star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${star <= ((editAnswers[i] as number) || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              )}
              {q.type === "text" && (
                <Textarea
                  value={(editAnswers[i] as string) || ""}
                  onChange={(e) => updateAnswer(i, e.target.value)}
                  placeholder="Reponse..."
                  rows={3}
                />
              )}
              {q.type === "qcm" && q.options && (
                <RadioGroup
                  value={(editAnswers[i] as string) || ""}
                  onValueChange={(v) => updateAnswer(i, v)}
                >
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`edit-q${i}-o${oi}`} />
                      <Label htmlFor={`edit-q${i}-o${oi}`} className="text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Note globale</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEditRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${star <= editRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Commentaires</Label>
            <Textarea
              value={editComments}
              onChange={(e) => setEditComments(e.target.value)}
              placeholder="Commentaires..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResponsesTab() {
  const [search, setSearch] = useState("");
  const [editingResponse, setEditingResponse] = useState<SurveyResponse | null>(null);
  const { hasPermission } = useAuth();

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

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher une reponse..."
        className="max-w-sm"
      />

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
                  <TableHead>Type</TableHead>
                  <TableHead>Repondant</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Score pondere</TableHead>
                  <TableHead>Commentaires</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((response) => {
                  const session = sessions?.find((s) => s.id === response.sessionId);
                  const template = templates?.find((t) => t.id === response.surveyId);
                  const evalLabel = response.evaluationType
                    ? EVALUATION_TYPES.find(e => e.value === response.evaluationType)?.label.split("(")[0].trim()
                    : null;
                  return (
                    <TableRow key={response.id} data-testid={`row-response-${response.id}`}>
                      <TableCell>
                        <p className="text-sm font-medium">{template?.title || "Enquete inconnue"}</p>
                      </TableCell>
                      <TableCell>
                        {evalLabel ? (
                          <Badge variant="outline" className="text-xs">{evalLabel}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Enquete</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {response.respondentName || response.respondentType || "-"}
                        </p>
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
                        {response.weightedScore != null ? (
                          <span className="text-sm font-medium">{response.weightedScore}/5</span>
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
                      {hasPermission("override_survey_responses") && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingResponse(response)}
                          title="Modifier la reponse"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editingResponse && (
        <ResponseEditDialog
          response={editingResponse}
          template={templates?.find((t) => t.id === editingResponse.surveyId)}
          open={!!editingResponse}
          onOpenChange={(open) => { if (!open) setEditingResponse(null); }}
        />
      )}
    </div>
  );
}

function EvaluationsTab() {
  const [selectedSession, setSelectedSession] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluationAssignment | null>(null);
  const [evalEditingResponse, setEvalEditingResponse] = useState<SurveyResponse | null>(null);
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const { data: sessions } = useQuery<Session[]>({ queryKey: ["/api/sessions"] });
  const { data: templates } = useQuery<SurveyTemplate[]>({ queryKey: ["/api/survey-templates"] });
  const { data: responses } = useQuery<SurveyResponse[]>({ queryKey: ["/api/survey-responses"] });
  const { data: assignments, isLoading } = useQuery<EvaluationAssignment[]>({
    queryKey: ["/api/evaluation-assignments", { sessionId: selectedSession }],
    queryFn: async () => {
      const url = selectedSession
        ? `/api/evaluation-assignments?sessionId=${selectedSession}`
        : "/api/evaluation-assignments";
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) throw new Error("Erreur");
      return resp.json();
    },
  });
  const { data: enrollments } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const resp = await fetch(`/api/enrollments?sessionId=${selectedSession}`, { credentials: "include" });
      return resp.json();
    },
    enabled: !!selectedSession,
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });

  const batchMutation = useMutation({
    mutationFn: async ({ evaluationType }: { evaluationType: string }) => {
      const resp = await fetch("/api/evaluation-assignments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: selectedSession, evaluationType }),
      });
      if (!resp.ok) throw new Error("Erreur");
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-assignments"] });
      toast({ title: `${data.created} evaluation(s) assignee(s)` });
    },
    onError: () => toast({ title: "Erreur lors de l'envoi", variant: "destructive" }),
  });

  const evalTypes = EVALUATION_TYPES.map(t => t.value);
  const activeEnrollments = enrollments?.filter((e: any) => e.status !== "cancelled") || [];

  const getAssignmentForCell = (traineeId: string, evalType: string) => {
    if (!assignments) return null;
    return assignments.find(
      (a) => a.traineeId === traineeId && templates?.find(t => t.id === a.templateId)?.evaluationType === evalType
    ) || null;
  };

  // Stats per evaluation type
  const statsPerType = evalTypes.map((evalType) => {
    const typeAssignments = (assignments || []).filter(
      (a) => templates?.find(t => t.id === a.templateId)?.evaluationType === evalType
    );
    const total = typeAssignments.length;
    const completed = typeAssignments.filter(a => a.status === "completed").length;
    const completedWithResponse = typeAssignments.filter(a => a.responseId);
    const relevantResponses = completedWithResponse
      .map(a => responses?.find(r => r.id === a.responseId))
      .filter(Boolean);
    const scores = relevantResponses
      .map(r => r!.weightedScore || r!.rating)
      .filter((s): s is number => s != null);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    return {
      evalType,
      label: EVALUATION_TYPES.find(e => e.value === evalType)?.label.split("(")[0].trim() || evalType,
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgScore,
    };
  });

  const getResponseForAssignment = (assignment: EvaluationAssignment) => {
    if (!assignment.responseId || !responses) return null;
    return responses.find(r => r.id === assignment.responseId) || null;
  };

  const openDetail = (assignment: EvaluationAssignment) => {
    setSelectedAssignment(assignment);
    setDetailDialogOpen(true);
  };

  const statusBadge = (assignment: EvaluationAssignment | null, clickable: boolean) => {
    if (!assignment) return <span className="text-xs text-muted-foreground">-</span>;
    const status = assignment.status;
    if (status === "completed") {
      const badge = (
        <Badge className={`bg-green-100 text-green-700 text-xs ${clickable ? "cursor-pointer hover:bg-green-200" : ""}`}>
          <CheckCircle className="w-3 h-3 mr-1" />Fait
        </Badge>
      );
      return clickable ? <button type="button" onClick={() => openDetail(assignment)}>{badge}</button> : badge;
    }
    if (status === "sent") return <Badge className="bg-blue-100 text-blue-700 text-xs"><Mail className="w-3 h-3 mr-1" />Envoye</Badge>;
    if (status === "pending") return <Badge className="bg-yellow-100 text-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />Programme</Badge>;
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  // Detail dialog data
  const detailResponse = selectedAssignment ? getResponseForAssignment(selectedAssignment) : null;
  const detailTemplate = selectedAssignment ? templates?.find(t => t.id === selectedAssignment.templateId) : null;
  const detailTrainee = selectedAssignment?.traineeId ? trainees?.find(t => t.id === selectedAssignment.traineeId) : null;
  const detailQuestions = (detailTemplate?.questions as Array<{ question: string; type: string; options?: string[] }>) || [];
  const detailSections = (detailTemplate?.sections as Array<{ title: string; type: string; questionIndices: number[]; coefficient?: number }>) || [];
  const detailAnswers = (detailResponse?.answers as Array<{ questionIndex: number; answer: string | number }>) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1 flex-1 max-w-xs">
          <Label className="text-sm">Session</Label>
          <Select value={selectedSession || "all"} onValueChange={(v) => setSelectedSession(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner une session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sessions</SelectItem>
              {sessions?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedSession ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Selectionnez une session</h3>
          <p className="text-sm text-muted-foreground">Choisissez une session pour voir et gerer les evaluations</p>
        </div>
      ) : (
        <>
          {/* Stats cards per evaluation type */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statsPerType.map((stat) => (
              <Card key={stat.evalType} className="p-3">
                <p className="text-xs font-medium text-muted-foreground truncate">{stat.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold">{stat.completed}/{stat.total}</span>
                  <span className="text-xs text-muted-foreground">({stat.rate}%)</span>
                </div>
                {stat.avgScore !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">{stat.avgScore}/5</span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Batch send buttons */}
          <div className="flex flex-wrap gap-2">
            {EVALUATION_TYPES.map((et) => (
              <Button
                key={et.value}
                variant="outline"
                size="sm"
                onClick={() => batchMutation.mutate({ evaluationType: et.value })}
                disabled={batchMutation.isPending}
              >
                <Send className="w-3 h-3 mr-1" />
                Envoyer: {et.label.split("(")[0].trim()}
              </Button>
            ))}
          </div>

          {/* Matrix */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : activeEnrollments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun stagiaire inscrit dans cette session</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Stagiaire</TableHead>
                      {EVALUATION_TYPES.map((et) => (
                        <TableHead key={et.value} className="text-center text-xs whitespace-nowrap">
                          {et.label.split("(")[0].trim().replace("Évaluation ", "").replace("Satisfaction ", "Sat. ")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEnrollments.map((enrollment: any) => {
                      const trainee = trainees?.find(t => t.id === enrollment.traineeId);
                      if (!trainee) return null;
                      return (
                        <TableRow key={enrollment.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium whitespace-nowrap">
                            {trainee.firstName} {trainee.lastName}
                          </TableCell>
                          {evalTypes.map((evalType) => {
                            const assignment = getAssignmentForCell(enrollment.traineeId, evalType);
                            return (
                              <TableCell key={evalType} className="text-center">
                                {statusBadge(assignment, true)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Response detail dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedAssignment(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTemplate?.title || "Detail de l'evaluation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Info bar */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              {detailTrainee && (
                <p><strong>Stagiaire :</strong> {detailTrainee.firstName} {detailTrainee.lastName}</p>
              )}
              {detailResponse?.respondentName && (
                <p><strong>Repondant :</strong> {detailResponse.respondentName} ({detailResponse.respondentType})</p>
              )}
              {detailResponse?.createdAt && (
                <p><strong>Soumise le :</strong> {new Date(detailResponse.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              )}
              {detailResponse?.rating != null && (
                <p className="flex items-center gap-1">
                  <strong>Note :</strong>
                  <StarRating rating={detailResponse.rating} />
                </p>
              )}
              {detailResponse?.weightedScore != null && (
                <p><strong>Score pondere :</strong> {detailResponse.weightedScore}/5</p>
              )}
            </div>

            {/* Answers */}
            {detailSections.length > 0 ? (
              detailSections.map((section, si) => (
                <div key={si} className="space-y-3">
                  <div className="border-b pb-1">
                    <h4 className="font-semibold text-sm">{section.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {section.type === "scored" ? "Partie notee" : "Partie ouverte"}
                      {section.coefficient && section.coefficient !== 1 ? ` — Coefficient: ${section.coefficient}` : ""}
                    </p>
                  </div>
                  {section.questionIndices.map((qi) => {
                    const q = detailQuestions[qi];
                    if (!q) return null;
                    const answer = detailAnswers.find(a => a.questionIndex === qi);
                    return (
                      <div key={qi} className="pl-3 border-l-2 border-muted space-y-1">
                        <p className="text-sm font-medium">{q.question}</p>
                        {answer ? (
                          q.type === "rating" ? (
                            <StarRating rating={answer.answer as number} />
                          ) : (
                            <p className="text-sm text-muted-foreground">{String(answer.answer)}</p>
                          )
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Pas de reponse</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              detailQuestions.map((q, i) => {
                const answer = detailAnswers.find(a => a.questionIndex === i);
                return (
                  <div key={i} className="pl-3 border-l-2 border-muted space-y-1">
                    <p className="text-sm font-medium">{q.question}</p>
                    {answer ? (
                      q.type === "rating" ? (
                        <StarRating rating={answer.answer as number} />
                      ) : (
                        <p className="text-sm text-muted-foreground">{String(answer.answer)}</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Pas de reponse</p>
                    )}
                  </div>
                );
              })
            )}

            {detailResponse?.comments && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-1">Commentaires</p>
                <p className="text-sm text-muted-foreground">{detailResponse.comments}</p>
              </div>
            )}

            {detailResponse && hasPermission("override_survey_responses") && (
              <div className="pt-3 border-t flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    setEvalEditingResponse(detailResponse);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Modifier la reponse
                </Button>
              </div>
            )}

            {!detailResponse && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune reponse trouvee pour cette evaluation.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {evalEditingResponse && (
        <ResponseEditDialog
          response={evalEditingResponse}
          template={templates?.find((t) => t.id === evalEditingResponse.surveyId)}
          open={!!evalEditingResponse}
          onOpenChange={(open) => { if (!open) setEvalEditingResponse(null); }}
        />
      )}
    </div>
  );
}

// ============================================================
// ANALYSE TAB (Section 9.5)
// ============================================================

interface AnalysisComment {
  id: string;
  sessionId: string;
  surveyId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  visibility: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisStats {
  totalResponses: number;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  typeStats: Array<{ type: string; count: number; avgRating: number | null; avgWeighted: number | null }>;
  questionStats: Array<{
    questionIndex: number;
    question: string;
    avgRating: number | null;
    ratingCount: number;
    textResponses: string[];
  }>;
}

function AnalyseTab() {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [commentDialog, setCommentDialog] = useState(false);
  const [editingComment, setEditingComment] = useState<AnalysisComment | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"private" | "public">("private");
  const [commentCategory, setCommentCategory] = useState("analysis");
  const [viewFilter, setViewFilter] = useState<"all" | "private" | "public">("all");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const { data: sessions } = useQuery<Session[]>({ queryKey: ["/api/sessions"] });
  const { data: templates } = useQuery<SurveyTemplate[]>({ queryKey: ["/api/survey-templates"] });

  const { data: stats, isLoading: loadingStats } = useQuery<AnalysisStats>({
    queryKey: ["/api/analysis-stats", selectedSessionId],
    queryFn: () => apiRequest("GET", `/api/analysis-stats?sessionId=${selectedSessionId}`).then(r => r.json()),
    enabled: !!selectedSessionId,
  });

  const { data: comments, isLoading: loadingComments } = useQuery<AnalysisComment[]>({
    queryKey: ["/api/analysis-comments", selectedSessionId, viewFilter],
    queryFn: () => {
      const url = viewFilter === "all"
        ? `/api/analysis-comments?sessionId=${selectedSessionId}`
        : `/api/analysis-comments?sessionId=${selectedSessionId}&visibility=${viewFilter}`;
      return apiRequest("GET", url).then(r => r.json());
    },
    enabled: !!selectedSessionId,
  });

  const { data: responses } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses", { sessionId: selectedSessionId }],
    queryFn: () => apiRequest("GET", `/api/survey-responses?sessionId=${selectedSessionId}`).then(r => r.json()),
    enabled: !!selectedSessionId,
  });

  const createCommentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/analysis-comments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-comments"] });
      setCommentDialog(false);
      setCommentContent("");
      setEditingComment(null);
      toast({ title: "Commentaire ajouté" });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/analysis-comments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-comments"] });
      setCommentDialog(false);
      setCommentContent("");
      setEditingComment(null);
      toast({ title: "Commentaire mis à jour" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/analysis-comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-comments"] });
      toast({ title: "Commentaire supprimé" });
    },
  });

  const handleSaveComment = () => {
    if (!commentContent.trim() || !selectedSessionId) return;
    if (editingComment) {
      updateCommentMutation.mutate({ id: editingComment.id, data: { content: commentContent, visibility: commentVisibility, category: commentCategory } });
    } else {
      createCommentMutation.mutate({ sessionId: selectedSessionId, content: commentContent, visibility: commentVisibility, category: commentCategory });
    }
  };

  const openEditComment = (comment: AnalysisComment) => {
    setEditingComment(comment);
    setCommentContent(comment.content);
    setCommentVisibility(comment.visibility as "private" | "public");
    setCommentCategory(comment.category);
    setCommentDialog(true);
  };

  const openNewComment = (vis: "private" | "public") => {
    setEditingComment(null);
    setCommentContent("");
    setCommentVisibility(vis);
    setCommentCategory("analysis");
    setCommentDialog(true);
  };

  const evalTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      satisfaction: "Satisfaction", satisfaction_hot: "Satisfaction à chaud",
      evaluation_cold: "Évaluation à froid", trainer_eval: "Éval. intervenant",
      manager_eval: "Éval. manager", commissioner_eval: "Éval. commanditaire",
      trainee: "Stagiaire", feedback: "Retour formateur",
    };
    return map[type] || type;
  };

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = { analysis: "Analyse", improvement: "Amélioration", observation: "Observation" };
    return map[cat] || cat;
  };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      analysis: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      improvement: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      observation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return map[cat] || "bg-gray-100 text-gray-700";
  };

  // Calcul des notes moyennes par question en utilisant le template
  const getQuestionLabel = (questionIndex: number) => {
    if (!templates || !responses || responses.length === 0) return `Question ${questionIndex + 1}`;
    const firstResponse = responses[0];
    const template = templates.find(t => t.id === firstResponse.surveyId);
    if (template?.questions && template.questions[questionIndex]) {
      return template.questions[questionIndex].question;
    }
    return `Question ${questionIndex + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Sélection de session */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap font-medium">Session :</Label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Sélectionner une session à analyser" />
              </SelectTrigger>
              <SelectContent>
                {sessions?.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} ({new Date(s.startDate).toLocaleDateString("fr-FR")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedSessionId && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Sélectionnez une session pour afficher l'analyse post-évaluation</p>
        </div>
      )}

      {selectedSessionId && (
        <>
          {/* KPIs globaux */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Réponses</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-8 w-20" /> : (
                  <div className="text-2xl font-bold">{stats?.totalResponses || 0}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taux complétion</CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-8 w-20" /> : (
                  <div className="text-2xl font-bold">{stats?.completionRate || 0}%</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assignations</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-8 w-20" /> : (
                  <div className="text-2xl font-bold">
                    {stats?.completedAssignments || 0} / {stats?.totalAssignments || 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Types éval.</CardTitle>
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-8 w-20" /> : (
                  <div className="text-2xl font-bold">{stats?.typeStats?.length || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Résultats par type d'évaluation */}
          {stats?.typeStats && stats.typeStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résultats par type d'évaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Réponses</TableHead>
                      <TableHead className="text-center">Note moyenne</TableHead>
                      <TableHead className="text-center">Score pondéré moy.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.typeStats.map(ts => (
                      <TableRow key={ts.type}>
                        <TableCell>
                          <Badge variant="outline">{evalTypeLabel(ts.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{ts.count}</TableCell>
                        <TableCell className="text-center">
                          {ts.avgRating != null ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{ts.avgRating}/5</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {ts.avgWeighted != null ? (
                            <span className="font-medium">{ts.avgWeighted}%</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Analyse par question */}
          {stats?.questionStats && stats.questionStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyse par question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.questionStats.map(qs => (
                  <div key={qs.questionIndex} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{getQuestionLabel(qs.questionIndex)}</p>
                        <div className="flex items-center gap-4 mt-1">
                          {qs.avgRating != null && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{qs.avgRating}/5</span>
                              <span className="text-muted-foreground">({qs.ratingCount} réponses)</span>
                            </div>
                          )}
                          {qs.avgRating != null && (
                            <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 rounded-full transition-all"
                                style={{ width: `${(qs.avgRating / 5) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      {qs.textResponses.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedQuestion(expandedQuestion === qs.questionIndex ? null : qs.questionIndex)}
                        >
                          {expandedQuestion === qs.questionIndex ? "Masquer" : `${qs.textResponses.length} réponse(s)`}
                        </Button>
                      )}
                    </div>
                    {expandedQuestion === qs.questionIndex && qs.textResponses.length > 0 && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        {qs.textResponses.map((text, i) => (
                          <div key={i} className="text-sm bg-muted/50 rounded p-2 italic">"{text}"</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Commentaires d'analyse */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Commentaires d'analyse</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as any)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="private">Privés uniquement</SelectItem>
                      <SelectItem value="public">Publics uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => openNewComment("private")}>
                    <Lock className="w-4 h-4 mr-1" /> Privé
                  </Button>
                  <Button size="sm" onClick={() => openNewComment("public")}>
                    <Globe className="w-4 h-4 mr-1" /> Public
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingComments ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          {c.visibility === "private" ? (
                            <Badge variant="secondary" className="text-xs"><EyeOff className="w-3 h-3 mr-1" />Privé</Badge>
                          ) : (
                            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Eye className="w-3 h-3 mr-1" />Public</Badge>
                          )}
                          <Badge className={`text-xs ${categoryColor(c.category)}`}>{categoryLabel(c.category)}</Badge>
                          <span className="text-xs text-muted-foreground">par {c.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditComment(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCommentMutation.mutate(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun commentaire pour cette session</p>
                  <p className="text-xs mt-1">Les commentaires privés sont réservés à l'équipe interne. Les commentaires publics peuvent être inclus dans les rapports qualité.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog ajout/édition commentaire */}
      <Dialog open={commentDialog} onOpenChange={setCommentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingComment ? "Modifier le commentaire" : "Nouveau commentaire d'analyse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Visibilité</Label>
                <Select value={commentVisibility} onValueChange={(v) => setCommentVisibility(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2"><EyeOff className="w-3.5 h-3.5" /> Privé (interne)</div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Public (rapport qualité)</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Catégorie</Label>
                <Select value={commentCategory} onValueChange={setCommentCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analysis">Analyse</SelectItem>
                    <SelectItem value="improvement">Amélioration</SelectItem>
                    <SelectItem value="observation">Observation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Commentaire</Label>
              <Textarea
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                placeholder={commentVisibility === "private"
                  ? "Commentaire privé (visible uniquement par l'équipe interne)..."
                  : "Commentaire public (pourra être inclus dans les rapports qualité transmis aux commanditaires)..."
                }
                rows={5}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {commentVisibility === "private" ? (
                <><Lock className="w-3.5 h-3.5" /> Ce commentaire ne sera visible que par les administrateurs</>
              ) : (
                <><Globe className="w-3.5 h-3.5" /> Ce commentaire pourra être inclus dans les rapports qualité</>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCommentDialog(false)}>Annuler</Button>
              <Button onClick={handleSaveComment} disabled={!commentContent.trim()}>
                {editingComment ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Surveys() {
  return (
    <PageLayout>
      <PageHeader
        title="Enquêtes"
        subtitle="Enquêtes de satisfaction et d'évaluation"
      />

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
          <TabsTrigger value="evaluations" data-testid="tab-evaluations">
            <ClipboardList className="w-4 h-4 mr-2" />
            Evaluations
          </TabsTrigger>
          <TabsTrigger value="analyse" data-testid="tab-analyse">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analyse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="responses">
          <ResponsesTab />
        </TabsContent>

        <TabsContent value="evaluations">
          <EvaluationsTab />
        </TabsContent>

        <TabsContent value="analyse">
          <AnalyseTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
