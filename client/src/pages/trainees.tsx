import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  RefreshCw,
  ExternalLink,
  LayoutGrid,
  List,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Trainee, InsertTrainee, Enterprise, UserDocument } from "@shared/schema";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedFilters } from "@/components/shared/AdvancedFilters";
import { ExportButton } from "@/components/shared/ExportButton";
import { TRAINEE_CIVILITIES, TRAINEE_PROFILE_TYPES, PRO_STATUT_TYPES, DIETARY_REGIMES, TRAINEE_PROFESSIONS, USER_DOCUMENT_STATUSES, AI_ANALYSIS_STATUSES, AI_CONFIDENCE_LEVELS } from "@shared/schema";

function ProfileTypeBadge({ profileType }: { profileType: string | null }) {
  const pt = TRAINEE_PROFILE_TYPES.find((p) => p.value === profileType);
  const variantMap: Record<string, "info" | "purple" | "secondary"> = {
    salarie: "info",
    profession_liberale: "purple",
    particulier: "secondary",
  };
  if (!pt) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={variantMap[pt.value] || "secondary"}>
      {pt.label}
    </Badge>
  );
}

function TraineeForm({
  trainee,
  enterprises,
  onSubmit,
  isPending,
}: {
  trainee?: Trainee;
  enterprises: Enterprise[];
  onSubmit: (data: InsertTrainee) => void;
  isPending: boolean;
}) {
  // Identité
  const [civility, setCivility] = useState(trainee?.civility || "");
  const [firstName, setFirstName] = useState(trainee?.firstName || "");
  const [lastName, setLastName] = useState(trainee?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState(trainee?.dateOfBirth || "");
  const [cityOfBirth, setCityOfBirth] = useState(trainee?.cityOfBirth || "");
  const [department, setDepartment] = useState(trainee?.department || "");

  // Contact
  const [email, setEmail] = useState(trainee?.email || "");
  const [phone, setPhone] = useState(trainee?.phone || "");

  // Profil
  const [profileType, setProfileType] = useState(trainee?.profileType || "salarie");
  const [enterpriseId, setEnterpriseId] = useState(trainee?.enterpriseId || "");
  const [company, setCompany] = useState(trainee?.company || "");
  const [proStatut, setProStatut] = useState(trainee?.proStatut || "");
  const [proDenomination, setProDenomination] = useState(trainee?.proDenomination || "");
  const [proSiret, setProSiret] = useState(trainee?.proSiret || "");
  const [proTva, setProTva] = useState(trainee?.proTva || "");

  // Santé
  const [profession, setProfession] = useState(trainee?.profession || "");
  const [rppsNumber, setRppsNumber] = useState(trainee?.rppsNumber || "");

  // Adresse
  const [address, setAddress] = useState(trainee?.address || "");
  const [traineeCity, setTraineeCity] = useState(trainee?.city || "");
  const [postalCode, setPostalCode] = useState(trainee?.postalCode || "");
  const [country, setCountry] = useState(trainee?.country || "France");

  // Responsable
  const [managerName, setManagerName] = useState(trainee?.managerName || "");
  const [managerEmail, setManagerEmail] = useState(trainee?.managerEmail || "");

  // Documents administratifs
  const [diplomaNumber, setDiplomaNumber] = useState(trainee?.diplomaNumber || "");
  const [socialSecurityNumber, setSocialSecurityNumber] = useState(trainee?.socialSecurityNumber || "");

  // Complémentaire
  const [poleEmploiId, setPoleEmploiId] = useState(trainee?.poleEmploiId || "");
  const [dietaryRegime, setDietaryRegime] = useState(trainee?.dietaryRegime || "");
  const [imageRightsConsent, setImageRightsConsent] = useState(trainee?.imageRightsConsent || false);

  const [status, setStatus] = useState(trainee?.status || "active");
  const [avatarUrl, setAvatarUrl] = useState(trainee?.avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const { toast: formToast } = useToast();

  const handleAvatarChange = async (file: File) => {
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setAvatarUploading(true);
    try {
      const uploaded = await uploadFile(file);
      setAvatarUrl(uploaded.fileUrl);
      setAvatarPreview("");
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      formToast({
        title: "Erreur lors de l'upload de la photo",
        description: err instanceof Error ? err.message : "Veuillez réessayer",
        variant: "destructive",
      });
      // Keep local preview so user sees their selection
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isSalarie = profileType === "salarie";
    const isLiberal = profileType === "profession_liberale";
    onSubmit({
      firstName,
      lastName,
      email,
      phone: phone || null,
      company: isSalarie ? (company || null) : null,
      enterpriseId: isSalarie ? (enterpriseId || null) : null,
      status,
      civility: civility || null,
      dateOfBirth: dateOfBirth || null,
      cityOfBirth: cityOfBirth || null,
      department: department || null,
      poleEmploiId: poleEmploiId || null,
      dietaryRegime: dietaryRegime || null,
      imageRightsConsent,
      profileType,
      proStatut: isLiberal ? (proStatut || null) : null,
      proDenomination: isLiberal ? (proDenomination || null) : null,
      proSiret: isLiberal ? (proSiret || null) : null,
      proTva: isLiberal ? (proTva || null) : null,
      avatarUrl: avatarUrl || null,
      rppsNumber: rppsNumber || null,
      profession: profession || null,
      address: address || null,
      city: traineeCity || null,
      postalCode: postalCode || null,
      country: country || null,
      managerName: managerName || null,
      managerEmail: managerEmail || null,
      diplomaNumber: diplomaNumber || null,
      socialSecurityNumber: socialSecurityNumber || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30">
          {(avatarPreview || avatarUrl) ? (
            <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <GraduationCap className="w-6 h-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="avatar-upload" className="text-sm">Photo de profil</Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="w-64"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatarChange(f);
            }}
          />
          {avatarUploading && <p className="text-xs text-muted-foreground">Upload en cours...</p>}
        </div>
      </div>

      {/* Section 1: Identité */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Identité</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Civilité</Label>
              <Select value={civility} onValueChange={setCivility}>
                <SelectTrigger data-testid="select-trainee-civility">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {TRAINEE_CIVILITIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-firstName">Prénom <span className="text-red-500">*</span></Label>
              <Input id="trainee-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required data-testid="input-trainee-firstName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-lastName">Nom <span className="text-red-500">*</span></Label>
              <Input id="trainee-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required data-testid="input-trainee-lastName" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trainee-dateOfBirth">Date de naissance</Label>
              <div className="flex gap-2">
                <Input
                  id="trainee-dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="flex-1"
                  data-testid="input-trainee-dateOfBirth"
                />
                <Input
                  placeholder="JJ/MM/AAAA"
                  value={dateOfBirth ? dateOfBirth.split("-").reverse().join("/") : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    if (match) {
                      setDateOfBirth(`${match[3]}-${match[2]}-${match[1]}`);
                    }
                  }}
                  className="w-32"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-cityOfBirth">Ville de naissance</Label>
              <Input id="trainee-cityOfBirth" value={cityOfBirth} onChange={(e) => setCityOfBirth(e.target.value)} data-testid="input-trainee-cityOfBirth" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-department">Département</Label>
              <Input id="trainee-department" value={department} onChange={(e) => setDepartment(e.target.value)} data-testid="input-trainee-department" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Contact */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Contact</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trainee-email">Email <span className="text-red-500">*</span></Label>
            <Input id="trainee-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-trainee-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainee-phone">Téléphone</Label>
            <Input id="trainee-phone" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-trainee-phone" />
          </div>
        </div>
      </div>

      {/* Section 3: Adresse */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Adresse</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trainee-address">Adresse</Label>
            <Input id="trainee-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Numéro et nom de rue" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trainee-postalCode">Code postal</Label>
              <Input id="trainee-postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Ex: 75001" maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-city">Ville</Label>
              <Input id="trainee-city" value={traineeCity} onChange={(e) => setTraineeCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-country">Pays</Label>
              <Input id="trainee-country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Profil */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Profil</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de profil</Label>
              <Select value={profileType} onValueChange={(val) => {
                setProfileType(val);
                // Reset profile-specific fields when switching type
                if (val !== "salarie") {
                  setEnterpriseId("");
                  setCompany("");
                }
                if (val !== "profession_liberale") {
                  setProStatut("");
                  setProDenomination("");
                  setProSiret("");
                  setProTva("");
                }
              }}>
                <SelectTrigger data-testid="select-trainee-profileType">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {TRAINEE_PROFILE_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut du dossier</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-trainee-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional fields for "salarie" */}
          {profileType === "salarie" && (
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/5 p-4 space-y-4">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">Informations salarié</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entreprise</Label>
                  <Select value={enterpriseId} onValueChange={(val) => {
                    setEnterpriseId(val);
                    if (val && val !== "none") {
                      const ent = enterprises.find((e) => e.id === val);
                      if (ent) setCompany(ent.name);
                    }
                  }}>
                    <SelectTrigger data-testid="select-trainee-enterprise">
                      <SelectValue placeholder="Sélectionner une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {enterprises.map((ent) => (
                        <SelectItem key={ent.id} value={ent.id}>{ent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainee-company">Entreprise (texte libre)</Label>
                  <Input id="trainee-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Si non référencée" data-testid="input-trainee-company" />
                </div>
              </div>
            </div>
          )}

          {/* Conditional fields for "profession_liberale" */}
          {profileType === "profession_liberale" && (
            <div className="rounded-lg border bg-purple-50/50 dark:bg-purple-900/5 p-4 space-y-4">
              <p className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">Informations profession libérale</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trainee-proStatut">Statut professionnel</Label>
                  <Select value={proStatut} onValueChange={setProStatut}>
                    <SelectTrigger data-testid="select-trainee-proStatut">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRO_STATUT_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainee-proDenomination">Dénomination</Label>
                  <Input id="trainee-proDenomination" value={proDenomination} onChange={(e) => setProDenomination(e.target.value)} placeholder="Raison sociale ou nom d'exercice" data-testid="input-trainee-proDenomination" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trainee-proSiret">SIRET</Label>
                  <Input id="trainee-proSiret" value={proSiret} onChange={(e) => setProSiret(e.target.value)} placeholder="14 chiffres" maxLength={14} data-testid="input-trainee-proSiret" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainee-proTva">N° TVA intracommunautaire</Label>
                  <Input id="trainee-proTva" value={proTva} onChange={(e) => setProTva(e.target.value)} placeholder="FR + 11 caractères" data-testid="input-trainee-proTva" />
                </div>
              </div>
            </div>
          )}

          {/* Info for "particulier" */}
          {profileType === "particulier" && (
            <div className="rounded-lg border bg-gray-50/50 dark:bg-gray-900/5 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Particulier</p>
              <p className="text-sm text-muted-foreground">
                Inscription à titre personnel, sans rattachement à une entreprise ou un exercice libéral. La facturation sera adressée directement au stagiaire.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section: Informations professionnelles de santé */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Informations professionnelles de santé</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Profession</Label>
            <Select value={profession} onValueChange={setProfession}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une profession" />
              </SelectTrigger>
              <SelectContent>
                {TRAINEE_PROFESSIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainee-rppsNumber">N° RPPS</Label>
            <Input id="trainee-rppsNumber" value={rppsNumber} onChange={(e) => setRppsNumber(e.target.value)} placeholder="Ex: 12345678901" />
          </div>
        </div>
      </div>

      {/* Section: Responsable */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Responsable</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trainee-managerName">Nom du responsable</Label>
            <Input id="trainee-managerName" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Nom complet" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainee-managerEmail">Email du responsable</Label>
            <Input id="trainee-managerEmail" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="responsable@entreprise.com" />
          </div>
        </div>
      </div>

      {/* Section: Documents administratifs */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Documents administratifs</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trainee-diplomaNumber">Numéro de diplôme</Label>
            <Input id="trainee-diplomaNumber" value={diplomaNumber} onChange={(e) => setDiplomaNumber(e.target.value)} placeholder="Ex: 2024-XXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainee-socialSecurityNumber">Numéro de sécurité sociale</Label>
            <Input id="trainee-socialSecurityNumber" value={socialSecurityNumber} onChange={(e) => setSocialSecurityNumber(e.target.value)} placeholder="15 chiffres" maxLength={15} />
          </div>
        </div>
      </div>

      {/* Section: Complémentaire */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Complémentaire</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trainee-poleEmploiId">Identifiant Pôle Emploi</Label>
              <Input id="trainee-poleEmploiId" value={poleEmploiId} onChange={(e) => setPoleEmploiId(e.target.value)} data-testid="input-trainee-poleEmploiId" />
            </div>
            <div className="space-y-2">
              <Label>Régime alimentaire</Label>
              <Select value={dietaryRegime} onValueChange={setDietaryRegime}>
                <SelectTrigger data-testid="select-trainee-dietaryRegime">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {DIETARY_REGIMES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trainee-imageRightsConsent"
              checked={imageRightsConsent}
              onChange={(e) => setImageRightsConsent(e.target.checked)}
              className="accent-primary"
              data-testid="checkbox-trainee-imageRightsConsent"
            />
            <Label htmlFor="trainee-imageRightsConsent" className="cursor-pointer">
              Consentement droit à l'image
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-trainee-submit">
          {isPending ? "Enregistrement..." : trainee ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

function TraineeDocuments({ traineeId }: { traineeId: string }) {
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<UserDocument[]>({
    queryKey: [`/api/trainees/${traineeId}/documents`],
  });

  const validateMutation = useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/user-documents/${docId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainees/${traineeId}/documents`] });
      toast({ title: "Document mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (docId: string) => apiRequest("POST", `/api/user-documents/${docId}/reanalyze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainees/${traineeId}/documents`] });
      toast({ title: "Analyse IA relancée" });
    },
    onError: () => toast({ title: "Erreur lors de la relance", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Aucun document justificatif</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const statusInfo = USER_DOCUMENT_STATUSES.find(s => s.value === doc.status);
        const aiStatusInfo = AI_ANALYSIS_STATUSES.find(s => s.value === doc.aiStatus);
        const confidenceInfo = AI_CONFIDENCE_LEVELS.find(c => c.value === doc.aiConfidence);

        return (
          <Card key={doc.id}>
            <CardContent className="p-4 space-y-3">
              {/* Line 1: File link + status badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {doc.fileUrl ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {doc.title || doc.fileName || "Document"}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium">{doc.title || "Document"}</span>
                  )}
                </div>
                {statusInfo && (
                  <Badge variant="outline" className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                )}
              </div>

              {/* Line 2: AI results */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Date extraite:</span>
                  <span className="font-medium">
                    {doc.aiExtractedDate
                      ? new Date(doc.aiExtractedDate).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                </div>
                {confidenceInfo && (
                  <Badge variant="outline" className={`text-xs ${confidenceInfo.color}`}>
                    Confiance: {confidenceInfo.label}
                  </Badge>
                )}
                {aiStatusInfo && (
                  <Badge variant="outline" className={`text-xs ${aiStatusInfo.color}`}>
                    IA: {aiStatusInfo.label}
                  </Badge>
                )}
              </div>

              {/* AI Error message */}
              {doc.aiError && (
                <p className="text-xs text-destructive">{doc.aiError}</p>
              )}

              {/* Line 3: Manual validation + reanalyze button */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={doc.isManuallyValidated || false}
                      onCheckedChange={(checked) => {
                        validateMutation.mutate({
                          docId: doc.id,
                          data: { isManuallyValidated: checked },
                        });
                      }}
                    />
                    <Label className="text-sm">Validation manuelle</Label>
                  </div>
                </div>
                {(doc.aiStatus === "failed" || doc.aiStatus === "pending") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reanalyzeMutation.mutate(doc.id)}
                    disabled={reanalyzeMutation.isPending}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${reanalyzeMutation.isPending ? "animate-spin" : ""}`} />
                    Relancer l'analyse
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TrombinoscopeGrid({
  trainees,
  enterprises,
  onEdit,
  onDelete,
}: {
  trainees: Trainee[];
  enterprises: Enterprise[];
  onEdit: (trainee: Trainee) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {trainees.map((trainee) => {
        const enterprise = enterprises.find((e) => e.id === trainee.enterpriseId);
        const initials = `${trainee.firstName?.[0] || ""}${trainee.lastName?.[0] || ""}`.toUpperCase();
        const companyDisplay = trainee.profileType === "profession_liberale"
          ? trainee.proDenomination
          : (enterprise?.name || trainee.company);

        return (
          <Card key={trainee.id} className="overflow-hidden group">
            <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
              <Avatar className="w-20 h-20">
                {trainee.avatarUrl ? (
                  <AvatarImage src={trainee.avatarUrl} alt={`${trainee.firstName} ${trainee.lastName}`} />
                ) : null}
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <p className="font-medium text-sm leading-tight">
                  {trainee.civility ? `${trainee.civility} ` : ""}
                  {trainee.firstName} {trainee.lastName}
                </p>
                {companyDisplay && (
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {companyDisplay}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-wrap justify-center">
                <StatusBadge
                  status={trainee.status === "active" ? "actif" : "inactif"}
                  label={trainee.status === "active" ? "Actif" : "Inactif"}
                />
                <ProfileTypeBadge profileType={trainee.profileType} />
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(trainee)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(trainee.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function Trainees() {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<"list" | "trombinoscope">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrainee, setEditTrainee] = useState<Trainee | undefined>();
  const { toast } = useToast();

  const { data: trainees, isLoading } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
  });

  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertTrainee) => apiRequest("POST", "/api/trainees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainees"] });
      setDialogOpen(false);
      toast({ title: "Stagiaire ajouté avec succès" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Erreur lors de l'ajout";
      toast({ title: msg.includes("unique") ? "Un stagiaire avec cet email existe déjà" : msg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertTrainee }) =>
      apiRequest("PATCH", `/api/trainees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainees"] });
      setDialogOpen(false);
      setEditTrainee(undefined);
      toast({ title: "Stagiaire modifié avec succès" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Erreur lors de la modification";
      toast({ title: msg.includes("unique") ? "Un stagiaire avec cet email existe déjà" : msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainees"] });
      toast({ title: "Stagiaire supprimé" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const traineeFilters = [
    {
      key: "enterpriseId",
      label: "Entreprise",
      type: "select" as const,
      options: (enterprises || []).map((e) => ({ value: e.id, label: e.name })),
    },
    {
      key: "status",
      label: "Statut",
      type: "select" as const,
      options: [
        { value: "active", label: "Actif" },
        { value: "inactive", label: "Inactif" },
      ],
    },
  ];

  const exportColumns = [
    { key: "firstName", label: "Prénom" },
    { key: "lastName", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Téléphone" },
    { key: "enterpriseName", label: "Entreprise" },
    { key: "address", label: "Adresse" },
    { key: "city", label: "Ville" },
    { key: "postalCode", label: "Code postal" },
    { key: "managerName", label: "Responsable" },
  ];

  const filtered = trainees?.filter(
    (t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.company || "").toLowerCase().includes(q) ||
        (t.proDenomination || "").toLowerCase().includes(q) ||
        (t.proSiret || "").toLowerCase().includes(q);

      const matchesEnterprise =
        !filterValues.enterpriseId || t.enterpriseId === filterValues.enterpriseId;

      const matchesStatus =
        !filterValues.status || t.status === filterValues.status;

      return matchesSearch && matchesEnterprise && matchesStatus;
    }
  ) || [];

  const exportData = filtered.map((t) => ({
    ...t,
    enterpriseName: enterprises?.find((e) => e.id === t.enterpriseId)?.name || t.company || "",
  }));

  return (
    <PageLayout>
      <PageHeader
        title="Stagiaires"
        subtitle="Gérez vos stagiaires et participants"
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "trombinoscope")}>
              <TabsList>
                <TabsTrigger value="list" className="gap-1.5">
                  <List className="w-4 h-4" />
                  Liste
                </TabsTrigger>
                <TabsTrigger value="trombinoscope" className="gap-1.5">
                  <LayoutGrid className="w-4 h-4" />
                  Trombinoscope
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ExportButton
              data={exportData}
              columns={exportColumns}
              filename="stagiaires"
            />
            <Button
              onClick={() => { setEditTrainee(undefined); setDialogOpen(true); }}
              data-testid="button-create-trainee"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un stagiaire
            </Button>
          </div>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un stagiaire..."
        className="max-w-sm"
      />

      <AdvancedFilters
        filters={traineeFilters}
        values={filterValues}
        onChange={setFilterValues}
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={GraduationCap}
              title="Aucun stagiaire"
              description={search ? "Aucun résultat pour votre recherche" : "Ajoutez votre premier stagiaire"}
              action={!search ? (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-trainee">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un stagiaire
                </Button>
              ) : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === "trombinoscope" ? (
        <TrombinoscopeGrid
          trainees={filtered}
          enterprises={enterprises || []}
          onEdit={(trainee) => { setEditTrainee(trainee); setDialogOpen(true); }}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Entreprise / Dénomination</TableHead>
                  <TableHead>Profil</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((trainee) => {
                  const enterprise = enterprises?.find((e) => e.id === trainee.enterpriseId);
                  return (
                    <TableRow key={trainee.id} data-testid={`row-trainee-${trainee.id}`}>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {trainee.civility ? `${trainee.civility} ` : ""}{trainee.firstName} {trainee.lastName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${trainee.email}`} className="text-sm text-primary hover:underline">{trainee.email}</a>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{trainee.phone || "—"}</p>
                      </TableCell>
                      <TableCell>
                        {trainee.profileType === "profession_liberale" ? (
                          <div>
                            <p className="text-sm text-muted-foreground">{trainee.proDenomination || "—"}</p>
                            {trainee.proSiret && (
                              <p className="text-xs text-muted-foreground/70">SIRET: {trainee.proSiret}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {enterprise?.name || trainee.company || "—"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <ProfileTypeBadge profileType={trainee.profileType} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={trainee.status === "active" ? "actif" : "inactif"}
                          label={trainee.status === "active" ? "Actif" : "Inactif"}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-trainee-menu-${trainee.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => { setEditTrainee(trainee); setDialogOpen(true); }}
                              data-testid={`button-edit-trainee-${trainee.id}`}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(trainee.id)}
                              data-testid={`button-delete-trainee-${trainee.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTrainee(undefined); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTrainee ? "Modifier le stagiaire" : "Nouveau stagiaire"}</DialogTitle>
          </DialogHeader>
          {editTrainee ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="w-4 h-4 mr-1" />
                  Documents justificatifs
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <TraineeForm
                  trainee={editTrainee}
                  enterprises={enterprises || []}
                  onSubmit={(data) => {
                    const cleanData = {
                      ...data,
                      enterpriseId: data.enterpriseId === "none" ? null : data.enterpriseId,
                    };
                    updateMutation.mutate({ id: editTrainee.id, data: cleanData });
                  }}
                  isPending={updateMutation.isPending}
                />
              </TabsContent>
              <TabsContent value="documents">
                <TraineeDocuments traineeId={editTrainee.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <TraineeForm
              trainee={undefined}
              enterprises={enterprises || []}
              onSubmit={(data) => {
                const cleanData = {
                  ...data,
                  enterpriseId: data.enterpriseId === "none" ? null : data.enterpriseId,
                };
                createMutation.mutate(cleanData);
              }}
              isPending={createMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
