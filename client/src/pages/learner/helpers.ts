import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

// Types
export interface ForumPost {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  authorRole: string | null;
  title: string;
  content: string;
  pinned: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  createdAt: string | null;
}

export interface UserDocument {
  id: string;
  ownerId: string;
  ownerType: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

export interface LearnerSessionData {
  session: import("@shared/schema").Session;
  program: { id: string; title: string; description: string; duration: number; modality: string; level: string } | null;
  trainer: { firstName: string; lastName: string; email: string; specialty: string } | null;
  enrollmentStatus: string;
}

// Constants
export const KAHOOT_COLORS = [
  "bg-red-500 hover:bg-red-600 text-white",
  "bg-blue-500 hover:bg-blue-600 text-white",
  "bg-green-500 hover:bg-green-600 text-white",
  "bg-yellow-500 hover:bg-yellow-600 text-white",
];

export const PERIOD_LABELS: Record<string, string> = {
  matin: "Matin",
  "apres-midi": "Apr\u00e8s-midi",
  journee: "Journ\u00e9e enti\u00e8re",
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  convention: "Convention de formation",
  contrat_particulier: "Contrat particulier",
  contrat_vae: "Contrat VAE",
  politique_confidentialite: "Politique de confidentialit\u00e9",
  devis: "Devis",
  devis_sous_traitance: "Devis sous-traitance",
  facture: "Facture",
  facture_blended: "Facture formation blended",
  facture_specifique: "Facture formation sp\u00e9cifique",
  convocation: "Convocation",
  attestation: "Attestation de formation",
  certificat: "Certificat",
  programme: "Programme de formation",
  reglement: "R\u00e8glement int\u00e9rieur",
  etiquette_envoi: "\u00c9tiquette d'envoi postal",
  bpf: "Bilan P\u00e9dagogique et Financier",
  autre: "Document",
};

// Helper functions
export function getVideoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
