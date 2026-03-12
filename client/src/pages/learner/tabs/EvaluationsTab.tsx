import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, CheckCircle, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "../helpers";
import type { SurveyTemplate, EvaluationAssignment } from "@shared/schema";
import { EVALUATION_TYPES } from "@shared/schema";

export function LearnerEvaluationsTab({ traineeId }: { traineeId: string }) {
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluationAssignment | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<EvaluationAssignment[]>({
    queryKey: ["/api/evaluation-assignments", { traineeId }],
    queryFn: async () => {
      const resp = await fetch(`/api/evaluation-assignments?traineeId=${traineeId}`, { credentials: "include" });
      if (!resp.ok) return [];
      return resp.json();
    },
  });

  const { data: templates } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
  });

  const pending = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter((a) => a.status === "sent" || a.status === "pending");
  }, [assignments]);

  const completed = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter((a) => a.status === "completed");
  }, [assignments]);

  const getTemplate = (templateId: string) => templates?.find(t => t.id === templateId);

  const getEvalLabel = (evalType: string | null | undefined) => {
    if (!evalType) return "Evaluation";
    return EVALUATION_TYPES.find(e => e.value === evalType)?.label || evalType;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignment) return;
      const answersArray = Object.entries(answers).map(([idx, answer]) => ({
        questionIndex: parseInt(idx),
        answer,
      }));
      const numericAnswers = answersArray.filter(a => typeof a.answer === "number");
      const avgRating = numericAnswers.length > 0
        ? Math.round(numericAnswers.reduce((s, a) => s + (a.answer as number), 0) / numericAnswers.length)
        : null;

      const template = getTemplate(selectedAssignment.templateId);

      const resp = await fetch("/api/survey-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          surveyId: selectedAssignment.templateId,
          sessionId: selectedAssignment.sessionId,
          traineeId,
          answers: answersArray,
          rating: avgRating,
          respondentType: "trainee",
          evaluationType: template?.evaluationType || null,
          assignmentId: selectedAssignment.id,
        }),
      });
      if (!resp.ok) throw new Error("Erreur");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluation-assignments"] });
      setEvalDialogOpen(false);
      setSelectedAssignment(null);
      setAnswers({});
      toast({ title: "Evaluation soumise avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Evaluations a completer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pending.map((assignment) => {
                const template = getTemplate(assignment.templateId);
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                    <div>
                      <p className="text-sm font-medium">{template?.title || "Evaluation"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEvalLabel(template?.evaluationType)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setAnswers({});
                        setEvalDialogOpen(true);
                      }}
                    >
                      Completer
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Evaluations completees ({completed.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Vous n'avez encore complete aucune evaluation.
            </p>
          ) : (
            <div className="space-y-2">
              {completed.map((assignment) => {
                const template = getTemplate(assignment.templateId);
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{template?.title || "Evaluation"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEvalLabel(template?.evaluationType)}
                        {assignment.completedAt && ` — ${formatDate(new Date(assignment.completedAt).toISOString())}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Completee
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={evalDialogOpen} onOpenChange={(open) => { setEvalDialogOpen(open); if (!open) setSelectedAssignment(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {getTemplate(selectedAssignment?.templateId || "")?.title || "Evaluation"}
            </DialogTitle>
          </DialogHeader>
          {selectedAssignment && (() => {
            const template = getTemplate(selectedAssignment.templateId);
            const questions = (template?.questions as Array<{ question: string; type: string; options?: string[] }>) || [];
            return (
              <div className="space-y-4">
                {template?.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                {questions.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <Label className="text-sm font-medium">{q.question}</Label>
                    {q.type === "rating" && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setAnswers(prev => ({ ...prev, [i]: star }))}>
                            <Star className={`w-6 h-6 ${star <= ((answers[i] as number) || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === "text" && (
                      <Textarea
                        value={(answers[i] as string) || ""}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="Votre reponse..."
                        rows={3}
                      />
                    )}
                    {q.type === "qcm" && q.options && (
                      <RadioGroup
                        value={(answers[i] as string) || ""}
                        onValueChange={(v) => setAnswers(prev => ({ ...prev, [i]: v }))}
                      >
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`eval-q${i}-o${oi}`} />
                            <Label htmlFor={`eval-q${i}-o${oi}`} className="text-sm">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="w-full"
                >
                  {submitMutation.isPending ? "Envoi..." : "Soumettre l'evaluation"}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
