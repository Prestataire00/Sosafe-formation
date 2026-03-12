import {
  Video,
  HelpCircle,
  Package,
  ClipboardCheck,
  Globe,
  MonitorPlay,
  Download,
  Image,
  BarChart3,
  FileText,
  Layers,
  GitBranch,
  Gamepad2,
} from "lucide-react";

export function BlockTypeIcon({ type }: { type: string }) {
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
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

export function BlockTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    text: "Texte",
    video: "Video",
    quiz: "Quiz",
    video_quiz: "Video + Questions",
    scorm: "Module SCORM",
    assignment: "Evaluation formative",
    flashcard: "Flashcards",
    resource_web: "Ressource web",
    virtual_class: "Classe virtuelle",
    document: "Document",
    image: "Image / Galerie",
    survey: "Sondage",
    scenario: "Scenario a embranchements",
    simulation: "Mise en situation",
  };
  return <span className="text-xs text-muted-foreground">{labels[type] || type}</span>;
}
