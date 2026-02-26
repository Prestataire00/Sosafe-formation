import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  GraduationCap, CalendarDays, MapPin, Users, Search,
  ArrowLeft, CheckCircle2, Clock, Euro, Monitor, Building2,
  Upload, FileText, X, Loader2, ShieldCheck, AlertTriangle, RefreshCw,
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
  } | null;
  prerequisites: Prerequisite[];
};

type Step = "sessions" | "prerequisites" | "form" | "confirmation";

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
  });
  const [knownTrainee, setKnownTrainee] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [prerequisitesWarnings, setPrerequisitesWarnings] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ title: string; fileUrl: string; fileName: string; fileSize: number; mimeType: string }>>([]);
  const [uploading, setUploading] = useState(false);
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

  const { data: sessions, isLoading } = useQuery<PublicSession[]>({
    queryKey: ["/api/public/sessions"],
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
      let message = "Erreur lors de l'inscription";
      try {
        if (error.message) message = error.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const hasPrerequisites = (session: PublicSession) =>
    session.prerequisites && session.prerequisites.length > 0;

  const handleSelectSession = (session: PublicSession) => {
    setSelectedSession(session);
    if (hasPrerequisites(session)) {
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
      documents: allDocs.length > 0 ? allDocs : undefined,
    });
  };

  const handleBack = () => {
    if (step === "form" && selectedSession && hasPrerequisites(selectedSession)) {
      setStep("prerequisites");
      return;
    }
    setStep("sessions");
    setSelectedSession(null);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "" });
    setKnownTrainee(null);
    setUploadedDocs([]);
    setVerificationMode(null);
    setRppsNumber("");
    setDiplomaDocs([]);
    setRecyclingEmail("");
    setRecyclingResult(null);
  };

  const handleBackToSessions = () => {
    setStep("sessions");
    setSelectedSession(null);
    setVerificationMode(null);
    setRppsNumber("");
    setDiplomaDocs([]);
    setRecyclingEmail("");
    setRecyclingResult(null);
  };

  const handleNewEnrollment = () => {
    setStep("sessions");
    setSelectedSession(null);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "" });
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Inscription aux formations</h1>
            <p className="text-sm text-muted-foreground">
              Choisissez une session et inscrivez-vous en quelques clics
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(() => {
            const showPrereq = selectedSession && hasPrerequisites(selectedSession);
            const steps = [
              { key: "sessions", label: "Choix de la session", num: 1 },
              ...(showPrereq ? [{ key: "prerequisites", label: "Vérification des prérequis", num: 2 }] : []),
              { key: "form", label: "Vos informations", num: showPrereq ? 3 : 2 },
              { key: "confirmation", label: "Confirmation", num: showPrereq ? 4 : 3 },
            ];
            const currentIndex = steps.findIndex((s) => s.key === step);
            return steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-border" />}
                <div
                  className={`flex items-center gap-2 text-sm ${
                    step === s.key
                      ? "text-primary font-semibold"
                      : i < currentIndex
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step === s.key
                        ? "bg-primary text-primary-foreground"
                        : i < currentIndex
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < currentIndex ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
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
                            {session.remainingSpots} place{session.remainingSpots > 1 ? "s" : ""} restante{session.remainingSpots > 1 ? "s" : ""}
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

        {/* STEP: Prerequisite verification */}
        {step === "prerequisites" && selectedSession && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBackToSessions}>
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
                      {enrollMutation.isPending ? "Inscription en cours..." : "S'inscrire"}
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
                    <span>{selectedSession.remainingSpots} place{selectedSession.remainingSpots > 1 ? "s" : ""} restante{selectedSession.remainingSpots > 1 ? "s" : ""}</span>
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
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Inscription enregistrée !</h2>
              <p className="text-muted-foreground mb-8">
                Votre inscription est en attente de validation. Vous recevrez une confirmation prochainement.
              </p>

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
                    <Badge variant="secondary">En attente de validation</Badge>
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
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Plateforme de gestion des formations
        </div>
      </footer>
    </div>
  );
}
