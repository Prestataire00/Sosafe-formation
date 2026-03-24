import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Users,
  Building2,
  Accessibility,
  Car,
  Train,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import type { TrainingLocation, InsertTrainingLocation } from "@shared/schema";

function LocationForm({
  location,
  onSubmit,
  isPending,
}: {
  location?: TrainingLocation;
  onSubmit: (data: InsertTrainingLocation) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(location?.name || "");
  const [address, setAddress] = useState(location?.address || "");
  const [city, setCity] = useState(location?.city || "");
  const [postalCode, setPostalCode] = useState(location?.postalCode || "");
  const [country, setCountry] = useState(location?.country || "France");
  const [rooms, setRooms] = useState<string[]>(location?.rooms || []);
  const [newRoom, setNewRoom] = useState("");
  const [capacity, setCapacity] = useState(location?.capacity?.toString() || "");
  const [contactName, setContactName] = useState(location?.contactName || "");
  const [contactPhone, setContactPhone] = useState(location?.contactPhone || "");
  const [contactEmail, setContactEmail] = useState(location?.contactEmail || "");
  const [notes, setNotes] = useState(location?.notes || "");
  const [accessibilityInfo, setAccessibilityInfo] = useState(location?.accessibilityInfo || "");
  const [parkingInfo, setParkingInfo] = useState(location?.parkingInfo || "");
  const [transportInfo, setTransportInfo] = useState(location?.transportInfo || "");
  const [isActive, setIsActive] = useState(location?.isActive !== false);

  const addRoom = () => {
    if (newRoom.trim() && !rooms.includes(newRoom.trim())) {
      setRooms([...rooms, newRoom.trim()]);
      setNewRoom("");
    }
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      address: address || null,
      city: city || null,
      postalCode: postalCode || null,
      country: country || "France",
      rooms,
      capacity: capacity ? parseInt(capacity) : null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      notes: notes || null,
      accessibilityInfo: accessibilityInfo || null,
      parkingInfo: parkingInfo || null,
      transportInfo: transportInfo || null,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="loc-name">Nom du lieu *</Label>
        <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: CHU Bordeaux, Centre de formation Paris..." required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="loc-address">Adresse</Label>
          <Input id="loc-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Rue Jean Burguet" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc-city">Ville</Label>
          <Input id="loc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bordeaux" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="loc-postal">Code postal</Label>
          <Input id="loc-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="33000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc-country">Pays</Label>
          <Input id="loc-country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Salles disponibles</Label>
        <div className="flex gap-2">
          <Input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="Nom de la salle" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRoom(); } }} />
          <Button type="button" variant="outline" size="sm" onClick={addRoom}>Ajouter</Button>
        </div>
        {rooms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {rooms.map((room, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1">
                {room}
                <button type="button" onClick={() => removeRoom(i)} className="ml-0.5 hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="loc-capacity">Capacité max (places)</Label>
        <Input id="loc-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="30" min="1" />
      </div>

      <div className="border-t pt-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Contact sur place</p>
        <div className="grid grid-cols-3 gap-3">
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom" />
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Téléphone" />
          <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" type="email" />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Informations pratiques</p>
        <div className="space-y-2">
          <Label htmlFor="loc-accessibility">Accessibilité PMR</Label>
          <Input id="loc-accessibility" value={accessibilityInfo} onChange={(e) => setAccessibilityInfo(e.target.value)} placeholder="Accès PMR, ascenseur..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc-parking">Parking</Label>
          <Input id="loc-parking" value={parkingInfo} onChange={(e) => setParkingInfo(e.target.value)} placeholder="Parking gratuit, nombre de places..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc-transport">Accès transports</Label>
          <Input id="loc-transport" value={transportInfo} onChange={(e) => setTransportInfo(e.target.value)} placeholder="Métro ligne A, Tram B, Bus 9..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="loc-notes">Notes</Label>
        <Textarea id="loc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complémentaires..." className="resize-none" rows={2} />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} id="loc-active" />
        <Label htmlFor="loc-active">Lieu actif</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : location ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

export default function TrainingLocations() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<TrainingLocation | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: locations, isLoading } = useQuery<TrainingLocation[]>({
    queryKey: ["/api/training-locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTrainingLocation) => {
      const res = await apiRequest("POST", "/api/training-locations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-locations"] });
      setDialogOpen(false);
      toast({ title: "Lieu créé avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTrainingLocation> }) => {
      const res = await apiRequest("PATCH", `/api/training-locations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-locations"] });
      setDialogOpen(false);
      setEditLocation(undefined);
      toast({ title: "Lieu modifié avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/training-locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-locations"] });
      toast({ title: "Lieu supprimé" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!locations) return [];
    if (!search) return locations;
    const q = search.toLowerCase();
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q) ||
        (l.address || "").toLowerCase().includes(q)
    );
  }, [locations, search]);

  const deleteLocation = locations?.find((l) => l.id === deleteId);

  return (
    <PageLayout>
      <PageHeader
        title="Lieux de formation"
        subtitle="Gérez vos sites et salles de formation"
        actions={
          <Button onClick={() => { setEditLocation(undefined); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau lieu
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un lieu..."
        className="max-w-md"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun lieu</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Aucun résultat pour votre recherche" : "Ajoutez vos premiers lieux de formation"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un lieu
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((loc) => (
            <Card key={loc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{loc.name}</h3>
                      {!loc.isActive && <Badge variant="outline" className="text-xs">Inactif</Badge>}
                    </div>
                    {(loc.address || loc.city) && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[loc.address, loc.postalCode, loc.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditLocation(loc); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(loc.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 space-y-1.5">
                  {loc.rooms && loc.rooms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {loc.rooms.map((room, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{room}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {loc.capacity && (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{loc.capacity} places</span>
                    )}
                    {loc.contactPhone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{loc.contactPhone}</span>
                    )}
                    {loc.contactEmail && (
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{loc.contactEmail}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {loc.accessibilityInfo && (
                      <span className="flex items-center gap-1"><Accessibility className="w-3 h-3" />{loc.accessibilityInfo}</span>
                    )}
                    {loc.parkingInfo && (
                      <span className="flex items-center gap-1"><Car className="w-3 h-3" />{loc.parkingInfo}</span>
                    )}
                    {loc.transportInfo && (
                      <span className="flex items-center gap-1"><Train className="w-3 h-3" />{loc.transportInfo}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} lieu{filtered.length > 1 ? "x" : ""}</p>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditLocation(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLocation ? "Modifier le lieu" : "Nouveau lieu de formation"}</DialogTitle>
          </DialogHeader>
          <LocationForm
            location={editLocation}
            onSubmit={(data) =>
              editLocation
                ? updateMutation.mutate({ id: editLocation.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lieu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer le lieu{" "}
              <strong>{deleteLocation?.name}</strong>. Les sessions existantes ne seront pas affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
