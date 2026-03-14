import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Save,
} from "lucide-react";

const STORAGE_KEY = "enterprise-registration-draft";

const FORMATS_JURIDIQUES = [
  "SARL", "SAS", "SASU", "SA", "EURL", "SCI", "SNC",
  "Auto-entrepreneur", "Association", "Établissement public",
  "Autre",
];

type FormData = {
  // Entreprise
  name: string;
  formatJuridique: string;
  siret: string;
  tvaNumber: string;
  address: string;
  city: string;
  postalCode: string;
  email: string;
  phone: string;
  sector: string;
  // Représentant légal
  legalRepName: string;
  legalRepEmail: string;
  legalRepPhone: string;
  // Contact principal
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
};

const EMPTY_FORM: FormData = {
  name: "", formatJuridique: "", siret: "", tvaNumber: "",
  address: "", city: "", postalCode: "", email: "", phone: "", sector: "",
  legalRepName: "", legalRepEmail: "", legalRepPhone: "",
  contactFirstName: "", contactLastName: "", contactEmail: "", contactPhone: "", contactRole: "",
};

type Step = "form" | "review" | "confirmation";

function loadDraft(): FormData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...EMPTY_FORM, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...EMPTY_FORM };
}

function saveDraft(data: FormData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export default function PublicEnterpriseRegistration() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>(loadDraft);

  // Auto-save draft on change
  useEffect(() => {
    if (step === "form") saveDraft(form);
  }, [form, step]);

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch("/api/public/enterprise-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || "Erreur lors de l'inscription");
      }
      return resp.json();
    },
    onSuccess: () => {
      clearDraft();
      setStep("confirmation");
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const canProceed = form.name.trim() && form.siret.trim();

  // Confirmation
  if (step === "confirmation") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Inscription enregistrée</h2>
            <p className="text-muted-foreground">
              Votre demande d'inscription a été transmise. Notre équipe vous contactera
              dans les meilleurs délais pour finaliser votre dossier.
            </p>
            <div className="bg-green-50 rounded-lg p-4 text-left space-y-1">
              <p className="text-sm"><strong>Entreprise :</strong> {form.name}</p>
              <p className="text-sm"><strong>SIRET :</strong> {form.siret}</p>
              {form.email && <p className="text-sm"><strong>Email :</strong> {form.email}</p>}
            </div>
            <p className="text-xs text-muted-foreground">Vous pouvez fermer cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review
  if (step === "review") {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="w-10 h-10 text-blue-600 mx-auto" />
            <h1 className="text-2xl font-bold">Vérification de vos informations</h1>
            <p className="text-muted-foreground">Veuillez vérifier les informations avant de valider</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Informations entreprise</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Dénomination :</span> <strong>{form.name}</strong></div>
                <div><span className="text-muted-foreground">Forme juridique :</span> <strong>{form.formatJuridique || "-"}</strong></div>
                <div><span className="text-muted-foreground">SIRET :</span> <strong>{form.siret}</strong></div>
                <div><span className="text-muted-foreground">N° TVA :</span> <strong>{form.tvaNumber || "-"}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground">Adresse :</span> <strong>{[form.address, form.postalCode, form.city].filter(Boolean).join(", ") || "-"}</strong></div>
                <div><span className="text-muted-foreground">Email :</span> <strong>{form.email || "-"}</strong></div>
                <div><span className="text-muted-foreground">Téléphone :</span> <strong>{form.phone || "-"}</strong></div>
                <div><span className="text-muted-foreground">Secteur :</span> <strong>{form.sector || "-"}</strong></div>
              </div>

              {(form.legalRepName || form.legalRepEmail) && (
                <>
                  <h3 className="font-semibold text-lg border-b pb-2 pt-2">Représentant légal</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Nom :</span> <strong>{form.legalRepName || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Email :</span> <strong>{form.legalRepEmail || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Téléphone :</span> <strong>{form.legalRepPhone || "-"}</strong></div>
                  </div>
                </>
              )}

              {(form.contactFirstName || form.contactLastName) && (
                <>
                  <h3 className="font-semibold text-lg border-b pb-2 pt-2">Contact principal</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Prénom :</span> <strong>{form.contactFirstName || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Nom :</span> <strong>{form.contactLastName || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Email :</span> <strong>{form.contactEmail || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Téléphone :</span> <strong>{form.contactPhone || "-"}</strong></div>
                    <div><span className="text-muted-foreground">Fonction :</span> <strong>{form.contactRole || "-"}</strong></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("form")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Modifier
            </Button>
            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {submitMutation.isPending ? "Envoi..." : "Confirmer l'inscription"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Building2 className="w-10 h-10 text-blue-600 mx-auto" />
          <h1 className="text-2xl font-bold">Inscription Entreprise</h1>
          <p className="text-muted-foreground">
            Remplissez le formulaire ci-dessous pour inscrire votre entreprise.
            Vos données sont sauvegardées automatiquement.
          </p>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Save className="w-3 h-3" /> Brouillon sauvegardé automatiquement
          </div>
        </div>

        {/* Informations entreprise */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Informations de l'entreprise</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Dénomination sociale *</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <Label htmlFor="formatJuridique">Forme juridique</Label>
                <Select value={form.formatJuridique} onValueChange={(v) => update("formatJuridique", v)}>
                  <SelectTrigger id="formatJuridique"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {FORMATS_JURIDIQUES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="siret">SIRET *</Label>
                <Input id="siret" value={form.siret} onChange={(e) => update("siret", e.target.value)} placeholder="123 456 789 00012" />
              </div>
              <div>
                <Label htmlFor="tvaNumber">N° TVA intracommunautaire</Label>
                <Input id="tvaNumber" value={form.tvaNumber} onChange={(e) => update("tvaNumber", e.target.value)} placeholder="FR12345678901" />
              </div>
              <div>
                <Label htmlFor="sector">Secteur d'activité</Label>
                <Input id="sector" value={form.sector} onChange={(e) => update("sector", e.target.value)} placeholder="Ex: Santé, BTP..." />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground pt-2">Coordonnées</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Numéro et rue" />
              </div>
              <div>
                <Label htmlFor="postalCode">Code postal</Label>
                <Input id="postalCode" value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} placeholder="75001" />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Paris" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@entreprise.fr" />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="01 23 45 67 89" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Représentant légal */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Représentant légal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="legalRepName">Nom complet</Label>
                <Input id="legalRepName" value={form.legalRepName} onChange={(e) => update("legalRepName", e.target.value)} placeholder="Prénom et nom" />
              </div>
              <div>
                <Label htmlFor="legalRepEmail">Email</Label>
                <Input id="legalRepEmail" type="email" value={form.legalRepEmail} onChange={(e) => update("legalRepEmail", e.target.value)} placeholder="representant@entreprise.fr" />
              </div>
              <div>
                <Label htmlFor="legalRepPhone">Téléphone</Label>
                <Input id="legalRepPhone" value={form.legalRepPhone} onChange={(e) => update("legalRepPhone", e.target.value)} placeholder="06 12 34 56 78" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact principal */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Contact principal</h3>
            <p className="text-sm text-muted-foreground">Personne à contacter pour les formations</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactFirstName">Prénom</Label>
                <Input id="contactFirstName" value={form.contactFirstName} onChange={(e) => update("contactFirstName", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contactLastName">Nom</Label>
                <Input id="contactLastName" value={form.contactLastName} onChange={(e) => update("contactLastName", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contactPhone">Téléphone</Label>
                <Input id="contactPhone" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contactRole">Fonction</Label>
                <Input id="contactRole" value={form.contactRole} onChange={(e) => update("contactRole", e.target.value)} placeholder="Ex: Responsable formation, DRH..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => { setForm({ ...EMPTY_FORM }); clearDraft(); }}>
            Réinitialiser
          </Button>
          <Button onClick={() => setStep("review")} disabled={!canProceed}>
            Vérifier et envoyer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {!canProceed && (
          <p className="text-xs text-muted-foreground text-center">
            * Les champs Dénomination sociale et SIRET sont obligatoires
          </p>
        )}
      </div>
    </div>
  );
}
