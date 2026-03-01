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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
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
  Package,
  ClipboardCheck,
  Upload,
  Link,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  CheckCircle,
  Clock,
  MessageSquare,
  Sparkles,
  Layers,
  Globe,
  MonitorPlay,
  Image,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ElearningModule,
  ElearningBlock,
  QuizQuestion,
  Session,
  Program,
  SessionResource,
  ScormPackage,
  FormativeSubmission,
  Trainee,
} from "@shared/schema";
import { ELEARNING_BLOCK_TYPES, DEFAULT_QUIZ_QUESTIONS } from "@shared/schema";
import { uploadFile } from "@/lib/queryClient";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

// ============================================================
// STATUS HELPERS
// ============================================================

const MODULE_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
];

function ModuleStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {};
  MODULE_STATUSES.forEach((s) => { labels[s.value] = s.label; });
  return <StatusBadge status={status} label={labels[status] || status} />;
}

function BlockTypeIcon({ type }: { type: string }) {
  if (type === "video") return <Video className="w-4 h-4 text-blue-500" />;
  if (type === "quiz") return <HelpCircle className="w-4 h-4 text-amber-500" />;
  if (type === "video_quiz") return <Video className="w-4 h-4 text-purple-500" />;
  if (type === "scorm") return <Package className="w-4 h-4 text-teal-500" />;
  if (type === "assignment") return <ClipboardCheck className="w-4 h-4 text-orange-500" />;
  if (type === "flashcard") return <Layers className="w-4 h-4 text-pink-500" />;
  if (type === "resource_web") return <Globe className="w-4 h-4 text-indigo-500" />;
  if (type === "virtual_class") return <MonitorPlay className="w-4 h-4 text-emerald-500" />;
  if (type === "document") return <Download className="w-4 h-4 text-sky-500" />;
  if (type === "image") return <Image className="w-4 h-4 text-rose-500" />;
  if (type === "survey") return <BarChart3 className="w-4 h-4 text-violet-500" />;
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

  // Quiz config
  const existingConfig = (block?.quizConfig as any) || {};
  const [timerSeconds, setTimerSeconds] = useState(existingConfig.timerSeconds?.toString() || "");
  const [showOneAtATime, setShowOneAtATime] = useState(existingConfig.showOneAtATime ?? true);
  const [passingScore, setPassingScore] = useState(existingConfig.passingScore?.toString() || "70");
  const [allowRetry, setAllowRetry] = useState(existingConfig.allowRetry ?? false);

  // SCORM
  const [scormPackageId, setScormPackageId] = useState(block?.scormPackageId || "");
  const { data: scormPackages } = useQuery<ScormPackage[]>({
    queryKey: ["/api/scorm-packages"],
    enabled: type === "scorm",
  });

  // Assignment config
  const existingAssignment = (block?.assignmentConfig as any) || {};
  const [assignInstructions, setAssignInstructions] = useState(existingAssignment.instructions || "");
  const [allowText, setAllowText] = useState(existingAssignment.allowText ?? true);
  const [allowFile, setAllowFile] = useState(existingAssignment.allowFile ?? true);

  // Flashcards
  const existingFlashcards = (block?.flashcards as Array<{ front: string; back: string }>) || [];
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string }>>(
    existingFlashcards.length > 0 ? existingFlashcards : [{ front: "", back: "" }]
  );

  // Resource web (iframe)
  const [embedUrl, setEmbedUrl] = useState((block as any)?.embedUrl || "");
  const [embedCode, setEmbedCode] = useState((block as any)?.embedCode || "");

  // Virtual class
  const [virtualClassUrl, setVirtualClassUrl] = useState((block as any)?.virtualClassUrl || "");
  const [virtualClassDate, setVirtualClassDate] = useState((block as any)?.virtualClassDate || "");

  // Document
  const [fileUrl, setFileUrl] = useState((block as any)?.fileUrl || "");
  const [fileName, setFileName] = useState((block as any)?.fileName || "");

  // Image / gallery
  const [imageUrls, setImageUrls] = useState<string[]>(
    ((block as any)?.imageUrls as string[]) || [""]
  );

  // Activity config (Digiforma-style)
  const [duration, setDuration] = useState((block as any)?.duration?.toString() || "");
  const [completionCondition, setCompletionCondition] = useState((block as any)?.completionCondition || "finished");
  const [minScore, setMinScore] = useState((block as any)?.minScore?.toString() || "");
  const [minViewPercent, setMinViewPercent] = useState((block as any)?.minViewPercent?.toString() || "");

  const addFlashcard = () => setFlashcards([...flashcards, { front: "", back: "" }]);
  const removeFlashcard = (idx: number) => {
    if (flashcards.length <= 1) return;
    setFlashcards(flashcards.filter((_, i) => i !== idx));
  };
  const updateFlashcard = (idx: number, side: "front" | "back", value: string) => {
    const updated = [...flashcards];
    updated[idx] = { ...updated[idx], [side]: value };
    setFlashcards(updated);
  };

  const addImageUrl = () => setImageUrls([...imageUrls, ""]);
  const removeImageUrl = (idx: number) => {
    if (imageUrls.length <= 1) return;
    setImageUrls(imageUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      moduleId,
      type,
      title,
      content: ["text", "assignment"].includes(type) ? content : null,
      videoUrl: ["video", "video_quiz"].includes(type) ? videoUrl : null,
      orderIndex: parseInt(orderIndex) || 0,
      duration: duration ? parseInt(duration) : null,
      completionCondition,
      minScore: minScore ? parseInt(minScore) : null,
      minViewPercent: minViewPercent ? parseInt(minViewPercent) : null,
    };
    if (type === "quiz" || type === "video_quiz" || type === "survey") {
      data.quizConfig = {
        timerSeconds: timerSeconds ? parseInt(timerSeconds) : undefined,
        showOneAtATime,
        passingScore: type === "survey" ? 0 : parseInt(passingScore) || 70,
        allowRetry,
      };
    }
    if (type === "scorm") {
      data.scormPackageId = scormPackageId || null;
    }
    if (type === "assignment") {
      data.assignmentConfig = {
        instructions: assignInstructions,
        allowText,
        allowFile,
      };
    }
    if (type === "flashcard") {
      data.flashcards = flashcards.filter((f) => f.front.trim() || f.back.trim());
    }
    if (type === "resource_web") {
      data.embedUrl = embedUrl || null;
      data.embedCode = embedCode || null;
    }
    if (type === "virtual_class") {
      data.virtualClassUrl = virtualClassUrl || null;
      data.virtualClassDate = virtualClassDate || null;
    }
    if (type === "document") {
      data.fileUrl = fileUrl || null;
      data.fileName = fileName || null;
    }
    if (type === "image") {
      data.imageUrls = imageUrls.filter((u) => u.trim());
    }
    onSubmit(data);
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
      {(type === "video" || type === "video_quiz") && (
        <div className="space-y-2">
          <Label htmlFor="block-video">URL de la video</Label>
          <Input
            id="block-video"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )}
      {(type === "quiz" || type === "video_quiz") && (
        <div className="space-y-4 rounded-lg border p-3">
          <p className="text-sm font-medium">Configuration du quiz</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Temps par question (sec)</Label>
              <Input
                type="number"
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(e.target.value)}
                placeholder="Ex: 30 (vide = illimite)"
                min="5"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Score de passage (%)</Label>
              <Input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Affichage une question a la fois (style Kahoot)</Label>
            <Switch checked={showOneAtATime} onCheckedChange={setShowOneAtATime} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Autoriser les tentatives multiples</Label>
            <Switch checked={allowRetry} onCheckedChange={setAllowRetry} />
          </div>
          {type === "quiz" && (
            <p className="text-xs text-muted-foreground">
              Les questions seront ajoutees apres la creation du bloc.
            </p>
          )}
          {type === "video_quiz" && (
            <p className="text-xs text-muted-foreground">
              Les questions apparaitront apres la video. Ajoutez-les apres la creation du bloc.
            </p>
          )}
        </div>
      )}
      {type === "scorm" && (
        <div className="space-y-2">
          <Label>Package SCORM</Label>
          <Select value={scormPackageId} onValueChange={setScormPackageId}>
            <SelectTrigger><SelectValue placeholder="Selectionner un package SCORM" /></SelectTrigger>
            <SelectContent>
              {scormPackages?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title} ({p.version})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Telechargez vos packages SCORM depuis l'onglet Ressources, puis selectionnez-les ici.
          </p>
        </div>
      )}
      {type === "assignment" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Evaluation formative</p>
          <div className="space-y-2">
            <Label className="text-xs">Instructions pour l'apprenant</Label>
            <Textarea
              value={assignInstructions}
              onChange={(e) => setAssignInstructions(e.target.value)}
              placeholder="Decrivez ce que l'apprenant doit soumettre..."
              className="resize-none min-h-[80px]"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Autoriser la soumission de texte</Label>
            <Switch checked={allowText} onCheckedChange={setAllowText} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Autoriser le depot de fichier</Label>
            <Switch checked={allowFile} onCheckedChange={setAllowFile} />
          </div>
        </div>
      )}

      {/* Flashcards */}
      {type === "flashcard" && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Cartes de memorisation</p>
            <Button type="button" variant="outline" size="sm" onClick={addFlashcard}>
              <Plus className="w-3 h-3 mr-1" />
              Ajouter une carte
            </Button>
          </div>
          {flashcards.map((card, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <div className="space-y-1">
                <Label className="text-xs">Recto (question)</Label>
                <Input
                  value={card.front}
                  onChange={(e) => updateFlashcard(idx, "front", e.target.value)}
                  placeholder="Question ou terme..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Verso (reponse)</Label>
                <Input
                  value={card.back}
                  onChange={(e) => updateFlashcard(idx, "back", e.target.value)}
                  placeholder="Reponse ou definition..."
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 mt-5 text-destructive"
                disabled={flashcards.length <= 1}
                onClick={() => removeFlashcard(idx)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Les apprenants pourront retourner les cartes et s'auto-evaluer.
          </p>
        </div>
      )}

      {/* Resource web (iframe) */}
      {type === "resource_web" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Ressource web integree</p>
          <div className="space-y-2">
            <Label className="text-xs">URL a integrer (iframe)</Label>
            <Input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://view.genially.com/... ou https://docs.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ou code d'integration HTML (optionnel)</Label>
            <Textarea
              value={embedCode}
              onChange={(e) => setEmbedCode(e.target.value)}
              placeholder='<iframe src="..." width="100%" height="600"></iframe>'
              className="resize-none min-h-[80px] font-mono text-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Compatible avec Genially, Google Docs, H5P, Padlet, Canva et autres outils.
          </p>
        </div>
      )}

      {/* Virtual class */}
      {type === "virtual_class" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Classe virtuelle</p>
          <div className="space-y-2">
            <Label className="text-xs">Lien de la classe virtuelle</Label>
            <Input
              value={virtualClassUrl}
              onChange={(e) => setVirtualClassUrl(e.target.value)}
              placeholder="https://zoom.us/j/... ou https://meet.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Date et heure prevues</Label>
            <Input
              type="datetime-local"
              value={virtualClassDate}
              onChange={(e) => setVirtualClassDate(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            L'apprenant pourra rejoindre la classe virtuelle depuis son portail.
          </p>
        </div>
      )}

      {/* Document */}
      {type === "document" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Document telechargeable</p>
          <div className="space-y-2">
            <Label className="text-xs">URL du document</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://... (PDF, DOCX, etc.)"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Nom du fichier</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="guide-pratique.pdf"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            L'apprenant pourra telecharger ce document depuis son portail.
          </p>
        </div>
      )}

      {/* Image / Gallery */}
      {type === "image" && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Images / Galerie</p>
            <Button type="button" variant="outline" size="sm" onClick={addImageUrl}>
              <Plus className="w-3 h-3 mr-1" />
              Ajouter une image
            </Button>
          </div>
          {imageUrls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  const updated = [...imageUrls];
                  updated[idx] = e.target.value;
                  setImageUrls(updated);
                }}
                placeholder="https://... (URL de l'image)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                disabled={imageUrls.length <= 1}
                onClick={() => removeImageUrl(idx)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Survey (non-scored quiz) */}
      {type === "survey" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Configuration du sondage</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Affichage une question a la fois</Label>
            <Switch checked={showOneAtATime} onCheckedChange={setShowOneAtATime} />
          </div>
          <p className="text-xs text-muted-foreground">
            Les questions seront ajoutees apres la creation du bloc. Contrairement au quiz, le sondage n'est pas note.
          </p>
        </div>
      )}

      {/* Activity config (Digiforma-style) */}
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Configuration de l'activite</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Duree estimee (minutes)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 30"
              min="1"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Condition de completion</Label>
            <Select value={completionCondition} onValueChange={setCompletionCondition}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="finished">Terminee</SelectItem>
                <SelectItem value="score">Score minimum</SelectItem>
                <SelectItem value="date">Date limite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {completionCondition === "score" && (
          <div className="space-y-1">
            <Label className="text-xs">Score minimum requis (%)</Label>
            <Input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="Ex: 70"
              min="0"
              max="100"
            />
          </div>
        )}
        {(type === "video" || type === "video_quiz") && (
          <div className="space-y-1">
            <Label className="text-xs">Pourcentage minimum de visionnage (%)</Label>
            <Input
              type="number"
              value={minViewPercent}
              onChange={(e) => setMinViewPercent(e.target.value)}
              placeholder="Ex: 80"
              min="0"
              max="100"
            />
          </div>
        )}
      </div>

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
          {isPending ? "Enregistrement..." : block ? "Modifier" : "Creer"}
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
  const [prefillCategory, setPrefillCategory] = useState("");

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

  const prefillMutation = useMutation({
    mutationFn: async (category: string) => {
      const defaultQuestions = DEFAULT_QUIZ_QUESTIONS[category];
      if (!defaultQuestions) return;
      const startIndex = questions?.length || 0;
      for (let i = 0; i < defaultQuestions.length; i++) {
        const q = defaultQuestions[i];
        await apiRequest("POST", "/api/quiz-questions", {
          blockId,
          question: q.question,
          type: "qcm",
          options: q.options,
          correctAnswer: q.correctAnswer,
          orderIndex: startIndex + i,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-questions"] });
      setPrefillCategory("");
      toast({ title: "Questions suggerees ajoutees" });
    },
    onError: () => toast({ title: "Erreur lors de l'ajout des questions", variant: "destructive" }),
  });

  const quizCategories = Object.keys(DEFAULT_QUIZ_QUESTIONS);

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

      <div className="flex items-center gap-2">
        <Select value={prefillCategory} onValueChange={setPrefillCategory}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Pre-remplir par thematique..." />
          </SelectTrigger>
          <SelectContent>
            {quizCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat} ({DEFAULT_QUIZ_QUESTIONS[cat].length} questions)</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!prefillCategory || prefillMutation.isPending}
          onClick={() => prefillCategory && prefillMutation.mutate(prefillCategory)}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          {prefillMutation.isPending ? "Ajout..." : "Ajouter"}
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
                    {block.type === "video_quiz" && block.videoUrl && (
                      <p className="text-xs text-purple-500 truncate">{block.videoUrl}</p>
                    )}
                    {(block.type === "quiz" || block.type === "video_quiz") && (
                      <QuizQuestionBuilder blockId={block.id} />
                    )}
                    {block.type === "scorm" && block.scormPackageId && (
                      <p className="text-xs text-teal-600">Package SCORM associe</p>
                    )}
                    {block.type === "assignment" && (
                      <SubmissionReviewer blockId={block.id} />
                    )}
                    {block.type === "flashcard" && (block as any).flashcards && (
                      <p className="text-xs text-pink-500">
                        {((block as any).flashcards as Array<{ front: string; back: string }>).length} carte(s)
                      </p>
                    )}
                    {block.type === "resource_web" && (block as any).embedUrl && (
                      <p className="text-xs text-indigo-500 truncate">{(block as any).embedUrl}</p>
                    )}
                    {block.type === "virtual_class" && (
                      <div className="flex items-center gap-2">
                        {(block as any).virtualClassUrl && (
                          <p className="text-xs text-emerald-500 truncate">{(block as any).virtualClassUrl}</p>
                        )}
                        {(block as any).virtualClassDate && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date((block as any).virtualClassDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </Badge>
                        )}
                      </div>
                    )}
                    {block.type === "document" && (block as any).fileName && (
                      <p className="text-xs text-sky-500">{(block as any).fileName}</p>
                    )}
                    {block.type === "image" && (block as any).imageUrls && (
                      <p className="text-xs text-rose-500">
                        {((block as any).imageUrls as string[]).length} image(s)
                      </p>
                    )}
                    {block.type === "survey" && (
                      <QuizQuestionBuilder blockId={block.id} />
                    )}
                    {(block as any).duration && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {(block as any).duration} min
                      </Badge>
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

// ============================================================
// SESSION RESOURCE MANAGER
// ============================================================

function SessionResourceManager() {
  const [selectedSession, setSelectedSession] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editResource, setEditResource] = useState<SessionResource | undefined>();
  const [resType, setResType] = useState<"file" | "link">("file");
  const [resTitle, setResTitle] = useState("");
  const [resDescription, setResDescription] = useState("");
  const [resExternalUrl, setResExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileData, setFileData] = useState<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const { toast } = useToast();

  const { data: sessions } = useQuery<Session[]>({ queryKey: ["/api/sessions"] });
  const { data: resources, isLoading } = useQuery<SessionResource[]>({
    queryKey: ["/api/session-resources", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const resp = await fetch(`/api/session-resources?sessionId=${selectedSession}`, { credentials: "include" });
      return resp.json();
    },
    enabled: !!selectedSession,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/session-resources", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-resources"] });
      resetForm();
      toast({ title: "Ressource ajoutee" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/session-resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-resources"] });
      toast({ title: "Ressource supprimee" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      apiRequest("PATCH", `/api/session-resources/${id}`, { visible }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/session-resources"] }),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditResource(undefined);
    setResType("file");
    setResTitle("");
    setResDescription("");
    setResExternalUrl("");
    setFileData(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFileData(result);
      if (!resTitle) setResTitle(file.name);
    } catch {
      toast({ title: "Erreur lors du telechargement", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      sessionId: selectedSession,
      title: resTitle,
      description: resDescription || null,
      type: resType,
      ...(resType === "file" && fileData
        ? { fileUrl: fileData.fileUrl, fileName: fileData.fileName, fileSize: fileData.fileSize, mimeType: fileData.mimeType }
        : {}),
      ...(resType === "link" ? { externalUrl: resExternalUrl } : {}),
    });
  };

  // SCORM upload
  const [scormUploading, setScormUploading] = useState(false);
  const handleScormUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScormUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.zip$/i, ""));
      const resp = await fetch("/api/scorm-packages/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Upload failed");
      const pkg = await resp.json();
      queryClient.invalidateQueries({ queryKey: ["/api/scorm-packages"] });
      toast({ title: `Package SCORM "${pkg.title}" telecharge (${pkg.version})` });
    } catch {
      toast({ title: "Erreur lors du telechargement SCORM", variant: "destructive" });
    }
    setScormUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="space-y-1 flex-1 max-w-xs">
          <Label className="text-sm">Session</Label>
          <Select value={selectedSession || "none"} onValueChange={(v) => setSelectedSession(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Selectionner une session" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choisir une session</SelectItem>
              {sessions?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSession && (
          <Button className="mt-5" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Ajouter une ressource
          </Button>
        )}
      </div>

      {/* SCORM Upload section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Packages SCORM</p>
              <p className="text-xs text-muted-foreground">Telechargez des modules SCORM (ZIP) pour les utiliser dans vos blocs e-learning</p>
            </div>
            <div>
              <input
                type="file"
                accept=".zip"
                onChange={handleScormUpload}
                className="hidden"
                id="scorm-upload"
                disabled={scormUploading}
              />
              <label htmlFor="scorm-upload">
                <Button variant="outline" size="sm" asChild disabled={scormUploading}>
                  <span><Upload className="w-4 h-4 mr-1" />{scormUploading ? "Telechargement..." : "Telecharger un ZIP SCORM"}</span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedSession ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Selectionnez une session</h3>
          <p className="text-sm text-muted-foreground">Choisissez une session pour gerer ses ressources pedagogiques</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !resources || resources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune ressource pour cette session"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{res.title}</p>
                      {res.description && <p className="text-xs text-muted-foreground">{res.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {res.type === "file" ? <FileText className="w-3 h-3 mr-1" /> : <Link className="w-3 h-3 mr-1" />}
                        {res.type === "file" ? "Fichier" : "Lien"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {res.fileSize ? `${(res.fileSize / 1024).toFixed(0)} Ko` : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={res.visible ?? true}
                        onCheckedChange={(v) => toggleVisibilityMutation.mutate({ id: res.id, visible: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {res.type === "file" && res.fileUrl && (
                          <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                        {res.type === "link" && res.externalUrl && (
                          <a href={res.externalUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(res.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une ressource</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={resType} onValueChange={(v) => setResType(v as "file" | "link")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">Fichier</SelectItem>
                  <SelectItem value="link">Lien externe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={resTitle} onChange={(e) => setResTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={resDescription} onChange={(e) => setResDescription(e.target.value)} rows={2} />
            </div>
            {resType === "file" && (
              <div className="space-y-2">
                <Label>Fichier</Label>
                <Input type="file" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground">Telechargement en cours...</p>}
                {fileData && <p className="text-xs text-green-600">Fichier telecharge: {fileData.fileName}</p>}
              </div>
            )}
            {resType === "link" && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={resExternalUrl} onChange={(e) => setResExternalUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending || (resType === "file" && !fileData)}>
                {createMutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SUBMISSION REVIEWER
// ============================================================

function SubmissionReviewer({ blockId }: { blockId: string }) {
  const { toast } = useToast();
  const { data: submissions, isLoading } = useQuery<FormativeSubmission[]>({
    queryKey: ["/api/formative-submissions", { blockId }],
    queryFn: async () => {
      const resp = await fetch(`/api/formative-submissions?blockId=${blockId}`, { credentials: "include" });
      return resp.json();
    },
  });
  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  const gradeMutation = useMutation({
    mutationFn: async ({ id, grade, feedback }: { id: string; grade: number; feedback: string }) => {
      const resp = await apiRequest("PATCH", `/api/formative-submissions/${id}`, {
        grade,
        feedback,
        status: "graded",
        reviewedAt: new Date().toISOString(),
      });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formative-submissions"] });
      setGradingId(null);
      setGrade("");
      setFeedback("");
      toast({ title: "Note enregistree" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-12 w-full" />;
  if (!submissions || submissions.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Aucune soumission pour ce bloc.</p>;
  }

  const statusBadge = (status: string) => {
    if (status === "graded") return <StatusBadge status="graded" label="Note" />;
    if (status === "reviewing") return <StatusBadge status="reviewing" label="En revue" />;
    return <StatusBadge status="submitted" label="Soumis" />;
  };

  return (
    <div className="space-y-2 mt-2 border-t pt-2">
      <p className="text-xs font-medium text-muted-foreground">Soumissions ({submissions.length})</p>
      {submissions.map((sub) => {
        const trainee = trainees?.find(t => t.id === sub.traineeId);
        return (
          <div key={sub.id} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{trainee ? `${trainee.firstName} ${trainee.lastName}` : sub.traineeId}</span>
                {statusBadge(sub.status)}
              </div>
              <span className="text-xs text-muted-foreground">
                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("fr-FR") : ""}
              </span>
            </div>
            {sub.textContent && (
              <p className="text-sm bg-muted/50 rounded p-2">{sub.textContent}</p>
            )}
            {sub.fileUrl && (
              <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                <Download className="w-3 h-3" />{sub.fileName || "Fichier"}
              </a>
            )}
            {sub.grade != null && (
              <p className="text-sm"><strong>Note:</strong> {sub.grade}/100 {sub.feedback && `— ${sub.feedback}`}</p>
            )}
            {sub.status !== "graded" && gradingId !== sub.id && (
              <Button variant="outline" size="sm" onClick={() => { setGradingId(sub.id); setGrade(""); setFeedback(""); }}>
                <Star className="w-3 h-3 mr-1" />Noter
              </Button>
            )}
            {gradingId === sub.id && (
              <div className="space-y-2 border-t pt-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Note /100"
                    min="0"
                    max="100"
                    className="w-28"
                  />
                  <Input
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Commentaire..."
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => gradeMutation.mutate({ id: sub.id, grade: parseInt(grade) || 0, feedback })} disabled={gradeMutation.isPending}>
                    Valider
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setGradingId(null)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
    <PageLayout>
      <PageHeader title="E-Learning" subtitle="Gérez vos modules de formation en ligne" />

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules"><BookOpen className="w-4 h-4 mr-2" />Modules</TabsTrigger>
          <TabsTrigger value="resources"><FileText className="w-4 h-4 mr-2" />Ressources</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div />
        <Button onClick={() => { setEditModule(undefined); setModuleDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau module
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un module..." className="max-w-sm" />
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
        <EmptyState
          icon={BookOpen}
          title="Aucun module e-learning"
          description={search || sessionFilter !== "all"
            ? "Aucun résultat pour vos filtres"
            : "Créez votre premier module de formation en ligne"}
          action={!search && sessionFilter === "all" ? (
            <Button onClick={() => setModuleDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un module
            </Button>
          ) : undefined}
        />
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
        </TabsContent>

        <TabsContent value="resources">
          <SessionResourceManager />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
