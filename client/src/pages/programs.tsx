import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  BookOpen,
  Clock,
  Euro,
  MoreHorizontal,
  Pencil,
  Trash2,
  Award,
  RefreshCw,
  Monitor,
  MapPin,
  Layers,
  ArrowLeft,
  Eye,
  Calendar,
  Target,
  ClipboardList,
  Accessibility,
  GraduationCap,
  Filter,
  X,
  ChevronDown,
  FileDown,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Program, InsertProgram, Session, ProgramPrerequisite } from "@shared/schema";
import { PROGRAM_CATEGORIES, PROGRAM_CATEGORY_GROUPS, MODALITIES, TRAINEE_PROFESSIONS, FUNDING_TYPES } from "@shared/schema";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";

const levels = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

const statusOptions = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
];

function ProgramStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    published: "Publié",
    archived: "Archivé",
  };
  return <StatusBadge status={status === "published" ? "actif" : status === "draft" ? "brouillon" : "archivé"} label={labels[status] || status} />;
}

function LevelBadge({ level }: { level: string }) {
  const labels: Record<string, string> = {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  };
  return <Badge variant="secondary" className="text-xs">{labels[level] || level}</Badge>;
}

function ModalityBadge({ modality }: { modality: string }) {
  const icons: Record<string, typeof Monitor> = {
    presentiel: MapPin,
    distanciel: Monitor,
    blended: Layers,
  };
  const labels: Record<string, string> = {
    presentiel: "Présentiel",
    distanciel: "Distanciel",
    blended: "Blended",
  };
  const Icon = icons[modality] || MapPin;
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Icon className="w-3 h-3" />
      {labels[modality] || modality}
    </Badge>
  );
}

