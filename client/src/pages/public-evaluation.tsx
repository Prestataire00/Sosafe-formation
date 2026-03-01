import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { CheckCircle, Loader2, Star } from "lucide-react";

interface EvaluationInfo {
  alreadyCompleted: boolean;
  templateTitle: string;
  templateDescription: string;
  questions: Array<{ question: string; type: string; options?: string[] }>;
  sections?: Array<{ title: string; type: "scored" | "open"; questionIndices: number[]; coefficient?: number }>;
  evaluationType: string;
  traineeName: string | null;
  sessionTitle: string;
  respondentName: string;
  respondentType: string;
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PublicEvaluation() {
  const [, params] = useRoute("/evaluation/:token");
  const token = params?.token;

  const { data, isLoading, error } = useQuery<EvaluationInfo>({
    queryKey: [`/api/public/evaluation/${token}`],
    enabled: !!token,
    queryFn: async () => {
      const resp = await fetch(`/api/public/evaluation/${token}`);
      if (!resp.ok) throw new Error("Lien invalide");
      return resp.json();
    },
  });

  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const answersArray = Object.entries(answers).map(([idx, answer]) => ({
        questionIndex: parseInt(idx),
        answer,
      }));

      // Calculate overall rating from numeric answers
      const numericAnswers = answersArray.filter(a => typeof a.answer === "number");
      const avgRating = numericAnswers.length > 0
        ? Math.round(numericAnswers.reduce((s, a) => s + (a.answer as number), 0) / numericAnswers.length)
        : null;

      const resp = await fetch(`/api/public/evaluation/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersArray,
          rating: avgRating,
          comments: null,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message);
      }
      return resp.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  const updateAnswer = (questionIndex: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-medium">Lien d'evaluation invalide ou expire.</p>
            <p className="text-sm text-muted-foreground mt-2">Veuillez contacter votre organisme de formation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.alreadyCompleted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Evaluation enregistree</h2>
            <p className="text-muted-foreground">
              Merci pour votre retour !
            </p>
            <p className="text-xs text-muted-foreground">Vous pouvez fermer cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderQuestion = (q: { question: string; type: string; options?: string[] }, index: number) => {
    return (
      <div key={index} className="space-y-2">
        <Label className="text-sm font-medium">{q.question}</Label>
        {q.type === "rating" && (
          <RatingInput
            value={(answers[index] as number) || 0}
            onChange={(v) => updateAnswer(index, v)}
          />
        )}
        {q.type === "text" && (
          <Textarea
            value={(answers[index] as string) || ""}
            onChange={(e) => updateAnswer(index, e.target.value)}
            placeholder="Votre reponse..."
            rows={3}
          />
        )}
        {q.type === "qcm" && q.options && (
          <RadioGroup
            value={(answers[index] as string) || ""}
            onValueChange={(v) => updateAnswer(index, v)}
          >
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`q${index}-o${oi}`} />
                <Label htmlFor={`q${index}-o${oi}`} className="text-sm">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>
    );
  };

  const hasSections = data.sections && data.sections.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <PageLayout className="max-w-2xl w-full p-0">
        <PageHeader title="Évaluation de formation" subtitle={data.templateTitle} />
        <Card className="w-full">
          <CardContent className="space-y-6 pt-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-sm"><strong>Formation :</strong> {data.sessionTitle}</p>
            {data.traineeName && (
              <p className="text-sm"><strong>Stagiaire :</strong> {data.traineeName}</p>
            )}
            <p className="text-sm"><strong>Repondant :</strong> {data.respondentName}</p>
          </div>

          {hasSections ? (
            data.sections!.map((section, si) => (
              <div key={si} className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-semibold text-base">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {section.type === "scored" ? "Partie notee" : "Partie ouverte"}
                    {section.coefficient && section.coefficient !== 1 ? ` (coefficient: ${section.coefficient})` : ""}
                  </p>
                </div>
                {section.questionIndices.map((qi) => {
                  const q = data.questions[qi];
                  if (!q) return null;
                  return renderQuestion(q, qi);
                })}
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {data.questions.map((q, i) => renderQuestion(q, i))}
            </div>
          )}

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="w-full"
            size="lg"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {submitMutation.isPending ? "Envoi en cours..." : "Soumettre l'evaluation"}
          </Button>

          {submitMutation.isError && (
            <p className="text-sm text-red-600 text-center">
              {(submitMutation.error as Error).message || "Erreur lors de la soumission"}
            </p>
          )}
        </CardContent>
      </Card>
      </PageLayout>
    </div>
  );
}
