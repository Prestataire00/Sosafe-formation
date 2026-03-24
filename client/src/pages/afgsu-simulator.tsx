import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  GraduationCap,
  Stethoscope,
  Shield,
  ArrowRight,
  RotateCcw,
  Info,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";

// ============================================================
// AFGSU Eligibility Rules
// ============================================================

const AFGSU2_PROFESSIONS = [
  { value: "medecin", label: "Medecin" },
  { value: "chirurgien_dentiste", label: "Chirurgien-dentiste" },
  { value: "sage_femme", label: "Sage-femme" },
  { value: "pharmacien", label: "Pharmacien" },
  { value: "infirmier", label: "Infirmier(ere)" },
  { value: "infirmier_iade", label: "Infirmier(ere) anesthesiste (IADE)" },
  { value: "infirmier_ibode", label: "Infirmier(ere) de bloc (IBODE)" },
  { value: "infirmier_ipa", label: "Infirmier(ere) en pratique avancee (IPA)" },
  { value: "infirmier_puericultrice", label: "Puericultrice" },
  { value: "masseur_kinesitherapeute", label: "Masseur-kinesitherapeute" },
  { value: "pedicure_podologue", label: "Pedicure-podologue" },
  { value: "ergotherapeute", label: "Ergotherapeute" },
  { value: "psychomotricien", label: "Psychomotricien(ne)" },
  { value: "orthophoniste", label: "Orthophoniste" },
  { value: "orthoptiste", label: "Orthoptiste" },
  { value: "audioprothesiste", label: "Audioprothesiste" },
  { value: "opticien_lunetier", label: "Opticien-lunetier" },
  { value: "dieteticien", label: "Dieteticien(ne)" },
  { value: "manipulateur_radio", label: "Manipulateur d'electroradiologie" },
  { value: "technicien_labo", label: "Technicien de laboratoire" },
  { value: "preparateur_pharmacie", label: "Preparateur en pharmacie" },
  { value: "aide_soignant", label: "Aide-soignant(e)" },
  { value: "auxiliaire_puericulture", label: "Auxiliaire de puericulture" },
  { value: "ambulancier", label: "Ambulancier(ere)" },
];

const AFGSU1_PROFESSIONS = [
  { value: "administratif_sante", label: "Personnel administratif (etablissement de sante)" },
  { value: "technique_sante", label: "Personnel technique (etablissement de sante)" },
  { value: "ash", label: "Agent de service hospitalier (ASH)" },
  { value: "brancardier", label: "Brancardier" },
  { value: "secretaire_medicale", label: "Secretaire medicale" },
  { value: "agent_accueil_sante", label: "Agent d'accueil (etablissement de sante)" },
  { value: "autre_sante", label: "Autre personnel d'un etablissement de sante" },
];

const NOT_ELIGIBLE_PROFESSIONS = [
  { value: "hors_sante", label: "Je ne travaille pas dans un etablissement de sante" },
  { value: "etudiant_hors_sante", label: "Etudiant(e) hors filiere sante" },
  { value: "autre", label: "Autre (secteur prive, hors sante)" },
];

const ALL_PROFESSIONS = [
  { group: "Professions medicales et paramedicales (AFGSU 2)", items: AFGSU2_PROFESSIONS },
  { group: "Personnel non medical en etablissement de sante (AFGSU 1)", items: AFGSU1_PROFESSIONS },
  { group: "Hors etablissement de sante", items: NOT_ELIGIBLE_PROFESSIONS },
];

type SimulatorResult = {
  eligible: "afgsu2" | "afgsu1" | "none";
  recycling: "needed" | "not_needed" | "not_applicable";
  message: string;
  details: string[];
};

