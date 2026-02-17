import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  Award,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  FileText,
  Calendar,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Trainer, InsertTrainer, Session, TrainerCompetency } from "@shared/schema";
import {
  TRAINER_DOCUMENT_TYPES, TRAINER_DOCUMENT_STATUSES, TRAINER_STATUSES,
  COMPETENCY_DOMAINS, COMPETENCY_LEVELS, COMPETENCY_STATUSES,
} from "@shared/schema";

type TrainerDocument = {
  id: string;
  trainerId: string;
  type: string;
  title: string;
  fileUrl: string | null;
  status: string;
  validatedBy: string | null;
  expiresAt: string | null;
  uploadedAt: Date | null;
  notes: string | null;
};

type TrainerEvaluation = {
  id: string;
  trainerId: string;
  sessionId: string | null;
  year: number;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
  satisfactionScore: number | null;
  createdAt: Date | null;
};

// ============================================================
// Document Preview Dialog
// ============================================================

function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string | null;
}) {
  if (!fileUrl) return null;
  const isPdf = /\.pdf(\?|$)/i.test(fileUrl);
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(fileUrl);
  const isOffice = /\.(doc|docx|xls|xlsx)(\?|$)/i.test(fileUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{fileName || "Aperçu du document"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 mt-2">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-[70vh] rounded-lg border" title={fileName || "PDF"} />
          ) : isImage ? (
            <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
              <img src={fileUrl} alt={fileName || "Image"} className="max-w-full max-h-[65vh] rounded-lg object-contain" />
            </div>
          ) : isOffice ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              className="w-full h-[70vh] rounded-lg border"
              title={fileName || "Document"}
            />
          ) : (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">L'aperçu n'est pas disponible pour ce type de fichier.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 border-t mt-3">
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const specialties = [
  "AFGSU / Urgences",
  "Hygiène / Certibiocide",
  "Prévention des risques",
  "Management santé",
  "Soins infirmiers",
  "Gestes et postures",
  "Formation continue santé",
  "Certificat de décès",
  "Autre",
];

function TrainerForm({
  trainer,
  onSubmit,
  isPending,
}: {
  trainer?: Trainer;
  onSubmit: (data: InsertTrainer) => void;
  isPending: boolean;
}) {
  const [firstName, setFirstName] = useState(trainer?.firstName || "");
  const [lastName, setLastName] = useState(trainer?.lastName || "");
  const [email, setEmail] = useState(trainer?.email || "");
  const [phone, setPhone] = useState(trainer?.phone || "");
  const [specialty, setSpecialty] = useState(trainer?.specialty || "");
  const [bio, setBio] = useState(trainer?.bio || "");
  const [status, setStatus] = useState(trainer?.status || "active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      email,
      phone: phone || null,
      specialty: specialty || null,
      bio: bio || null,
      status,
      avatarUrl: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">Prénom</Label>
          <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required data-testid="input-trainer-firstname" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Nom</Label>
          <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required data-testid="input-trainer-lastname" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-trainer-email" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-trainer-phone" />
        </div>
        <div className="space-y-2">
          <Label>Spécialité</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger data-testid="select-trainer-specialty"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {specialties.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Biographie</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Expérience et parcours du formateur..." className="resize-none" data-testid="input-trainer-bio" />
      </div>
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-trainer-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRAINER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-trainer-submit">
          {isPending ? "Enregistrement..." : trainer ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Document Form
// ============================================================

function DocumentForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { type: string; title: string; fileUrl: string | null; notes: string | null; expiresAt: string | null }) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState("autre");
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type, title, fileUrl: fileUrl || null, notes: notes || null, expiresAt: expiresAt || null }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de document</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRAINER_DOCUMENT_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date d'expiration</Label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: CV - Sophie Martin" />
      </div>
      <div className="space-y-2">
        <Label>URL du fichier</Label>
        <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement..." : "Ajouter"}</Button>
      </div>
    </form>
  );
}

// ============================================================
// Evaluation Form
// ============================================================

function EvaluationForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { year: number; overallRating: number | null; strengths: string | null; improvements: string | null; satisfactionScore: number | null; notes: string | null }) => void;
  isPending: boolean;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [overallRating, setOverallRating] = useState("3");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [satisfactionScore, setSatisfactionScore] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ year, overallRating: parseInt(overallRating) || null, strengths: strengths || null, improvements: improvements || null, satisfactionScore: parseInt(satisfactionScore) || null, notes: notes || null }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Année</Label>
          <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Note globale (1-5)</Label>
          <Input type="number" min="1" max="5" value={overallRating} onChange={(e) => setOverallRating(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Score de satisfaction (%)</Label>
        <Input type="number" min="0" max="100" value={satisfactionScore} onChange={(e) => setSatisfactionScore(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Points forts</Label>
        <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} className="resize-none" />
      </div>
      <div className="space-y-2">
        <Label>Axes d'amélioration</Label>
        <Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} className="resize-none" />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement..." : "Ajouter"}</Button>
      </div>
    </form>
  );
}

