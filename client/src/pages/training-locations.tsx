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
  Euro,
  Upload,
  FileText,
  Wifi,
  Monitor,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { uploadFile } from "@/lib/queryClient";
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
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const loc = location as any;
  const [name, setName] = useState(loc?.name || "");
  const [description, setDescription] = useState(loc?.description || "");
  // Address
  const [roadNumber, setRoadNumber] = useState(loc?.roadNumber || "");
  const [roadRepetition, setRoadRepetition] = useState(loc?.roadRepetition || "");
  const [roadType, setRoadType] = useState(loc?.roadType || "");
  const [roadLabel, setRoadLabel] = useState(loc?.roadLabel || "");
  const [addressExtra, setAddressExtra] = useState(loc?.addressExtra || "");
  const [postalCode, setPostalCode] = useState(loc?.postalCode || "");
  const [city, setCity] = useState(loc?.city || "");
  const [country, setCountry] = useState(loc?.country || "France");
  // Facilities
  const [rooms, setRooms] = useState<string[]>(loc?.rooms || []);
  const [newRoom, setNewRoom] = useState("");
  const [capacity, setCapacity] = useState(loc?.capacity?.toString() || "");
  const [equipment, setEquipment] = useState(loc?.equipment || "");
  const [pricePerDay, setPricePerDay] = useState(loc?.pricePerDay?.toString() || "");
  const [pricePerHalfDay, setPricePerHalfDay] = useState(loc?.pricePerHalfDay?.toString() || "");
  // Contact
  const [contactName, setContactName] = useState(loc?.contactName || "");
  const [contactPhone, setContactPhone] = useState(loc?.contactPhone || "");
  const [contactEmail, setContactEmail] = useState(loc?.contactEmail || "");
  // Accessibility
  const [accessibilityInfo, setAccessibilityInfo] = useState(loc?.accessibilityInfo || "");
  const [accessibilityCompliant, setAccessibilityCompliant] = useState(loc?.accessibilityCompliant || false);
  const [accessInstructions, setAccessInstructions] = useState(loc?.accessInstructions || "");
  const [parkingInfo, setParkingInfo] = useState(loc?.parkingInfo || "");
  const [transportInfo, setTransportInfo] = useState(loc?.transportInfo || "");
  // Custom fields
  const [wifiBorne, setWifiBorne] = useState((loc?.customFields as any)?.wifiBorne || "");
  const [wifiCode, setWifiCode] = useState((loc?.customFields as any)?.wifiCode || "");
  const [paperboard, setPaperboard] = useState((loc?.customFields as any)?.paperboard ?? false);
  const [projector, setProjector] = useState((loc?.customFields as any)?.projector ?? false);
  const [printer, setPrinter] = useState((loc?.customFields as any)?.printer ?? false);
  const [blackboard, setBlackboard] = useState((loc?.customFields as any)?.blackboard ?? false);
  // Documents
  const [documents, setDocuments] = useState<Array<{ title: string; fileUrl: string; fileName: string; fileSize?: number }>>(loc?.documents || []);
  const [docUploading, setDocUploading] = useState(false);
  // Admin
  const [siret, setSiret] = useState(loc?.siret || "");
  const [notes, setNotes] = useState(loc?.notes || "");
  const [isActive, setIsActive] = useState(loc?.isActive !== false);

  const addRoom = () => {
    if (newRoom.trim() && !rooms.includes(newRoom.trim())) {
      setRooms([...rooms, newRoom.trim()]);
      setNewRoom("");
    }
  };
  const removeRoom = (i: number) => setRooms(rooms.filter((_, idx) => idx !== i));

  const handleDocUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDocUploading(true);
    for (const file of Array.from(files)) {
      try {
        const result = await uploadFile(file);
        setDocuments((prev) => [...prev, { title: file.name, fileName: file.name, fileUrl: result.fileUrl, fileSize: file.size }]);
      } catch { /* ignore */ }
    }
    setDocUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = [roadNumber, roadRepetition, roadType, roadLabel].filter(Boolean).join(" ");
    onSubmit({
      name,
      description: description || null,
      roadNumber: roadNumber || null,
      roadRepetition: roadRepetition || null,
      roadType: roadType || null,
      roadLabel: roadLabel || null,
      address: fullAddress || null,
      addressExtra: addressExtra || null,
      postalCode: postalCode || null,
      city: city || null,
      country: country || "France",
      rooms,
      capacity: capacity ? parseInt(capacity) : null,
      equipment: equipment || null,
      pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
      pricePerHalfDay: pricePerHalfDay ? parseFloat(pricePerHalfDay) : null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      accessibilityInfo: accessibilityInfo || null,
      accessibilityCompliant,
      accessInstructions: accessInstructions || null,
      parkingInfo: parkingInfo || null,
      transportInfo: transportInfo || null,
      customFields: { wifiBorne, wifiCode, paperboard, projector, printer, blackboard },
      documents,
      siret: siret || null,
      notes: notes || null,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Informations générales ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Informations générales</h3>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Domaine Lolicé" required />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du lieu de formation..." rows={2} className="resize-none" />
        </div>
        <div className="space-y-2">
          <Label>Équipement disponible</Label>
          <Textarea value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Vidéoprojecteur, paperboard, micro..." rows={2} className="resize-none" />
        </div>
        <div className="space-y-2">
          <Label>Capacité</Label>
          <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="30" min="1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prix 1/2 journée (€)</Label>
            <div className="relative">
              <Input type="number" step="0.01" value={pricePerHalfDay} onChange={(e) => setPricePerHalfDay(e.target.value)} placeholder="0.00" />
              <Euro className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prix journée (€)</Label>
            <div className="relative">
              <Input type="number" step="0.01" value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} placeholder="0.00" />
              <Euro className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Adresse ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Adresse</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>N° de voie</Label>
            <Input value={roadNumber} onChange={(e) => setRoadNumber(e.target.value)} placeholder="12" />
          </div>
          <div className="space-y-2">
            <Label>Indice de répétition</Label>
            <Input value={roadRepetition} onChange={(e) => setRoadRepetition(e.target.value)} placeholder="bis, ter..." />
          </div>
          <div className="space-y-2">
            <Label>Type de voie</Label>
            <Input value={roadType} onChange={(e) => setRoadType(e.target.value)} placeholder="Rue, Avenue, Bd..." />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Libellé de la voie</Label>
          <Input value={roadLabel} onChange={(e) => setRoadLabel(e.target.value)} placeholder="Jean Burguet" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Code postal</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="33000" />
          </div>
          <div className="space-y-2">
            <Label>Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bordeaux" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Pays</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Lieu-dit / BP / Poste restante</Label>
          <Input value={addressExtra} onChange={(e) => setAddressExtra(e.target.value)} placeholder="Lieu-dit, boîte postale..." />
        </div>
      </div>

      {/* ── Salles ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Salles disponibles</h3>
        <div className="flex gap-2">
          <Input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="Nom de la salle" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRoom(); } }} />
          <Button type="button" variant="outline" size="sm" onClick={addRoom}>Ajouter</Button>
        </div>
        {rooms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rooms.map((room, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1">
                {room}
                <button type="button" onClick={() => removeRoom(i)} className="ml-0.5 hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* ── Conformité réglementaire PMR ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Conformité réglementaire — Accès PMR</h3>
        <div className="flex items-center gap-2">
          <Switch checked={accessibilityCompliant} onCheckedChange={setAccessibilityCompliant} />
          <Label>Conforme à la réglementation PMR</Label>
        </div>
        <div className="space-y-2">
          <Label>Description des moyens d'accès</Label>
          <Textarea value={accessInstructions} onChange={(e) => setAccessInstructions(e.target.value)} placeholder="Rampe d'accès, ascenseur, places PMR..." rows={2} className="resize-none" />
        </div>
        <div className="space-y-2">
          <Label>Informations accessibilité</Label>
          <Input value={accessibilityInfo} onChange={(e) => setAccessibilityInfo(e.target.value)} placeholder="Détails complémentaires..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Parking</Label>
            <Input value={parkingInfo} onChange={(e) => setParkingInfo(e.target.value)} placeholder="Parking gratuit, nb places..." />
          </div>
          <div className="space-y-2">
            <Label>Accès transports</Label>
            <Input value={transportInfo} onChange={(e) => setTransportInfo(e.target.value)} placeholder="Métro, Tram, Bus..." />
          </div>
        </div>
      </div>

      {/* ── Contact ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Contact</h3>
        <div className="space-y-2">
          <Label>Nom du contact</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="06 12 34 56 78" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@lieu.fr" type="email" />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Notes</h3>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complémentaires..." rows={3} className="resize-none" />
      </div>

      {/* ── Champs personnalisés (Digiforma-style) ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Champs personnalisés</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Borne Wi-Fi</Label>
            <Input value={wifiBorne} onChange={(e) => setWifiBorne(e.target.value)} placeholder="Nom du réseau" />
          </div>
          <div className="space-y-2">
            <Label>Code Wi-Fi</Label>
            <Input value={wifiCode} onChange={(e) => setWifiCode(e.target.value)} placeholder="Mot de passe" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded border bg-card">
            <Switch checked={paperboard} onCheckedChange={setPaperboard} />
            <Label className="cursor-pointer">Paperboard</Label>
          </div>
          <div className="flex items-center gap-2 p-2 rounded border bg-card">
            <Switch checked={projector} onCheckedChange={setProjector} />
            <Label className="cursor-pointer">Projecteur</Label>
          </div>
          <div className="flex items-center gap-2 p-2 rounded border bg-card">
            <Switch checked={printer} onCheckedChange={setPrinter} />
            <Label className="cursor-pointer">Imprimante</Label>
          </div>
          <div className="flex items-center gap-2 p-2 rounded border bg-card">
            <Switch checked={blackboard} onCheckedChange={setBlackboard} />
            <Label className="cursor-pointer">Tableau noir</Label>
          </div>
        </div>
      </div>

      {/* ── Documents ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Archivage de documents</h3>
        <div>
          <input
            type="file"
            id="loc-doc-upload"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => handleDocUpload(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" disabled={docUploading} onClick={() => document.getElementById("loc-doc-upload")?.click()}>
            {docUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Ajouter un document
          </Button>
        </div>
        {documents.length > 0 && (
          <div className="space-y-1.5">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded border bg-card text-sm">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">{doc.fileName || doc.title}</a>
                <button type="button" onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Admin ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Administration</h3>
        <div className="space-y-2">
          <Label>SIRET</Label>
          <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="N° SIRET du lieu" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Lieu actif</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : location ? "Enregistrer" : "Créer"}
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
                    {(loc.address || loc.city || (loc as any).roadLabel) && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[loc.address || [(loc as any).roadNumber, (loc as any).roadType, (loc as any).roadLabel].filter(Boolean).join(" "), loc.postalCode, loc.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {(loc as any).description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{(loc as any).description}</p>
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
                    {(loc as any).pricePerDay && (
                      <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{(loc as any).pricePerDay}€/jour</span>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