function computeEligibility(
  profession: string,
  hasExistingAfgsu: boolean,
  afgsuLevel: string,
  afgsuDate: string,
  worksInHealthcare: boolean
): SimulatorResult {
  const isAfgsu2Profession = AFGSU2_PROFESSIONS.some((p) => p.value === profession);
  const isAfgsu1Profession = AFGSU1_PROFESSIONS.some((p) => p.value === profession);

  if (!isAfgsu2Profession && !isAfgsu1Profession && !worksInHealthcare) {
    return {
      eligible: "none",
      recycling: "not_applicable",
      message: "Non eligible a l'AFGSU",
      details: [
        "L'AFGSU est reservee aux personnels travaillant dans un etablissement de sante ou medico-social.",
        "Si vous travaillez dans un etablissement de sante, selectionnez votre profession dans la categorie appropriee.",
      ],
    };
  }

  const level: "afgsu2" | "afgsu1" = isAfgsu2Profession ? "afgsu2" : "afgsu1";
  const levelLabel = level === "afgsu2" ? "AFGSU 2" : "AFGSU 1";

  if (hasExistingAfgsu && afgsuDate) {
    const obtainedDate = new Date(afgsuDate);
    const now = new Date();
    const yearsDiff = (now.getTime() - obtainedDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsDiff >= 4) {
      return {
        eligible: level,
        recycling: "needed",
        message: `Recyclage ${levelLabel} necessaire`,
        details: [
          `Vous etes eligible a l'${levelLabel}.`,
          `Votre dernier AFGSU date de plus de 4 ans (${obtainedDate.toLocaleDateString("fr-FR")}).`,
          `Le recyclage est obligatoire tous les 4 ans.`,
          `Vous devez suivre une formation de recyclage ${levelLabel} (1 journee).`,
          level === "afgsu2" && afgsuLevel === "afgsu1"
            ? `Attention : vous aviez un AFGSU 1. Pour passer a l'AFGSU 2, vous devez suivre la formation initiale AFGSU 2 complete (3 jours).`
            : "",
        ].filter(Boolean),
      };
    }

    return {
      eligible: level,
      recycling: "not_needed",
      message: `${levelLabel} en cours de validite`,
      details: [
        `Votre ${afgsuLevel === "afgsu2" ? "AFGSU 2" : "AFGSU 1"} est valide jusqu'au ${new Date(obtainedDate.getTime() + 4 * 365.25 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}.`,
        `Le recyclage sera necessaire a cette date.`,
        level === "afgsu2" && afgsuLevel === "afgsu1"
          ? `Note : vous etes eligible a l'AFGSU 2 de par votre profession. Vous pouvez passer la formation initiale AFGSU 2 pour monter de niveau.`
          : "",
      ].filter(Boolean),
    };
  }

  return {
    eligible: level,
    recycling: "not_applicable",
    message: `Eligible a l'${levelLabel} (formation initiale)`,
    details: [
      `En tant que ${ALL_PROFESSIONS.flatMap((g) => g.items).find((p) => p.value === profession)?.label || profession}, vous etes eligible a l'${levelLabel}.`,
      level === "afgsu2"
        ? "La formation initiale AFGSU 2 dure 3 jours (21 heures)."
        : "La formation initiale AFGSU 1 dure 2 jours (14 heures).",
      "L'attestation est valable 4 ans. Un recyclage sera necessaire apres cette periode.",
    ],
  };
}

// ============================================================
// Main Component
// ============================================================

