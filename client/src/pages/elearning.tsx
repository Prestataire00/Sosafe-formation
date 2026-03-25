import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Loader2,
  FileUp,
  Trophy,
  RotateCcw,
  Timer,
  ThumbsUp,
  Lock,
  ChevronRight,
  ChevronLeft,
  Play,
  Smile,
  ArrowRight,
  Zap,
  Target,
  Award,
  Send,
  EyeOff as EyeOffIcon,
  Archive,
  Maximize2,
  GitBranch,
  Gamepad2,
  Library,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
import { ImmersiveModuleViewer } from "@/pages/learner/components/ImmersiveModuleViewer";
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
  if (type === "scenario") return <GitBranch className="w-4 h-4 text-cyan-500" />;
  if (type === "simulation") return <Gamepad2 className="w-4 h-4 text-lime-500" />;
  if (type === "kahoot") return <Gamepad2 className="w-4 h-4 text-purple-600" />;
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
  const [requireSequential, setRequireSequential] = useState(module?.requireSequential !== false);
  const [pathType, setPathType] = useState((module as any)?.pathType || "combined");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      programId: programId || null,
      sessionId: sessionId || null,
      status,
      orderIndex: parseInt(orderIndex) || 0,
      requireSequential,
      pathType,
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
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label>Progression séquentielle</Label>
          <p className="text-xs text-muted-foreground">
            L'apprenant doit valider chaque bloc avant d'accéder au suivant
          </p>
        </div>
        <Switch checked={requireSequential} onCheckedChange={setRequireSequential} />
      </div>
      <div className="space-y-2">
        <Label>Type de parcours</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "combined", label: "Combiné", desc: "Textes + Quiz + Flashcards", icon: <Layers className="w-4 h-4" />, color: "blue" },
            { value: "learning", label: "Apprentissage", desc: "Textes + Flashcards", icon: <BookOpen className="w-4 h-4" />, color: "green" },
            { value: "assessment", label: "Évaluation", desc: "Quiz uniquement", icon: <Target className="w-4 h-4" />, color: "orange" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPathType(opt.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${
                pathType === opt.value
                  ? opt.color === "blue"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : opt.color === "green"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
            >
              <span className={pathType === opt.value ? (opt.color === "blue" ? "text-blue-600" : opt.color === "green" ? "text-green-600" : "text-orange-600") : "text-muted-foreground"}>{opt.icon}</span>
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
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

  // Kahoot quizzes for autopositionnement block
  const { data: availableQuizzes } = useQuery<Array<{ id: string; title: string; description: string | null }>>({
    queryKey: ["/api/quizzes"],
    enabled: type === "kahoot",
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

  // Scenario config
  const existingScenario = (block as any)?.scenarioConfig as any;
  const [scenarioNodes, setScenarioNodes] = useState<Array<{
    id: string; situation: string; imageUrl?: string;
    choices: Array<{ id: string; text: string; feedback: string; points: number; nextNodeId: string | null }>;
  }>>(existingScenario?.nodes || [{ id: "node-1", situation: "", choices: [{ id: "c-1-1", text: "", feedback: "", points: 10, nextNodeId: null }] }]);

  // Linked Kahoot quiz (autopositionnement)
  const [linkedQuizId, setLinkedQuizId] = useState((block as any)?.linkedQuizId || "");

  // Simulation config
  const existingSim = (block as any)?.simulationConfig as any;
  const [simSubType, setSimSubType] = useState<string>(existingSim?.subType || "ordering");
  const [simInstructions, setSimInstructions] = useState(existingSim?.instructions || "");
  const [simOrderingItems, setSimOrderingItems] = useState<Array<{ id: string; text: string; correctPosition: number }>>(
    existingSim?.orderingItems || [{ id: "o-1", text: "", correctPosition: 0 }]
  );
  const [simMatchingPairs, setSimMatchingPairs] = useState<Array<{ id: string; left: string; right: string }>>(
    existingSim?.matchingPairs || [{ id: "m-1", left: "", right: "" }]
  );
  const [simFillBlankText, setSimFillBlankText] = useState(existingSim?.fillBlankText || "");
  const [simFillBlankAnswers, setSimFillBlankAnswers] = useState<Array<{ blankIndex: number; correctAnswer: string }>>(
    existingSim?.fillBlankAnswers || [{ blankIndex: 0, correctAnswer: "" }]
  );
  const [simWordBank, setSimWordBank] = useState<string[]>(existingSim?.wordBank || []);
  const [simHotspotImageUrl, setSimHotspotImageUrl] = useState(existingSim?.hotspotImageUrl || "");
  const [simHotspotZones, setSimHotspotZones] = useState<Array<{ id: string; x: number; y: number; width: number; height: number; label: string; isCorrect: boolean }>>(
    existingSim?.hotspotZones || []
  );
  const [simAllowRetry, setSimAllowRetry] = useState(existingSim?.allowRetry ?? true);
  const [simPassingScore, setSimPassingScore] = useState(existingSim?.passingScore?.toString() || "70");

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
    if (type === "scenario") {
      data.scenarioConfig = {
        startNodeId: scenarioNodes[0]?.id || "node-1",
        nodes: scenarioNodes,
      };
    }
    if (type === "simulation") {
      const simConfig: Record<string, unknown> = {
        subType: simSubType,
        instructions: simInstructions,
        allowRetry: simAllowRetry,
        passingScore: parseInt(simPassingScore) || 70,
      };
      if (simSubType === "ordering") simConfig.orderingItems = simOrderingItems;
      if (simSubType === "matching") simConfig.matchingPairs = simMatchingPairs;
      if (simSubType === "fill_blank") {
        simConfig.fillBlankText = simFillBlankText;
        simConfig.fillBlankAnswers = simFillBlankAnswers;
        simConfig.wordBank = simWordBank.filter(w => w.trim());
      }
      if (simSubType === "hotspot") {
        simConfig.hotspotImageUrl = simHotspotImageUrl;
        simConfig.hotspotZones = simHotspotZones;
      }
      data.simulationConfig = simConfig;
    }
    if (type === "kahoot") {
      data.linkedQuizId = linkedQuizId || null;
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

      {/* SCENARIO EDITOR */}
      {type === "scenario" && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Noeuds du scenario</p>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              const newId = `node-${scenarioNodes.length + 1}`;
              setScenarioNodes([...scenarioNodes, {
                id: newId, situation: "",
                choices: [{ id: `c-${newId}-1`, text: "", feedback: "", points: 10, nextNodeId: null }],
              }]);
            }}>
              <Plus className="w-3 h-3 mr-1" /> Ajouter un noeud
            </Button>
          </div>
          {scenarioNodes.map((node, nIdx) => (
            <div key={node.id} className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-muted-foreground">Noeud {nIdx + 1} ({node.id})</p>
                {scenarioNodes.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                    onClick={() => setScenarioNodes(scenarioNodes.filter((_, i) => i !== nIdx))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Textarea
                value={node.situation}
                onChange={(e) => {
                  const updated = [...scenarioNodes];
                  updated[nIdx] = { ...updated[nIdx], situation: e.target.value };
                  setScenarioNodes(updated);
                }}
                placeholder="Description de la situation..."
                rows={3}
              />
              <div className="space-y-1">
                <Label className="text-xs">Image URL (optionnel)</Label>
                <Input
                  value={node.imageUrl || ""}
                  onChange={(e) => {
                    const updated = [...scenarioNodes];
                    updated[nIdx] = { ...updated[nIdx], imageUrl: e.target.value };
                    setScenarioNodes(updated);
                  }}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Choix</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    const updated = [...scenarioNodes];
                    updated[nIdx].choices.push({
                      id: `c-${node.id}-${node.choices.length + 1}`,
                      text: "", feedback: "", points: 0, nextNodeId: null,
                    });
                    setScenarioNodes(updated);
                  }}>
                    <Plus className="w-3 h-3 mr-1" /> Choix
                  </Button>
                </div>
                {node.choices.map((choice, cIdx) => (
                  <div key={choice.id} className="space-y-1 border rounded p-2 bg-background">
                    <div className="flex gap-2">
                      <Input
                        value={choice.text}
                        onChange={(e) => {
                          const updated = [...scenarioNodes];
                          updated[nIdx].choices[cIdx].text = e.target.value;
                          setScenarioNodes(updated);
                        }}
                        placeholder="Texte du choix"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={choice.points}
                        onChange={(e) => {
                          const updated = [...scenarioNodes];
                          updated[nIdx].choices[cIdx].points = parseInt(e.target.value) || 0;
                          setScenarioNodes(updated);
                        }}
                        placeholder="Pts"
                        className="w-16"
                      />
                      {node.choices.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => {
                            const updated = [...scenarioNodes];
                            updated[nIdx].choices = updated[nIdx].choices.filter((_, i) => i !== cIdx);
                            setScenarioNodes(updated);
                          }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={choice.feedback}
                      onChange={(e) => {
                        const updated = [...scenarioNodes];
                        updated[nIdx].choices[cIdx].feedback = e.target.value;
                        setScenarioNodes(updated);
                      }}
                      placeholder="Feedback contextuel..."
                    />
                    <Select
                      value={choice.nextNodeId || "__end__"}
                      onValueChange={(v) => {
                        const updated = [...scenarioNodes];
                        updated[nIdx].choices[cIdx].nextNodeId = v === "__end__" ? null : v;
                        setScenarioNodes(updated);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Noeud suivant" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__end__">Fin du scenario</SelectItem>
                        {scenarioNodes.filter(n => n.id !== node.id).map(n => (
                          <SelectItem key={n.id} value={n.id}>Noeud: {n.situation?.substring(0, 30) || n.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SIMULATION EDITOR */}
      {type === "simulation" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Configuration de l'exercice pratique</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type d'exercice</Label>
              <Select value={simSubType} onValueChange={setSimSubType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordering">Classement (remettre en ordre)</SelectItem>
                  <SelectItem value="matching">Appariement (relier les paires)</SelectItem>
                  <SelectItem value="fill_blank">Texte a trous</SelectItem>
                  <SelectItem value="hotspot">Zones sensibles (clic sur image)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Score minimum (%)</Label>
              <Input type="number" value={simPassingScore} onChange={(e) => setSimPassingScore(e.target.value)} min="0" max="100" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Instructions</Label>
            <Textarea value={simInstructions} onChange={(e) => setSimInstructions(e.target.value)} placeholder="Instructions pour l'apprenant..." rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Autoriser les tentatives multiples</Label>
            <Switch checked={simAllowRetry} onCheckedChange={setSimAllowRetry} />
          </div>

          {/* ORDERING */}
          {simSubType === "ordering" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Elements a ordonner</p>
                <Button type="button" variant="ghost" size="sm" onClick={() =>
                  setSimOrderingItems([...simOrderingItems, { id: `o-${simOrderingItems.length + 1}`, text: "", correctPosition: simOrderingItems.length }])
                }>
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
              {simOrderingItems.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                  <Input value={item.text} onChange={(e) => {
                    const updated = [...simOrderingItems];
                    updated[idx].text = e.target.value;
                    setSimOrderingItems(updated);
                  }} placeholder="Element" className="flex-1" />
                  <Input type="number" value={item.correctPosition} onChange={(e) => {
                    const updated = [...simOrderingItems];
                    updated[idx].correctPosition = parseInt(e.target.value) || 0;
                    setSimOrderingItems(updated);
                  }} placeholder="Pos" className="w-16" title="Position correcte (0-indexe)" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    disabled={simOrderingItems.length <= 1}
                    onClick={() => setSimOrderingItems(simOrderingItems.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* MATCHING */}
          {simSubType === "matching" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Paires a associer</p>
                <Button type="button" variant="ghost" size="sm" onClick={() =>
                  setSimMatchingPairs([...simMatchingPairs, { id: `m-${simMatchingPairs.length + 1}`, left: "", right: "" }])
                }>
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
              {simMatchingPairs.map((pair, idx) => (
                <div key={pair.id} className="flex gap-2 items-center">
                  <Input value={pair.left} onChange={(e) => {
                    const updated = [...simMatchingPairs];
                    updated[idx].left = e.target.value;
                    setSimMatchingPairs(updated);
                  }} placeholder="Element gauche" className="flex-1" />
                  <span className="text-muted-foreground">→</span>
                  <Input value={pair.right} onChange={(e) => {
                    const updated = [...simMatchingPairs];
                    updated[idx].right = e.target.value;
                    setSimMatchingPairs(updated);
                  }} placeholder="Correspondance droite" className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    disabled={simMatchingPairs.length <= 1}
                    onClick={() => setSimMatchingPairs(simMatchingPairs.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* FILL BLANK */}
          {simSubType === "fill_blank" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Texte (utilisez {"{blank}"} pour les trous)</Label>
                <Textarea value={simFillBlankText} onChange={(e) => setSimFillBlankText(e.target.value)}
                  placeholder="La {blank} est le processus par lequel {blank} se transforme..." rows={3} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reponses correctes (par ordre des trous)</Label>
                {simFillBlankAnswers.map((ans, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-12">Trou {idx + 1}</span>
                    <Input value={ans.correctAnswer} onChange={(e) => {
                      const updated = [...simFillBlankAnswers];
                      updated[idx].correctAnswer = e.target.value;
                      setSimFillBlankAnswers(updated);
                    }} placeholder="Reponse correcte" className="flex-1" />
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() =>
                  setSimFillBlankAnswers([...simFillBlankAnswers, { blankIndex: simFillBlankAnswers.length, correctAnswer: "" }])
                }>
                  <Plus className="w-3 h-3 mr-1" /> Ajouter un trou
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Banque de mots (un par ligne)</Label>
                <Textarea value={simWordBank.join("\n")} onChange={(e) => setSimWordBank(e.target.value.split("\n"))}
                  placeholder="mot1\nmot2\nmot3" rows={2} />
              </div>
            </div>
          )}

          {/* HOTSPOT */}
          {simSubType === "hotspot" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">URL de l'image</Label>
                <Input value={simHotspotImageUrl} onChange={(e) => setSimHotspotImageUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Zones cliquables (en % de l'image)</p>
                <Button type="button" variant="ghost" size="sm" onClick={() =>
                  setSimHotspotZones([...simHotspotZones, { id: `z-${simHotspotZones.length + 1}`, x: 10, y: 10, width: 20, height: 20, label: "", isCorrect: true }])
                }>
                  <Plus className="w-3 h-3 mr-1" /> Zone
                </Button>
              </div>
              {simHotspotZones.map((zone, idx) => (
                <div key={zone.id} className="flex gap-1 items-center flex-wrap border rounded p-2 bg-background">
                  <Input value={zone.label} onChange={(e) => {
                    const updated = [...simHotspotZones];
                    updated[idx].label = e.target.value;
                    setSimHotspotZones(updated);
                  }} placeholder="Label" className="w-24" />
                  <Input type="number" value={zone.x} onChange={(e) => {
                    const updated = [...simHotspotZones]; updated[idx].x = parseInt(e.target.value) || 0; setSimHotspotZones(updated);
                  }} className="w-14" title="X %" />
                  <Input type="number" value={zone.y} onChange={(e) => {
                    const updated = [...simHotspotZones]; updated[idx].y = parseInt(e.target.value) || 0; setSimHotspotZones(updated);
                  }} className="w-14" title="Y %" />
                  <Input type="number" value={zone.width} onChange={(e) => {
                    const updated = [...simHotspotZones]; updated[idx].width = parseInt(e.target.value) || 0; setSimHotspotZones(updated);
                  }} className="w-14" title="Largeur %" />
                  <Input type="number" value={zone.height} onChange={(e) => {
                    const updated = [...simHotspotZones]; updated[idx].height = parseInt(e.target.value) || 0; setSimHotspotZones(updated);
                  }} className="w-14" title="Hauteur %" />
                  <div className="flex items-center gap-1">
                    <Switch checked={zone.isCorrect} onCheckedChange={(v) => {
                      const updated = [...simHotspotZones]; updated[idx].isCorrect = v; setSimHotspotZones(updated);
                    }} />
                    <span className="text-xs">{zone.isCorrect ? "Correcte" : "Incorrecte"}</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                    onClick={() => setSimHotspotZones(simHotspotZones.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KAHOOT QUIZ (autopositionnement / evaluation) */}
      {type === "kahoot" && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Quiz interactif (Autopositionnement)</p>
          <p className="text-xs text-muted-foreground">
            Sélectionnez un quiz Kahoot existant. Les apprenants pourront y participer directement dans le parcours e-learning.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Quiz à associer</Label>
            <Select value={linkedQuizId} onValueChange={setLinkedQuizId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un quiz..." /></SelectTrigger>
              <SelectContent>
                {availableQuizzes?.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.title}
                    {q.description ? ` — ${q.description}` : ""}
                  </SelectItem>
                ))}
                {(!availableQuizzes || availableQuizzes.length === 0) && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Aucun quiz créé. Allez dans Quiz Manager pour en créer.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          {linkedQuizId && (
            <p className="text-xs text-green-600">
              ✓ Quiz sélectionné. L'apprenant pourra rejoindre et participer au quiz dans le parcours.
            </p>
          )}
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
  const [aiEditBlock, setAiEditBlock] = useState<ElearningBlock | null>(null);
  const [aiAction, setAiAction] = useState<string>("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: blocks, isLoading } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${moduleId}`],
  });

  const handleAiEdit = async () => {
    if (!aiEditBlock || !aiAction) return;
    setAiLoading(true);
    try {
      const resp = await apiRequest("POST", `/api/elearning-blocks/${aiEditBlock.id}/ai-edit`, {
        action: aiAction,
        instructions: aiInstructions || undefined,
        count: parseInt(aiCount) || 5,
      });
      const data = await resp.json();
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-questions"] });
      toast({ title: data.message || "Modification IA appliquée" });
      setAiEditBlock(null);
      setAiAction("");
      setAiInstructions("");
    } catch (err: any) {
      toast({ title: err?.message || "Erreur IA", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const { data: templateBlocks } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks/templates"],
  });

  const toggleBlockTemplateMutation = useMutation({
    mutationFn: ({ id, isTemplate }: { id: string; isTemplate: boolean }) =>
      apiRequest("PATCH", `/api/elearning-blocks/${id}`, { isTemplate }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks/templates"] });
      toast({ title: vars.isTemplate ? "Bloc sauvegardé comme bloc-type" : "Bloc retiré des blocs-types" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const importBlockMutation = useMutation({
    mutationFn: (sourceBlockId: string) =>
      apiRequest("POST", `/api/elearning-blocks/${sourceBlockId}/duplicate`, { moduleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-blocks"] });
      setTemplateDialogOpen(false);
      toast({ title: "Bloc-type importé avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de l'import", variant: "destructive" }),
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
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <Library className="w-3 h-3 mr-1" />
            Importer bloc-type
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditBlock(undefined); setBlockDialogOpen(true); }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Nouveau bloc
          </Button>
        </div>
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
            <Card key={block.id} className="border overflow-hidden">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-start gap-2 min-w-0">
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
                      {(block as any).isTemplate && (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-300 bg-indigo-50 text-[10px] px-1 py-0">
                          <Library className="w-2.5 h-2.5 mr-0.5" />Type
                        </Badge>
                      )}
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
                      {block.type === "text" && (
                        <>
                          <DropdownMenuItem onClick={() => { setAiEditBlock(block); setAiAction("enrich_text"); }}>
                            <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                            Enrichir avec l'IA
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setAiEditBlock(block); setAiAction("rewrite"); }}>
                            <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                            Réécrire avec l'IA
                          </DropdownMenuItem>
                        </>
                      )}
                      {(block.type === "quiz" || block.type === "video_quiz" || block.type === "survey") && (
                        <DropdownMenuItem onClick={() => { setAiEditBlock(block); setAiAction("add_questions"); }}>
                          <Sparkles className="w-4 h-4 mr-2 text-green-500" />
                          Ajouter des questions (IA)
                        </DropdownMenuItem>
                      )}
                      {block.type === "flashcard" && (
                        <DropdownMenuItem onClick={() => { setAiEditBlock(block); setAiAction("add_flashcards"); }}>
                          <Sparkles className="w-4 h-4 mr-2 text-pink-500" />
                          Ajouter des flashcards (IA)
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => toggleBlockTemplateMutation.mutate({ id: block.id, isTemplate: !(block as any).isTemplate })}
                      >
                        <Library className="w-4 h-4 mr-2" />
                        {(block as any).isTemplate ? "Retirer des blocs-types" : "Sauvegarder comme bloc-type"}
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

      {/* AI Edit Dialog */}
      <Dialog open={!!aiEditBlock} onOpenChange={(open) => { if (!open) { setAiEditBlock(null); setAiAction(""); setAiInstructions(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {aiAction === "add_questions" && "Ajouter des questions avec l'IA"}
              {aiAction === "add_flashcards" && "Ajouter des flashcards avec l'IA"}
              {aiAction === "enrich_text" && "Enrichir le contenu avec l'IA"}
              {aiAction === "rewrite" && "Réécrire avec l'IA"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {aiEditBlock && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-medium">Bloc :</span> {aiEditBlock.title}
              </div>
            )}

            {(aiAction === "add_questions" || aiAction === "add_flashcards") && (
              <div className="space-y-2">
                <Label>Nombre à générer</Label>
                <Select value={aiCount} onValueChange={setAiCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Instructions supplémentaires (optionnel)</Label>
              <Textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder={
                  aiAction === "add_questions"
                    ? "Ex: Questions plus difficiles, axées sur la sécurité incendie..."
                    : aiAction === "add_flashcards"
                      ? "Ex: Focalisées sur les définitions clés..."
                      : "Ex: Ajouter des exemples concrets, structurer en listes..."
                }
                rows={3}
              />
            </div>

            <Button className="w-full" onClick={handleAiEdit} disabled={aiLoading}>
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {aiAction === "add_questions" && `Générer ${aiCount} questions`}
                  {aiAction === "add_flashcards" && `Générer ${aiCount} flashcards`}
                  {aiAction === "enrich_text" && "Enrichir le contenu"}
                  {aiAction === "rewrite" && "Réécrire le contenu"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import bloc-type dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-500" />
              Importer un bloc-type
            </DialogTitle>
          </DialogHeader>
          {!templateBlocks || templateBlocks.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Library className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Aucun bloc-type disponible.</p>
              <p className="text-xs mt-1">Sauvegardez un bloc existant comme bloc-type depuis le menu ⋯</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templateBlocks.map((tb) => (
                <Card key={tb.id} className="border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <BlockTypeIcon type={tb.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tb.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <BlockTypeLabel type={tb.type} />
                        {tb.content && <p className="text-xs text-muted-foreground truncate">{tb.content.slice(0, 60)}...</p>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={importBlockMutation.isPending}
                      onClick={() => importBlockMutation.mutate(tb.id)}
                    >
                      {importBlockMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <><Copy className="w-3.5 h-3.5 mr-1" />Importer</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="space-y-1 flex-1 sm:max-w-xs">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm">Packages SCORM</p>
              <p className="text-xs text-muted-foreground">Telechargez des modules SCORM (ZIP) pour les utiliser dans vos blocs e-learning</p>
            </div>
            <div className="shrink-0">
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
          <CardContent className="p-0 overflow-x-auto">
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

// ============================================================
// KAHOOT-STYLE COLORS
// ============================================================
const PREVIEW_KAHOOT_COLORS = [
  "bg-red-500 hover:bg-red-600 text-white",
  "bg-blue-500 hover:bg-blue-600 text-white",
  "bg-green-500 hover:bg-green-600 text-white",
  "bg-yellow-500 hover:bg-yellow-600 text-white",
];

const BLOCK_TYPE_ICONS: Record<string, typeof BookOpen> = {
  text: FileText,
  quiz: Zap,
  flashcard: Layers,
  video: MonitorPlay,
  video_quiz: MonitorPlay,
  document: FileText,
  image: Image,
  assignment: ClipboardCheck,
  survey: ClipboardCheck,
  scenario: GitBranch,
  simulation: Gamepad2,
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  video: "Vidéo",
  quiz: "Quiz",
  video_quiz: "Vidéo + Quiz",
  flashcard: "Flashcards",
  scorm: "SCORM",
  assignment: "Évaluation",
  resource_web: "Ressource web",
  virtual_class: "Classe virtuelle",
  document: "Document",
  image: "Image / Galerie",
  survey: "Sondage",
  scenario: "Scénario",
  simulation: "Mise en situation",
};

// ============================================================
// IMMERSIVE QUIZ PLAYER (Preview Mode)
// ============================================================
function PreviewQuizPlayer({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[];
  onComplete: (score: number, passed: boolean) => void;
}) {
  const sorted = useMemo(
    () => questions.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [questions]
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer per question
  useEffect(() => {
    if (submitted || showFeedback) return;
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, submitted, showFeedback]);

  const handleAnswer = useCallback((optIdx: number) => {
    if (submitted || showFeedback) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const q = sorted[currentIdx];
    if (!q) return;
    const isCorrect = optIdx === q.correctAnswer;

    setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
    setResults((prev) => ({ ...prev, [currentIdx]: isCorrect }));
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      if (currentIdx < sorted.length - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        // Compute final score
        const finalResults = { ...results, [currentIdx]: isCorrect };
        const correct = Object.values(finalResults).filter(Boolean).length;
        const pct = Math.round((correct / sorted.length) * 100);
        setScore(pct);
        setSubmitted(true);
        onComplete(pct, pct >= 70);
      }
    }, 1200);
  }, [currentIdx, submitted, showFeedback, sorted, results, onComplete]);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Aucune question disponible.</p>;
  }

  // Score screen
  if (submitted) {
    const correct = Object.values(results).filter(Boolean).length;
    const passed = score >= 70;
    return (
      <div className="space-y-6">
        <div className={`text-center p-8 rounded-2xl border-2 ${
          passed
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700"
            : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-700"
        }`}>
          {score >= 90 ? (
            <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-3 animate-bounce" />
          ) : passed ? (
            <ThumbsUp className="w-16 h-16 mx-auto text-green-500 mb-3" />
          ) : (
            <Smile className="w-16 h-16 mx-auto text-amber-500 mb-3" />
          )}
          <p className="text-5xl font-bold mb-2">{score}%</p>
          <p className="text-base font-medium text-muted-foreground">
            {passed ? "Félicitations, quiz réussi !" : `Score insuffisant (70% requis)`}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {correct}/{sorted.length} réponses correctes
          </p>
        </div>

        {/* Correction détaillée */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Correction détaillée :</p>
          {sorted.map((q, i) => {
            const wasCorrect = results[i];
            const opts = (q.options as string[]) || [];
            return (
              <div key={q.id} className={`p-3 rounded-lg border ${wasCorrect ? "border-green-200 bg-green-50/50 dark:bg-green-900/10" : "border-red-200 bg-red-50/50 dark:bg-red-900/10"}`}>
                <div className="flex items-start gap-2">
                  {wasCorrect ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <span className="text-red-500 font-bold text-sm mt-0.5 shrink-0">✗</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                    {!wasCorrect && (
                      <p className="text-xs text-green-600 mt-1">Bonne réponse : {opts[q.correctAnswer] || "?"}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!passed && (
          <Button className="w-full" onClick={() => {
            setCurrentIdx(0);
            setAnswers({});
            setResults({});
            setSubmitted(false);
            setScore(0);
            setShowFeedback(false);
          }}>
            <RotateCcw className="w-4 h-4 mr-2" /> Réessayer le quiz
          </Button>
        )}
      </div>
    );
  }

  // Question display — Kahoot style
  const q = sorted[currentIdx];
  const options = (q.options as string[]) || [];

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-primary">
          {currentIdx + 1}/{sorted.length}
        </span>
        <Progress value={((currentIdx) / sorted.length) * 100} className="flex-1 h-2.5" />
      </div>

      {/* Timer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Timer className={`w-4 h-4 ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
            <span className={`text-lg font-mono font-bold ${timeLeft <= 5 ? "text-red-500" : ""}`}>{timeLeft}s</span>
          </div>
          <div className="flex gap-1">
            {sorted.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${
                i < currentIdx ? (results[i] ? "bg-green-500" : "bg-red-400") : i === currentIdx ? "bg-primary" : "bg-muted"
              }`} />
            ))}
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center py-6 px-4">
        <Badge variant="secondary" className="text-xs mb-3">
          {q.type === "vrai_faux" ? "Vrai/Faux" : "QCM"}
        </Badge>
        <p className="text-xl font-bold leading-snug">{q.question}</p>
      </div>

      {/* Kahoot-style options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, optIdx) => {
          const colorClass = PREVIEW_KAHOOT_COLORS[optIdx % PREVIEW_KAHOOT_COLORS.length];
          const isFeedbackCorrect = showFeedback && optIdx === q.correctAnswer;
          const isFeedbackWrong = showFeedback && answers[currentIdx] === optIdx && optIdx !== q.correctAnswer;

          return (
            <button
              key={optIdx}
              onClick={() => handleAnswer(optIdx)}
              disabled={showFeedback}
              className={`p-5 rounded-xl text-left font-semibold text-base transition-all transform ${
                isFeedbackCorrect
                  ? "bg-green-500 text-white ring-4 ring-green-300 scale-105 shadow-lg"
                  : isFeedbackWrong
                    ? "bg-gray-400 text-white opacity-60 scale-95"
                    : showFeedback
                      ? "bg-gray-200 text-gray-500 opacity-40 dark:bg-gray-700 dark:text-gray-400"
                      : colorClass
              } ${!showFeedback ? "hover:scale-[1.03] active:scale-95 shadow-md hover:shadow-lg cursor-pointer" : ""}`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// IMMERSIVE FLASHCARD PLAYER (Preview Mode)
// ============================================================
function PreviewFlashcardPlayer({
  cards,
  onComplete,
}: {
  cards: { front: string; back: string }[];
  onComplete: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Aucune flashcard disponible.</p>;
  }

  if (completed) {
    return (
      <div className="text-center p-8 rounded-2xl border-2 bg-gradient-to-br from-violet-50 to-pink-50 border-violet-300 dark:from-violet-900/20 dark:to-pink-900/20 dark:border-violet-700">
        <Award className="w-14 h-14 mx-auto text-violet-500 mb-3" />
        <p className="text-xl font-bold mb-1">Flashcards terminées !</p>
        <p className="text-sm text-muted-foreground">
          {knownCards.size}/{cards.length} cartes maîtrisées
        </p>
        <Button variant="outline" className="mt-4" onClick={() => {
          setCurrentIdx(0);
          setFlipped(false);
          setKnownCards(new Set());
          setCompleted(false);
        }}>
          <RotateCcw className="w-4 h-4 mr-2" /> Recommencer
        </Button>
      </div>
    );
  }

  const card = cards[currentIdx];

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-primary">
          Carte {currentIdx + 1}/{cards.length}
        </span>
        <Progress value={((currentIdx + 1) / cards.length) * 100} className="flex-1 h-2.5" />
        <Badge variant="secondary" className="text-xs">
          {knownCards.size} maîtrisée{knownCards.size > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className={`cursor-pointer rounded-2xl border-2 p-10 text-center min-h-[200px] flex items-center justify-center transition-all duration-300 transform hover:shadow-xl ${
          flipped
            ? "bg-gradient-to-br from-pink-50 to-purple-50 border-pink-300 dark:from-pink-900/20 dark:to-purple-900/20 dark:border-pink-700 scale-[1.01]"
            : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 hover:border-pink-300"
        }`}
      >
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3" />
            {flipped ? "Réponse" : "Question"} — Cliquez pour retourner
          </p>
          <p className="text-xl font-semibold leading-relaxed">{flipped ? card.back : card.front}</p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={currentIdx === 0}
          onClick={() => { setCurrentIdx(currentIdx - 1); setFlipped(false); }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Précédente
        </Button>

        {flipped && (
          <>
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (currentIdx < cards.length - 1) {
                  setCurrentIdx(currentIdx + 1);
                  setFlipped(false);
                } else {
                  setCompleted(true);
                  onComplete();
                }
              }}
            >
              À revoir
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                setKnownCards((prev) => new Set(prev).add(currentIdx));
                if (currentIdx < cards.length - 1) {
                  setCurrentIdx(currentIdx + 1);
                  setFlipped(false);
                } else {
                  setCompleted(true);
                  onComplete();
                }
              }}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Maîtrisée
            </Button>
          </>
        )}

        {!flipped && (
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentIdx === cards.length - 1}
            onClick={() => { setCurrentIdx(currentIdx + 1); setFlipped(false); }}
          >
            Suivante <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// QUIZ LOADER — loads questions per block
// ============================================================
function PreviewQuizLoader({
  blockId,
  onComplete,
}: {
  blockId: string;
  onComplete: (score: number, passed: boolean) => void;
}) {
  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz-questions", `?blockId=${blockId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Chargement du quiz...</span>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Aucune question disponible pour ce quiz.</p>;
  }

  return <PreviewQuizPlayer questions={questions} onComplete={onComplete} />;
}

// ============================================================
// MODULE PREVIEW — Full immersive test mode
// ============================================================
function ModulePreview({ moduleId }: { moduleId: string }) {
  const { data: blocks, isLoading } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks", `?moduleId=${moduleId}`],
  });

  const { data: moduleData } = useQuery<ElearningModule>({
    queryKey: [`/api/elearning-modules/${moduleId}`],
  });

  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);

  const sortedBlocks = useMemo(
    () => (blocks || []).slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [blocks]
  );

  const totalBlocks = sortedBlocks.length;
  const progressPct = totalBlocks > 0 ? Math.round((completedBlocks.size / totalBlocks) * 100) : 0;
  const allCompleted = completedBlocks.size === totalBlocks && totalBlocks > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement du module...</p>
      </div>
    );
  }

  if (totalBlocks === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Aucun bloc dans ce module.</p>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 px-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{moduleData?.title || "Module"}</h3>
          {moduleData?.description && (
            <p className="text-muted-foreground max-w-md mx-auto">{moduleData.description}</p>
          )}
        </div>

        {/* Parcours overview */}
        <div className="border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Parcours : {totalBlocks} étape{totalBlocks > 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {sortedBlocks.map((block, idx) => {
              const Icon = BLOCK_TYPE_ICONS[block.type] || FileText;
              return (
                <div key={block.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{block.title}</span>
                  <Badge variant="outline" className="text-xs">{BLOCK_TYPE_LABELS[block.type] || block.type}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Button size="lg" className="w-full text-base h-12" onClick={() => setStarted(true)}>
          <Play className="w-5 h-5 mr-2" /> Commencer le parcours
        </Button>
      </div>
    );
  }

  // Completion screen
  if (allCompleted) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10 px-4">
          <div className="relative inline-block mb-4">
            <Trophy className="w-20 h-20 text-amber-500 animate-bounce" />
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Module terminé !</h3>
          <p className="text-muted-foreground">
            Vous avez complété les {totalBlocks} étapes du parcours.
          </p>
        </div>

        {/* Summary */}
        <div className="border rounded-xl p-4 space-y-2">
          {sortedBlocks.map((block, idx) => (
            <div key={block.id} className="flex items-center gap-3 py-1.5">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-sm flex-1">{block.title}</span>
              <Badge variant="outline" className="text-xs">{BLOCK_TYPE_LABELS[block.type] || block.type}</Badge>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={() => {
          setStarted(false);
          setActiveBlockIdx(0);
          setCompletedBlocks(new Set());
        }}>
          <RotateCcw className="w-4 h-4 mr-2" /> Recommencer le parcours
        </Button>
      </div>
    );
  }

  // Active block view
  const activeBlock = sortedBlocks[activeBlockIdx];
  const isCurrentCompleted = completedBlocks.has(activeBlockIdx);
  const BlockIcon = BLOCK_TYPE_ICONS[activeBlock.type] || FileText;

  return (
    <div className="space-y-4">
      {/* Top progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progression du module</span>
          <span className="font-bold text-primary">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-3" />
        <div className="flex gap-1.5">
          {sortedBlocks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                // Can go back to completed, or stay on current
                if (completedBlocks.has(idx) || idx === activeBlockIdx || idx <= Math.max(...Array.from(completedBlocks), -1) + 1) {
                  setActiveBlockIdx(idx);
                }
              }}
              className={`flex-1 h-2 rounded-full transition-all ${
                completedBlocks.has(idx)
                  ? "bg-green-500"
                  : idx === activeBlockIdx
                    ? "bg-primary animate-pulse"
                    : idx <= Math.max(...Array.from(completedBlocks), -1) + 1
                      ? "bg-muted hover:bg-muted-foreground/30 cursor-pointer"
                      : "bg-muted/50"
              }`}
              title={sortedBlocks[idx]?.title}
            />
          ))}
        </div>
      </div>

      {/* Block header */}
      <div className="flex items-center gap-3 py-3 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BlockIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{activeBlock.title}</p>
          <p className="text-xs text-muted-foreground">
            Étape {activeBlockIdx + 1}/{totalBlocks} — {BLOCK_TYPE_LABELS[activeBlock.type] || activeBlock.type}
          </p>
        </div>
        {isCurrentCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
      </div>

      {/* Block content */}
      <div className="py-2">
        {/* TEXT block */}
        {activeBlock.type === "text" && (
          <div className="space-y-4">
            <div
              className="prose prose-base max-w-none dark:prose-invert leading-loose text-[15px]"
              dangerouslySetInnerHTML={{ __html: (activeBlock.content || "").replace(/\n/g, "<br/><br/>") }}
            />
            {!isCurrentCompleted && (
              <Button className="w-full" onClick={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 300);
                }
              }}>
                <CheckCircle className="w-4 h-4 mr-2" /> J'ai lu ce contenu — Continuer
              </Button>
            )}
          </div>
        )}

        {/* VIDEO block */}
        {(activeBlock.type === "video" || activeBlock.type === "video_quiz") && (
          <div className="space-y-4">
            {activeBlock.videoUrl && (
              <div className="aspect-video rounded-xl overflow-hidden bg-black border">
                {activeBlock.videoUrl.match(/youtube|youtu\.be|vimeo/) ? (
                  <iframe
                    src={(() => {
                      const url = activeBlock.videoUrl || "";
                      const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                      if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
                      const vm = url.match(/vimeo\.com\/(\d+)/);
                      if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
                      return url;
                    })()}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={activeBlock.videoUrl} controls className="w-full h-full" />
                )}
              </div>
            )}
            {activeBlock.type === "video_quiz" ? (
              <PreviewQuizLoader
                blockId={activeBlock.id}
                onComplete={(score, passed) => {
                  if (passed) {
                    setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                    if (activeBlockIdx < totalBlocks - 1) {
                      setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 1500);
                    }
                  }
                }}
              />
            ) : !isCurrentCompleted ? (
              <Button className="w-full" onClick={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 300);
                }
              }}>
                <CheckCircle className="w-4 h-4 mr-2" /> J'ai visionné la vidéo — Continuer
              </Button>
            ) : null}
          </div>
        )}

        {/* QUIZ block */}
        {activeBlock.type === "quiz" && (
          <PreviewQuizLoader
            blockId={activeBlock.id}
            onComplete={(score, passed) => {
              if (passed) {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 1500);
                }
              }
            }}
          />
        )}

        {/* FLASHCARD block */}
        {activeBlock.type === "flashcard" && (
          <PreviewFlashcardPlayer
            cards={(Array.isArray((activeBlock as any).flashcards) ? (activeBlock as any).flashcards : []) as { front: string; back: string }[]}
            onComplete={() => {
              setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
              if (activeBlockIdx < totalBlocks - 1) {
                setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 500);
              }
            }}
          />
        )}

        {/* DOCUMENT block */}
        {activeBlock.type === "document" && (
          <div className="space-y-4">
            <div className="border rounded-xl p-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">{activeBlock.title}</p>
              {activeBlock.content && (
                <p className="text-sm text-muted-foreground mt-2">{activeBlock.content}</p>
              )}
              {(activeBlock as any).documentUrl && (
                <Button variant="outline" className="mt-3" onClick={() => window.open((activeBlock as any).documentUrl, "_blank")}>
                  <Download className="w-4 h-4 mr-2" /> Télécharger le document
                </Button>
              )}
            </div>
            {!isCurrentCompleted && (
              <Button className="w-full" onClick={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 300);
                }
              }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Document consulté — Continuer
              </Button>
            )}
          </div>
        )}

        {/* IMAGE block */}
        {activeBlock.type === "image" && (
          <div className="space-y-4">
            {activeBlock.imageUrls && Array.isArray(activeBlock.imageUrls) && (
              <div className="grid grid-cols-2 gap-3">
                {(activeBlock.imageUrls as string[]).map((url, i) => (
                  <img key={i} src={url} alt={`Image ${i + 1}`} className="rounded-lg border w-full object-cover" />
                ))}
              </div>
            )}
            {activeBlock.content && <p className="text-sm text-muted-foreground">{activeBlock.content}</p>}
            {!isCurrentCompleted && (
              <Button className="w-full" onClick={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 300);
                }
              }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Contenu visualisé — Continuer
              </Button>
            )}
          </div>
        )}

        {/* SURVEY block */}
        {activeBlock.type === "survey" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
              <ClipboardCheck className="w-4 h-4" />
              <span>Sondage — Vos réponses ne sont pas notées</span>
            </div>
            <PreviewQuizLoader
              blockId={activeBlock.id}
              onComplete={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 1000);
                }
              }}
            />
          </div>
        )}

        {/* ASSIGNMENT block */}
        {activeBlock.type === "assignment" && (
          <div className="space-y-4">
            <div className="border rounded-xl p-6">
              <ClipboardCheck className="w-10 h-10 text-primary/40 mb-3" />
              <p className="font-medium mb-2">Évaluation formative</p>
              {activeBlock.content && (
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: (activeBlock.content || "").replace(/\n/g, "<br/>") }} />
              )}
            </div>
            {!isCurrentCompleted && (
              <Button className="w-full" onClick={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 300);
                }
              }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Évaluation terminée — Continuer
              </Button>
            )}
          </div>
        )}

        {/* Generic fallback for other block types */}
        {!["text", "video", "video_quiz", "quiz", "flashcard", "document", "image", "survey", "assignment"].includes(activeBlock.type) && (
          <div className="space-y-4">
            <div className="border rounded-xl p-6 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">{activeBlock.title}</p>
              {activeBlock.content && (
                <div className="prose prose-sm max-w-none dark:prose-invert mt-3" dangerouslySetInnerHTML={{ __html: (activeBlock.content || "").replace(/\n/g, "<br/>") }} />
              )}
            </div>
            {!isCurrentCompleted && (
              <Button className="w-full" onClick={() => {
                setCompletedBlocks((prev) => new Set(prev).add(activeBlockIdx));
                if (activeBlockIdx < totalBlocks - 1) {
                  setTimeout(() => setActiveBlockIdx(activeBlockIdx + 1), 300);
                }
              }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Marquer comme terminé — Continuer
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      {isCurrentCompleted && (
        <div className="flex gap-3 pt-2 border-t">
          {activeBlockIdx > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setActiveBlockIdx(activeBlockIdx - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
            </Button>
          )}
          {activeBlockIdx < totalBlocks - 1 && (
            <Button className="flex-1" onClick={() => setActiveBlockIdx(activeBlockIdx + 1)}>
              Étape suivante <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Elearning() {
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editModule, setEditModule] = useState<ElearningModule | undefined>();
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null);
  const [immersiveModuleId, setImmersiveModuleId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState("");
  const [aiProgramId, setAiProgramId] = useState("");
  const [aiSessionId, setAiSessionId] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPathType, setAiPathType] = useState("combined");
  const [aiDuration, setAiDuration] = useState("moyen");
  const [aiDurationMinutes, setAiDurationMinutes] = useState<number | "">("");
  const [aiBlockTypes, setAiBlockTypes] = useState<string[]>(["text", "quiz", "flashcard"]);
  const aiFileRef = useRef<HTMLInputElement>(null);
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
    onError: (err: any) => toast({ title: "Erreur lors de la suppression", description: err?.message || "", variant: "destructive" }),
  });

  const publishModuleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/elearning-modules/${id}`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      const labels: Record<string, string> = { published: "Module publié — visible par les apprenants", draft: "Module dépublié — masqué pour les apprenants", archived: "Module archivé" };
      toast({ title: labels[vars.status] || "Statut mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors du changement de statut", variant: "destructive" }),
  });

  const { data: globalTemplateBlocks } = useQuery<ElearningBlock[]>({
    queryKey: ["/api/elearning-blocks/templates"],
  });

  // Module templates state
  const [importModuleDialogOpen, setImportModuleDialogOpen] = useState(false);
  const [importModuleTarget, setImportModuleTarget] = useState<ElearningModule | undefined>();
  const [importModuleProgramId, setImportModuleProgramId] = useState("");
  const [importModuleSessionId, setImportModuleSessionId] = useState("");

  const templateModules = modules?.filter((m: any) => m.isTemplate) || [];

  const seedDefaultTemplatesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/elearning-modules/seed-defaults", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      toast({ title: "Modules-types par défaut créés avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création des modèles", variant: "destructive" }),
  });

  const duplicateModuleMutation = useMutation({
    mutationFn: ({ id, programId, sessionId }: { id: string; programId?: string; sessionId?: string }) =>
      apiRequest("POST", `/api/elearning-modules/${id}/duplicate`, { programId, sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      setImportModuleDialogOpen(false);
      setImportModuleTarget(undefined);
      setImportModuleProgramId("");
      setImportModuleSessionId("");
      toast({ title: "Module-type importé dans le parcours" });
    },
    onError: () => toast({ title: "Erreur lors de l'import", variant: "destructive" }),
  });

  const removeTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/elearning-modules/${id}`, { isTemplate: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      toast({ title: "Module retiré des modules-types" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const handleAiGenerate = async () => {
    if (!aiFile) return;
    setAiGenerating(true);
    try {
      const formData = new FormData();
      formData.append("file", aiFile);
      if (aiTitle) formData.append("title", aiTitle);
      if (aiProgramId && aiProgramId !== "none") formData.append("programId", aiProgramId);
      if (aiSessionId && aiSessionId !== "none") formData.append("sessionId", aiSessionId);
      formData.append("pathType", aiPathType);
      formData.append("duration", aiDuration);
      if (aiDurationMinutes && typeof aiDurationMinutes === "number") {
        formData.append("durationMinutes", aiDurationMinutes.toString());
      }
      if (aiBlockTypes.length > 0) formData.append("blockTypes", aiBlockTypes.join(","));

      const resp = await fetch("/api/elearning-modules/generate-from-document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || "Erreur lors de la génération");
      }
      const result = await resp.json();
      queryClient.invalidateQueries({ queryKey: ["/api/elearning-modules"] });
      setAiDialogOpen(false);
      setAiFile(null);
      setAiTitle("");
      setAiProgramId("");
      setAiSessionId("");
      setAiPathType("combined");
      setAiDuration("moyen");
      setAiBlockTypes(["text", "quiz", "flashcard"]);
      toast({ title: result.message || "Parcours généré avec succès" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

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
    <>
    <PageLayout>
      <PageHeader title="E-Learning" subtitle="Gérez vos modules de formation en ligne" />

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules"><BookOpen className="w-4 h-4 mr-2" />Modules</TabsTrigger>
          <TabsTrigger value="module-templates"><Layers className="w-4 h-4 mr-2" />Modules-types{templateModules.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{templateModules.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="templates"><Library className="w-4 h-4 mr-2" />Blocs-types{(globalTemplateBlocks?.length ?? 0) > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{globalTemplateBlocks?.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="resources"><FileText className="w-4 h-4 mr-2" />Ressources</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Générer avec l'IA
          </Button>
          <Button onClick={() => { setEditModule(undefined); setModuleDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau module
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un module..." className="sm:max-w-sm" />
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
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
        <Card className="overflow-hidden">
          <CardContent className="p-2 sm:p-4">
            <Accordion type="multiple" className="w-full">
              {filtered.map((mod) => {
                const session = sessions?.find((s) => s.id === mod.sessionId);
                const program = programs?.find((p) => p.id === mod.programId);
                return (
                  <AccordionItem key={mod.id} value={mod.id}>
                    <AccordionTrigger className="hover:no-underline overflow-hidden">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2 overflow-hidden">
                        <span className="text-xs font-mono text-muted-foreground w-6">
                          #{mod.orderIndex}
                        </span>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate max-w-[200px] sm:max-w-none">{mod.title}</span>
                            <ModuleStatusBadge status={mod.status} />
                            {(mod as any).pathType === "learning" && (
                              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-[10px] px-1.5 py-0">
                                <BookOpen className="w-3 h-3 mr-1" />Apprentissage
                              </Badge>
                            )}
                            {(mod as any).pathType === "assessment" && (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-[10px] px-1.5 py-0">
                                <Target className="w-3 h-3 mr-1" />Évaluation
                              </Badge>
                            )}
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
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {mod.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 hidden sm:inline-flex"
                              title="Publier"
                              onClick={() => publishModuleMutation.mutate({ id: mod.id, status: "published" })}
                              disabled={publishModuleMutation.isPending}
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />
                              <span className="text-xs font-medium">Publier</span>
                            </Button>
                          )}
                          {mod.status === "published" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hidden sm:inline-flex"
                              title="Depublier"
                              onClick={() => publishModuleMutation.mutate({ id: mod.id, status: "draft" })}
                              disabled={publishModuleMutation.isPending}
                            >
                              <EyeOffIcon className="w-3.5 h-3.5 mr-1" />
                              <span className="text-xs font-medium">Depublier</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hidden sm:inline-flex"
                            title="Mode immersif"
                            onClick={() => setImmersiveModuleId(mod.id)}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {mod.status === "draft" && (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => publishModuleMutation.mutate({ id: mod.id, status: "published" })}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Publier
                                </DropdownMenuItem>
                              )}
                              {mod.status === "published" && (
                                <DropdownMenuItem
                                  className="text-amber-600"
                                  onClick={() => publishModuleMutation.mutate({ id: mod.id, status: "draft" })}
                                >
                                  <EyeOffIcon className="w-4 h-4 mr-2" />
                                  Depublier
                                </DropdownMenuItem>
                              )}
                              {mod.status === "archived" && (
                                <DropdownMenuItem
                                  onClick={() => publishModuleMutation.mutate({ id: mod.id, status: "draft" })}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Reactiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setPreviewModuleId(mod.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Apercu rapide
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setImmersiveModuleId(mod.id)}>
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Mode immersif
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditModule(mod); setModuleDialogOpen(true); }}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {mod.status !== "archived" && (
                                <DropdownMenuItem
                                  className="text-muted-foreground"
                                  onClick={() => publishModuleMutation.mutate({ id: mod.id, status: "archived" })}
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteModuleMutation.mutate(mod.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(open) => { setAiDialogOpen(open); if (!open) { setAiFile(null); setAiTitle(""); setAiPathType("combined"); setAiDuration("moyen"); setAiBlockTypes(["text", "quiz", "flashcard"]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Générer un parcours avec l'IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uploadez un cours (PDF ou Word) et l'IA créera automatiquement un parcours d'apprentissage interactif avec des blocs de texte, des quiz et des flashcards.
            </p>
            <div className="space-y-2">
              <Label>Fichier du cours (PDF ou Word)</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${aiFile ? "border-green-400 bg-green-50 dark:bg-green-900/10" : "border-muted-foreground/25 hover:border-primary/50"}`}
                onClick={() => aiFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file && (file.type === "application/pdf" || file.name.endsWith(".docx") || file.name.endsWith(".doc"))) {
                    setAiFile(file);
                  }
                }}
              >
                <input
                  ref={aiFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAiFile(file);
                  }}
                />
                {aiFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">{aiFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(aiFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquez ou glissez un fichier PDF / Word ici</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Titre du module (optionnel)</Label>
              <Input
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
                placeholder="Laissez vide pour un titre automatique"
              />
            </div>
            <div className="space-y-2">
              <Label>Type de parcours</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "combined", label: "Combiné", desc: "Textes + Quiz + Flashcards", icon: <Layers className="w-5 h-5" />, color: "blue" },
                  { value: "learning", label: "Apprentissage", desc: "Textes + Flashcards uniquement", icon: <BookOpen className="w-5 h-5" />, color: "green" },
                  { value: "assessment", label: "Évaluation", desc: "Quiz uniquement", icon: <Target className="w-5 h-5" />, color: "orange" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiPathType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                      aiPathType === opt.value
                        ? opt.color === "blue"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                          : opt.color === "green"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm"
                          : "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className={aiPathType === opt.value ? (opt.color === "blue" ? "text-blue-600" : opt.color === "green" ? "text-green-600" : "text-orange-600") : "text-muted-foreground"}>{opt.icon}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Duration selector */}
            <div className="space-y-2">
              <Label>Durée du parcours</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "court", label: "Court", desc: "~15 min", icon: <Zap className="w-5 h-5" /> },
                  { value: "moyen", label: "Moyen", desc: "~45-60 min", icon: <Timer className="w-5 h-5" /> },
                  { value: "long", label: "Long", desc: "~1h30-2h", icon: <Layers className="w-5 h-5" /> },
                  { value: "custom", label: "Précis", desc: "En minutes", icon: <Clock className="w-5 h-5" /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setAiDuration(opt.value); if (opt.value !== "custom") setAiDurationMinutes(""); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                      aiDuration === opt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className={aiDuration === opt.value ? "text-primary" : "text-muted-foreground"}>{opt.icon}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
              {aiDuration === "custom" && (
                <div className="flex items-center gap-3 pt-2">
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    placeholder="Ex: 30"
                    value={aiDurationMinutes}
                    onChange={(e) => setAiDurationMinutes(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                  {typeof aiDurationMinutes === "number" && aiDurationMinutes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      → ~{Math.max(2, Math.round(aiDurationMinutes / 7))} blocs
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Block types selector */}
            <div className="space-y-2">
              <Label>Types de blocs souhaites</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: "text", label: "Texte", icon: <FileText className="w-4 h-4" />, color: "text-blue-500" },
                  { value: "quiz", label: "Quiz QCM", icon: <HelpCircle className="w-4 h-4" />, color: "text-amber-500" },
                  { value: "flashcard", label: "Flashcards", icon: <Layers className="w-4 h-4" />, color: "text-pink-500" },
                  { value: "scenario", label: "Scenario", icon: <GitBranch className="w-4 h-4" />, color: "text-cyan-500" },
                  { value: "simulation", label: "Exercice pratique", icon: <Gamepad2 className="w-4 h-4" />, color: "text-lime-500" },
                ].map((opt) => {
                  const isSelected = aiBlockTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAiBlockTypes(prev =>
                          prev.includes(opt.value)
                            ? prev.filter(t => t !== opt.value)
                            : [...prev, opt.value]
                        );
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30 opacity-60"
                      }`}
                    >
                      <span className={isSelected ? opt.color : "text-muted-foreground"}>{opt.icon}</span>
                      <span className="text-xs font-medium">{opt.label}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
              {aiBlockTypes.length === 0 && (
                <p className="text-xs text-destructive">Selectionnez au moins un type de bloc</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formation</Label>
                <Select value={aiProgramId} onValueChange={setAiProgramId}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {programs?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={aiSessionId} onValueChange={setAiSessionId}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {sessions?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAiGenerate}
              disabled={!aiFile || aiGenerating || aiBlockTypes.length === 0}
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours... (peut prendre 30s)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer le parcours
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog — Full immersive test mode */}
      <Dialog open={!!previewModuleId} onOpenChange={(open) => { if (!open) setPreviewModuleId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Mode test — Expérience apprenant
            </DialogTitle>
          </DialogHeader>
          {previewModuleId && <ModulePreview moduleId={previewModuleId} />}
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="module-templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Les modules-types sont des modèles complets réutilisables (accueil, évaluation, satisfaction...) que vous pouvez importer dans n'importe quel parcours de formation.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDefaultTemplatesMutation.mutate()}
              disabled={seedDefaultTemplatesMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {seedDefaultTemplatesMutation.isPending ? "Chargement..." : "Charger modèles Digiforma"}
            </Button>
          </div>
          {templateModules.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Aucun module-type"
              description="Cliquez sur « Charger modèles Digiforma » pour importer les modules-types standards (accueil, évaluations, satisfaction, bilan, règlement)."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templateModules.map((mod: any) => (
                <Card key={mod.id} className="relative overflow-hidden border-indigo-200 dark:border-indigo-800">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{mod.title}</h3>
                      <Badge variant="outline" className="text-indigo-600 border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-[10px] px-1.5 py-0 shrink-0">
                        {mod.pathType === "assessment" ? "Évaluation" : mod.pathType === "learning" ? "Apprentissage" : "Combiné"}
                      </Badge>
                    </div>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{mod.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          setImportModuleTarget(mod);
                          setImportModuleProgramId("");
                          setImportModuleSessionId("");
                          setImportModuleDialogOpen(true);
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Importer dans un parcours
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => removeTemplateMutation.mutate(mod.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Les blocs-types sont des contenus réutilisables (texte, quiz, vidéo, flashcards...) que vous pouvez importer dans n'importe quel module de formation.
          </p>
          {!globalTemplateBlocks || globalTemplateBlocks.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Aucun bloc-type"
              description="Sauvegardez un bloc existant comme bloc-type depuis un module (menu ⋯ → Sauvegarder comme bloc-type)"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {globalTemplateBlocks.map((tb) => (
                <Card key={tb.id} className="relative overflow-hidden border-indigo-200 dark:border-indigo-800">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <BlockTypeIcon type={tb.type} />
                        <h3 className="font-semibold text-sm truncate">{tb.title}</h3>
                      </div>
                      <BlockTypeLabel type={tb.type} />
                    </div>
                    {tb.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{tb.content}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-indigo-600 border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-[10px] px-1.5 py-0">
                        <Library className="w-3 h-3 mr-1" />Bloc-type
                      </Badge>
                      {(tb as any).duration && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Clock className="w-3 h-3 mr-1" />{(tb as any).duration} min
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources">
          <SessionResourceManager />
        </TabsContent>
      </Tabs>

    </PageLayout>

    {/* Import module-type dialog */}
    <Dialog open={importModuleDialogOpen} onOpenChange={setImportModuleDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-indigo-500" />
            Importer le module-type
          </DialogTitle>
        </DialogHeader>
        {importModuleTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200">
              <p className="font-medium text-sm">{importModuleTarget.title}</p>
              {importModuleTarget.description && <p className="text-xs text-muted-foreground mt-1">{importModuleTarget.description}</p>}
            </div>
            <div className="space-y-2">
              <Label>Formation cible *</Label>
              <Select value={importModuleProgramId} onValueChange={setImportModuleProgramId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une formation" /></SelectTrigger>
                <SelectContent>
                  {programs?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session (optionnel)</Label>
              <Select value={importModuleSessionId} onValueChange={setImportModuleSessionId}>
                <SelectTrigger><SelectValue placeholder="Toutes les sessions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune session spécifique</SelectItem>
                  {sessions?.filter((s) => !importModuleProgramId || s.programId === importModuleProgramId).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!importModuleProgramId || duplicateModuleMutation.isPending}
              onClick={() => duplicateModuleMutation.mutate({
                id: importModuleTarget.id,
                programId: importModuleProgramId,
                sessionId: importModuleSessionId && importModuleSessionId !== "none" ? importModuleSessionId : undefined,
              })}
            >
              {duplicateModuleMutation.isPending ? "Import en cours..." : "Importer le module"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Immersive full-screen preview */}
    {immersiveModuleId && (() => {
      const mod = modules?.find((m) => m.id === immersiveModuleId);
      if (!mod) return null;
      return createPortal(
        <ImmersiveModuleViewer
          initialModuleId={immersiveModuleId}
          initialBlockIndex={0}
          modules={[mod]}
          progressData={[]}
          previewMode={true}
          onExit={() => setImmersiveModuleId(null)}
        />,
        document.body
      );
    })()}
    </>
  );
}
