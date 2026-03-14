import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Target,
  Mail,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  Tag,
  TrendingUp,
  DollarSign,
  Building2,
  GraduationCap,
  UserPlus,
  Phone,
  MessageSquare,
  Calendar,
  ArrowRight,
  Eye,
} from "lucide-react";
import type { Prospect, Trainee, Enterprise } from "@shared/schema";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

// ============================================================
// TYPES
// ============================================================

interface ContactTag {
  id: string;
  name: string;
  color: string;
  category: string;
  createdAt: string;
}

interface TagAssignment {
  id: string;
  tagId: string;
  contactType: string;
  contactId: string;
}

interface MarketingCampaign {
  id: string;
  title: string;
  subject: string;
  body: string;
  status: string;
  targetType: string;
  targetTagIds: string[];
  targetContactType: string;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  createdAt: string;
}

interface ProspectActivity {
  id: string;
  prospectId: string;
  type: string;
  description: string;
  authorName: string | null;
  createdAt: string;
}

interface CrmStats {
  totalProspects: number;
  totalEnterprises: number;
  totalTrainees: number;
  pipelineStats: Record<string, number>;
  totalRevenue: number;
  pipelineRevenue: number;
  sentCampaigns: number;
  totalEmails: number;
}

const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospect", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { key: "contact", label: "Contacté", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "qualified", label: "Qualifié", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { key: "negotiation", label: "Négociation", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "won", label: "Gagné", color: "won" },
  { key: "lost", label: "Perdu", color: "lost" },
];

const TAG_CATEGORIES = [
  { value: "profession", label: "Profession" },
  { value: "sector", label: "Secteur" },
  { value: "interest", label: "Intérêt" },
  { value: "source", label: "Source" },
  { value: "general", label: "Général" },
];

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

// ============================================================
// CONTACTS TAB
// ============================================================

function ContactsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTagId, setFilterTagId] = useState<string>("all");
  const [tagDialog, setTagDialog] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#6366f1");
  const [tagCategory, setTagCategory] = useState("general");
  const [editingTag, setEditingTag] = useState<ContactTag | null>(null);

  const { data: trainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"] });
  const { data: enterprises } = useQuery<Enterprise[]>({ queryKey: ["/api/enterprises"] });
  const { data: prospects } = useQuery<Prospect[]>({ queryKey: ["/api/prospects"] });
  const { data: tags } = useQuery<ContactTag[]>({ queryKey: ["/api/contact-tags"] });
  const { data: assignments } = useQuery<TagAssignment[]>({ queryKey: ["/api/tag-assignments"] });

  const createTagMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/contact-tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-tags"] });
      setTagDialog(false);
      resetTagForm();
      toast({ title: "Tag créé" });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/contact-tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-tags"] });
      setTagDialog(false);
      resetTagForm();
      toast({ title: "Tag modifié" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contact-tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tag-assignments"] });
      toast({ title: "Tag supprimé" });
    },
  });

  const assignTagMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tag-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-assignments"] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (params: { tagId: string; contactType: string; contactId: string }) =>
      apiRequest("DELETE", `/api/tag-assignments?tagId=${params.tagId}&contactType=${params.contactType}&contactId=${params.contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-assignments"] });
    },
  });

  const resetTagForm = () => {
    setTagName("");
    setTagColor("#6366f1");
    setTagCategory("general");
    setEditingTag(null);
  };

  const openEditTag = (tag: ContactTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagCategory(tag.category);
    setTagDialog(true);
  };

  const handleSaveTag = () => {
    if (!tagName.trim()) return;
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, data: { name: tagName, color: tagColor, category: tagCategory } });
    } else {
      createTagMutation.mutate({ name: tagName, color: tagColor, category: tagCategory });
    }
  };

  const getContactTags = (contactType: string, contactId: string) => {
    const assigned = assignments?.filter(a => a.contactType === contactType && a.contactId === contactId) || [];
    return assigned.map(a => tags?.find(t => t.id === a.tagId)).filter(Boolean) as ContactTag[];
  };

  const isTagAssigned = (tagId: string, contactType: string, contactId: string) => {
    return assignments?.some(a => a.tagId === tagId && a.contactType === contactType && a.contactId === contactId);
  };

  // Construire la liste unifiée de contacts
  type Contact = { id: string; name: string; email: string; phone: string; type: string; extra: string; tags: ContactTag[] };
  const allContacts: Contact[] = [];

  if (filterType === "all" || filterType === "trainee") {
    trainees?.forEach(t => allContacts.push({
      id: t.id, name: `${t.firstName} ${t.lastName}`, email: t.email || "", phone: t.phone || "",
      type: "trainee", extra: t.profession || t.company || "", tags: getContactTags("trainee", t.id),
    }));
  }
  if (filterType === "all" || filterType === "enterprise") {
    enterprises?.forEach(e => allContacts.push({
      id: e.id, name: e.name, email: e.contactEmail || "", phone: e.contactPhone || "",
      type: "enterprise", extra: e.sector || "", tags: getContactTags("enterprise", e.id),
    }));
  }
  if (filterType === "all" || filterType === "prospect") {
    prospects?.forEach(p => allContacts.push({
      id: p.id, name: `${p.companyName} (${p.contactName})`, email: p.contactEmail || "", phone: p.contactPhone || "",
      type: "prospect", extra: p.source || "", tags: getContactTags("prospect", p.id),
    }));
  }

  const filtered = allContacts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.extra.toLowerCase().includes(search.toLowerCase());
    const matchTag = filterTagId === "all" || c.tags.some(t => t.id === filterTagId);
    return matchSearch && matchTag;
  });

  const typeLabel = (t: string) => {
    const m: Record<string, string> = { trainee: "Apprenant", enterprise: "Entreprise", prospect: "Prospect" };
    return m[t] || t;
  };

  const typeColor = (t: string) => t;

  return (
    <div className="space-y-4">
      {/* Tags management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" /> Tags de segmentation
            </CardTitle>
            <Button size="sm" onClick={() => { resetTagForm(); setTagDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Nouveau tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags?.map(tag => (
              <div key={tag.id} className="group flex items-center gap-1">
                <Badge
                  className="cursor-pointer"
                  style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
                  onClick={() => openEditTag(tag)}
                >
                  {tag.name}
                  <span className="text-xs ml-1 opacity-60">
                    ({assignments?.filter(a => a.tagId === tag.id).length || 0})
                  </span>
                </Badge>
                <button
                  className="opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => deleteTagMutation.mutate(tag.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(!tags || tags.length === 0) && (
              <p className="text-sm text-muted-foreground">Aucun tag. Créez des tags pour segmenter vos contacts.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters & search */}
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un contact..." className="max-w-sm" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les contacts</SelectItem>
            <SelectItem value="trainee">Apprenants</SelectItem>
            <SelectItem value="enterprise">Entreprises</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTagId} onValueChange={setFilterTagId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tags</SelectItem>
            {tags?.map(tag => (
              <SelectItem key={tag.id} value={tag.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name} ({assignments?.filter(a => a.tagId === tag.id).length || 0})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Info</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map(contact => (
                <TableRow key={`${contact.type}-${contact.id}`}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={contact.type} label={typeLabel(contact.type)} />
                  </TableCell>
                  <TableCell className="text-sm">{contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : "—"}</TableCell>
                  <TableCell className="text-sm">{contact.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{contact.extra}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map(tag => (
                        <Badge
                          key={tag.id}
                          className="text-xs cursor-pointer"
                          style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
                          onClick={() => removeTagMutation.mutate({ tagId: tag.id, contactType: contact.type, contactId: contact.id })}
                        >
                          {tag.name} ✕
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Tag className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {tags?.map(tag => (
                          <DropdownMenuItem
                            key={tag.id}
                            onClick={() => {
                              if (isTagAssigned(tag.id, contact.type, contact.id)) {
                                removeTagMutation.mutate({ tagId: tag.id, contactType: contact.type, contactId: contact.id });
                              } else {
                                assignTagMutation.mutate({ tagId: tag.id, contactType: contact.type, contactId: contact.id });
                              }
                            }}
                          >
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                            {isTagAssigned(tag.id, contact.type, contact.id) && " ✓"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 50 && (
            <p className="text-center text-sm text-muted-foreground py-3">
              {filtered.length} contacts au total (50 affichés)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tag dialog */}
      <Dialog open={tagDialog} onOpenChange={setTagDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Modifier le tag" : "Nouveau tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="Ex: Infirmier, EHPAD, Urgences..." />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={tagCategory} onValueChange={setTagCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAG_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Couleur</Label>
              <div className="flex gap-2 mt-1">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${tagColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setTagColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTagDialog(false)}>Annuler</Button>
              <Button onClick={handleSaveTag} disabled={!tagName.trim()}>
                {editingTag ? "Modifier" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// CAMPAIGNS TAB
// ============================================================

function CampaignsTab() {
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetContactType, setTargetContactType] = useState("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [manualRecipients, setManualRecipients] = useState<Array<{ email: string; name: string; type: string }>>([]);
  const [manualSearch, setManualSearch] = useState("");

  const { data: campaigns, isLoading } = useQuery<MarketingCampaign[]>({ queryKey: ["/api/marketing-campaigns"] });
  const { data: tags } = useQuery<ContactTag[]>({ queryKey: ["/api/contact-tags"] });
  const { data: allTrainees } = useQuery<Trainee[]>({ queryKey: ["/api/trainees"], enabled: targetType === "manual" });
  const { data: allEnterprises } = useQuery<Enterprise[]>({ queryKey: ["/api/enterprises"], enabled: targetType === "manual" });
  const { data: allProspects } = useQuery<Prospect[]>({ queryKey: ["/api/prospects"], enabled: targetType === "manual" });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/marketing-campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      resetForm();
      toast({ title: "Campagne créée" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/marketing-campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      resetForm();
      toast({ title: "Campagne modifiée" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/marketing-campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      toast({ title: "Campagne supprimée" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/marketing-campaigns/${id}/send`),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      toast({ title: `Campagne envoyée à ${data.sent} destinataires` });
    },
  });

  const resetForm = () => {
    setDialog(false);
    setEditing(null);
    setTitle("");
    setSubject("");
    setBody("");
    setTargetType("all");
    setTargetContactType("all");
    setSelectedTagIds([]);
    setManualRecipients([]);
    setManualSearch("");
  };

  const openEdit = (c: MarketingCampaign) => {
    setEditing(c);
    setTitle(c.title);
    setSubject(c.subject);
    setBody(c.body);
    setTargetType(c.targetType);
    setTargetContactType(c.targetContactType);
    setSelectedTagIds(c.targetTagIds || []);
    setManualRecipients([]);
    setDialog(true);
  };

  // Build available contacts for manual selection
  const manualContacts = useMemo(() => {
    if (targetType !== "manual") return [];
    const contacts: Array<{ email: string; name: string; type: string }> = [];
    allTrainees?.filter(t => t.email).forEach(t => contacts.push({ email: t.email!, name: `${t.firstName} ${t.lastName}`, type: "Apprenant" }));
    allEnterprises?.filter(e => e.contactEmail).forEach(e => contacts.push({ email: e.contactEmail!, name: e.name, type: "Entreprise" }));
    allProspects?.filter(p => p.contactEmail).forEach(p => contacts.push({ email: p.contactEmail!, name: `${p.companyName} (${p.contactName})`, type: "Prospect" }));
    if (!manualSearch) return contacts;
    const s = manualSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));
  }, [targetType, allTrainees, allEnterprises, allProspects, manualSearch]);

  const toggleManualRecipient = (contact: { email: string; name: string; type: string }) => {
    setManualRecipients(prev =>
      prev.some(r => r.email === contact.email)
        ? prev.filter(r => r.email !== contact.email)
        : [...prev, contact]
    );
  };

  const handleSave = () => {
    const data: any = { title, subject, body, targetType, targetContactType, targetTagIds: selectedTagIds };
    if (targetType === "manual") {
      data.manualEmails = manualRecipients.map(r => r.email);
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusBadge = (status: string) => {
    const labels: Record<string, string> = { draft: "Brouillon", scheduled: "Planifiée", sent: "Envoyée", cancelled: "Annulée" };
    return <StatusBadge status={status} label={labels[status] || status} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campagnes marketing</h3>
        <Button onClick={() => { resetForm(); setDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nouvelle campagne
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{c.title}</h4>
                      {statusBadge(c.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">Sujet : {c.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {c.totalRecipients || 0} destinataires
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" /> {c.sentCount || 0} envoyés
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {c.openedCount || 0} ouverts
                      </span>
                      {c.sentAt && (
                        <span>
                          Envoyée le {new Date(c.sentAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {c.status === "draft" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" onClick={() => sendMutation.mutate(c.id)}>
                          <Send className="w-3.5 h-3.5 mr-1" /> Envoyer
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Mail}
          title="Aucune campagne marketing"
          description="Créez des newsletters pour communiquer avec vos contacts"
        />
      )}

      {/* Campaign dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre de la campagne</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Newsletter Mars 2026" />
            </div>
            <div>
              <Label>Objet de l'email</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Nouvelles sessions disponibles !" />
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Contenu de l'email..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ciblage</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les contacts</SelectItem>
                    <SelectItem value="tag">Par tag</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de contact</Label>
                <Select value={targetContactType} onValueChange={setTargetContactType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="trainee">Apprenants</SelectItem>
                    <SelectItem value="enterprise">Entreprises</SelectItem>
                    <SelectItem value="prospect">Prospects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {targetType === "tag" && (
              <div>
                <Label>Tags ciblés</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags?.map(tag => (
                    <Badge
                      key={tag.id}
                      className="cursor-pointer"
                      variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                      onClick={() => setSelectedTagIds(prev =>
                        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      )}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {targetType === "manual" && (
              <div className="space-y-2">
                <Label>Destinataires ({manualRecipients.length} sélectionnés)</Label>
                <Input
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  placeholder="Rechercher un contact..."
                  className="mb-2"
                />
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {manualContacts.slice(0, 50).map((contact: { email: string; name: string; type: string }) => {
                    const isSelected = manualRecipients.some(r => r.email === contact.email);
                    return (
                      <label
                        key={contact.email}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-sm ${isSelected ? "bg-primary/10" : "hover:bg-accent/50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleManualRecipient(contact)}
                          className="accent-primary"
                        />
                        <span className="flex-1 truncate">{contact.name}</span>
                        <span className="text-xs text-muted-foreground">{contact.type}</span>
                      </label>
                    );
                  })}
                  {manualContacts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Aucun contact trouvé</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={!title.trim() || !subject.trim() || !body.trim()}>
                {editing ? "Modifier" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// PIPELINE TAB
// ============================================================

function PipelineTab() {
  const { toast } = useToast();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [activityType, setActivityType] = useState("note");
  const [activityDesc, setActivityDesc] = useState("");

  const { data: prospects } = useQuery<Prospect[]>({ queryKey: ["/api/prospects"] });

  const { data: activities, isLoading: loadingActivities } = useQuery<ProspectActivity[]>({
    queryKey: ["/api/prospect-activities", selectedProspect?.id],
    queryFn: () => apiRequest("GET", `/api/prospect-activities?prospectId=${selectedProspect!.id}`).then(r => r.json()),
    enabled: !!selectedProspect,
  });

  const createActivityMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/prospect-activities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospect-activities"] });
      setActivityDesc("");
      toast({ title: "Activité ajoutée" });
    },
  });

  const updateProspectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/prospects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-stats"] });
    },
  });

  const handleAddActivity = () => {
    if (!activityDesc.trim() || !selectedProspect) return;
    createActivityMutation.mutate({
      prospectId: selectedProspect.id,
      type: activityType,
      description: activityDesc,
    });
  };

  const handleStageChange = (prospect: Prospect, newStage: string) => {
    updateProspectMutation.mutate({ id: prospect.id, data: { status: newStage } });
    if (selectedProspect?.id === prospect.id) {
      createActivityMutation.mutate({
        prospectId: prospect.id,
        type: "status_change",
        description: `Statut changé vers "${PIPELINE_STAGES.find(s => s.key === newStage)?.label || newStage}"`,
      });
    }
  };

  const activityIcon = (type: string) => {
    const m: Record<string, any> = {
      call: <Phone className="w-3.5 h-3.5" />,
      email: <Mail className="w-3.5 h-3.5" />,
      meeting: <Calendar className="w-3.5 h-3.5" />,
      note: <MessageSquare className="w-3.5 h-3.5" />,
      status_change: <ArrowRight className="w-3.5 h-3.5" />,
      quote: <DollarSign className="w-3.5 h-3.5" />,
    };
    return m[type] || <MessageSquare className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-4">
      {/* Pipeline kanban-like view */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_STAGES.map(stage => {
          const stageProspects = prospects?.filter(p => p.status === stage.key) || [];
          const stageRevenue = stageProspects.reduce((s, p) => s + (p.estimatedRevenue || 0), 0);
          return (
            <Card key={stage.key}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${stage.color}`}>{stage.label}</Badge>
                  <span className="text-xs font-medium">{stageProspects.length}</span>
                </div>
                {stageRevenue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stageRevenue)}</p>
                )}
              </CardHeader>
              <CardContent className="p-2 pt-0 space-y-1.5 max-h-48 overflow-y-auto">
                {stageProspects.map(p => (
                  <div
                    key={p.id}
                    className={`text-xs border rounded p-2 cursor-pointer hover:bg-muted/50 ${
                      selectedProspect?.id === p.id ? "ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedProspect(p)}
                  >
                    <p className="font-medium truncate">{p.companyName}</p>
                    <p className="text-muted-foreground truncate">{p.contactName}</p>
                    {p.estimatedRevenue ? (
                      <p className="text-muted-foreground">{formatCurrency(p.estimatedRevenue)}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Détail prospect sélectionné */}
      {selectedProspect && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedProspect.companyName}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedProspect.contactName} — <a href={`mailto:${selectedProspect.contactEmail}`} className="text-primary hover:underline">{selectedProspect.contactEmail}</a> — {selectedProspect.contactPhone}
                </p>
              </div>
              <Select
                value={selectedProspect.status}
                onValueChange={(v) => handleStageChange(selectedProspect, v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add activity */}
            <div className="flex gap-2">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Appel</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="quote">Devis</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                value={activityDesc}
                onChange={e => setActivityDesc(e.target.value)}
                placeholder="Ajouter une activité..."
                onKeyDown={e => e.key === "Enter" && handleAddActivity()}
              />
              <Button onClick={handleAddActivity} disabled={!activityDesc.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Activity timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Historique</h4>
              {loadingActivities ? (
                <Skeleton className="h-20 w-full" />
              ) : activities && activities.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        {activityIcon(a.type)}
                      </div>
                      <div className="flex-1">
                        <p>{a.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.authorName && `${a.authorName} — `}
                          {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// MAIN CRM PAGE
// ============================================================

export default function CrmPage() {
  const { data: stats, isLoading: loadingStats } = useQuery<CrmStats>({
    queryKey: ["/api/crm-stats"],
  });

  return (
    <PageLayout>
      <PageHeader title="CRM & Marketing" subtitle="Gestion de la relation client et marketing" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">
                {(stats?.totalTrainees || 0) + (stats?.totalEnterprises || 0) + (stats?.totalProspects || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalTrainees || 0} apprenants, {stats?.totalEnterprises || 0} entreprises
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.totalProspects || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pipelineStats?.won || 0} gagnés, {stats?.pipelineStats?.negotiation || 0} en négo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CA Pipeline</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{formatCurrency(stats?.pipelineRevenue || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Gagné : {formatCurrency(stats?.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campagnes</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.sentCampaigns || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalEmails || 0} emails envoyés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Mail className="w-4 h-4 mr-2" />
            Campagnes
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
