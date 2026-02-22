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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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
import type { Trainee, InsertTrainee, Enterprise } from "@shared/schema";
import { TRAINEE_CIVILITIES, TRAINEE_PROFILE_TYPES, PRO_STATUT_TYPES, DIETARY_REGIMES, TRAINEE_PROFESSIONS } from "@shared/schema";

function ProfileTypeBadge({ profileType }: { profileType: string | null }) {
  const pt = TRAINEE_PROFILE_TYPES.find((p) => p.value === profileType);
  const variants: Record<string, string> = {
    salarie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    profession_liberale: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    particulier: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  if (!pt) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={variants[pt.value] || ""}>
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
              <Label htmlFor="trainee-firstName">Prénom</Label>
              <Input id="trainee-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required data-testid="input-trainee-firstName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee-lastName">Nom</Label>
              <Input id="trainee-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required data-testid="input-trainee-lastName" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trainee-dateOfBirth">Date de naissance</Label>
              <Input id="trainee-dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} data-testid="input-trainee-dateOfBirth" />
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
            <Label htmlFor="trainee-email">Email</Label>
            <Input id="trainee-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-trainee-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainee-phone">Téléphone</Label>
            <Input id="trainee-phone" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-trainee-phone" />
          </div>
        </div>
      </div>

      {/* Section 3: Profil */}
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

      {/* Section 4: Complémentaire */}
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

export default function Trainees() {
  const [search, setSearch] = useState("");
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
    onError: () => toast({ title: "Erreur lors de l'ajout", variant: "destructive" }),
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
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainees"] });
      toast({ title: "Stagiaire supprimé" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered = trainees?.filter(
    (t) => {
      const q = search.toLowerCase();
      return (
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.company || "").toLowerCase().includes(q) ||
        (t.proDenomination || "").toLowerCase().includes(q) ||
        (t.proSiret || "").toLowerCase().includes(q)
      );
    }
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-trainees-title">Stagiaires</h1>
          <p className="text-muted-foreground mt-1">Gérez vos stagiaires et participants</p>
        </div>
        <Button
          onClick={() => { setEditTrainee(undefined); setDialogOpen(true); }}
          data-testid="button-create-trainee"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un stagiaire
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un stagiaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-trainees"
        />
      </div>

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
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun stagiaire</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun résultat pour votre recherche" : "Ajoutez votre premier stagiaire"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-trainee">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un stagiaire
            </Button>
          )}
        </div>
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
                        <p className="text-sm text-muted-foreground">{trainee.email}</p>
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
                        <Badge
                          variant="outline"
                          className={
                            trainee.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {trainee.status === "active" ? "Actif" : "Inactif"}
                        </Badge>
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
          <TraineeForm
            trainee={editTrainee}
            enterprises={enterprises || []}
            onSubmit={(data) => {
              const cleanData = {
                ...data,
                enterpriseId: data.enterpriseId === "none" ? null : data.enterpriseId,
              };
              editTrainee
                ? updateMutation.mutate({ id: editTrainee.id, data: cleanData })
                : createMutation.mutate(cleanData);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
