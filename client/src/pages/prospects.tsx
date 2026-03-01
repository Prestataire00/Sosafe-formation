import { useState } from "react";
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
  Users,
  Mail,
  Phone,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRightCircle,
  DollarSign,
  StickyNote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Prospect, InsertProspect } from "@shared/schema";
import { PROSPECT_STATUSES } from "@shared/schema";

const PIPELINE_ORDER = ["prospect", "contact", "qualified", "negotiation", "won", "lost"] as const;

function getStatusConfig(status: string) {
  return PROSPECT_STATUSES.find((s) => s.value === status) || PROSPECT_STATUSES[0];
}

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const stepsWithoutLost = PIPELINE_ORDER.filter((s) => s !== "lost");
  const currentIndex = stepsWithoutLost.indexOf(currentStatus as typeof stepsWithoutLost[number]);
  const isLost = currentStatus === "lost";

  return (
    <div className="flex items-center gap-1 mt-3">
      {stepsWithoutLost.map((step, index) => {
        const config = getStatusConfig(step);
        const isActive = !isLost && index <= currentIndex;
        const isCurrent = step === currentStatus;

        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                isLost
                  ? "bg-red-200 dark:bg-red-900/30"
                  : isActive
                    ? step === "won"
                      ? "bg-green-500"
                      : "bg-primary"
                    : "bg-muted"
              }`}
            />
            {isCurrent && (
              <span className="text-[10px] font-medium text-muted-foreground">
                {config.label}
              </span>
            )}
          </div>
        );
      })}
      {isLost && (
        <span className="text-[10px] font-medium text-red-500 ml-1">
          Perdu
        </span>
      )}
    </div>
  );
}

function ProspectForm({
  prospect,
  onSubmit,
  isPending,
}: {
  prospect?: Prospect;
  onSubmit: (data: InsertProspect) => void;
  isPending: boolean;
}) {
  const [companyName, setCompanyName] = useState(prospect?.companyName || "");
  const [contactName, setContactName] = useState(prospect?.contactName || "");
  const [contactEmail, setContactEmail] = useState(prospect?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(prospect?.contactPhone || "");
  const [status, setStatus] = useState(prospect?.status || "prospect");
  const [source, setSource] = useState(prospect?.source || "");
  const [notes, setNotes] = useState(prospect?.notes || "");
  const [estimatedRevenue, setEstimatedRevenue] = useState(
    prospect?.estimatedRevenue?.toString() || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      companyName,
      contactName,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      status,
      source: source || null,
      notes: notes || null,
      estimatedRevenue: estimatedRevenue ? parseInt(estimatedRevenue, 10) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company-name">Nom de l'entreprise</Label>
        <Input
          id="company-name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          data-testid="input-prospect-company"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-name">Nom du contact</Label>
        <Input
          id="contact-name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
          data-testid="input-prospect-contact-name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            data-testid="input-prospect-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone">Telephone</Label>
          <Input
            id="contact-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            data-testid="input-prospect-phone"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-prospect-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Site web, salon, recommandation..."
            data-testid="input-prospect-source"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="estimated-revenue">Revenu estime (EUR)</Label>
        <Input
          id="estimated-revenue"
          type="number"
          value={estimatedRevenue}
          onChange={(e) => setEstimatedRevenue(e.target.value)}
          placeholder="0"
          data-testid="input-prospect-revenue"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informations complementaires sur le prospect..."
          className="resize-none"
          data-testid="input-prospect-notes"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-prospect-submit">
          {isPending ? "Enregistrement..." : prospect ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

export default function Prospects() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Prospect | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: prospects, isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertProspect) => apiRequest("POST", "/api/prospects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setDialogOpen(false);
      toast({ title: "Prospect ajoute avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de l'ajout", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertProspect }) =>
      apiRequest("PATCH", `/api/prospects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setDialogOpen(false);
      setEditItem(undefined);
      toast({ title: "Prospect modifie avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/prospects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({ title: "Prospect supprime" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/prospects/${id}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      toast({ title: "Prospect converti en entreprise avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la conversion", variant: "destructive" }),
  });

  const filtered = prospects?.filter((p) => {
    const matchesSearch =
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.contactName.toLowerCase().includes(search.toLowerCase()) ||
      (p.contactEmail || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <PageLayout>
      <PageHeader
        title="Prospects"
        subtitle="Suivez vos prospects et opportunités"
        actions={
          <Button
            onClick={() => { setEditItem(undefined); setDialogOpen(true); }}
            data-testid="button-create-prospect"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un prospect
          </Button>
        }
      />

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
          data-testid="filter-all"
        >
          Tous
          {prospects && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {prospects.length}
            </Badge>
          )}
        </Button>
        {PROSPECT_STATUSES.map((s) => {
          const count = prospects?.filter((p) => p.status === s.value).length || 0;
          return (
            <Button
              key={s.value}
              variant={statusFilter === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s.value)}
              data-testid={`filter-${s.value}`}
            >
              {s.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un prospect..." className="max-w-sm" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-2 w-full mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun prospect"
          description={search || statusFilter !== "all"
            ? "Aucun resultat pour votre recherche"
            : "Ajoutez votre premier prospect"}
          action={!search && statusFilter === "all" ? (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-prospect">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un prospect
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prospect) => {
            const statusConfig = getStatusConfig(prospect.status);

            return (
              <Card key={prospect.id} className="hover-elevate" data-testid={`card-prospect-${prospect.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{prospect.companyName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{prospect.contactName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-prospect-menu-${prospect.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => { setEditItem(prospect); setDialogOpen(true); }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {prospect.status === "won" && (
                            <DropdownMenuItem
                              onClick={() => convertMutation.mutate(prospect.id)}
                            >
                              <ArrowRightCircle className="w-4 h-4 mr-2" />
                              Convertir en entreprise
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(prospect.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {prospect.contactEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{prospect.contactEmail}</span>
                      </div>
                    )}
                    {prospect.contactPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{prospect.contactPhone}</span>
                      </div>
                    )}
                    {prospect.estimatedRevenue && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 shrink-0" />
                        <span>{prospect.estimatedRevenue.toLocaleString("fr-FR")} EUR</span>
                      </div>
                    )}
                    {prospect.source && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{prospect.source}</span>
                      </div>
                    )}
                    {prospect.notes && (
                      <div className="flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{prospect.notes}</span>
                      </div>
                    )}
                  </div>

                  <StatusPipeline currentStatus={prospect.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(undefined); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Modifier le prospect" : "Nouveau prospect"}</DialogTitle>
          </DialogHeader>
          <ProspectForm
            prospect={editItem}
            onSubmit={(data) =>
              editItem
                ? updateMutation.mutate({ id: editItem.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
