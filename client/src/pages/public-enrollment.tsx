
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, uploadFile } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINEE_PROFESSIONS, FUNDING_MODES, PROFILE_TYPES } from "@shared/schema";
import type { ProgramCustomField } from "@shared/schema";
import {
  GraduationCap, CalendarDays, MapPin, Users, Search,
  ArrowLeft, CheckCircle2, Clock, Euro, Monitor, Building2,
  Upload, FileText, X, Loader2, ShieldCheck, AlertTriangle, RefreshCw, RotateCcw, ArrowRight,
} from "lucide-react";

type Prerequisite = {
  id: string;
  requiresRpps: boolean | null;
  requiresDiploma: boolean | null;
  maxMonthsSinceCompletion: number | null;
  minMonthsSinceCompletion: number | null;
  requiredProfessions: string[] | null;
  description: string | null;
};

type PublicSession = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  modality: string;
  maxParticipants: number;
  enrollmentCount: number;
  remainingSpots: number;
  waitlistCount: number;
  isFull: boolean;
  status: string;
  program: {
    id: string;
    title: string;
    duration: number;
    price: number;
    categories: string[] | null;
    fundingTypes: string[] | null;
    certifying: boolean | null;
    recyclingMonths: number | null;
    customFields: ProgramCustomField[] | null;
  } | null;
  prerequisites: Prerequisite[];
};

type Step = "sessions" | "afgsu_check" | "prerequisites" | "form" | "confirmation";

// AFGSU eligibility logic (imported from afgsu-simulator)
const AFGSU2_PROFESSIONS = [
  { value: "medecin", label: "Médecin" },
  { value: "chirurgien_dentiste", label: "Chirurgien-dentiste" },
  { value: "sage_femme", label: "Sage-femme" },
  { value: "pharmacien", label: "Pharmacien" },
  { value: "infirmier", label: "Infirmier(ère)" },
  { value: "infirmier_iade", label: "Infirmier(ère) anesthésiste (IADE)" },
  { value: "infirmier_ibode", label: "Infirmier(ère) de bloc (IBODE)" },
  { value: "infirmier_ipa", label: "Infirmier(ère) en pratique avancée (IPA)" },
  { value: "infirmier_puericultrice", label: "Puéricultrice" },
  { value: "masseur_kinesitherapeute", label: "Masseur-kinésithérapeute" },
  { value: "pedicure_podologue", label: "Pédicure-podologue" },
  { value: "ergotherapeute", label: "Ergothérapeute" },
  { value: "psychomotricien", label: "Psychomotricien(ne)" },
  { value: "orthophoniste", label: "Orthophoniste" },
  { value: "orthoptiste", label: "Orthoptiste" },
  { value: "audioprothesiste", label: "Audioprothésiste" },
  { value: "opticien_lunetier", label: "Opticien-lunetier" },
  { value: "dieteticien", label: "Diététicien(ne)" },
  { value: "manipulateur_radio", label: "Manipulateur d'électroradiologie" },
  { value: "technicien_labo", label: "Technicien de laboratoire" },
  { value: "preparateur_pharmacie", label: "Préparateur en pharmacie" },
  { value: "aide_soignant", label: "Aide-soignant(e)" },
  { value: "auxiliaire_puericulture", label: "Auxiliaire de puériculture" },
  { value: "ambulancier", label: "Ambulancier(ère)" },
];

const AFGSU1_PROFESSIONS = [
  { value: "administratif_sante", label: "Personnel administratif (établissement de santé)" },
  { value: "technique_sante", label: "Personnel technique (établissement de santé)" },
  { value: "ash", label: "Agent de service hospitalier (ASH)" },
  { value: "brancardier", label: "Brancardier" },
  { value: "secretaire_medicale", label: "Secrétaire médicale" },
  { value: "agent_accueil_sante", label: "Agent d'accueil (établissement de santé)" },
  { value: "autre_sante", label: "Autre personnel d'un établissement de santé" },
];

const NOT_ELIGIBLE_AFGSU = [
  { value: "hors_sante", label: "Je ne travaille pas dans un établissement de santé" },
  { value: "etudiant_hors_sante", label: "Étudiant(e) hors filière santé" },
  { value: "autre", label: "Autre (secteur privé, hors santé)" },
];

const ALL_AFGSU_PROFESSIONS = [
  { group: "Professions médicales et paramédicales (AFGSU 2)", items: AFGSU2_PROFESSIONS },
  { group: "Personnel non médical en établissement de santé (AFGSU 1)", items: AFGSU1_PROFESSIONS },
  { group: "Hors établissement de santé", items: NOT_ELIGIBLE_AFGSU },
];

type AfgsuResult = {
  eligible: "afgsu2" | "afgsu1" | "none";
  recycling: "needed" | "not_needed" | "not_applicable";
  message: string;
  details: string[];
};

function computeAfgsuEligibility(
  profession: string,
  hasExisting: boolean,
  existingLevel: string,
  existingDate: string,
): AfgsuResult {
  const isAfgsu2 = AFGSU2_PROFESSIONS.some((p) => p.value === profession);
  const isAfgsu1 = AFGSU1_PROFESSIONS.some((p) => p.value === profession);

  if (!isAfgsu2 && !isAfgsu1) {
    return {
      eligible: "none",
      recycling: "not_applicable",
      message: "Non éligible à l'AFGSU",
      details: [
        "L'AFGSU est réservée aux personnels travaillant dans un établissement de santé ou médico-social.",
        "Si vous pensez être éligible, contactez-nous directement.",
      ],
    };
  }

  const level: "afgsu2" | "afgsu1" = isAfgsu2 ? "afgsu2" : "afgsu1";
  const levelLabel = level === "afgsu2" ? "AFGSU 2" : "AFGSU 1";

  if (hasExisting && existingDate) {
    const obtained = new Date(existingDate);
    const years = (Date.now() - obtained.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years >= 4) {
      return {
        eligible: level,
        recycling: "needed",
        message: `Recyclage ${levelLabel} nécessaire`,
        details: [
          `Votre dernier AFGSU date de plus de 4 ans.`,
          `Vous devez suivre une formation de recyclage ${levelLabel} (1 journée).`,
          level === "afgsu2" && existingLevel === "afgsu1"
            ? `Attention : vous aviez un AFGSU 1. Pour passer à l'AFGSU 2, formation initiale complète (3 jours) requise.`
            : "",
        ].filter(Boolean),
      };
    }
    return {
      eligible: level,
      recycling: "not_needed",
      message: `${levelLabel} en cours de validité`,
      details: [
        `Votre ${existingLevel === "afgsu2" ? "AFGSU 2" : "AFGSU 1"} est valide jusqu'au ${new Date(obtained.getTime() + 4 * 365.25 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}.`,
        `Le recyclage sera nécessaire à cette date.`,
      ],
    };
  }

  return {
    eligible: level,
    recycling: "not_applicable",
    message: `Éligible à l'${levelLabel} (formation initiale)`,
    details: [
      `En tant que ${ALL_AFGSU_PROFESSIONS.flatMap((g) => g.items).find((p) => p.value === profession)?.label || profession}, vous êtes éligible à l'${levelLabel}.`,
      level === "afgsu2"
        ? "Formation initiale AFGSU 2 : 3 jours (21 heures)."
        : "Formation initiale AFGSU 1 : 2 jours (14 heures).",
    ],
  };
}

