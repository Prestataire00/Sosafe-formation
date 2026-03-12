import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Download } from "lucide-react";
import type { ElearningBlock, LearnerProgress, FormativeSubmission } from "@shared/schema";

export function AssignmentSubmitter({
  block,
  traineeId,
  moduleId,
  existingProgress,
}: {
  block: ElearningBlock;
  traineeId: string;
  moduleId: string;
  existingProgress?: LearnerProgress;
}) {
  const { toast } = useToast();
  const config = (block.assignmentConfig as any) || {};
  const instructions = config.instructions || block.content || "";
  const allowText = config.allowText ?? true;
  const allowFile = config.allowFile ?? true;

  const [textContent, setTextContent] = useState("");
  const [fileData, setFileData] = useState<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existingSubmission } = useQuery<FormativeSubmission[]>({
    queryKey: ["/api/formative-submissions", { blockId: block.id, traineeId }],
    queryFn: async () => {
      const resp = await fetch(`/api/formative-submissions?blockId=${block.id}&traineeId=${traineeId}`, { credentials: "include" });
      return resp.json();
    },
  });

  const submission = existingSubmission?.[0];

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/formative-submissions", {
        blockId: block.id,
        moduleId,
        traineeId,
        textContent: allowText ? textContent : null,
        fileUrl: fileData?.fileUrl || null,
        fileName: fileData?.fileName || null,
        fileSize: fileData?.fileSize || null,
        mimeType: fileData?.mimeType || null,
      });
      await apiRequest("POST", "/api/learner-progress", {
        traineeId,
        moduleId,
        blockId: block.id,
        completed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formative-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learner-progress"] });
      toast({ title: "Soumission envoyee" });
    },
    onError: () => toast({ title: "Erreur lors de la soumission", variant: "destructive" }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFileData(result);
    } catch {
      toast({ title: "Erreur de telechargement", variant: "destructive" });
    }
    setUploading(false);
  };

  if (submission) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Soumission envoyee</span>
          <Badge variant="outline" className="text-xs ml-2">
            {submission.status === "graded" ? "Note" : submission.status === "reviewing" ? "En revue" : "Soumis"}
          </Badge>
        </div>
        {submission.textContent && (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm">{submission.textContent}</p>
          </div>
        )}
        {submission.fileName && (
          <a href={submission.fileUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center gap-1">
            <Download className="w-3 h-3" />{submission.fileName}
          </a>
        )}
        {submission.status === "graded" && submission.grade != null && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-1">
            <p className="text-sm font-medium">Note : {submission.grade}/100</p>
            {submission.feedback && <p className="text-sm text-muted-foreground">{submission.feedback}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm">{instructions}</p>
        </div>
      )}
      {allowText && (
        <div className="space-y-2">
          <Label className="text-sm">Votre reponse</Label>
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Saisissez votre reponse ici..."
            rows={5}
          />
        </div>
      )}
      {allowFile && (
        <div className="space-y-2">
          <Label className="text-sm">Deposer un fichier</Label>
          <Input type="file" onChange={handleFileUpload} disabled={uploading} />
          {uploading && <p className="text-xs text-muted-foreground">Telechargement en cours...</p>}
          {fileData && <p className="text-xs text-green-600">Fichier telecharge: {fileData.fileName}</p>}
        </div>
      )}
      <Button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || (!textContent && !fileData)}
        className="w-full"
      >
        {submitMutation.isPending ? "Envoi en cours..." : "Soumettre"}
      </Button>
    </div>
  );
}