// ============================================================
// Trainer Detail View
// ============================================================

function TrainerDetail({ trainer, onBack }: { trainer: Trainer; onBack: () => void }) {
  const { toast } = useToast();
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [editCompetency, setEditCompetency] = useState<TrainerCompetency | undefined>();
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const { data: documents } = useQuery<TrainerDocument[]>({
    queryKey: [`/api/trainers/${trainer.id}/documents`],
  });

  const { data: evaluations } = useQuery<TrainerEvaluation[]>({
    queryKey: [`/api/trainers/${trainer.id}/evaluations`],
  });

  const { data: trainerSessions } = useQuery<Session[]>({
    queryKey: [`/api/trainers/${trainer.id}/sessions`],
  });

  const { data: competencies } = useQuery<TrainerCompetency[]>({
    queryKey: [`/api/trainers/${trainer.id}/competencies`],
  });

  type QualiopiStatus = {
    globalScore: number;
    documents: { score: number; coverage: { type: string; present: boolean }[]; total: number; validated: number };
    competencies: { score: number; total: number; active: number; expired: number; renewal: number };
    evaluations: { score: number; hasCurrentYear: boolean; total: number };
    sessions: { count: number };
  };

  const { data: qualiopiStatus } = useQuery<QualiopiStatus>({
    queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`],
  });

  const createDocMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", `/api/trainers/${trainer.id}/documents`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/documents`] });
      setDocDialogOpen(false);
      toast({ title: "Document ajouté" });
    },
  });

  const validateDocMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/trainer-documents/${id}`, { status: "validated" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/documents`] });
      toast({ title: "Document validé" });
    },
  });

  const rejectDocMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/trainer-documents/${id}`, { status: "rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/documents`] });
      toast({ title: "Document rejeté" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/documents`] });
      toast({ title: "Document supprimé" });
    },
  });

  const createEvalMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", `/api/trainers/${trainer.id}/evaluations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/evaluations`] });
      setEvalDialogOpen(false);
      toast({ title: "Évaluation ajoutée" });
    },
  });

  const createCompMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", `/api/trainers/${trainer.id}/competencies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/competencies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`] });
      setCompDialogOpen(false);
      toast({ title: "Competence ajoutee" });
    },
  });

  const updateCompMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/trainer-competencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/competencies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`] });
      setCompDialogOpen(false);
      setEditCompetency(undefined);
      toast({ title: "Competence modifiee" });
    },
  });

  const deleteCompMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer-competencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/competencies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainer.id}/qualiopi-status`] });
      toast({ title: "Competence supprimee" });
    },
  });

  const docTypeLabels: Record<string, string> = {};
  TRAINER_DOCUMENT_TYPES.forEach((t) => { docTypeLabels[t.value] = t.label; });
  const docStatusConfig: Record<string, { label: string; color: string }> = {};
  TRAINER_DOCUMENT_STATUSES.forEach((s) => { docStatusConfig[s.value] = { label: s.label, color: s.color }; });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">{trainer.firstName[0]}{trainer.lastName[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{trainer.firstName} {trainer.lastName}</h1>
          <p className="text-muted-foreground text-sm">{trainer.specialty || "Formateur"}</p>
        </div>
        {(() => {
          const statusInfo = TRAINER_STATUSES.find((s) => s.value === trainer.status) || TRAINER_STATUSES[0];
          return (
            <Badge variant="outline" className={`ml-auto ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          );
        })()}
      </div>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profil" className="gap-2"><Users className="w-4 h-4" />Profil</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" />Documents</TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2"><Star className="w-4 h-4" />Évaluations</TabsTrigger>
          <TabsTrigger value="competences" className="gap-2"><Award className="w-4 h-4" />Compétences</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2"><Calendar className="w-4 h-4" />Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{trainer.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{trainer.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Spécialité</span><span>{trainer.specialty || "—"}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Biographie</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{trainer.bio || "Aucune biographie renseignée."}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Documents du formateur</CardTitle>
              <Button size="sm" onClick={() => setDocDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
            </CardHeader>
            <CardContent>
              {!documents || documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun document</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const statusInfo = docStatusConfig[doc.status] || { label: doc.status, color: "" };
                      return (
                        <TableRow key={doc.id}>
                          <TableCell><Badge variant="outline" className="text-xs">{docTypeLabels[doc.type] || doc.type}</Badge></TableCell>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell><Badge variant="outline" className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString("fr-FR") : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {doc.fileUrl && (
                                <Button variant="ghost" size="icon" onClick={() => setPreviewDoc({ url: doc.fileUrl!, title: doc.title })} title="Aperçu">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {doc.status === "pending" && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => validateDocMutation.mutate(doc.id)} title="Valider">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => rejectDocMutation.mutate(doc.id)} title="Rejeter">
                                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocMutation.mutate(doc.id)} title="Supprimer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
            <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
              <DocumentForm onSubmit={(data) => createDocMutation.mutate(data)} isPending={createDocMutation.isPending} />
            </DialogContent>
          </Dialog>
          <DocumentPreviewDialog
            open={!!previewDoc}
            onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
            fileUrl={previewDoc?.url || null}
            fileName={previewDoc?.title || null}
          />
        </TabsContent>

        <TabsContent value="evaluations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Évaluations annuelles</CardTitle>
              <Button size="sm" onClick={() => setEvalDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
            </CardHeader>
            <CardContent>
              {!evaluations || evaluations.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune évaluation</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Année</TableHead>
                      <TableHead>Note globale</TableHead>
                      <TableHead>Satisfaction</TableHead>
                      <TableHead>Points forts</TableHead>
                      <TableHead>Axes d'amélioration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.year}</TableCell>
                        <TableCell>{ev.overallRating ? `${ev.overallRating}/5` : "—"}</TableCell>
                        <TableCell>{ev.satisfactionScore != null ? `${ev.satisfactionScore}%` : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ev.strengths || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ev.improvements || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
            <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
              <EvaluationForm onSubmit={(data) => createEvalMutation.mutate(data)} isPending={createEvalMutation.isPending} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="competences">
          <div className="space-y-4">
            {/* Qualiopi compact score */}
            {qualiopiStatus && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${qualiopiStatus.globalScore >= 75 ? "bg-green-50 dark:bg-green-900/20" : qualiopiStatus.globalScore >= 50 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                      <CheckCircle className={`w-5 h-5 ${qualiopiStatus.globalScore >= 75 ? "text-green-600" : qualiopiStatus.globalScore >= 50 ? "text-amber-600" : "text-red-600"}`} />
                    </div>
                    <div>
                      <p className="font-medium">Score Qualiopi : {qualiopiStatus.globalScore}%</p>
                      <p className="text-xs text-muted-foreground">
                        Docs {qualiopiStatus.documents.score}% | Comp. {qualiopiStatus.competencies.score}% | Eval. {qualiopiStatus.evaluations.score}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competencies list */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Competences du formateur</CardTitle>
                <Button size="sm" onClick={() => { setEditCompetency(undefined); setCompDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Ajouter
                </Button>
              </CardHeader>
              <CardContent>
                {!competencies || competencies.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune competence</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domaine</TableHead>
                        <TableHead>Libelle</TableHead>
                        <TableHead>Niveau</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competencies.map((comp) => {
                        const levelInfo = COMPETENCY_LEVELS.find((l) => l.value === comp.level) || COMPETENCY_LEVELS[0];
                        const statusInfoComp = COMPETENCY_STATUSES.find((s) => s.value === comp.status) || COMPETENCY_STATUSES[0];
                        return (
                          <TableRow key={comp.id}>
                            <TableCell><Badge variant="outline" className="text-xs">{comp.domain}</Badge></TableCell>
                            <TableCell className="font-medium">{comp.competencyLabel}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${levelInfo.color}`}>{levelInfo.label}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${statusInfoComp.color}`}>{statusInfoComp.label}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{comp.expiresAt ? new Date(comp.expiresAt).toLocaleDateString("fr-FR") : "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setEditCompetency(comp); setCompDialogOpen(true); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCompMutation.mutate(comp.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog open={compDialogOpen} onOpenChange={(open) => { setCompDialogOpen(open); if (!open) setEditCompetency(undefined); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editCompetency ? "Modifier la competence" : "Nouvelle competence"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  domain: formData.get("domain") as string,
                  competencyLabel: formData.get("competencyLabel") as string,
                  level: formData.get("level") as string,
                  certificationRef: (formData.get("certificationRef") as string) || null,
                  obtainedAt: (formData.get("obtainedAt") as string) || null,
                  expiresAt: (formData.get("expiresAt") as string) || null,
                  status: formData.get("status") as string,
                  documentId: null,
                  notes: (formData.get("notes") as string) || null,
                };
                if (editCompetency) {
                  updateCompMutation.mutate({ id: editCompetency.id, data });
                } else {
                  createCompMutation.mutate(data);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Domaine</Label>
                    <Select name="domain" defaultValue={editCompetency?.domain || ""}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_DOMAINS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Niveau</Label>
                    <Select name="level" defaultValue={editCompetency?.level || "junior"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_LEVELS.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Libelle</Label>
                  <Input name="competencyLabel" defaultValue={editCompetency?.competencyLabel || ""} required placeholder="Ex: Formateur AFGSU Niveau 2" />
                </div>
                <div className="space-y-2">
                  <Label>Ref. certification</Label>
                  <Input name="certificationRef" defaultValue={editCompetency?.certificationRef || ""} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Obtention</Label>
                    <Input name="obtainedAt" type="date" defaultValue={editCompetency?.obtainedAt || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration</Label>
                    <Input name="expiresAt" type="date" defaultValue={editCompetency?.expiresAt || ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select name="status" defaultValue={editCompetency?.status || "active"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPETENCY_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" defaultValue={editCompetency?.notes || ""} className="resize-none" />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createCompMutation.isPending || updateCompMutation.isPending}>
                    {(createCompMutation.isPending || updateCompMutation.isPending) ? "Enregistrement..." : editCompetency ? "Modifier" : "Ajouter"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader><CardTitle className="text-base">Sessions du formateur</CardTitle></CardHeader>
            <CardContent>
              {!trainerSessions || trainerSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune session assignée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainerSessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(s.startDate).toLocaleDateString("fr-FR")} - {new Date(s.endDate).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.location || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Main Trainers Page
// ============================================================

export default function Trainers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrainer, setEditTrainer] = useState<Trainer | undefined>();
  const [viewTrainer, setViewTrainer] = useState<Trainer | undefined>();
  const { toast } = useToast();

  const { data: trainers, isLoading } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertTrainer) => apiRequest("POST", "/api/trainers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainers"] });
      setDialogOpen(false);
      toast({ title: "Formateur ajouté avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de l'ajout", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertTrainer }) =>
      apiRequest("PATCH", `/api/trainers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainers"] });
      setDialogOpen(false);
      setEditTrainer(undefined);
      toast({ title: "Formateur modifié avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainers"] });
      toast({ title: "Formateur supprimé" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  if (viewTrainer) {
    return <TrainerDetail trainer={viewTrainer} onBack={() => setViewTrainer(undefined)} />;
  }

  const filtered = trainers?.filter(
    (t) =>
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.specialty || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-trainers-title">Formateurs</h1>
          <p className="text-muted-foreground mt-1">Gérez votre équipe de formateurs</p>
        </div>
        <Button onClick={() => { setEditTrainer(undefined); setDialogOpen(true); }} data-testid="button-create-trainer">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un formateur
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un formateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-trainers" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-12 w-12 rounded-full mb-3" /><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun formateur</h3>
          <p className="text-sm text-muted-foreground mb-4">{search ? "Aucun résultat pour votre recherche" : "Ajoutez votre premier formateur"}</p>
          {!search && (<Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-trainer"><Plus className="w-4 h-4 mr-2" />Ajouter un formateur</Button>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trainer) => (
            <Card key={trainer.id} className="hover-elevate" data-testid={`card-trainer-${trainer.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{trainer.firstName[0]}{trainer.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-sm">{trainer.firstName} {trainer.lastName}</h3>
                      {(() => {
                        const statusInfo = TRAINER_STATUSES.find((s) => s.value === trainer.status) || TRAINER_STATUSES[0];
                        return (
                          <Badge variant="outline" className={`${statusInfo.color} mt-0.5`}>
                            {statusInfo.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-trainer-menu-${trainer.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewTrainer(trainer)}>
                        <Eye className="w-4 h-4 mr-2" />Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditTrainer(trainer); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" />Modifier
                      </DropdownMenuItem>
                      {TRAINER_STATUSES.filter((s) => s.value !== trainer.status).map((s) => (
                        <DropdownMenuItem key={s.value} onClick={() => updateMutation.mutate({ id: trainer.id, data: { ...trainer, status: s.value } as InsertTrainer })}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${s.value === "active" ? "bg-green-500" : s.value === "inactive" ? "bg-gray-400" : s.value === "pending" ? "bg-amber-500" : s.value === "suspended" ? "bg-red-500" : "bg-blue-500"}`} />
                          Passer en {s.label.toLowerCase()}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(trainer.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {trainer.specialty && (
                  <div className="flex items-center gap-1.5 text-sm mb-2">
                    <Award className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{trainer.specialty}</span>
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /><span className="truncate">{trainer.email}</span></div>
                  {trainer.phone && (<div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /><span>{trainer.phone}</span></div>)}
                </div>
                {trainer.bio && (<p className="text-xs text-muted-foreground mt-2 line-clamp-2">{trainer.bio}</p>)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTrainer(undefined); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTrainer ? "Modifier le formateur" : "Nouveau formateur"}</DialogTitle></DialogHeader>
          <TrainerForm
            trainer={editTrainer}
            onSubmit={(data) => editTrainer ? updateMutation.mutate({ id: editTrainer.id, data }) : createMutation.mutate(data)}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
