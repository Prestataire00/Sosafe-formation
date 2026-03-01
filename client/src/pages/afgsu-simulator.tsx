import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Search, ShieldCheck, CheckCircle2, ArrowRight, Info, ArrowLeft,
} from "lucide-react";

type Category = {
  code: string;
  label: string;
  professions: string[];
};

const CATEGORIES: Category[] = [
  {
    code: "A",
    label: "Professions Médicales",
    professions: ["Médecin", "Chirurgien-dentiste", "Sage-femme"],
  },
  {
    code: "B",
    label: "Professions de la Pharmacie",
    professions: ["Pharmacien", "Préparateur en pharmacie", "Préparateur en pharmacie hospitalière"],
  },
  {
    code: "C",
    label: "Auxiliaires Médicaux",
    professions: [
      "Infirmier(ère) diplômé(e) d'État (IDE)",
      "Infirmier(ère) de bloc opératoire (IBODE)",
      "Infirmier(ère) anesthésiste (IADE)",
      "Infirmier(ère) en pratique avancée (IPA)",
      "Masseur-kinésithérapeute",
      "Pédicure-podologue",
      "Ergothérapeute",
      "Psychomotricien(ne)",
      "Orthophoniste",
      "Orthoptiste",
      "Manipulateur(trice) en électroradiologie médicale",
      "Technicien(ne) de laboratoire médical",
      "Audioprothésiste",
      "Opticien-lunetier",
      "Prothésiste dentaire",
      "Diététicien(ne)",
    ],
  },
  {
    code: "D",
    label: "Professions d'Appareillage",
    professions: ["Orthoprothésiste", "Podo-orthésiste", "Oculariste", "Épithésiste", "Orthopédiste-orthésiste"],
  },
  {
    code: "E",
    label: "Autres Professions de Santé",
    professions: ["Aide-soignant(e)", "Auxiliaire de puériculture", "Ambulancier(ère)", "Assistant(e) dentaire"],
  },
  {
    code: "F",
    label: "Professions du Domaine Social",
    professions: [
      "Accompagnant éducatif et social (AES)",
      "Aide médico-psychologique (AMP)",
      "Auxiliaire de vie sociale (AVS)",
    ],
  },
  {
    code: "G",
    label: "Autres catégories",
    professions: ["Auxiliaire ambulancier", "Préleveur sanguin", "Brancardier"],
  },
  {
    code: "H",
    label: "Étudiants",
    professions: ["Étudiant(e) en formation vers un des diplômes de santé ci-dessus"],
  },
];

function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Step = "selection" | "result";
type Result = { eligible: true; profession: string; category: string } | { eligible: false };

export default function AfgsuSimulator() {
  const [step, setStep] = useState<Step>("selection");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = normalizeString(searchQuery.trim());
    const matches: { profession: string; category: string }[] = [];
    for (const cat of CATEGORIES) {
      for (const prof of cat.professions) {
        if (normalizeString(prof).includes(q)) {
          matches.push({ profession: prof, category: cat.label });
        }
      }
    }
    return matches;
  }, [searchQuery]);

  const handleSelectProfession = (profession: string, category: string) => {
    setResult({ eligible: true, profession, category });
    setStep("result");
  };

  const handleNotInList = () => {
    setResult({ eligible: false });
    setStep("result");
  };

  const handleReset = () => {
    setStep("selection");
    setSearchQuery("");
    setExpandedCategory(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      <PageLayout className="max-w-4xl">
        <PageHeader title="Simulateur AFGSU" subtitle="Testez vos connaissances en urgences" />
        {/* Step 1: Selection */}
        {step === "selection" && (
          <>
            {/* Info banner */}
            <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
              <CardContent className="p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">Qu'est-ce que l'AFGSU 2 ?</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    L'Attestation de Formation aux Gestes et Soins d'Urgence de niveau 2 est obligatoire pour les
                    professionnels de santé inscrits dans la 4ème partie du Code de la Santé Publique.
                    Sélectionnez votre profession ci-dessous pour vérifier votre éligibilité.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Search bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher votre profession (ex: IDE, kiné, aide-soignant...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setExpandedCategory(null);
                }}
                className="pl-10"
              />
            </div>

            {/* Search results */}
            {searchResults !== null ? (
              searchResults.length > 0 ? (
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""} trouvé{searchResults.length > 1 ? "s" : ""}
                  </p>
                  {searchResults.map((r) => (
                    <Card
                      key={r.profession}
                      className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                      onClick={() => handleSelectProfession(r.profession, r.category)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.profession}</p>
                          <p className="text-sm text-muted-foreground">{r.category}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="mb-6">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground mb-1">Aucune profession trouvée pour "{searchQuery}"</p>
                    <p className="text-sm text-muted-foreground">
                      Essayez un autre terme ou parcourez les catégories ci-dessous
                    </p>
                  </CardContent>
                </Card>
              )
            ) : null}

            {/* Category grid */}
            {!searchQuery.trim() && !expandedCategory && (
              <div className="grid gap-4 md:grid-cols-2">
                {CATEGORIES.map((cat) => (
                  <Card
                    key={cat.code}
                    className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                    onClick={() => setExpandedCategory(cat.code)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-bold">
                            {cat.code}
                          </Badge>
                          <div>
                            <p className="font-medium">{cat.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {cat.professions.length} profession{cat.professions.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Expanded category */}
            {!searchQuery.trim() && expandedCategory && (
              <>
                <Button
                  variant="ghost"
                  className="mb-4"
                  onClick={() => setExpandedCategory(null)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour aux catégories
                </Button>
                {(() => {
                  const cat = CATEGORIES.find((c) => c.code === expandedCategory);
                  if (!cat) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary" className="font-bold">
                          {cat.code}
                        </Badge>
                        <h2 className="text-lg font-semibold">{cat.label}</h2>
                      </div>
                      <div className="space-y-2">
                        {cat.professions.map((prof) => (
                          <Card
                            key={prof}
                            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                            onClick={() => handleSelectProfession(prof, cat.label)}
                          >
                            <CardContent className="p-4 flex items-center justify-between">
                              <p className="font-medium">{prof}</p>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Not in list button */}
            <div className="mt-8 text-center">
              <Button variant="outline" onClick={handleNotInList}>
                Ma profession n'est pas dans la liste
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Result */}
        {step === "result" && result && (
          <div className="max-w-2xl mx-auto">
            {result.eligible ? (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-green-900 dark:text-green-100">
                    Vous êtes éligible à l'AFGSU 2
                  </h2>
                  <p className="text-green-700 dark:text-green-300 mb-2">
                    En tant que <strong>{result.profession}</strong>,
                  </p>
                  <p className="text-green-700 dark:text-green-300 mb-8">
                    vous pouvez suivre la formation AFGSU de niveau 2.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg">
                      <a href="/inscription">
                        M'inscrire à une formation AFGSU 2
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" onClick={handleReset}>
                      Refaire le test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Info className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-amber-900 dark:text-amber-100">
                    Votre profession ne semble pas éligible à l'AFGSU 2
                  </h2>
                  <p className="text-amber-700 dark:text-amber-300 mb-2">
                    L'AFGSU 2 est réservée aux professionnels de santé inscrits dans la 4ème partie
                    du Code de la Santé Publique.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mb-8">
                    Cependant, vous pourriez être éligible à l'<strong>AFGSU de niveau 1</strong>,
                    ouverte à tout professionnel travaillant dans un établissement de santé ou médico-social.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" size="lg" onClick={handleReset}>
                      Refaire le test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageLayout>
    </div>
  );
}
