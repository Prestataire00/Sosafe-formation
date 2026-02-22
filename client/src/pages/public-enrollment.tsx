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
} from "lucide-react";

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
  } | null;
};

type Step = "sessions" | "form" | "confirmation";

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
      } else {
        setKnownTrainee(null);
      }
    },
  });

  const enrollMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/public/enrollments", data),
    onSuccess: async (res) => {
      const result = await res.json();
      setConfirmationData(result);
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

  const handleSelectSession = (session: PublicSession) => {
    setSelectedSession(session);
    setStep("form");
  };

  const handleEmailBlur = () => {
    const email = formData.email.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      checkEmailMutation.mutate(email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    enrollMutation.mutate({
      sessionId: selectedSession.id,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      company: formData.company.trim() || undefined,
    });
  };

  const handleBack = () => {
    setStep("sessions");
    setSelectedSession(null);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "" });
    setKnownTrainee(null);
  };

  const handleNewEnrollment = () => {
    setStep("sessions");
    setSelectedSession(null);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "" });
    setKnownTrainee(null);
    setConfirmationData(null);
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
          {[
            { key: "sessions", label: "Choix de la session", num: 1 },
            { key: "form", label: "Vos informations", num: 2 },
            { key: "confirmation", label: "Confirmation", num: 3 },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div
                className={`flex items-center gap-2 text-sm ${
                  step === s.key
                    ? "text-primary font-semibold"
                    : step === "confirmation" && s.key !== "confirmation"
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.key
                      ? "bg-primary text-primary-foreground"
                      : step === "confirmation" && s.key !== "confirmation"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step === "confirmation" && s.key !== "confirmation" ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          ))}
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

                      {session.program?.categories && session.program.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(session.program.categories as string[]).map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}

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

        {/* STEP 2: Enrollment form */}
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

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={enrollMutation.isPending}
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
