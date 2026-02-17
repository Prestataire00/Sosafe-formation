import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Plus,
  Search,
  BookOpen,
  Pencil,
  Trash2,
  GripVertical,
  FileText,
  Video,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ElearningModule,
  ElearningBlock,
  QuizQuestion,
  Session,
  Program,
} from "@shared/schema";
import { ELEARNING_BLOCK_TYPES } from "@shared/schema";

// ============================================================
// STATUS HELPERS
// ============================================================

const MODULE_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
];

function ModuleStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-accent text-accent-foreground",
    published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    archived: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {};
  MODULE_STATUSES.forEach((s) => { labels[s.value] = s.label; });
  return <Badge variant="outline" className={variants[status] || ""}>{labels[status] || status}</Badge>;
}

function BlockTypeIcon({ type }: { type: string }) {
  if (type === "video") return <Video className="w-4 h-4 text-blue-500" />;
  if (type === "quiz") return <HelpCircle className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function BlockTypeLabel({ type }: { type: string }) {
  const found = ELEARNING_BLOCK_TYPES.find((t) => t.value === type);
  return <span className="text-xs text-muted-foreground">{found?.label || type}</span>;
}

// ============================================================
// MODULE FORM
// ============================================================

function ModuleForm({
  module,
  programs,
  sessions,
  onSubmit,
  isPending,
}: {
  module?: ElearningModule;
  programs: Program[];
  sessions: Session[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(module?.title || "");
  const [description, setDescription] = useState(module?.description || "");
  const [programId, setProgramId] = useState(module?.programId || "");
  const [sessionId, setSessionId] = useState(module?.sessionId || "");
  const [status, setStatus] = useState(module?.status || "draft");
  const [orderIndex, setOrderIndex] = useState(module?.orderIndex?.toString() || "0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      programId: programId || null,
      sessionId: sessionId || null,
      status,
      orderIndex: parseInt(orderIndex) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="module-title">Titre du module</Label>
        <Input
          id="module-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Introduction aux gestes d'urgence"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-description">Description</Label>
        <Textarea
          id="module-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description du module..."
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Formation</Label>
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Session</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODULE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-order">Ordre</Label>
          <Input
            id="module-order"
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            min="0"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : module ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// BLOCK FORM
// ============================================================

function BlockForm({
  block,
  moduleId,
  onSubmit,
  isPending,
}: {
  block?: ElearningBlock;
  moduleId: string;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState(block?.type || "text");
  const [title, setTitle] = useState(block?.title || "");
  const [content, setContent] = useState(block?.content || "");
  const [videoUrl, setVideoUrl] = useState(block?.videoUrl || "");
  const [orderIndex, setOrderIndex] = useState(block?.orderIndex?.toString() || "0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      moduleId,
      type,
      title,
      content: type === "text" ? content : null,
      videoUrl: type === "video" ? videoUrl : null,
      orderIndex: parseInt(orderIndex) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type de bloc</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ELEARNING_BLOCK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="block-title">Titre du bloc</Label>
        <Input
          id="block-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Les bases du secourisme"
          required
        />
      </div>
      {type === "text" && (
        <div className="space-y-2">
          <Label htmlFor="block-content">Contenu texte</Label>
          <Textarea
            id="block-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Saisissez le contenu du bloc texte..."
            className="resize-none min-h-[120px]"
          />
        </div>
      )}
      {type === "video" && (
        <div className="space-y-2">
          <Label htmlFor="block-video">URL de la vidéo</Label>
          <Input
            id="block-video"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )}
      {type === "quiz" && (
        <p className="text-sm text-muted-foreground">
          Les questions du quiz pourront être ajoutées après la création du bloc.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="block-order">Ordre</Label>
        <Input
          id="block-order"
          type="number"
          value={orderIndex}
          onChange={(e) => setOrderIndex(e.target.value)}
          min="0"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : block ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// QUIZ QUESTION BUILDER
// ============================================================

function QuizQuestionBuilder({ blockId }: { blockId: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<QuizQuestion | undefined>();

  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz-questions", `?blockId=${blockId}`],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/quiz-questions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-questions"] });
      setDialogOpen(false);
      toast({ title: "Question ajoutée" });
    },
    onError: () => toast({ title: "Erreur lors de l'ajout", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/quiz-questions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-questions"] });
      setDialogOpen(false);
      setEditQuestion(undefined);
      toast({ title: "Question modifiée" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quiz-questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-questions"] });
      toast({ title: "Question supprimée" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">Questions du quiz</h5>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setEditQuestion(undefined); setDialogOpen(true); }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Ajouter
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : !questions || questions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune question pour ce quiz.</p>
      ) : (
        <div className="space-y-2">
          {questions
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((q, idx) => (
              <div key={q.id} className="flex items-start gap-2 p-2 rounded-md bg-accent/30">
                <span className="text-xs font-medium text-muted-foreground mt-0.5">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {q.type === "vrai_faux" ? "Vrai/Faux" : "QCM"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(q.options as string[])?.length || 0} options
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditQuestion(q); setDialogOpen(true); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteMutation.mutate(q.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditQuestion(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editQuestion ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
          </DialogHeader>
          <QuizQuestionForm
            question={editQuestion}
            blockId={blockId}
            onSubmit={(data) =>
              editQuestion
                ? updateMutation.mutate({ id: editQuestion.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// QUIZ QUESTION FORM
// ============================================================

function QuizQuestionForm({
  question,
  blockId,
  onSubmit,
  isPending,
}: {
  question?: QuizQuestion;
  blockId: string;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [questionText, setQuestionText] = useState(question?.question || "");
  const [type, setType] = useState(question?.type || "qcm");
  const [options, setOptions] = useState<string[]>(
    question?.options
      ? (question.options as string[])
      : type === "vrai_faux"
        ? ["Vrai", "Faux"]
        : ["", "", ""]
  );
  const [correctAnswer, setCorrectAnswer] = useState(question?.correctAnswer?.toString() || "0");
  const [orderIndex, setOrderIndex] = useState(question?.orderIndex?.toString() || "0");

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === "vrai_faux") {
      setOptions(["Vrai", "Faux"]);
      setCorrectAnswer("0");
    } else if (options.length < 2) {
      setOptions(["", "", ""]);
    }
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const newOpts = options.filter((_, i) => i !== index);
    setOptions(newOpts);
    const ca = parseInt(correctAnswer);
    if (ca >= newOpts.length) setCorrectAnswer((newOpts.length - 1).toString());
    else if (ca > index) setCorrectAnswer((ca - 1).toString());
  };

  const updateOption = (index: number, value: string) => {
    const newOpts = [...options];
    newOpts[index] = value;
    setOptions(newOpts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      blockId,
      question: questionText,
      type,
      options,
      correctAnswer: parseInt(correctAnswer) || 0,
      orderIndex: parseInt(orderIndex) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="question-text">Question</Label>
        <Textarea
          id="question-text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Saisissez la question..."
          className="resize-none"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de question</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="qcm">QCM</SelectItem>
              <SelectItem value="vrai_faux">Vrai / Faux</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-order">Ordre</Label>
          <Input
            id="question-order"
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            min="0"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Options de réponse</Label>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctAnswer"
                checked={parseInt(correctAnswer) === idx}
                onChange={() => setCorrectAnswer(idx.toString())}
                className="accent-primary"
              />
              <Input
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                disabled={type === "vrai_faux"}
                className="flex-1"
              />
              {type === "qcm" && options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeOption(idx)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Sélectionnez le bouton radio pour indiquer la bonne réponse.
        </p>
        {type === "qcm" && (
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="w-3 h-3 mr-1" />
            Ajouter une option
          </Button>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : question ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// BLOCK LIST INSIDE MODULE
// ============================================================

function ModuleBlocks({ moduleId }: { moduleId: string }) {
  const { toast } = useToast();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<ElearningBlock | undefined>();

  const { data: blocks, isLoading } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${moduleId}`],
  });

  const createBlockMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/elearning-blocks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
      setBlockDialogOpen(false);
      toast({ title: "Bloc créé avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création du bloc", variant: "destructive" }),
  });

  const updateBlockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/elearning-blocks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
      setBlockDialogOpen(false);
      setEditBlock(undefined);
      toast({ title: "Bloc modifié avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/elearning-blocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
      toast({ title: "Bloc supprimé" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const reorderBlockMutation = useMutation({
    mutationFn: ({ id, orderIndex }: { id: string; orderIndex: number }) =>
      apiRequest("PATCH", `/api/elearning-blocks/${id}`, { orderIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
    },
  });

  const sortedBlocks = blocks?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [];

  const moveBlock = (block: ElearningBlock, direction: "up" | "down") => {
    const idx = sortedBlocks.findIndex((b) => b.id === block.id);
    if (direction === "up" && idx > 0) {
      const other = sortedBlocks[idx - 1];
      reorderBlockMutation.mutate({ id: block.id, orderIndex: other.orderIndex });
      reorderBlockMutation.mutate({ id: other.id, orderIndex: block.orderIndex });
    } else if (direction === "down" && idx < sortedBlocks.length - 1) {
      const other = sortedBlocks[idx + 1];
      reorderBlockMutation.mutate({ id: block.id, orderIndex: other.orderIndex });
      reorderBlockMutation.mutate({ id: other.id, orderIndex: block.orderIndex });
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Blocs du module</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setEditBlock(undefined); setBlockDialogOpen(true); }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Nouveau bloc
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sortedBlocks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun bloc dans ce module. Ajoutez du contenu texte, vidéo ou quiz.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedBlocks.map((block, idx) => (
            <Card key={block.id} className="border">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === 0}
                      onClick={() => moveBlock(block, "up")}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === sortedBlocks.length - 1}
                      onClick={() => moveBlock(block, "down")}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BlockTypeIcon type={block.type} />
                      <span className="text-sm font-medium truncate">{block.title}</span>
                      <BlockTypeLabel type={block.type} />
                    </div>
                    {block.type === "text" && block.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{block.content}</p>
                    )}
                    {block.type === "video" && block.videoUrl && (
                      <p className="text-xs text-blue-500 truncate">{block.videoUrl}</p>
                    )}
                    {block.type === "quiz" && (
                      <QuizQuestionBuilder blockId={block.id} />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditBlock(block); setBlockDialogOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteBlockMutation.mutate(block.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={blockDialogOpen} onOpenChange={(open) => { setBlockDialogOpen(open); if (!open) setEditBlock(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBlock ? "Modifier le bloc" : "Nouveau bloc"}</DialogTitle>
          </DialogHeader>
          <BlockForm
            block={editBlock}
            moduleId={moduleId}
            onSubmit={(data) =>
              editBlock
                ? updateBlockMutation.mutate({ id: editBlock.id, data })
                : createBlockMutation.mutate(data)
            }
            isPending={createBlockMutation.isPending || updateBlockMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Elearning() {
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editModule, setEditModule] = useState<ElearningModule | undefined>();
  const { toast } = useToast();

  const { data: modules, isLoading } = useQuery<ElearningModule[]>({
    queryKey: ["/api/elearning-modules"],
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const createModuleMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/elearning-modules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      setModuleDialogOpen(false);
      toast({ title: "Module créé avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/elearning-modules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      setModuleDialogOpen(false);
      setEditModule(undefined);
      toast({ title: "Module modifié avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/elearning-modules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      toast({ title: "Module supprimé" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered = modules
    ?.filter((m) => {
      const matchesSearch =
        search === "" ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesSession =
        sessionFilter === "all" || m.sessionId === sessionFilter;
      return matchesSearch && matchesSession;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">E-Learning / LMS</h1>
          <p className="text-muted-foreground mt-1">Gérez vos modules et contenus de formation en ligne</p>
        </div>
        <Button onClick={() => { setEditModule(undefined); setModuleDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau module
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrer par session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sessions</SelectItem>
            {sessions?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun module e-learning</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || sessionFilter !== "all"
              ? "Aucun résultat pour vos filtres"
              : "Créez votre premier module de formation en ligne"}
          </p>
          {!search && sessionFilter === "all" && (
            <Button onClick={() => setModuleDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un module
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Accordion type="multiple" className="w-full">
              {filtered.map((mod) => {
                const session = sessions?.find((s) => s.id === mod.sessionId);
                const program = programs?.find((p) => p.id === mod.programId);
                return (
                  <AccordionItem key={mod.id} value={mod.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                        <span className="text-xs font-mono text-muted-foreground w-6">
                          #{mod.orderIndex}
                        </span>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{mod.title}</span>
                            <ModuleStatusBadge status={mod.status} />
                          </div>
                          {mod.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {mod.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {program && (
                              <span className="text-xs text-muted-foreground">
                                Formation : {program.title}
                              </span>
                            )}
                            {session && (
                              <span className="text-xs text-muted-foreground">
                                Session : {session.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditModule(mod); setModuleDialogOpen(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteModuleMutation.mutate(mod.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ModuleBlocks moduleId={mod.id} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Dialog open={moduleDialogOpen} onOpenChange={(open) => { setModuleDialogOpen(open); if (!open) setEditModule(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editModule ? "Modifier le module" : "Nouveau module"}</DialogTitle>
          </DialogHeader>
          <ModuleForm
            module={editModule}
            programs={programs || []}
            sessions={sessions || []}
            onSubmit={(data) => {
              const cleanData = {
                ...data,
                programId: data.programId === "none" ? null : data.programId,
                sessionId: data.sessionId === "none" ? null : data.sessionId,
              };
              editModule
                ? updateModuleMutation.mutate({ id: editModule.id, data: cleanData })
                : createModuleMutation.mutate(cleanData);
            }}
            isPending={createModuleMutation.isPending || updateModuleMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