function isAfgsuSession(session: PublicSession | null): boolean {
  if (!session) return false;
  const title = (session.program?.title || session.title || "").toLowerCase();
  return title.includes("afgsu") || title.includes("a.f.g.s.u");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatModality(m: string) {
  switch (m) {
    case "presentiel": return "Présentiel";
    case "distanciel": return "Distanciel";
    case "blended": return "Mixte";
    default: return m;
  }
}

function ModalityIcon({ modality }: { modality: string }) {
  if (modality === "distanciel") return <Monitor className="w-4 h-4" />;
  if (modality === "blended") return <Monitor className="w-4 h-4" />;
  return <MapPin className="w-4 h-4" />;
}

export default function PublicEnrollment() {
  const [step, setStep] = useState<Step>("sessions");
  const [selectedSession, setSelectedSession] = useState<PublicSession | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    profession: "",
    profileType: "profession_liberale",
    fundingMode: "",
    address: "",
    city: "",
    postalCode: "",
    diplomaNumber: "",
    dateOfBirth: "",
    managerName: "",
    managerEmail: "",
  });
  const [knownTrainee, setKnownTrainee] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [prerequisitesWarnings, setPrerequisitesWarnings] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ title: string; fileUrl: string; fileName: string; fileSize: number; mimeType: string }>>([]);
  const [uploading, setUploading] = useState(false);
  // AFGSU eligibility state
  const [afgsuProfession, setAfgsuProfession] = useState("");
  const [afgsuHasExisting, setAfgsuHasExisting] = useState<boolean | null>(null);
  const [afgsuExistingLevel, setAfgsuExistingLevel] = useState("");
  const [afgsuExistingDate, setAfgsuExistingDate] = useState("");
  const [afgsuResult, setAfgsuResult] = useState<AfgsuResult | null>(null);
  const [afgsuStep, setAfgsuStep] = useState<1 | 2 | 3 | 4>(1);
  const [afgsuDocs, setAfgsuDocs] = useState<Array<{ title: string; fileUrl: string; fileName: string; fileSize: number; mimeType: string }>>([]);
  const [afgsuDocUploading, setAfgsuDocUploading] = useState(false);
  // Prerequisite verification state
  const [verificationMode, setVerificationMode] = useState<"rpps" | "diploma" | null>(null);
  const [rppsNumber, setRppsNumber] = useState("");
  const [diplomaDocs, setDiplomaDocs] = useState<Array<{ title: string; fileUrl: string; fileName: string; fileSize: number; mimeType: string }>>([]);
  const [diplomaUploading, setDiplomaUploading] = useState(false);
  // Recycling check state
  const [recyclingEmail, setRecyclingEmail] = useState("");
  const [recyclingResult, setRecyclingResult] = useState<{
    found: boolean;
    certification?: {
      label: string;
      obtainedAt: string;
      expiresAt: string;
      isValid: boolean;
      remainingMonths: number;
      recyclingMonths: number;
    };
  } | null>(null);
  const { toast } = useToast();

  // Pre-fill email from URL parameter (e.g. /inscription?email=john@example.com)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
      checkEmailMutation.mutate(emailParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If sessionId is in URL, only fetch that session for faster loading
  const urlSessionId = new URLSearchParams(window.location.search).get("sessionId");

  const { data: sessions, isLoading } = useQuery<PublicSession[]>({
    queryKey: ["/api/public/sessions", urlSessionId],
    queryFn: () => fetch(`/api/public/sessions${urlSessionId ? `?sessionId=${urlSessionId}` : ""}`, { credentials: "include" }).then(r => r.json()),
  });

  const checkEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/public/check-email?email=${encodeURIComponent(email)}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.exists) {
        setFormData((prev) => ({
          ...prev,
          firstName: data.trainee.firstName || prev.firstName,
          lastName: data.trainee.lastName || prev.lastName,
          phone: data.trainee.phone || prev.phone,
          company: data.trainee.company || prev.company,
          profession: data.trainee.profession || prev.profession,
          profileType: data.trainee.profileType || prev.profileType,
          fundingMode: data.trainee.fundingMode || prev.fundingMode,
          address: data.trainee.address || prev.address,
          city: data.trainee.city || prev.city,
          postalCode: data.trainee.postalCode || prev.postalCode,
          diplomaNumber: data.trainee.diplomaNumber || prev.diplomaNumber,
          dateOfBirth: data.trainee.dateOfBirth || prev.dateOfBirth,
          managerName: data.trainee.managerName || prev.managerName,
          managerEmail: data.trainee.managerEmail || prev.managerEmail,
        }));
        setKnownTrainee(data.trainee.firstName);
        if (data.trainee.rppsNumber) {
          setRppsNumber(data.trainee.rppsNumber);
        }
      } else {
        setKnownTrainee(null);
      }
    },
  });

  const checkRecyclingMutation = useMutation({
    mutationFn: async ({ email, programId }: { email: string; programId: string }) => {
      const res = await fetch(
        `/api/public/check-recycling?email=${encodeURIComponent(email)}&programId=${encodeURIComponent(programId)}`
      );
      return res.json();
    },
    onSuccess: (data) => {
      setRecyclingResult(data);
    },
  });

  // Poll document AI analysis status (Issue 2)
  type DocStatus = {
    id: string;
    status: string;
    aiStatus: string;
    aiExtractedDate: string | null;
    aiConfidence: string | null;
    aiError: string | null;
  };

  const { data: docStatuses } = useQuery<DocStatus[]>({
    queryKey: ["document-statuses", documentIds],
    queryFn: async () => {
      const results = await Promise.all(
        documentIds.map(async (id) => {
          const res = await fetch(`/api/public/documents/${id}/status`);
          return res.json();
        })
      );
      return results;
    },
    enabled: documentIds.length > 0 && step === "confirmation",
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      const allDone = data.every(
        (d: DocStatus) => d.aiStatus === "completed" || d.aiStatus === "failed"
      );
      return allDone ? false : 3000;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/public/enrollments", data),
    onSuccess: async (res) => {
      const result = await res.json();
      setConfirmationData(result);
      if (result.documentIds) setDocumentIds(result.documentIds);
      if (result.prerequisitesWarnings) setPrerequisitesWarnings(result.prerequisitesWarnings);
      setStep("confirmation");
    },
    onError: async (error: any) => {
      let title = "Inscription impossible";
      let description = "";
      try {
        if (error.errors && Array.isArray(error.errors)) {
          description = error.errors.join("\n");
        } else if (error.message) {
          description = error.message;
        }
      } catch {}
      toast({ title, description: description || "Une erreur est survenue", variant: "destructive", duration: 10000 });
    },
  });

  // Auto-select session from URL parameter
  useEffect(() => {
    if (urlSessionId && sessions && sessions.length > 0 && !selectedSession) {
      const target = sessions.find(s => s.id === urlSessionId);
      if (target) {
        handleSelectSession(target);
      }
    }
  }, [sessions, urlSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPrerequisites = (session: PublicSession) =>
    session.prerequisites && session.prerequisites.length > 0;

  const handleSelectSession = (session: PublicSession) => {
    setSelectedSession(session);
    if (isAfgsuSession(session)) {
      setStep("afgsu_check");
    } else if (hasPrerequisites(session)) {
      setStep("prerequisites");
    } else {
      setStep("form");
    }
  };

  const handleEmailBlur = () => {
    const email = formData.email.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      checkEmailMutation.mutate(email);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `${file.name} dépasse la taille maximale de 10 Mo`, variant: "destructive" });
        continue;
      }
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/public/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          toast({ title: err.message || `Erreur lors de l'upload de ${file.name}`, variant: "destructive" });
          continue;
        }
        const data = await res.json();
        setUploadedDocs((prev) => [...prev, {
          title: file.name,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        }]);
      } catch {
        toast({ title: `Erreur lors de l'upload de ${file.name}`, variant: "destructive" });
      }
    }
    setUploading(false);
  };

  const handleRemoveDoc = (index: number) => {
    setUploadedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDiplomaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDiplomaUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `${file.name} dépasse la taille maximale de 10 Mo`, variant: "destructive" });
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/public/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json();
          toast({ title: err.message || `Erreur lors de l'upload de ${file.name}`, variant: "destructive" });
          continue;
        }
        const data = await res.json();
        setDiplomaDocs((prev) => [...prev, {
          title: file.name,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        }]);
      } catch {
        toast({ title: `Erreur lors de l'upload de ${file.name}`, variant: "destructive" });
      }
    }
    setDiplomaUploading(false);
  };

  const handlePrerequisitesContinue = () => {
    if (verificationMode === "rpps" && !rppsNumber.trim()) {
      toast({ title: "Veuillez saisir votre numéro RPPS", variant: "destructive" });
      return;
    }
    if (verificationMode === "diploma" && diplomaDocs.length === 0) {
      toast({ title: "Veuillez télécharger votre diplôme", variant: "destructive" });
      return;
    }
    setStep("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    const allDocs = [...uploadedDocs, ...diplomaDocs];
    enrollMutation.mutate({
      sessionId: selectedSession.id,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      company: formData.company.trim() || undefined,
      rppsNumber: rppsNumber.trim() || undefined,
      profession: formData.profession || undefined,
      profileType: formData.profileType || undefined,
      fundingMode: formData.fundingMode || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      diplomaNumber: formData.diplomaNumber.trim() || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      managerName: formData.managerName.trim() || undefined,
      managerEmail: formData.managerEmail.trim() || undefined,
      documents: allDocs.length > 0 ? allDocs : undefined,
      customData: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      afgsuEligibility: afgsuResult ? {
        eligible: afgsuResult.eligible,
        recycling: afgsuResult.recycling,
        profession: afgsuProfession,
        existingLevel: afgsuExistingLevel || null,
        existingDate: afgsuExistingDate || null,
      } : undefined,
    });
  };

  const handleBack = () => {
    if (step === "form" && selectedSession && hasPrerequisites(selectedSession)) {
      setStep("prerequisites");
      return;
    }
    if (step === "form" && selectedSession && isAfgsuSession(selectedSession)) {
      setStep("afgsu_check");
      return;
    }
    if (step === "prerequisites" && selectedSession && isAfgsuSession(selectedSession)) {
      setStep("afgsu_check");
      return;
    }
    setStep("sessions");
    setSelectedSession(null);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "", profession: "", profileType: "", fundingMode: "", address: "", city: "", postalCode: "", diplomaNumber: "", dateOfBirth: "", managerName: "", managerEmail: "" });
    setKnownTrainee(null);
    setUploadedDocs([]);
    setVerificationMode(null);
    setRppsNumber("");
    setDiplomaDocs([]);
    setRecyclingEmail("");
    setRecyclingResult(null);
    setAfgsuProfession("");
    setAfgsuHasExisting(null);
    setAfgsuExistingLevel("");
    setAfgsuExistingDate("");
    setAfgsuResult(null);
    setAfgsuStep(1);
    setAfgsuDocs([]);
  };

  const handleBackToSessions = () => {
    setStep("sessions");
    setSelectedSession(null);
    setVerificationMode(null);
    setRppsNumber("");
    setDiplomaDocs([]);
    setRecyclingEmail("");
    setRecyclingResult(null);
    setAfgsuProfession("");
    setAfgsuHasExisting(null);
    setAfgsuExistingLevel("");
    setAfgsuExistingDate("");
    setAfgsuResult(null);
    setAfgsuStep(1);
    setAfgsuDocs([]);
  };

  const handleNewEnrollment = () => {
    setStep("sessions");
    setSelectedSession(null);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "", profession: "", profileType: "", fundingMode: "", address: "", city: "", postalCode: "", diplomaNumber: "", dateOfBirth: "", managerName: "", managerEmail: "" });
    setKnownTrainee(null);
    setConfirmationData(null);
    setUploadedDocs([]);
    setVerificationMode(null);
    setRppsNumber("");
    setDiplomaDocs([]);
    setRecyclingEmail("");
    setRecyclingResult(null);
    setDocumentIds([]);
    setPrerequisitesWarnings([]);
    setAfgsuProfession("");
    setAfgsuHasExisting(null);
    setAfgsuExistingLevel("");
    setAfgsuExistingDate("");
    setAfgsuResult(null);
    setAfgsuStep(1);
    setAfgsuDocs([]);
  };

  const handleAfgsuDocUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAfgsuDocUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `${file.name} dépasse 10 Mo`, variant: "destructive" });
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/public/upload", { method: "POST", body: fd });
        if (!res.ok) continue;
        const data = await res.json();
        setAfgsuDocs((prev) => [...prev, {
          title: file.name,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        }]);
      } catch {}
    }
    setAfgsuDocUploading(false);
  };

  const handleAfgsuContinue = () => {
    if (!afgsuResult || afgsuResult.eligible === "none") return;
    // Merge AFGSU docs into main uploaded docs
    if (afgsuDocs.length > 0) {
      setUploadedDocs((prev) => [...prev, ...afgsuDocs]);
    }
    if (selectedSession && hasPrerequisites(selectedSession)) {
      setStep("prerequisites");
    } else {
      setStep("form");
    }
  };

  const filteredSessions = sessions?.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.program?.title.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.program?.categories?.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa]" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* So'Safe branded header */}
      <div className="w-full bg-[#32373c] text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://www.so-safe.fr/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <img src="/logo-sosafe-white.png" alt="SO'SAFE" className="h-8" />
          </a>
          <nav className="text-sm text-gray-300">
            <a href="https://www.so-safe.fr/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Accueil</a>
            <span className="mx-2">›</span>
            <a href="https://www.so-safe.fr/formations/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Formations</a>
            <span className="mx-2">›</span>
            <span className="text-[#fec700]">Inscription</span>
          </nav>
        </div>
      </div>
      {/* Yellow accent bar */}
      <div className="w-full h-1" style={{ background: "linear-gradient(-45deg, #F6DE14, #F7B136)" }} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#32373c]">Inscription en ligne</h1>
          <p className="text-sm text-gray-500 mt-1">Inscrivez-vous à nos formations</p>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(() => {
            const showAfgsu = selectedSession && isAfgsuSession(selectedSession);
            const showPrereq = selectedSession && hasPrerequisites(selectedSession);
            let stepNum = 1;
            const steps = [
              { key: "sessions", label: "Choix de la session", num: stepNum++ },
              ...(showAfgsu ? [{ key: "afgsu_check", label: "Éligibilité AFGSU", num: stepNum++ }] : []),
              ...(showPrereq ? [{ key: "prerequisites", label: "Prérequis", num: stepNum++ }] : []),
              { key: "form", label: "Vos informations", num: stepNum++ },
              { key: "confirmation", label: "Confirmation", num: stepNum++ },
            ];
            const currentIndex = steps.findIndex((s) => s.key === step);
            return steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-gray-300" />}
                <button
                  type="button"
                  disabled={i >= currentIndex}
                  onClick={() => {
                    if (i < currentIndex) {
                      if (s.key === "sessions") {
                        handleBackToSessions();
                      } else {
                        setStep(s.key as Step);
                      }
                    }
                  }}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    step === s.key
                      ? "text-[#32373c] font-semibold"
                      : i < currentIndex
                      ? "text-green-600 hover:text-green-800 cursor-pointer"
                      : "text-gray-400 cursor-default"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step === s.key
                        ? "bg-[#fec700] text-[#32373c]"
                        : i < currentIndex
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < currentIndex ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </div>
            ));
          })()}
        </div>

        {/* STEP 1: Session selection */}
        {step === "sessions" && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une formation, un lieu, une catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-5 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-2" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSessions && filteredSessions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                    onClick={() => handleSelectSession(session)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-base leading-tight">
                          {session.program?.title || session.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {session.program?.categories && (session.program.categories as string[]).map((cat) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {session.program?.recyclingMonths && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Recyclage {session.program.recyclingMonths / 12} ans
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 shrink-0" />
                          <span>
                            {formatDate(session.startDate)} — {formatDate(session.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <ModalityIcon modality={session.modality} />
                          <span>
                            {formatModality(session.modality)}
                            {session.location ? ` — ${session.location}` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>{session.program?.duration}h de formation</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>
                            {session.isFull ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                Session complète — Liste d'attente ({session.waitlistCount} en attente)
                              </span>
                            ) : (
                              `${session.remainingSpots} place${session.remainingSpots > 1 ? "s" : ""} restante${session.remainingSpots > 1 ? "s" : ""}`
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <div className="flex items-center gap-1 font-semibold text-primary">
                          <Euro className="w-4 h-4" />
                          <span>{session.program?.price ? `${session.program.price} €` : "Sur devis"}</span>
                        </div>

                        {session.program?.fundingTypes && (session.program.fundingTypes as string[]).length > 0 && (
                          <div className="flex gap-1">
                            {(session.program.fundingTypes as string[]).map((ft) => (
                              <Badge key={ft} variant="outline" className="text-xs">
                                {ft}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">Aucune session disponible</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Aucun résultat pour votre recherche. Essayez d'autres termes."
                      : "Il n'y a pas de sessions ouvertes aux inscriptions pour le moment."}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* STEP: AFGSU Eligibility Check */}
        {step === "afgsu_check" && selectedSession && (
          <>
            <Button variant="ghost" size="sm" className="mb-4" onClick={handleBackToSessions}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux sessions
            </Button>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Vérification d'éligibilité AFGSU
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cette formation nécessite de vérifier votre éligibilité. Répondez aux questions ci-dessous.
                </p>
              </CardHeader>
              <CardContent>
                {/* AFGSU sub-step 1: Profession */}
                {afgsuStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Quelle est votre profession ?</h3>
                    {ALL_AFGSU_PROFESSIONS.map((group) => (
                      <div key={group.group}>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                          {group.group}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {group.items.map((p) => (
                            <Button
                              key={p.value}
                              variant={afgsuProfession === p.value ? "default" : "outline"}
                              className="justify-start text-left h-auto py-2.5 px-3 text-sm"
                              onClick={() => setAfgsuProfession(p.value)}
                            >
                              {p.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => {
                          if (NOT_ELIGIBLE_AFGSU.some((p) => p.value === afgsuProfession)) {
                            const res = computeAfgsuEligibility(afgsuProfession, false, "", "");
                            setAfgsuResult(res);
                            setAfgsuStep(4);
                          } else {
                            setAfgsuStep(2);
                          }
                        }}
                        disabled={!afgsuProfession}
                      >
                        Suivant <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* AFGSU sub-step 2: Existing AFGSU? */}
                {afgsuStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Avez-vous déjà un AFGSU ?</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={afgsuHasExisting === true ? "default" : "outline"}
                        className="h-16 text-base"
                        onClick={() => { setAfgsuHasExisting(true); setAfgsuStep(3); }}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> Oui
                      </Button>
                      <Button
                        variant={afgsuHasExisting === false ? "default" : "outline"}
                        className="h-16 text-base"
                        onClick={() => {
                          setAfgsuHasExisting(false);
                          const res = computeAfgsuEligibility(afgsuProfession, false, "", "");
                          setAfgsuResult(res);
                          setAfgsuStep(4);
                        }}
                      >
                        Non
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAfgsuStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Retour
                    </Button>
                  </div>
                )}

                {/* AFGSU sub-step 3: AFGSU details */}
                {afgsuStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Détails de votre AFGSU actuel</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Niveau AFGSU obtenu</Label>
                        <Select value={afgsuExistingLevel} onValueChange={setAfgsuExistingLevel}>
                          <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="afgsu1">AFGSU Niveau 1</SelectItem>
                            <SelectItem value="afgsu2">AFGSU Niveau 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date d'obtention</Label>
                        <Input
                          type="date"
                          value={afgsuExistingDate}
                          onChange={(e) => setAfgsuExistingDate(e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setAfgsuStep(2)}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
                      </Button>
                      <Button
                        className="ml-auto"
                        disabled={!afgsuExistingLevel || !afgsuExistingDate}
                        onClick={() => {
                          const res = computeAfgsuEligibility(afgsuProfession, true, afgsuExistingLevel, afgsuExistingDate);
                          setAfgsuResult(res);
                          setAfgsuStep(4);
                        }}
                      >
                        Vérifier <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* AFGSU sub-step 4: Result */}
                {afgsuStep === 4 && afgsuResult && (
                  <div className="space-y-4">
                    {/* Result card */}
                    <div className={`p-4 rounded-lg border ${
                      afgsuResult.eligible === "none"
                        ? "border-red-200 bg-red-50 dark:bg-red-900/10"
                        : afgsuResult.recycling === "needed"
                          ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10"
                          : "border-green-200 bg-green-50 dark:bg-green-900/10"
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        {afgsuResult.eligible === "none" ? (
                          <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                        ) : afgsuResult.recycling === "needed" ? (
                          <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                        )}
                        <div>
                          <h3 className="font-bold text-lg">{afgsuResult.message}</h3>
                          {afgsuResult.eligible !== "none" && (
                            <Badge variant={afgsuResult.recycling === "needed" ? "destructive" : "default"} className="mt-1">
                              {afgsuResult.eligible === "afgsu2" ? "AFGSU 2" : "AFGSU 1"}
                              {afgsuResult.recycling === "needed" ? " — Recyclage" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {afgsuResult.details.map((d, i) => (
                          <p key={i} className="text-sm text-muted-foreground">{d}</p>
                        ))}
                      </div>
                    </div>

                    {/* Document upload for eligible users */}
                    {afgsuResult.eligible !== "none" && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            📎 Justificatifs recommandés
                          </p>
                          <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-0.5 list-disc list-inside">
                            <li>Attestation AFGSU en cours de validité (si recyclage)</li>
                            <li>Diplôme professionnel attestant de votre qualification</li>
                            <li>Carte professionnelle ou numéro RPPS</li>
                          </ul>
                        </div>
                        <div>
                          <Label>Télécharger vos justificatifs</Label>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleAfgsuDocUpload(e.target.files)}
                            disabled={afgsuDocUploading}
                            className="mt-1"
                          />
                          {afgsuDocUploading && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" /> Upload en cours...
                            </div>
                          )}
                          {afgsuDocs.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {afgsuDocs.map((doc, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <FileText className="w-4 h-4 text-green-600" />
                                  <span className="flex-1 truncate">{doc.title}</span>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAfgsuDocs((prev) => prev.filter((_, idx) => idx !== i))}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setAfgsuStep(1);
                        setAfgsuResult(null);
                        setAfgsuProfession("");
                        setAfgsuHasExisting(null);
                        setAfgsuExistingLevel("");
                        setAfgsuExistingDate("");
                        setAfgsuDocs([]);
                      }}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Recommencer
                      </Button>
                      {afgsuResult.eligible !== "none" && (
                        <Button className="ml-auto" onClick={handleAfgsuContinue}>
                          Continuer l'inscription <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {afgsuResult.eligible === "none" && (
                        <Button variant="outline" className="ml-auto" onClick={handleBackToSessions}>
                          Retour aux formations
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP: Prerequisite verification */}
        {step === "prerequisites" && selectedSession && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (isAfgsuSession(selectedSession)) {
                      setStep("afgsu_check");
                    } else {
                      setStep("sessions");
                      setSelectedSession(null);
                    }
                  }}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Vérification des prérequis
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info about prerequisites */}
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                        Cette formation nécessite la vérification de prérequis
                      </p>
                      {selectedSession.prerequisites.map((p) => (
                        <p key={p.id} className="text-amber-700 dark:text-amber-300">
                          {p.description || (
                            p.requiresRpps
                              ? "Numéro RPPS valide ou diplôme IDE requis"
                              : p.maxMonthsSinceCompletion
                              ? `Diplôme obtenu il y a plus de ${Math.floor(p.maxMonthsSinceCompletion / 12)} an(s)`
                              : "Prérequis requis"
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recycling validation check */}
                {selectedSession.program?.recyclingMonths && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-primary" />
                      <p className="font-medium text-sm">
                        Vérification de recyclage ({selectedSession.program.recyclingMonths / 12} ans)
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Saisissez votre email pour vérifier si vous disposez d'une attestation encore valide.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="votre@email.com"
                        type="email"
                        value={recyclingEmail}
                        onChange={(e) => {
                          setRecyclingEmail(e.target.value);
                          setRecyclingResult(null);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!recyclingEmail.trim() || !selectedSession.program) return;
                          checkRecyclingMutation.mutate({
                            email: recyclingEmail.trim(),
                            programId: selectedSession.program.id,
                          });
                        }}
                        disabled={
                          !recyclingEmail.trim() ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recyclingEmail) ||
                          checkRecyclingMutation.isPending
                        }
                      >
                        {checkRecyclingMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Vérifier"
                        )}
                      </Button>
                    </div>

                    {/* Recycling result */}
                    {recyclingResult && (
                      <>
                        {recyclingResult.found && recyclingResult.certification ? (
                          recyclingResult.certification.isValid ? (
                            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 p-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                  <p className="font-medium text-green-900 dark:text-green-100">
                                    Attestation valide
                                  </p>
                                  <p className="text-green-700 dark:text-green-300">
                                    <strong>{recyclingResult.certification.label}</strong> obtenue le{" "}
                                    {formatDate(recyclingResult.certification.obtainedAt)}
                                  </p>
                                  <p className="text-green-700 dark:text-green-300">
                                    Valide jusqu'au{" "}
                                    <strong>{formatDate(recyclingResult.certification.expiresAt)}</strong>
                                    {" "}({recyclingResult.certification.remainingMonths} mois restant{recyclingResult.certification.remainingMonths > 1 ? "s" : ""})
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                  <p className="font-medium text-red-900 dark:text-red-100">
                                    Attestation expirée — recyclage nécessaire
                                  </p>
                                  <p className="text-red-700 dark:text-red-300">
                                    <strong>{recyclingResult.certification.label}</strong> obtenue le{" "}
                                    {formatDate(recyclingResult.certification.obtainedAt)}
                                  </p>
                                  <p className="text-red-700 dark:text-red-300">
                                    Expirée depuis le{" "}
                                    <strong>{formatDate(recyclingResult.certification.expiresAt)}</strong>
                                    {" "}(validité : {recyclingResult.certification.recyclingMonths} mois, de mois à mois)
                                  </p>
                                  <p className="text-red-700 dark:text-red-300 mt-1">
                                    Vous devez suivre une formation de recyclage pour renouveler votre attestation.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                            Aucune attestation trouvée pour cet email. Si c'est votre première formation,
                            poursuivez l'inscription ci-dessous.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Choisissez l'une des méthodes suivantes pour valider vos prérequis :
                </p>

                {/* Verification mode selection */}
                {(() => {
                  const prereqs = selectedSession.prerequisites;
                  const showRpps = prereqs.some(p => p.requiresRpps);
                  const showDiploma = prereqs.some(p => p.requiresDiploma || p.minMonthsSinceCompletion || p.maxMonthsSinceCompletion);
                  const minYears = prereqs.find(p => p.minMonthsSinceCompletion)?.minMonthsSinceCompletion;
                  const minYearsLabel = minYears ? Math.floor(minYears / 12) : null;

                  return (
                    <div className={`grid gap-4 ${showRpps && showDiploma ? "sm:grid-cols-2" : ""}`}>
                      {showRpps && (
                        <Card
                          className={`cursor-pointer transition-shadow hover:shadow-md ${
                            verificationMode === "rpps"
                              ? "border-primary ring-2 ring-primary/20"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setVerificationMode("rpps")}
                        >
                          <CardContent className="p-4 text-center">
                            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <p className="font-semibold mb-1">Numéro RPPS</p>
                            <p className="text-xs text-muted-foreground">
                              Saisissez votre numéro RPPS (11 chiffres) pour une vérification immédiate
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {showDiploma && (
                        <Card
                          className={`cursor-pointer transition-shadow hover:shadow-md ${
                            verificationMode === "diploma"
                              ? "border-primary ring-2 ring-primary/20"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setVerificationMode("diploma")}
                        >
                          <CardContent className="p-4 text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <p className="font-semibold mb-1">Télécharger un diplôme</p>
                            <p className="text-xs text-muted-foreground">
                              {minYearsLabel
                                ? `Envoyez votre diplôme IDE (obtenu il y a plus de ${minYearsLabel} an${minYearsLabel > 1 ? "s" : ""}) pour vérification par IA`
                                : "Envoyez votre diplôme IDE pour vérification (validation automatique par IA)"}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}

                {/* RPPS input */}
                {verificationMode === "rpps" && (
                  <div className="space-y-3">
                    <Label htmlFor="rpps">Numéro RPPS</Label>
                    <Input
                      id="rpps"
                      placeholder="Ex : 10003456789"
                      value={rppsNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setRppsNumber(val);
                      }}
                      maxLength={11}
                    />
                    <p className="text-xs text-muted-foreground">
                      Le numéro RPPS est composé de 11 chiffres. Vous le trouverez sur votre carte CPS
                      ou sur le site de l'Ordre professionnel.
                    </p>
                    {rppsNumber.length > 0 && rppsNumber.length < 11 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {11 - rppsNumber.length} chiffre{11 - rppsNumber.length > 1 ? "s" : ""} restant{11 - rppsNumber.length > 1 ? "s" : ""}
                      </p>
                    )}
                    {rppsNumber.length === 11 && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Format RPPS valide
                      </p>
                    )}
                  </div>
                )}

                {/* Diploma upload */}
                {verificationMode === "diploma" && (
                  <div className="space-y-3">
                    <Label>Diplôme IDE</Label>
                    <p className="text-xs text-muted-foreground">
                      Téléchargez une copie de votre diplôme d'État d'infirmier(ère).
                      Le document sera analysé automatiquement pour vérifier sa date d'obtention.
                    </p>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => document.getElementById("diploma-file-input")?.click()}
                    >
                      <input
                        id="diploma-file-input"
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          handleDiplomaUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      {diplomaUploading ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Upload en cours...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="w-6 h-6" />
                          <span className="text-sm">Cliquez pour envoyer votre diplôme</span>
                          <span className="text-xs">PDF ou image (JPG, PNG) — 10 Mo max</span>
                        </div>
                      )}
                    </div>

                    {diplomaDocs.length > 0 && (
                      <div className="space-y-2">
                        {diplomaDocs.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between gap-2 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
                              <span className="truncate">{doc.fileName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({(doc.fileSize / 1024).toFixed(0)} Ko)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => setDiplomaDocs((prev) => prev.filter((_, i) => i !== index))}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Continue button */}
                {verificationMode && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePrerequisitesContinue}
                    disabled={
                      (verificationMode === "rpps" && rppsNumber.length !== 11) ||
                      (verificationMode === "diploma" && diplomaDocs.length === 0) ||
                      diplomaUploading
                    }
                  >
                    Continuer vers l'inscription
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP: Enrollment form */}
        {step === "form" && selectedSession && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle>Vos informations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email with auto-detection */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="votre@email.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setKnownTrainee(null);
                        }}
                        onBlur={handleEmailBlur}
                      />
                      {knownTrainee && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Bienvenue, {knownTrainee} ! Vos informations ont été pré-remplies.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom *</Label>
                        <Input
                          id="firstName"
                          required
                          placeholder="Prénom"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom *</Label>
                        <Input
                          id="lastName"
                          required
                          placeholder="Nom"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="06 12 34 56 78"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Entreprise / Établissement</Label>
                        <Input
                          id="company"
                          placeholder="Nom de l'entreprise"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Profil & Financement — select dropdowns */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Votre situation *</Label>
                        <Select value={formData.profileType || "profession_liberale"} onValueChange={(v) => setFormData({ ...formData, profileType: v })}>
                          <SelectTrigger><SelectValue placeholder="Sélectionnez votre situation" /></SelectTrigger>
                          <SelectContent>
                            {[
                              { value: "profession_liberale", label: "Profession libérale" },
                              ...PROFILE_TYPES.filter(p => p.value !== "profession_liberale"),
                            ].map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Mode de financement *</Label>
                        <Select value={formData.fundingMode || undefined} onValueChange={(v) => setFormData({ ...formData, fundingMode: v })}>
                          <SelectTrigger><SelectValue placeholder="Sélectionnez le financement" /></SelectTrigger>
                          <SelectContent>
                            {FUNDING_MODES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Date de naissance */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date de naissance</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="diplomaNumber">N° de diplôme</Label>
                        <Input
                          id="diplomaNumber"
                          placeholder="Numéro de diplôme"
                          value={formData.diplomaNumber}
                          onChange={(e) => setFormData({ ...formData, diplomaNumber: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Adresse */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        placeholder="Numéro et rue"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Code postal</Label>
                        <Input
                          id="postalCode"
                          placeholder="75000"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                          id="city"
                          placeholder="Paris"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Responsable / Manager (si salarié) */}
                    {(formData.profileType === "salarie" || formData.fundingMode === "entreprise") && (
                      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="managerName">Nom du responsable</Label>
                          <Input
                            id="managerName"
                            placeholder="Nom du responsable hiérarchique"
                            value={formData.managerName}
                            onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="managerEmail">Email du responsable</Label>
                          <Input
                            id="managerEmail"
                            type="email"
                            placeholder="responsable@entreprise.com"
                            value={formData.managerEmail}
                            onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Profession - shown when session has profession prerequisites */}
                    {selectedSession?.prerequisites?.some(p => p.requiredProfessions && (p.requiredProfessions as string[]).length > 0) && (
                      <div className="space-y-2">
                        <Label htmlFor="profession">Profession *</Label>
                        <Select
                          value={formData.profession}
                          onValueChange={(val) => setFormData({ ...formData, profession: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez votre profession" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRAINEE_PROFESSIONS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Cette formation exige une profession spécifique pour l'inscription
                        </p>
                      </div>
                    )}

                    {/* Custom fields from program */}
                    {selectedSession?.program?.customFields && selectedSession.program.customFields.length > 0 && (
                      <div className="space-y-4 pt-2 border-t">
                        <p className="text-sm font-medium">Informations complémentaires</p>
                        {selectedSession.program.customFields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label htmlFor={`custom-${field.id}`}>
                              {field.label} {field.required && "*"}
                            </Label>
                            {field.helpText && (
                              <p className="text-xs text-muted-foreground">{field.helpText}</p>
                            )}
                            {field.type === "text" && (
                              <Input
                                id={`custom-${field.id}`}
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                placeholder={field.placeholder}
                                required={field.required}
                              />
                            )}
                            {field.type === "textarea" && (
                              <Textarea
                                id={`custom-${field.id}`}
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                placeholder={field.placeholder}
                                required={field.required}
                                className="resize-none"
                                rows={3}
                              />
                            )}
                            {field.type === "number" && (
                              <Input
                                id={`custom-${field.id}`}
                                type="number"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                placeholder={field.placeholder}
                                required={field.required}
                              />
                            )}
                            {field.type === "email" && (
                              <Input
                                id={`custom-${field.id}`}
                                type="email"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                placeholder={field.placeholder}
                                required={field.required}
                              />
                            )}
                            {field.type === "phone" && (
                              <Input
                                id={`custom-${field.id}`}
                                type="tel"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                placeholder={field.placeholder}
                                required={field.required}
                              />
                            )}
                            {field.type === "date" && (
                              <Input
                                id={`custom-${field.id}`}
                                type="date"
                                value={customFieldValues[field.id] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                required={field.required}
                              />
                            )}
                            {field.type === "select" && (
                              <Select
                                value={customFieldValues[field.id] || ""}
                                onValueChange={(v) => setCustomFieldValues({ ...customFieldValues, [field.id]: v })}
                              >
                                <SelectTrigger><SelectValue placeholder={field.placeholder || "Sélectionner..."} /></SelectTrigger>
                                <SelectContent>
                                  {(field.options || []).map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {field.type === "checkbox" && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`custom-${field.id}`}
                                  checked={!!customFieldValues[field.id]}
                                  onCheckedChange={(checked) => setCustomFieldValues({ ...customFieldValues, [field.id]: !!checked })}
                                />
                                <Label htmlFor={`custom-${field.id}`} className="text-sm font-normal">{field.placeholder || field.label}</Label>
                              </div>
                            )}
                            {field.type === "file" && (
                              <Input
                                id={`custom-${field.id}`}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const result = await uploadFile(file);
                                    setCustomFieldValues({ ...customFieldValues, [field.id]: { fileName: file.name, fileUrl: result.url } });
                                  } catch {
                                    // silently fail
                                  }
                                }}
                                required={field.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Documents justificatifs */}
                    <div className="space-y-3 pt-2">
                      <Label>Documents justificatifs (optionnel)</Label>
                      <p className="text-xs text-muted-foreground">
                        PDF, images (JPG, PNG), Word — 10 Mo max par fichier
                      </p>
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById("public-file-input")?.click()}
                      >
                        <input
                          id="public-file-input"
                          type="file"
                          multiple
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => {
                            handleFileUpload(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Upload en cours...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="w-6 h-6" />
                            <span className="text-sm">Cliquez pour ajouter des fichiers</span>
                          </div>
                        )}
                      </div>

                      {uploadedDocs.length > 0 && (
                        <div className="space-y-2">
                          {uploadedDocs.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{doc.fileName}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  ({(doc.fileSize / 1024).toFixed(0)} Ko)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleRemoveDoc(index)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={enrollMutation.isPending || uploading}
                    >
                      {enrollMutation.isPending
                        ? "Inscription en cours..."
                        : selectedSession?.isFull
                          ? "S'inscrire sur la liste d'attente"
                          : "S'inscrire"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Session summary sidebar */}
            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="text-base">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold">{selectedSession.program?.title || selectedSession.title}</p>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>
                      {formatDate(selectedSession.startDate)} — {formatDate(selectedSession.endDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ModalityIcon modality={selectedSession.modality} />
                    <span>
                      {formatModality(selectedSession.modality)}
                      {selectedSession.location ? ` — ${selectedSession.location}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{selectedSession.program?.duration}h</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      {selectedSession.isFull
                        ? "Liste d'attente"
                        : `${selectedSession.remainingSpots} place${selectedSession.remainingSpots > 1 ? "s" : ""} restante${selectedSession.remainingSpots > 1 ? "s" : ""}`}
                    </span>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-1 font-semibold text-lg text-primary">
                      <Euro className="w-5 h-5" />
                      <span>{selectedSession.program?.price ? `${selectedSession.program.price} €` : "Sur devis"}</span>
                    </div>
                  </div>

                  {selectedSession.program?.fundingTypes && (selectedSession.program.fundingTypes as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(selectedSession.program.fundingTypes as string[]).map((ft) => (
                        <Badge key={ft} variant="outline" className="text-xs">
                          {ft}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === "confirmation" && confirmationData && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              {confirmationData.enrollment?.status === "waitlisted" ? (
                <>
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Inscription en liste d'attente</h2>
                  <p className="text-muted-foreground mb-4">
                    Cette session est complète. Vous êtes en position <strong>#{confirmationData.waitlistPosition}</strong> sur la liste d'attente.
                  </p>
                  <p className="text-sm text-muted-foreground mb-8">
                    Vous serez automatiquement inscrit(e) si une place se libère. Vous recevrez un email de confirmation.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Inscription enregistrée !</h2>
                  <p className="text-muted-foreground mb-8">
                    Votre inscription est en attente de validation. Vous recevrez une confirmation prochainement.
                  </p>
                </>
              )}

              <Card className="text-left mb-8">
                <CardContent className="p-6 space-y-3 text-sm">
                  <h3 className="font-semibold text-base mb-3">Récapitulatif de votre inscription</h3>

                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">
                      {confirmationData.program?.title || confirmationData.session?.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>
                      {formatDate(confirmationData.session.startDate)} — {formatDate(confirmationData.session.endDate)}
                    </span>
                  </div>

                  {confirmationData.session.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{confirmationData.session.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{formatModality(confirmationData.session.modality)}</span>
                  </div>

                  <div className="pt-3 border-t flex items-center gap-2">
                    <Badge variant={confirmationData.enrollment?.status === "waitlisted" ? "outline" : "secondary"}
                      className={confirmationData.enrollment?.status === "waitlisted" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                      {confirmationData.enrollment?.status === "waitlisted"
                        ? `Liste d'attente — Position #${confirmationData.waitlistPosition}`
                        : "En attente de validation"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Prerequisites warnings (Issue 2) */}
              {prerequisitesWarnings.length > 0 && (
                <Card className="text-left mb-8">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
                          Avertissements sur les prérequis
                        </p>
                        {prerequisitesWarnings.map((w, i) => (
                          <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                            {w}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Document AI analysis status (Issue 2) */}
              {docStatuses && docStatuses.length > 0 && (
                <Card className="text-left mb-8">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-sm mb-3">Analyse de vos documents</h3>
                    <div className="space-y-3">
                      {docStatuses.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 text-sm">
                          {(doc.aiStatus === "processing" || doc.aiStatus === "pending") && (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                              <span className="text-muted-foreground">Analyse en cours...</span>
                            </>
                          )}
                          {doc.aiStatus === "completed" && doc.status === "auto_valid" && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                              <span className="text-green-700 dark:text-green-300">
                                Document validé
                                {doc.aiExtractedDate && ` — date extraite : ${formatDate(doc.aiExtractedDate)}`}
                              </span>
                            </>
                          )}
                          {doc.aiStatus === "completed" && doc.status === "auto_invalid" && (
                            <>
                              <X className="w-4 h-4 text-red-600 shrink-0" />
                              <span className="text-red-700 dark:text-red-300">
                                {doc.aiError || "Document non conforme"}
                                {!doc.aiError && doc.aiExtractedDate && ` — date extraite : ${formatDate(doc.aiExtractedDate)}`}
                              </span>
                            </>
                          )}
                          {doc.aiStatus === "completed" && doc.status !== "auto_valid" && doc.status !== "auto_invalid" && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="text-muted-foreground">Analyse terminée — vérification manuelle requise</span>
                            </>
                          )}
                          {doc.aiStatus === "failed" && (
                            <>
                              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                              <span className="text-orange-700 dark:text-orange-300">
                                Vérification manuelle requise
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button onClick={handleNewEnrollment} variant="outline">
                S'inscrire à une autre session
              </Button>
            </CardContent>
          </Card>
        )}
      {/* Footer */}
      <div className="mt-12 pt-6 pb-8 border-t border-gray-200 text-center text-xs text-gray-400">
        <a href="https://www.so-safe.fr/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
          © {new Date().getFullYear()} SO'SAFE Formation — Tous droits réservés
        </a>
      </div>
      </div>
    </div>
  );
}