function ProgramForm({
  program,
  onSubmit,
  isPending,
}: {
  program?: Program;
  onSubmit: (data: InsertProgram) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(program?.title || "");
  const [description, setDescription] = useState(program?.description || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(program?.categories || []);
  const [duration, setDuration] = useState(program?.duration?.toString() || "14");
  const [price, setPrice] = useState(program?.price?.toString() || "500");
  const [level, setLevel] = useState(program?.level || "beginner");
  const [objectives, setObjectives] = useState(program?.objectives || "");
  const [prerequisites, setPrerequisites] = useState(program?.prerequisites || "");
  const [modality, setModality] = useState(program?.modality || "presentiel");
  const [status, setStatus] = useState(program?.status || "draft");
  const [certifying, setCertifying] = useState(program?.certifying || false);
  const [recyclingMonths, setRecyclingMonths] = useState(program?.recyclingMonths?.toString() || "");
  // Qualiopi fields
  const [programContent, setProgramContent] = useState(program?.programContent || "");
  const [targetAudience, setTargetAudience] = useState(program?.targetAudience || "");
  const [teachingMethods, setTeachingMethods] = useState(program?.teachingMethods || "");
  const [evaluationMethods, setEvaluationMethods] = useState(program?.evaluationMethods || "");
  const [technicalMeans, setTechnicalMeans] = useState(program?.technicalMeans || "");
  const [accessibilityInfo, setAccessibilityInfo] = useState(program?.accessibilityInfo || "");
  const [accessDelay, setAccessDelay] = useState(program?.accessDelay || "");
  const [resultIndicators, setResultIndicators] = useState(program?.resultIndicators || "");
  const [referentContact, setReferentContact] = useState(program?.referentContact || "");
  const [referentHandicap, setReferentHandicap] = useState(program?.referentHandicap || "");
  const [selectedFunding, setSelectedFunding] = useState<string[]>(program?.fundingTypes || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      categories: selectedCategories,
      duration: parseInt(duration) || 14,
      price: parseInt(price) || 0,
      level,
      objectives: objectives || null,
      prerequisites: prerequisites || null,
      modality,
      status,
      certifying,
      recyclingMonths: recyclingMonths ? parseInt(recyclingMonths) : null,
      programContent: programContent || null,
      targetAudience: targetAudience || null,
      teachingMethods: teachingMethods || null,
      evaluationMethods: evaluationMethods || null,
      technicalMeans: technicalMeans || null,
      accessibilityInfo: accessibilityInfo || null,
      accessDelay: accessDelay || null,
      resultIndicators: resultIndicators || null,
      referentContact: referentContact || null,
      referentHandicap: referentHandicap || null,
      fundingTypes: selectedFunding,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Information générale */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Information générale</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la formation</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: AFGSU Niveau 1" required data-testid="input-program-title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description de la formation..." className="resize-none" data-testid="input-program-description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégories</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal" data-testid="select-program-category">
                    {selectedCategories.length === 0
                      ? "Sélectionner..."
                      : `${selectedCategories.length} catégorie${selectedCategories.length > 1 ? "s" : ""}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 max-h-72 overflow-y-auto p-3 z-[100]" align="start">
                  <div className="space-y-3">
                    {PROGRAM_CATEGORY_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group.label}</p>
                        <div className="space-y-1.5">
                          {group.categories.map((c) => (
                            <label key={c} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={selectedCategories.includes(c)}
                                onCheckedChange={() => {
                                  setSelectedCategories((prev) =>
                                    prev.includes(c)
                                      ? prev.filter((x) => x !== c)
                                      : [...prev, c]
                                  );
                                }}
                              />
                              <span className="text-sm">{c}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger data-testid="select-program-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modalité</Label>
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger data-testid="select-program-modality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-program-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Durée (heures)</Label>
              <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" data-testid="input-program-duration" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prix (EUR)</Label>
              <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" data-testid="input-program-price" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-accent/30">
            <Switch id="certifying" checked={certifying} onCheckedChange={setCertifying} data-testid="switch-program-certifying" />
            <Label htmlFor="certifying" className="text-sm cursor-pointer">Formation certifiante</Label>
          </div>
          {certifying && (
            <div className="space-y-2">
              <Label htmlFor="recycling">Délai de recyclage (mois)</Label>
              <Input id="recycling" type="number" value={recyclingMonths} onChange={(e) => setRecyclingMonths(e.target.value)} placeholder="Ex: 48 pour AFGSU" data-testid="input-program-recycling" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Financements possibles</Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  {selectedFunding.length === 0
                    ? "Sélectionner les financements..."
                    : `${selectedFunding.length} financement${selectedFunding.length > 1 ? "s" : ""}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-3 z-[100]" align="start">
                <div className="space-y-1.5">
                  {FUNDING_TYPES.map((ft) => (
                    <label key={ft.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedFunding.includes(ft.value)}
                        onCheckedChange={() => {
                          setSelectedFunding((prev) =>
                            prev.includes(ft.value)
                              ? prev.filter((x) => x !== ft.value)
                              : [...prev, ft.value]
                          );
                        }}
                      />
                      <Badge className={`text-xs ${ft.color}`}>{ft.label}</Badge>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Section 2: Contenu pédagogique */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contenu pédagogique</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="programContent">Programme détaillé / Syllabus</Label>
            <Textarea id="programContent" value={programContent} onChange={(e) => setProgramContent(e.target.value)} placeholder="Détaillez le contenu du programme..." className="resize-none min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objectives">Objectifs pédagogiques</Label>
            <Textarea id="objectives" value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="Les objectifs de cette formation..." className="resize-none" data-testid="input-program-objectives" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Public visé</Label>
            <Textarea id="targetAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Décrivez le public cible..." className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teachingMethods">Méthodes pédagogiques</Label>
            <Textarea id="teachingMethods" value={teachingMethods} onChange={(e) => setTeachingMethods(e.target.value)} placeholder="Ex: Apports théoriques, mises en situation, cas pratiques..." className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technicalMeans">Moyens techniques et pédagogiques</Label>
            <Textarea id="technicalMeans" value={technicalMeans} onChange={(e) => setTechnicalMeans(e.target.value)} placeholder="Ex: Vidéoprojecteur, mannequins, supports de cours..." className="resize-none" />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Section 3: Évaluation et résultats */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Évaluation et résultats</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evaluationMethods">Modalités d'évaluation</Label>
            <Textarea id="evaluationMethods" value={evaluationMethods} onChange={(e) => setEvaluationMethods(e.target.value)} placeholder="Ex: QCM, mise en situation pratique, évaluation continue..." className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resultIndicators">Indicateurs de résultats</Label>
            <Textarea id="resultIndicators" value={resultIndicators} onChange={(e) => setResultIndicators(e.target.value)} placeholder="Ex: Taux de réussite, taux de satisfaction..." className="resize-none" />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Section 4: Accessibilité et contact */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Accessibilité et contact</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prerequisites">Prérequis</Label>
            <Input id="prerequisites" value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} placeholder="Ex: Aucun prérequis" data-testid="input-program-prerequisites" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessibilityInfo">Accessibilité handicap</Label>
            <Textarea id="accessibilityInfo" value={accessibilityInfo} onChange={(e) => setAccessibilityInfo(e.target.value)} placeholder="Informations sur l'accessibilité aux personnes en situation de handicap..." className="resize-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessDelay">Délais d'accès</Label>
            <Input id="accessDelay" value={accessDelay} onChange={(e) => setAccessDelay(e.target.value)} placeholder="Ex: 15 jours avant le début de la session" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referentContact">Contact référent</Label>
              <Input id="referentContact" value={referentContact} onChange={(e) => setReferentContact(e.target.value)} placeholder="Nom et coordonnées" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referentHandicap">Référent handicap</Label>
              <Input id="referentHandicap" value={referentHandicap} onChange={(e) => setReferentHandicap(e.target.value)} placeholder="Nom et coordonnées" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-program-submit">
          {isPending ? "Enregistrement..." : program ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <p className="text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}

function ProgramDetail({
  program,
  onBack,
  onEdit,
}: {
  program: Program;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: allPrograms } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });
  const { data: prerequisites } = useQuery<ProgramPrerequisite[]>({
    queryKey: [`/api/programs/${program.id}/prerequisites`],
  });

  const [prereqDialogOpen, setPrereqDialogOpen] = useState(false);
  const [prereqRequiredProgramId, setPrereqRequiredProgramId] = useState("");
  const [prereqRequiredCategory, setPrereqRequiredCategory] = useState("");
  const [prereqMaxMonths, setPrereqMaxMonths] = useState("");
  const [prereqRequiredProfessions, setPrereqRequiredProfessions] = useState<string[]>([]);
  const [prereqRequiresRpps, setPrereqRequiresRpps] = useState(false);
  const [prereqDescription, setPrereqDescription] = useState("");

  const { toast: detailToast } = useToast();

  const createPrereqMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/programs/${program.id}/prerequisites`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${program.id}/prerequisites`] });
      setPrereqDialogOpen(false);
      setPrereqRequiredProgramId("");
      setPrereqRequiredCategory("");
      setPrereqMaxMonths("");
      setPrereqRequiredProfessions([]);
      setPrereqRequiresRpps(false);
      setPrereqDescription("");
      detailToast({ title: "Prérequis ajouté" });
    },
  });

  const deletePrereqMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/program-prerequisites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${program.id}/prerequisites`] });
      detailToast({ title: "Prérequis supprimé" });
    },
  });

  const programSessions = sessions?.filter((s) => s.programId === program.id) || [];

  const modalityLabels: Record<string, string> = {
    presentiel: "Présentiel",
    distanciel: "Distanciel",
    blended: "Blended Learning",
  };

  const levelLabels: Record<string, string> = {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  };

  const sessionStatusLabels: Record<string, string> = {
    planned: "Planifiée",
    ongoing: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{program.title}</h1>
          <p className="text-muted-foreground text-sm">
            {program.categories?.join(", ") || "Aucune catégorie"}
            {program.updatedAt && (
              <span className="ml-2">— Mis à jour le {new Date(program.updatedAt).toLocaleDateString("fr-FR")}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProgramStatusBadge status={program.status} />
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Information générale */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Information générale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-start gap-2"><span className="text-muted-foreground shrink-0">Catégories</span><div className="flex flex-wrap gap-1 justify-end">{program.categories?.length ? program.categories.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>) : <span className="text-muted-foreground italic">Aucune</span>}</div></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Niveau</span><span>{levelLabels[program.level] || program.level}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Modalité</span><span>{modalityLabels[program.modality] || program.modality}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Durée</span><span>{program.duration}h</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prix</span><span>{program.price.toLocaleString("fr-FR")} EUR</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Certifiante</span>
              <span>{program.certifying ? "Oui" : "Non"}</span>
            </div>
            {program.recyclingMonths && (
              <div className="flex justify-between"><span className="text-muted-foreground">Recyclage</span><span>{program.recyclingMonths} mois</span></div>
            )}
            {program.fundingTypes && program.fundingTypes.length > 0 && (
              <div className="flex justify-between items-start gap-2"><span className="text-muted-foreground shrink-0">Financements</span><div className="flex flex-wrap gap-1 justify-end">{program.fundingTypes.map((f: string) => { const ft = FUNDING_TYPES.find((t) => t.value === f); return ft ? <Badge key={f} className={`text-xs ${ft.color}`}>{ft.label}</Badge> : null; })}</div></div>
            )}
          </CardContent>
        </Card>

        {/* Contenu pédagogique */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Contenu pédagogique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Description" value={program.description} />
            <DetailRow label="Programme détaillé" value={program.programContent} />
            <DetailRow label="Objectifs pédagogiques" value={program.objectives} />
            <DetailRow label="Public visé" value={program.targetAudience} />
            {!program.description && !program.programContent && !program.objectives && !program.targetAudience && (
              <p className="text-muted-foreground italic">Aucun contenu pédagogique renseigné</p>
            )}
          </CardContent>
        </Card>

        {/* Méthodes et moyens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Méthodes et moyens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Méthodes pédagogiques" value={program.teachingMethods} />
            <DetailRow label="Moyens techniques et pédagogiques" value={program.technicalMeans} />
            <DetailRow label="Prérequis" value={program.prerequisites} />
            {!program.teachingMethods && !program.technicalMeans && !program.prerequisites && (
              <p className="text-muted-foreground italic">Aucune information renseignée</p>
            )}
          </CardContent>
        </Card>

        {/* Évaluation et résultats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Évaluation et résultats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Modalités d'évaluation" value={program.evaluationMethods} />
            <DetailRow label="Indicateurs de résultats" value={program.resultIndicators} />
            {!program.evaluationMethods && !program.resultIndicators && (
              <p className="text-muted-foreground italic">Aucune information renseignée</p>
            )}
          </CardContent>
        </Card>

        {/* Accessibilité et contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Accessibility className="w-4 h-4" />
              Accessibilité et contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Accessibilité handicap" value={program.accessibilityInfo} />
            <DetailRow label="Délais d'accès" value={program.accessDelay} />
            <DetailRow label="Contact référent" value={program.referentContact} />
            <DetailRow label="Référent handicap" value={program.referentHandicap} />
            {!program.accessibilityInfo && !program.accessDelay && !program.referentContact && !program.referentHandicap && (
              <p className="text-muted-foreground italic">Aucune information renseignée</p>
            )}
          </CardContent>
        </Card>

        {/* Prérequis structurés */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Prérequis structurés
              <Badge variant="secondary" className="ml-auto">{prerequisites?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!prerequisites || prerequisites.length === 0) ? (
              <p className="text-sm text-muted-foreground italic">Aucun prérequis structuré défini</p>
            ) : (
              <div className="space-y-3">
                {prerequisites.map((prereq) => (
                  <div key={prereq.id} className="flex items-start justify-between p-3 rounded-md border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{prereq.description || "Prérequis"}</p>
                      <div className="flex flex-wrap gap-1">
                        {prereq.requiredCategory && <Badge variant="outline" className="text-xs">{prereq.requiredCategory}</Badge>}
                        {prereq.requiresRpps && <Badge variant="outline" className="text-xs bg-amber-50">RPPS requis</Badge>}
                        {prereq.maxMonthsSinceCompletion && <Badge variant="outline" className="text-xs">{prereq.maxMonthsSinceCompletion} mois max</Badge>}
                        {prereq.requiredProgramId && (
                          <Badge variant="outline" className="text-xs">
                            Programme : {allPrograms?.find(p => p.id === prereq.requiredProgramId)?.title || prereq.requiredProgramId}
                          </Badge>
                        )}
                        {(prereq.requiredProfessions as string[] || []).length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {(prereq.requiredProfessions as string[]).map(p => TRAINEE_PROFESSIONS.find(tp => tp.value === p)?.label || p).join(", ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => deletePrereqMutation.mutate(prereq.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPrereqDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un prérequis
            </Button>

            {/* Prerequisite Dialog */}
            <Dialog open={prereqDialogOpen} onOpenChange={setPrereqDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un prérequis</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createPrereqMutation.mutate({
                    requiredProgramId: prereqRequiredProgramId || null,
                    requiredCategory: prereqRequiredCategory || null,
                    maxMonthsSinceCompletion: prereqMaxMonths ? parseInt(prereqMaxMonths) : null,
                    requiredProfessions: prereqRequiredProfessions,
                    requiresRpps: prereqRequiresRpps,
                    description: prereqDescription,
                  });
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={prereqDescription} onChange={(e) => setPrereqDescription(e.target.value)} placeholder="Ex: AFGSU Niveau 1 valide" />
                  </div>
                  <div className="space-y-2">
                    <Label>Programme requis</Label>
                    <Select value={prereqRequiredProgramId} onValueChange={setPrereqRequiredProgramId}>
                      <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent>
                        {allPrograms?.filter(p => p.id !== program.id).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie requise</Label>
                    <Input value={prereqRequiredCategory} onChange={(e) => setPrereqRequiredCategory(e.target.value)} placeholder="Ex: AFGSU" />
                  </div>
                  <div className="space-y-2">
                    <Label>Délai max depuis obtention (mois)</Label>
                    <Input type="number" value={prereqMaxMonths} onChange={(e) => setPrereqMaxMonths(e.target.value)} placeholder="Ex: 48" />
                  </div>
                  <div className="space-y-2">
                    <Label>Professions éligibles</Label>
                    <div className="flex flex-wrap gap-2">
                      {TRAINEE_PROFESSIONS.map(p => (
                        <label key={p.value} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={prereqRequiredProfessions.includes(p.value)} onChange={(e) => {
                            if (e.target.checked) setPrereqRequiredProfessions([...prereqRequiredProfessions, p.value]);
                            else setPrereqRequiredProfessions(prereqRequiredProfessions.filter(v => v !== p.value));
                          }} className="accent-primary" />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={prereqRequiresRpps} onChange={(e) => setPrereqRequiresRpps(e.target.checked)} className="accent-primary" />
                    <Label className="cursor-pointer">Exige un n° RPPS</Label>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createPrereqMutation.isPending}>
                      {createPrereqMutation.isPending ? "Ajout..." : "Ajouter"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Sessions associées */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Sessions associées
              <Badge variant="secondary" className="ml-auto">{programSessions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {programSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune session associée à cette formation</p>
            ) : (
              <div className="space-y-3">
                {programSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-md border">
                    <div>
                      <p className="text-sm font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startDate).toLocaleDateString("fr-FR")} — {new Date(session.endDate).toLocaleDateString("fr-FR")}
                        {session.location && <span> | {session.location}</span>}
                      </p>
                    </div>
                    <StatusBadge status={session.status} label={sessionStatusLabels[session.status] || session.status} colorMap={{ planned: "purple", ongoing: "info", completed: "success", cancelled: "destructive" }} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

export default function Programs() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<Program | undefined>();
  const [viewProgram, setViewProgram] = useState<Program | undefined>();
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const { toast } = useToast();

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertProgram) => apiRequest("POST", "/api/programs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setDialogOpen(false);
      toast({ title: "Formation créée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertProgram }) =>
      apiRequest("PATCH", `/api/programs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setDialogOpen(false);
      setEditProgram(undefined);
      // Also refresh the detail view if open
      if (viewProgram && editProgram && viewProgram.id === editProgram.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/programs"] }).then(() => {
          const updated = queryClient.getQueryData<Program[]>(["/api/programs"]);
          const refreshed = updated?.find((p) => p.id === viewProgram.id);
          if (refreshed) setViewProgram(refreshed);
        });
      }
      toast({ title: "Formation modifiée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Formation supprimée" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  // Published programs count for catalog preview
  const publishedPrograms = programs?.filter((p) => p.status === "published") || [];
  const catalogFilteredCount = catalogCategories.length === 0
    ? publishedPrograms.length
    : publishedPrograms.filter((p) =>
        p.categories?.some((c) => catalogCategories.includes(c))
      ).length;

  const handleDownloadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const params = catalogCategories.length > 0
        ? `?categories=${encodeURIComponent(catalogCategories.join(","))}`
        : "";
      const res = await fetch(`/api/programs/catalog-pdf${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la génération");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Catalogue_Formations_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCatalogDialogOpen(false);
      toast({ title: "Catalogue PDF téléchargé" });
    } catch {
      toast({ title: "Erreur lors de la génération du catalogue", variant: "destructive" });
    } finally {
      setCatalogLoading(false);
    }
  };

  const filtered = programs?.filter((p) => {
    const matchesSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.categories?.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchesCategories = categoryFilter.length === 0 ||
      categoryFilter.every((cat) => p.categories?.includes(cat));
    return matchesSearch && matchesCategories;
  }) || [];

  // Detail view
  if (viewProgram) {
    // Get fresh data from the query cache
    const freshProgram = programs?.find((p) => p.id === viewProgram.id) || viewProgram;
    return (
      <ProgramDetail
        program={freshProgram}
        onBack={() => setViewProgram(undefined)}
        onEdit={() => {
          setEditProgram(freshProgram);
          setDialogOpen(true);
        }}
      />
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Formations"
        subtitle="Catalogue des formations SO'SAFE"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCatalogCategories([]);
                setCatalogDialogOpen(true);
              }}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Catalogue PDF
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importer CSV
            </Button>
            <Button onClick={() => { setEditProgram(undefined); setDialogOpen(true); }} data-testid="button-create-program">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle formation
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher une formation..."
            className="max-w-sm"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Catégories
                {categoryFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{categoryFilter.length}</Badge>
                )}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-80 overflow-y-auto p-3" align="start">
              <div className="space-y-3">
                {PROGRAM_CATEGORY_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group.label}</p>
                    <div className="space-y-1.5">
                      {group.categories.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={categoryFilter.includes(c)}
                            onCheckedChange={() => {
                              setCategoryFilter((prev) =>
                                prev.includes(c)
                                  ? prev.filter((x) => x !== c)
                                  : [...prev, c]
                              );
                            }}
                          />
                          <span className="text-sm">{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {(search || categoryFilter.length > 0) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter([]); }} className="text-muted-foreground">
              <X className="w-3 h-3 mr-1" />
              Effacer les filtres
            </Button>
          )}
        </div>
        {categoryFilter.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categoryFilter.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => setCategoryFilter((prev) => prev.filter((c) => c !== cat))}
              >
                {cat}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3 mb-4" /><Skeleton className="h-6 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune formation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || categoryFilter.length > 0 ? "Aucun résultat pour vos critères de recherche" : "Commencez par créer votre première formation"}
          </p>
          {!search && categoryFilter.length === 0 && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-program">
              <Plus className="w-4 h-4 mr-2" />
              Créer une formation
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((program) => (
            <Card key={program.id} className="hover-elevate cursor-pointer" data-testid={`card-program-${program.id}`} onClick={() => setViewProgram(program)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate hover:text-primary transition-colors">{program.title}</h3>
                    <div className="flex flex-wrap gap-1 mt-0.5">{program.categories?.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} data-testid={`button-program-menu-${program.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewProgram(program); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir la fiche
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditProgram(program); setDialogOpen(true); }} data-testid={`button-edit-program-${program.id}`}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(program.id); }} data-testid={`button-delete-program-${program.id}`}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {program.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{program.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <LevelBadge level={program.level} />
                  <ProgramStatusBadge status={program.status} />
                  <ModalityBadge modality={program.modality} />
                  {program.certifying && (
                    <Badge variant="outline" className="text-xs gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Award className="w-3 h-3" />
                      Certifiante
                    </Badge>
                  )}
                  {program.fundingTypes?.map((f: string) => {
                    const ft = FUNDING_TYPES.find((t) => t.value === f);
                    return ft ? <Badge key={f} className={`text-xs ${ft.color}`}>{ft.label}</Badge> : null;
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {program.duration}h
                  </span>
                  <span className="flex items-center gap-1">
                    <Euro className="w-3.5 h-3.5" />
                    {program.price.toLocaleString("fr-FR")} EUR
                  </span>
                  {program.recyclingMonths && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {program.recyclingMonths} mois
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditProgram(undefined); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProgram ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
          </DialogHeader>
          <ProgramForm
            program={editProgram}
            onSubmit={(data) =>
              editProgram
                ? updateMutation.mutate({ id: editProgram.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Générer le catalogue PDF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez les catégories à inclure dans le catalogue.
              Seules les formations publiées seront incluses.
            </p>

            <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-3">
              {PROGRAM_CATEGORY_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-1.5">
                    {group.categories.map((c) => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={catalogCategories.length === 0 || catalogCategories.includes(c)}
                          onCheckedChange={() => {
                            setCatalogCategories((prev) => {
                              if (prev.length === 0) {
                                // Switching from "all" to specific: select all except this one
                                const allCats = PROGRAM_CATEGORY_GROUPS.flatMap((g) => [...g.categories]);
                                return allCats.filter((x) => x !== c);
                              }
                              if (prev.includes(c)) {
                                const next = prev.filter((x) => x !== c);
                                return next;
                              }
                              return [...prev, c];
                            });
                          }}
                        />
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {catalogFilteredCount} formation{catalogFilteredCount > 1 ? "s" : ""} publiée{catalogFilteredCount > 1 ? "s" : ""} incluse{catalogFilteredCount > 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-primary underline-offset-4 hover:underline"
                onClick={() => setCatalogCategories([])}
              >
                Tout sélectionner
              </Button>
            </div>

            <Button
              onClick={handleDownloadCatalog}
              disabled={catalogLoading || catalogFilteredCount === 0}
              className="w-full"
            >
              {catalogLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Générer et télécharger
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType="programs"
        entityLabel="formations"
        queryKey="/api/programs"
        requiredFields={["Titre"]}
        exampleColumns={[
          { header: "Titre", example: "Formation SST" },
          { header: "Durée", example: "14" },
          { header: "Prix", example: "350" },
          { header: "Description", example: "Formation aux premiers secours" },
          { header: "Objectifs", example: "Savoir porter secours" },
          { header: "Modalité", example: "presentiel" },
        ]}
      />
    </PageLayout>
  );
}
