import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Trainer, InsertTrainer } from "@shared/schema";

const specialties = [
  "Développement web",
  "Design UX/UI",
  "Marketing digital",
  "Management",
  "Bureautique",
  "Langues",
  "Cybersécurité",
  "Data Science",
  "DevOps",
  "Gestion de projet",
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
          <Input
            id="first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            data-testid="input-trainer-firstname"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Nom</Label>
          <Input
            id="last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            data-testid="input-trainer-lastname"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="input-trainer-email"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            data-testid="input-trainer-phone"
          />
        </div>
        <div className="space-y-2">
          <Label>Spécialité</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger data-testid="select-trainer-specialty">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Biographie</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Expérience et parcours du formateur..."
          className="resize-none"
          data-testid="input-trainer-bio"
        />
      </div>
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-trainer-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
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

export default function Trainers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrainer, setEditTrainer] = useState<Trainer | undefined>();
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
        <Button
          onClick={() => { setEditTrainer(undefined); setDialogOpen(true); }}
          data-testid="button-create-trainer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un formateur
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un formateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-trainers"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-12 w-12 rounded-full mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun formateur</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun résultat pour votre recherche" : "Ajoutez votre premier formateur"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-trainer">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un formateur
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trainer) => (
            <Card key={trainer.id} className="hover-elevate" data-testid={`card-trainer-${trainer.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {trainer.firstName[0]}{trainer.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-sm">{trainer.firstName} {trainer.lastName}</h3>
                      <Badge
                        variant="outline"
                        className={
                          trainer.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-0.5"
                            : "bg-muted text-muted-foreground mt-0.5"
                        }
                      >
                        {trainer.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-trainer-menu-${trainer.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => { setEditTrainer(trainer); setDialogOpen(true); }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(trainer.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
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
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{trainer.email}</span>
                  </div>
                  {trainer.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{trainer.phone}</span>
                    </div>
                  )}
                </div>
                {trainer.bio && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{trainer.bio}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTrainer(undefined); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTrainer ? "Modifier le formateur" : "Nouveau formateur"}</DialogTitle>
          </DialogHeader>
          <TrainerForm
            trainer={editTrainer}
            onSubmit={(data) =>
              editTrainer
                ? updateMutation.mutate({ id: editTrainer.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
