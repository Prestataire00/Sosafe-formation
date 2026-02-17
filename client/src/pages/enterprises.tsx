import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Eye,
  ArrowLeft,
  UserPlus,
  Users,
  FileText,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Enterprise, InsertEnterprise, Enrollment, Session } from "@shared/schema";
import { ENTERPRISE_FORMATS_JURIDIQUES, ENTERPRISE_CONTACT_ROLES } from "@shared/schema";

type EnterpriseContact = {
  id: string;
  enterpriseId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isPrimary: boolean | null;
  createdAt: Date | null;
};

const sectors = [
  "Hospitalier",
  "Clinique privée",
  "Médico-social",
  "EHPAD",
  "Libéral",
  "Entreprise",
  "Autre",
];

function EnterpriseForm({
  enterprise,
  enterprises,
  onSubmit,
  isPending,
}: {
  enterprise?: Enterprise;
  enterprises?: Enterprise[];
  onSubmit: (data: InsertEnterprise) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
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
  const [formatJuridique, setFormatJuridique] = useState(enterprise?.formatJuridique || "");
  const [tvaNumber, setTvaNumber] = useState(enterprise?.tvaNumber || "");
  const [email, setEmail] = useState(enterprise?.email || "");
  const [phone, setPhone] = useState(enterprise?.phone || "");
  const [legalRepName, setLegalRepName] = useState(enterprise?.legalRepName || "");
  const [legalRepEmail, setLegalRepEmail] = useState(enterprise?.legalRepEmail || "");
  const [legalRepPhone, setLegalRepPhone] = useState(enterprise?.legalRepPhone || "");
  const [siretSearch, setSiretSearch] = useState("");

  const handleSiretSearch = () => {
    if (!siretSearch || !enterprises) return;
    const found = enterprises.find((e) => e.siret === siretSearch);
    if (found) {
      setName(found.name);
      setSiret(found.siret || "");
      setAddress(found.address || "");
      setCity(found.city || "");
      setPostalCode(found.postalCode || "");
      setContactName(found.contactName || "");
      setContactEmail(found.contactEmail || "");
      setContactPhone(found.contactPhone || "");
      setSector(found.sector || "");
      setFormatJuridique(found.formatJuridique || "");
      setTvaNumber(found.tvaNumber || "");
      setEmail(found.email || "");
      setPhone(found.phone || "");
      setLegalRepName(found.legalRepName || "");
      setLegalRepEmail(found.legalRepEmail || "");
      setLegalRepPhone(found.legalRepPhone || "");
      toast({ title: "Entreprise trouvee ! Champs pre-remplis." });
    } else {
      toast({ title: "Aucune entreprise trouvee avec ce SIRET", variant: "destructive" });
    }
  };

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
      formatJuridique: formatJuridique || null,
      tvaNumber: tvaNumber || null,
      email: email || null,
      phone: phone || null,
      legalRepName: legalRepName || null,
      legalRepEmail: legalRepEmail || null,
      legalRepPhone: legalRepPhone || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* SIRET search (creation mode only) */}
      {!enterprise && (
        <div className="p-3 rounded-lg border border-dashed bg-muted/30 space-y-2">
          <Label className="text-xs text-muted-foreground">Recherche par SIRET (pre-remplissage)</Label>
          <div className="flex gap-2">
            <Input
              value={siretSearch}
              onChange={(e) => setSiretSearch(e.target.value)}
              placeholder="Entrez un SIRET existant..."
              className="flex-1"
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleSiretSearch}>
              <Search className="w-4 h-4 mr-1" />
              Rechercher
            </Button>
          </div>
        </div>
      )}

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
          <Label>Format juridique</Label>
          <Select value={formatJuridique} onValueChange={setFormatJuridique}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {ENTERPRISE_FORMATS_JURIDIQUES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tva">N° TVA</Label>
          <Input id="tva" value={tvaNumber} onChange={(e) => setTvaNumber(e.target.value)} placeholder="FR..." />
        </div>
        <div className="space-y-2">
          <Label>Secteur</Label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger data-testid="select-enterprise-sector"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">Coordonnées de l'entreprise</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ent-email">Email entreprise</Label>
            <Input id="ent-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ent-phone">Téléphone entreprise</Label>
            <Input id="ent-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
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

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">Contact principal</h4>
        <div className="space-y-2">
          <Label htmlFor="contact-name">Nom du contact</Label>
          <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-enterprise-contact-name" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email contact</Label>
            <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-enterprise-contact-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Téléphone contact</Label>
            <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} data-testid="input-enterprise-contact-phone" />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">Représentant légal</h4>
        <div className="space-y-2">
          <Label htmlFor="legal-name">Nom</Label>
          <Input id="legal-name" value={legalRepName} onChange={(e) => setLegalRepName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="legal-email">Email</Label>
            <Input id="legal-email" type="email" value={legalRepEmail} onChange={(e) => setLegalRepEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legal-phone">Téléphone</Label>
            <Input id="legal-phone" value={legalRepPhone} onChange={(e) => setLegalRepPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-enterprise-status"><SelectValue /></SelectTrigger>
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

// ============================================================
// Contact Form
// ============================================================

function ContactForm({
  contact,
  onSubmit,
  isPending,
}: {
  contact?: EnterpriseContact;
  onSubmit: (data: { firstName: string; lastName: string; email: string | null; phone: string | null; role: string; isPrimary: boolean }) => void;
  isPending: boolean;
}) {
  const [firstName, setFirstName] = useState(contact?.firstName || "");
  const [lastName, setLastName] = useState(contact?.lastName || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [role, setRole] = useState(contact?.role || "general");
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary || false);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ firstName, lastName, email: email || null, phone: phone || null, role, isPrimary }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rôle</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTERPRISE_CONTACT_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="accent-primary" />
            <span className="text-sm">Contact principal</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : contact ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Enterprise Detail View
// ============================================================

function EnterpriseDetail({ enterprise, onBack }: { enterprise: Enterprise; onBack: () => void }) {
  const { toast } = useToast();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<EnterpriseContact | undefined>();

  const { data: contacts, isLoading: contactsLoading } = useQuery<EnterpriseContact[]>({
    queryKey: [`/api/enterprises/${enterprise.id}/contacts`],
  });

  const { data: enrollmentsList } = useQuery<Enrollment[]>({
    queryKey: [`/api/enterprises/${enterprise.id}/enrollments`],
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const createContactMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", `/api/enterprises/${enterprise.id}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterprise.id}/contacts`] });
      setContactDialogOpen(false);
      toast({ title: "Contact ajouté" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/enterprise-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterprise.id}/contacts`] });
      setContactDialogOpen(false);
      setEditContact(undefined);
      toast({ title: "Contact modifié" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enterprise-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/enterprises/${enterprise.id}/contacts`] });
      toast({ title: "Contact supprimé" });
    },
  });

  const roleLabels: Record<string, string> = {};
  ENTERPRISE_CONTACT_ROLES.forEach((r) => { roleLabels[r.value] = r.label; });

  const formatLabels: Record<string, string> = {};
  ENTERPRISE_FORMATS_JURIDIQUES.forEach((f) => { formatLabels[f.value] = f.label; });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{enterprise.name}</h1>
          <p className="text-muted-foreground text-sm">
            {enterprise.sector && <span>{enterprise.sector}</span>}
            {enterprise.formatJuridique && <span> - {formatLabels[enterprise.formatJuridique] || enterprise.formatJuridique}</span>}
          </p>
        </div>
        <Badge variant="outline" className={enterprise.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ml-auto" : "bg-muted text-muted-foreground ml-auto"}>
          {enterprise.status === "active" ? "Actif" : "Inactif"}
        </Badge>
      </div>

      <Tabs defaultValue="fiche" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fiche" className="gap-2"><Building2 className="w-4 h-4" />Fiche</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2"><Users className="w-4 h-4" />Contacts</TabsTrigger>
          <TabsTrigger value="historique" className="gap-2"><ClipboardList className="w-4 h-4" />Historique</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" />Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="fiche">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">SIRET</span><span>{enterprise.siret || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">N° TVA</span><span>{enterprise.tvaNumber || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Format juridique</span><span>{enterprise.formatJuridique ? formatLabels[enterprise.formatJuridique] || enterprise.formatJuridique : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{enterprise.email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{enterprise.phone || "—"}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Adresse</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>{enterprise.address || "—"}</div>
                <div>{enterprise.postalCode} {enterprise.city}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Contact principal</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nom</span><span>{enterprise.contactName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{enterprise.contactEmail || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{enterprise.contactPhone || "—"}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Représentant légal</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nom</span><span>{enterprise.legalRepName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{enterprise.legalRepEmail || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{enterprise.legalRepPhone || "—"}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contacts de l'entreprise</CardTitle>
              <Button size="sm" onClick={() => { setEditContact(undefined); setContactDialogOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {contactsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !contacts || contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun contact enregistré</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.firstName} {c.lastName}
                          {c.isPrimary && <Badge variant="outline" className="ml-2 text-xs">Principal</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{roleLabels[c.role] || c.role}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditContact(c); setContactDialogOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteContactMutation.mutate(c.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={contactDialogOpen} onOpenChange={(open) => { setContactDialogOpen(open); if (!open) setEditContact(undefined); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editContact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
              </DialogHeader>
              <ContactForm
                contact={editContact}
                onSubmit={(data) =>
                  editContact
                    ? updateContactMutation.mutate({ id: editContact.id, data })
                    : createContactMutation.mutate(data)
                }
                isPending={createContactMutation.isPending || updateContactMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="historique">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {!enrollmentsList || enrollmentsList.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune inscription pour cette entreprise</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'inscription</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentsList.map((e) => {
                      const session = sessions?.find((s) => s.id === e.sessionId);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{session?.title || e.sessionId}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{e.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString("fr-FR") : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Les documents seront disponibles via le portail entreprise</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Enterprise List (main page)
// ============================================================

export default function Enterprises() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEnterprise, setEditEnterprise] = useState<Enterprise | undefined>();
  const [viewEnterprise, setViewEnterprise] = useState<Enterprise | undefined>();
  const { toast } = useToast();

  const { data: enterprises, isLoading } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertEnterprise) => apiRequest("POST", "/api/enterprises", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      setDialogOpen(false);
      toast({ title: "Entreprise ajoutée avec succès" });
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
      toast({ title: "Entreprise modifiée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/enterprises/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      toast({ title: "Entreprise supprimée" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  if (viewEnterprise) {
    return <EnterpriseDetail enterprise={viewEnterprise} onBack={() => setViewEnterprise(undefined)} />;
  }

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
          <p className="text-muted-foreground mt-1">Gérez vos entreprises clientes et établissements</p>
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
            {search ? "Aucun résultat pour votre recherche" : "Ajoutez votre première entreprise cliente"}
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ent.sector}{ent.formatJuridique ? ` - ${ent.formatJuridique}` : ""}
                    </p>
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
                        <DropdownMenuItem onClick={() => setViewEnterprise(ent)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir
                        </DropdownMenuItem>
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
                  {(ent.email || ent.contactEmail) && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{ent.email || ent.contactEmail}</span>
                    </div>
                  )}
                  {(ent.phone || ent.contactPhone) && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{ent.phone || ent.contactPhone}</span>
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
            enterprises={enterprises}
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
