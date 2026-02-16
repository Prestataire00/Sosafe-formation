import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Building2,
  Mail,
  Phone,
  MapPin,
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
import type { Enterprise, InsertEnterprise } from "@shared/schema";

const sectors = [
  "Hospitalier",
  "Clinique priv\u00e9e",
  "M\u00e9dico-social",
  "EHPAD",
  "Lib\u00e9ral",
  "Entreprise",
  "Autre",
];

function EnterpriseForm({
  enterprise,
  onSubmit,
  isPending,
}: {
  enterprise?: Enterprise;
  onSubmit: (data: InsertEnterprise) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(enterprise?.name || "");
  const [siret, setSiret] = useState(enterprise?.siret || "");
  const [address, setAddress] = useState(enterprise?.address || "");
  const [city, setCity] = useState(enterprise?.city || "");
  const [postalCode, setPostalCode] = useState(enterprise?.postalCode || "");
  const [contactName, setContactName] = useState(enterprise?.contactName || "");
  const [contactEmail, setContactEmail] = useState(enterprise?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(enterprise?.contactPhone || "");
  const [sector, setSector] = useState(enterprise?.sector || "");
  const [status, setStatus] = useState(enterprise?.status || "active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      siret: siret || null,
      address: address || null,
      city: city || null,
      postalCode: postalCode || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      sector: sector || null,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ent-name">Nom de l'entreprise</Label>
        <Input id="ent-name" value={name} onChange={(e) => setName(e.target.value)} required data-testid="input-enterprise-name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="siret">SIRET</Label>
          <Input id="siret" value={siret} onChange={(e) => setSiret(e.target.value)} data-testid="input-enterprise-siret" />
        </div>
        <div className="space-y-2">
          <Label>Secteur</Label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger data-testid="select-enterprise-sector">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-enterprise-address" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-enterprise-city" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal-code">Code postal</Label>
          <Input id="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} data-testid="input-enterprise-postal" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-name">Nom du contact</Label>
        <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-enterprise-contact-name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email contact</Label>
          <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-enterprise-contact-email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone">T\u00e9l\u00e9phone contact</Label>
          <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} data-testid="input-enterprise-contact-phone" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-enterprise-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-enterprise-submit">
          {isPending ? "Enregistrement..." : enterprise ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

export default function Enterprises() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEnterprise, setEditEnterprise] = useState<Enterprise | undefined>();
  const { toast } = useToast();

  const { data: enterprises, isLoading } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertEnterprise) => apiRequest("POST", "/api/enterprises", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      setDialogOpen(false);
      toast({ title: "Entreprise ajout\u00e9e avec succ\u00e8s" });
    },
    onError: () => toast({ title: "Erreur lors de l'ajout", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertEnterprise }) =>
      apiRequest("PATCH", `/api/enterprises/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      setDialogOpen(false);
      setEditEnterprise(undefined);
      toast({ title: "Entreprise modifi\u00e9e avec succ\u00e8s" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enterprises/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      toast({ title: "Entreprise supprim\u00e9e" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered = enterprises?.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.sector || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-enterprises-title">Entreprises clientes</h1>
          <p className="text-muted-foreground mt-1">G\u00e9rez vos entreprises clientes et \u00e9tablissements</p>
        </div>
        <Button onClick={() => { setEditEnterprise(undefined); setDialogOpen(true); }} data-testid="button-create-enterprise">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une entreprise
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une entreprise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-enterprises"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune entreprise</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun r\u00e9sultat pour votre recherche" : "Ajoutez votre premi\u00e8re entreprise cliente"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-enterprise">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une entreprise
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ent) => (
            <Card key={ent.id} className="hover-elevate" data-testid={`card-enterprise-${ent.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{ent.name}</h3>
                    {ent.sector && <p className="text-xs text-muted-foreground mt-0.5">{ent.sector}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={ent.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                      {ent.status === "active" ? "Actif" : "Inactif"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-enterprise-menu-${ent.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditEnterprise(ent); setDialogOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(ent.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {ent.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{ent.postalCode} {ent.city}</span>
                    </div>
                  )}
                  {ent.contactName && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{ent.contactName}</span>
                    </div>
                  )}
                  {ent.contactEmail && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{ent.contactEmail}</span>
                    </div>
                  )}
                  {ent.contactPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{ent.contactPhone}</span>
                    </div>
                  )}
                  {ent.siret && (
                    <p className="text-xs text-muted-foreground/70 mt-1">SIRET: {ent.siret}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditEnterprise(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEnterprise ? "Modifier l'entreprise" : "Nouvelle entreprise"}</DialogTitle>
          </DialogHeader>
          <EnterpriseForm
            enterprise={editEnterprise}
            onSubmit={(data) =>
              editEnterprise
                ? updateMutation.mutate({ id: editEnterprise.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