export default function AfgsuSimulator() {
  const [step, setStep] = useState(1);
  const [profession, setProfession] = useState("");
  const [worksInHealthcare, setWorksInHealthcare] = useState(false);
  const [hasExistingAfgsu, setHasExistingAfgsu] = useState(false);
  const [afgsuLevel, setAfgsuLevel] = useState("");
  const [afgsuDate, setAfgsuDate] = useState("");
  const [result, setResult] = useState<SimulatorResult | null>(null);

  const handleCompute = () => {
    const res = computeEligibility(profession, hasExistingAfgsu, afgsuLevel, afgsuDate, worksInHealthcare);
    setResult(res);
    setStep(4);
  };

  const reset = () => {
    setStep(1);
    setProfession("");
    setWorksInHealthcare(false);
    setHasExistingAfgsu(false);
    setAfgsuLevel("");
    setAfgsuDate("");
    setResult(null);
  };

  return (
    <PageLayout>
      <PageHeader
        title="Simulateur d'eligibilite AFGSU"
        subtitle="Verifiez votre eligibilite a l'AFGSU 1 ou 2 et si vous devez passer un recyclage"
      />

      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Profession */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5" /> Quelle est votre profession ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ALL_PROFESSIONS.map((group) => (
                <div key={group.group}>
                  <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">
                    {group.group}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.items.map((p) => (
                      <Button
                        key={p.value}
                        variant={profession === p.value ? "default" : "outline"}
                        className="justify-start text-left h-auto py-2.5 px-3"
                        onClick={() => {
                          setProfession(p.value);
                          setWorksInHealthcare(!NOT_ELIGIBLE_PROFESSIONS.some((np) => np.value === p.value));
                        }}
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
                    if (NOT_ELIGIBLE_PROFESSIONS.some((p) => p.value === profession)) {
                      handleCompute();
                    } else {
                      setStep(2);
                    }
                  }}
                  disabled={!profession}
                >
                  Suivant <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Existing AFGSU */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Avez-vous deja un AFGSU ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={hasExistingAfgsu ? "default" : "outline"}
                  className="h-20 text-lg"
                  onClick={() => setHasExistingAfgsu(true)}
                >
                  <CheckCircle className="w-6 h-6 mr-2" /> Oui
                </Button>
                <Button
                  variant={!hasExistingAfgsu ? "default" : "outline"}
                  className="h-20 text-lg"
                  onClick={() => {
                    setHasExistingAfgsu(false);
                    handleCompute();
                  }}
                >
                  <XCircle className="w-6 h-6 mr-2" /> Non
                </Button>
              </div>
              {hasExistingAfgsu && (
                <Button onClick={() => setStep(3)} className="w-full">
                  Suivant <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: AFGSU details */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" /> Details de votre AFGSU actuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Niveau AFGSU obtenu</Label>
                <Select value={afgsuLevel} onValueChange={setAfgsuLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="afgsu1">AFGSU Niveau 1</SelectItem>
                    <SelectItem value="afgsu2">AFGSU Niveau 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date d'obtention</Label>
                <Input
                  type="date"
                  value={afgsuDate}
                  onChange={(e) => setAfgsuDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button onClick={handleCompute} disabled={!afgsuLevel || !afgsuDate} className="w-full">
                Verifier mon eligibilite <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="space-y-4">
            <Card className={
              result.eligible === "none"
                ? "border-red-200 bg-red-50 dark:bg-red-900/10"
                : result.recycling === "needed"
                  ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10"
                  : result.recycling === "not_needed"
                    ? "border-green-200 bg-green-50 dark:bg-green-900/10"
                    : "border-blue-200 bg-blue-50 dark:bg-blue-900/10"
            }>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {result.eligible === "none" ? (
                    <XCircle className="w-10 h-10 text-red-500 shrink-0" />
                  ) : result.recycling === "needed" ? (
                    <AlertTriangle className="w-10 h-10 text-amber-500 shrink-0" />
                  ) : result.recycling === "not_needed" ? (
                    <CheckCircle className="w-10 h-10 text-green-500 shrink-0" />
                  ) : (
                    <GraduationCap className="w-10 h-10 text-blue-500 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{result.message}</h3>
                    {result.eligible !== "none" && (
                      <Badge
                        variant={result.recycling === "needed" ? "destructive" : "default"}
                        className="mt-1"
                      >
                        {result.eligible === "afgsu2" ? "AFGSU 2" : "AFGSU 1"}
                        {result.recycling === "needed" ? " — Recyclage requis" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {result.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-sm">{detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {result.eligible !== "none" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-2">Formation initiale</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.eligible === "afgsu2"
                        ? "3 jours (21h) — Gestes d'urgence specifiques aux professionnels de sante"
                        : "2 jours (14h) — Gestes d'urgence de base pour personnels d'etablissements de sante"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-2">Recyclage</h4>
                    <p className="text-sm text-muted-foreground">
                      1 jour (7h) — Tous les 4 ans. Mise a jour des connaissances et pratiques.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-center">
              <Button variant="outline" onClick={reset} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Recommencer la simulation
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
