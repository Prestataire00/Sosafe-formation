import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
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
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Award,
  CheckCircle,
  Linkedin,
  Eye,
  UserPlus,
  Ban,
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
import {
  BADGE_TYPES,
  BADGE_LEVELS,
  BADGE_AWARD_STATUSES,
} from "@shared/schema";

// =============================================
// BADGES TAB
// =============================================

function BadgesTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [viewingBadge, setViewingBadge] = useState<any>(null);
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [awardingBadge, setAwardingBadge] = useState<any>(null);

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ["/api/digital-badges"],
    queryFn: () => apiRequest("GET", "/api/digital-badges").then(r => r.json()),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ["/api/badge-awards"],
    queryFn: () => apiRequest("GET", "/api/badge-awards").then(r => r.json()),
  });

  const { data: trainees = [] } = useQuery({
    queryKey: ["/api/trainees"],
    queryFn: () => apiRequest("GET", "/api/trainees").then(r => r.json()),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then(r => r.json()),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["/api/programs"],
    queryFn: () => apiRequest("GET", "/api/programs").then(r => r.json()),
  });

  const createBadgeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/digital-badges", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-badges"] });
      setShowForm(false);
      toast({ title: "Badge créé" });
    },
  });

  const updateBadgeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/digital-badges/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-badges"] });
      setEditingBadge(null);
      setShowForm(false);
      toast({ title: "Badge mis à jour" });
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/digital-badges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-badges"] });
      toast({ title: "Badge supprimé" });
    },
  });

  const createAwardMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/badge-awards", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badge-awards"] });
      setShowAwardForm(false);
      setAwardingBadge(null);
      toast({ title: "Badge attribué" });
    },
  });

  const revokeAwardMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("PATCH", `/api/badge-awards/${id}`, { status: "revoked", revokedReason: reason }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badge-awards"] });
      toast({ title: "Badge révoqué" });
    },
  });

  const linkedinShareMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/badge-awards/${id}/linkedin-share`).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/badge-awards"] });
      if (data.linkedinShareUrl) {
        window.open(data.linkedinShareUrl, "_blank");
      }
      toast({ title: "Lien LinkedIn généré" });
    },
  });

  const filtered = badges.filter((b: any) => {
    if (search) {
      const s = search.toLowerCase();
      return b.title?.toLowerCase().includes(s) || b.description?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    totalBadges: badges.length,
    activeBadges: badges.filter((b: any) => b.isActive).length,
    totalAwards: awards.length,
    activeAwards: awards.filter((a: any) => a.status === "active").length,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.totalBadges}</div>
            <div className="text-sm text-muted-foreground">Badges créés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.activeBadges}</div>
            <div className="text-sm text-muted-foreground">Badges actifs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalAwards}</div>
            <div className="text-sm text-muted-foreground">Attributions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-purple-600">{stats.activeAwards}</div>
            <div className="text-sm text-muted-foreground">Actives</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un badge..."
          className="max-w-sm"
        />
        <Button onClick={() => { setEditingBadge(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Créer un badge
        </Button>
      </div>

      {/* Badge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            Aucun badge créé. Cliquez sur "Créer un badge" pour commencer.
          </div>
        ) : filtered.map((badge: any) => {
          const typeInfo = BADGE_TYPES.find(t => t.value === badge.type);
          const levelInfo = BADGE_LEVELS.find(l => l.value === badge.level);
          const badgeAwards = awards.filter((a: any) => a.badgeId === badge.id);
          const activeAwards = badgeAwards.filter((a: any) => a.status === "active");

          return (
            <Card key={badge.id} className="relative overflow-hidden">
              {!badge.isActive && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="text-xs">Inactif</Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{badge.title}</CardTitle>
                    <div className="flex gap-1.5 mt-1">
                      <Badge className={typeInfo?.color || ""} variant="secondary">{typeInfo?.label || badge.type}</Badge>
                      <Badge className={levelInfo?.color || ""} variant="secondary">{levelInfo?.label || badge.level}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {badge.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{badge.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {activeAwards.length} attribution{activeAwards.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    {badge.linkedinShareable && <Linkedin className="h-3.5 w-3.5 text-blue-600" />}
                    {badge.autoAward && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                    {badge.validityMonths && (
                      <span className="text-xs text-muted-foreground">{badge.validityMonths} mois</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewingBadge(badge)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Détails
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => { setAwardingBadge(badge); setShowAwardForm(true); }}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Attribuer
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingBadge(badge); setShowForm(true); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteBadgeMutation.mutate(badge.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Badge Detail Dialog */}
      {viewingBadge && (
        <Dialog open={!!viewingBadge} onOpenChange={() => setViewingBadge(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                {viewingBadge.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingBadge.description && <p className="text-sm text-muted-foreground">{viewingBadge.description}</p>}
              {viewingBadge.criteria && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs font-medium mb-1">Critères d'obtention</div>
                  <p className="text-sm">{viewingBadge.criteria}</p>
                </div>
              )}

              <h4 className="font-semibold">Attributions ({awards.filter((a: any) => a.badgeId === viewingBadge.id).length})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apprenant</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awards.filter((a: any) => a.badgeId === viewingBadge.id).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                        Aucune attribution
                      </TableCell>
                    </TableRow>
                  ) : awards.filter((a: any) => a.badgeId === viewingBadge.id).map((award: any) => {
                    const statusInfo = BADGE_AWARD_STATUSES.find(s => s.value === award.status);
                    return (
                      <TableRow key={award.id}>
                        <TableCell className="font-medium">{award.traineeName}</TableCell>
                        <TableCell className="text-sm">{award.sessionTitle || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {award.awardMethod === "automatic" ? "Auto" : "Manuel"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo?.color || ""}>{statusInfo?.label || award.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {award.awardedAt ? new Date(award.awardedAt).toLocaleDateString("fr-FR") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {award.status === "active" && viewingBadge.linkedinShareable && (
                              <Button size="sm" variant="ghost" onClick={() => linkedinShareMutation.mutate(award.id)}>
                                <Linkedin className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                            )}
                            {award.status === "active" && (
                              <Button size="sm" variant="ghost" onClick={() => revokeAwardMutation.mutate({ id: award.id, reason: "Révocation manuelle" })} className="text-red-600">
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Badge Form Dialog */}
      <BadgeFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingBadge(null); }}
        onSubmit={(data: any) => {
          if (editingBadge) {
            updateBadgeMutation.mutate({ id: editingBadge.id, data });
          } else {
            createBadgeMutation.mutate(data);
          }
        }}
        editing={editingBadge}
        programs={programs}
        sessions={sessions}
      />

      {/* Award Form Dialog */}
      <AwardFormDialog
        open={showAwardForm}
        onClose={() => { setShowAwardForm(false); setAwardingBadge(null); }}
        onSubmit={(data: any) => createAwardMutation.mutate(data)}
        badge={awardingBadge}
        trainees={trainees}
        sessions={sessions}
      />
    </div>
  );
}

function BadgeFormDialog({ open, onClose, onSubmit, editing, programs, sessions }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [type, setType] = useState("completion");
  const [category, setCategory] = useState("none");
  const [level, setLevel] = useState("bronze");
  const [programId, setProgramId] = useState("none");
  const [sessionId, setSessionId] = useState("none");
  const [autoAward, setAutoAward] = useState(false);
  const [autoAwardCondition, setAutoAwardCondition] = useState("completion_100");
  const [linkedinShareable, setLinkedinShareable] = useState(true);
  const [validityMonths, setValidityMonths] = useState("");

  // Reset form when dialog opens or editing changes
  useState(() => {
    if (open) {
      setTitle(editing?.title || "");
      setDescription(editing?.description || "");
      setCriteria(editing?.criteria || "");
      setType(editing?.type || "completion");
      setCategory(editing?.category || "none");
      setLevel(editing?.level || "bronze");
      setProgramId(editing?.programId || "none");
      setSessionId(editing?.sessionId || "none");
      setAutoAward(editing?.autoAward || false);
      setAutoAwardCondition(editing?.autoAwardCondition || "completion_100");
      setLinkedinShareable(editing?.linkedinShareable !== false);
      setValidityMonths(editing?.validityMonths?.toString() || "");
    }
  });

  const handleSubmit = () => {
    onSubmit({
      title,
      description,
      criteria,
      type,
      category: category !== "none" ? category : null,
      level,
      programId: programId !== "none" ? programId : null,
      sessionId: sessionId !== "none" ? sessionId : null,
      autoAward,
      autoAwardCondition: autoAward ? autoAwardCondition : null,
      linkedinShareable,
      validityMonths: validityMonths ? parseInt(validityMonths) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le badge" : "Créer un badge numérique"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre du badge *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Expert AFGSU Niveau 2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BADGE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Niveau</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BADGE_LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description du badge..." rows={2} />
          </div>
          <div>
            <Label>Critères d'obtention</Label>
            <Textarea value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Conditions requises pour obtenir ce badge..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Programme lié</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {programs?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non défini</SelectItem>
                  <SelectItem value="pedagogique">Pédagogique</SelectItem>
                  <SelectItem value="technique">Technique</SelectItem>
                  <SelectItem value="transversal">Transversal</SelectItem>
                  <SelectItem value="securite">Sécurité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Validité (mois)</Label>
              <Input type="number" value={validityMonths} onChange={e => setValidityMonths(e.target.value)} placeholder="Illimité si vide" />
            </div>
            <div className="space-y-2 pt-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="linkedin" checked={linkedinShareable} onChange={e => setLinkedinShareable(e.target.checked)} />
                <Label htmlFor="linkedin" className="flex items-center gap-1">
                  <Linkedin className="h-3.5 w-3.5 text-blue-600" /> Partageable LinkedIn
                </Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoAward" checked={autoAward} onChange={e => setAutoAward(e.target.checked)} />
              <Label htmlFor="autoAward">Attribution automatique</Label>
            </div>
            {autoAward && (
              <Select value={autoAwardCondition} onValueChange={setAutoAwardCondition}>
                <SelectTrigger><SelectValue placeholder="Condition d'attribution auto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion_100">Complétion 100%</SelectItem>
                  <SelectItem value="score_above_80">Score supérieur à 80%</SelectItem>
                  <SelectItem value="attendance_100">Présence 100%</SelectItem>
                  <SelectItem value="quiz_passed">Quiz réussi</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!title}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AwardFormDialog({ open, onClose, onSubmit, badge, trainees, sessions }: any) {
  const [traineeId, setTraineeId] = useState("none");
  const [sessionId, setSessionId] = useState("none");
  const [notes, setNotes] = useState("");

  if (!badge) return null;

  const selectedTrainee = trainees?.find((t: any) => t.id === traineeId);
  const selectedSession = sessions?.find((s: any) => s.id === sessionId);

  const handleSubmit = () => {
    onSubmit({
      badgeId: badge.id,
      traineeId,
      traineeName: selectedTrainee ? `${selectedTrainee.firstName} ${selectedTrainee.lastName}` : "",
      sessionId: sessionId !== "none" ? sessionId : null,
      sessionTitle: selectedSession?.title || null,
      notes: notes || null,
    });
    setTraineeId("none");
    setSessionId("none");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Attribuer : {badge.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Apprenant *</Label>
            <Select value={traineeId} onValueChange={setTraineeId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un apprenant" /></SelectTrigger>
              <SelectContent>
                {trainees?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Session (optionnel)</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {sessions?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes optionnelles..." rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={traineeId === "none"}>Attribuer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// MAIN PAGE
// =============================================

export default function CertificationsBadges() {
  return (
    <PageLayout>
      <PageHeader
        title="Certifications & Badges"
        subtitle="Gestion des certifications et badges numériques"
      />

      <BadgesTab />
    </PageLayout>
  );
}
