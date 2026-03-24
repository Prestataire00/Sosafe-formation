import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  Trash2,
  Play,
  GripVertical,
  Timer,
  CheckCircle,
  Zap,
  Copy,
  ExternalLink,
  ListOrdered,
  Edit2,
  Trophy,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Program } from "@shared/schema";

// ============================================================
// Types
// ============================================================

interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  order: number;
  imageUrl?: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  programId?: string;
  createdAt: string;
  questions?: QuizQuestion[];
}

interface QuizSession {
  id: string;
  quizId: string;
  code: string;
  status: string;
  currentQuestionIndex: number;
  createdAt: string;
}

// ============================================================
// Question Editor
// ============================================================

function QuestionEditor({
  quizId,
  question,
  onClose,
}: {
  quizId: string;
  question?: QuizQuestion;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState(question?.question || "");
  const [options, setOptions] = useState<string[]>(question?.options || ["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(question?.correctAnswer ?? 0);
  const [timeLimit, setTimeLimit] = useState(question?.timeLimit ?? 20);
  const [points, setPoints] = useState(question?.points ?? 100);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        question: text,
        options: options.filter((o) => o.trim()),
        correctAnswer,
        timeLimit,
        points,
        order: question?.order ?? 0,
      };
      if (question) {
        return apiRequest("PATCH", `/api/quiz-questions/${question.id}`, data);
      }
      return apiRequest("POST", `/api/quizzes/${quizId}/questions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({ title: question ? "Question modifiee" : "Question ajoutee" });
      onClose();
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (idx: number) => {
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    if (correctAnswer >= next.length) setCorrectAnswer(0);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quelle est la premiere etape du PLS ?"
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Reponses</Label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={correctAnswer === idx ? "default" : "outline"}
              className={`h-8 w-8 p-0 shrink-0 ${correctAnswer === idx ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={() => setCorrectAnswer(idx)}
              title="Marquer comme bonne reponse"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[idx] = e.target.value;
                setOptions(next);
              }}
              placeholder={`Reponse ${idx + 1}`}
            />
            {options.length > 2 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0 text-red-500"
                onClick={() => removeOption(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter une reponse
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" /> Temps (secondes)
          </Label>
          <Input
            type="number"
            min={5}
            max={120}
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 20)}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Points
          </Label>
          <Input
            type="number"
            min={10}
            max={1000}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 100)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !text.trim() || options.filter((o) => o.trim()).length < 2}
        >
          {saveMutation.isPending ? "Enregistrement..." : question ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Quiz Detail (with questions)
// ============================================================

function QuizDetail({ quizId, onBack }: { quizId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [questionDialog, setQuestionDialog] = useState<{ open: boolean; question?: QuizQuestion }>({ open: false });
  const [startSessionDialog, setStartSessionDialog] = useState(false);
  const [linkedSessionId, setLinkedSessionId] = useState("");

  const { data: quizData } = useQuery<Quiz & { questions: QuizQuestion[] }>({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => {
      const resp = await fetch(`/api/quizzes/${quizId}`, { credentials: "include" });
      return resp.json();
    },
  });

  const { data: programs } = useQuery<Program[]>({ queryKey: ["/api/programs"] });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quiz-questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({ title: "Question supprimee" });
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/quiz-sessions", {
        quizId,
        sessionId: linkedSessionId || null,
      });
      return resp.json();
    },
    onSuccess: (data) => {
      setStartSessionDialog(false);
      // Navigate to presenter view
      window.open(`/quiz/presenter/${data.id}`, "_blank");
      toast({ title: `Session lancee ! Code: ${data.code}` });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const { data: sessions } = useQuery<any[]>({ queryKey: ["/api/sessions"] });

  const questions = quizData?.questions || [];
  const programName = programs?.find((p) => p.id === quizData?.programId)?.title;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            &larr; Retour
          </Button>
          <h2 className="text-xl font-bold">{quizData?.title}</h2>
          {quizData?.description && <p className="text-sm text-muted-foreground">{quizData.description}</p>}
          {programName && <Badge variant="secondary" className="mt-1">{programName}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setStartSessionDialog(true)} disabled={questions.length === 0}>
            <Play className="w-4 h-4 mr-2" /> Lancer un quiz
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="w-4 h-4" /> Questions ({questions.length})
            </CardTitle>
            <Button size="sm" onClick={() => setQuestionDialog({ open: true })}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              title="Aucune question"
              description="Ajoutez des questions pour creer votre quiz."
            />
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 pt-0.5">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs font-mono">{idx + 1}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{q.question}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {q.options.map((opt, optIdx) => (
                        <Badge
                          key={optIdx}
                          variant={optIdx === q.correctAnswer ? "default" : "outline"}
                          className={`text-xs ${optIdx === q.correctAnswer ? "bg-green-600" : ""}`}
                        >
                          {opt}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {q.timeLimit}s</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {q.points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setQuestionDialog({ open: true, question: q })}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500"
                      onClick={() => deleteQuestionMutation.mutate(q.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past sessions */}
      <QuizSessionHistory quizId={quizId} />

      {/* Question dialog */}
      <Dialog open={questionDialog.open} onOpenChange={(open) => { if (!open) setQuestionDialog({ open: false }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{questionDialog.question ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
          </DialogHeader>
          <QuestionEditor
            quizId={quizId}
            question={questionDialog.question}
            onClose={() => setQuestionDialog({ open: false })}
          />
        </DialogContent>
      </Dialog>

      {/* Start session dialog */}
      <Dialog open={startSessionDialog} onOpenChange={setStartSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lancer un quiz en direct</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Associer a une session de formation (optionnel)</Label>
              <Select value={linkedSessionId} onValueChange={setLinkedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {sessions?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} ({new Date(s.startDate).toLocaleDateString("fr-FR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Un code a 6 chiffres sera genere. Les participants pourront rejoindre via ce code.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStartSessionDialog(false)}>Annuler</Button>
              <Button onClick={() => startSessionMutation.mutate()} disabled={startSessionMutation.isPending}>
                <Play className="w-4 h-4 mr-2" />
                {startSessionMutation.isPending ? "Lancement..." : "Lancer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Quiz Session History
// ============================================================

function QuizSessionHistory({ quizId }: { quizId: string }) {
  const { data: sessionsData } = useQuery<QuizSession[]>({
    queryKey: ["/api/quiz-sessions", `?quizId=${quizId}`],
    queryFn: async () => {
      const resp = await fetch(`/api/quiz-sessions?quizId=${quizId}`, { credentials: "include" });
      return resp.json();
    },
  });

  if (!sessionsData || sessionsData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Sessions passees
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sessionsData.map((qs) => (
            <div key={qs.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Code: {qs.code}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(qs.createdAt).toLocaleDateString("fr-FR")} — {new Date(qs.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={qs.status === "finished" ? "secondary" : qs.status === "waiting" ? "outline" : "default"}>
                  {qs.status === "finished" ? "Termine" : qs.status === "waiting" ? "En attente" : "En cours"}
                </Badge>
                {qs.status !== "finished" && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`/quiz/presenter/${qs.id}`, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ouvrir
                  </Button>
                )}
                {qs.status === "finished" && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`/quiz/presenter/${qs.id}`, "_blank")}>
                    <Trophy className="w-3.5 h-3.5 mr-1" /> Resultats
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Quiz Manager Page
// ============================================================

export default function QuizManager() {
  const { toast } = useToast();
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProgramId, setNewProgramId] = useState("");

  const { data: quizzesData } = useQuery<Quiz[]>({ queryKey: ["/api/quizzes"] });
  const { data: programs } = useQuery<Program[]>({ queryKey: ["/api/programs"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/quizzes", {
        title: newTitle,
        description: newDescription || null,
        programId: newProgramId || null,
      });
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setCreateDialog(false);
      setNewTitle("");
      setNewDescription("");
      setNewProgramId("");
      setSelectedQuizId(data.id);
      toast({ title: "Quiz cree" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quizzes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({ title: "Quiz supprime" });
    },
  });

  if (selectedQuizId) {
    return (
      <PageLayout>
        <QuizDetail quizId={selectedQuizId} onBack={() => setSelectedQuizId(null)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Quiz & Autopositionnement"
        subtitle="Creez des quiz interactifs style Kahoot pour vos formations"
      />

      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau quiz
        </Button>
      </div>

      {!quizzesData || quizzesData.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Aucun quiz"
          description="Creez votre premier quiz interactif pour animer vos formations."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzesData.map((quiz) => {
            const program = programs?.find((p) => p.id === quiz.programId);
            return (
              <Card
                key={quiz.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedQuizId(quiz.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{quiz.title}</h3>
                      {quiz.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quiz.description}</p>
                      )}
                      {program && (
                        <Badge variant="secondary" className="mt-2 text-xs">{program.title}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Cree le {new Date(quiz.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Supprimer ce quiz ?")) deleteMutation.mutate(quiz.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Quiz AFGSU Niveau 1" />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Test d'autopositionnement..." />
            </div>
            <div className="space-y-2">
              <Label>Programme associe (optionnel)</Label>
              <Select value={newProgramId} onValueChange={setNewProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {programs?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Annuler</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newTitle.trim()}>
                {createMutation.isPending ? "Creation..." : "Creer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
