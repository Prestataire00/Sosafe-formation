import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileText,
  Euro,
  TrendingUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRightLeft,
  X,
} from "lucide-react";
import type { Quote, InsertQuote, Prospect, Enterprise } from "@shared/schema";
import { QUOTE_STATUSES } from "@shared/schema";

// ============================================================
// Helpers
// ============================================================

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return map[status] || "";
}

function statusLabel(status: string): string {
  const found = QUOTE_STATUSES.find((s) => s.value === status);
  return found ? found.label : status;
}

function statusIcon(status: string) {
  const map: Record<string, typeof FileText> = {
    draft: Clock,
    sent: Send,
    accepted: CheckCircle,
    rejected: XCircle,
    expired: Clock,
  };
  const Icon = map[status] || FileText;
  return <Icon className="w-3.5 h-3.5" />;
}

// ============================================================
// Line item types and editor
// ============================================================

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in centimes
  total: number; // in centimes
}

function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const addRow = () => {
    onChange([...items, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item };
      if (field === "description") {
        newItem.description = value as string;
      } else if (field === "quantity") {
        newItem.quantity = Math.max(0, Number(value) || 0);
      } else if (field === "unitPrice") {
        // Input is in euros, store in centimes
        newItem.unitPrice = Math.round((Number(value) || 0) * 100);
      }
      newItem.total = newItem.quantity * newItem.unitPrice;
      return newItem;
    });
    onChange(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tvaAmount = Math.round(subtotal * 0.2);
  const total = subtotal + tvaAmount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Lignes du devis</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Ajouter une ligne
        </Button>
      </div>

      {items.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[100px]">Quantite</TableHead>
                <TableHead className="w-[130px]">Prix unit. (EUR)</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="p-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateRow(index, "description", e.target.value)}
                      placeholder="Description de la prestation"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateRow(index, "quantity", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(item.unitPrice / 100).toFixed(2)}
                      onChange={(e) => updateRow(index, "unitPrice", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right text-sm font-medium">
                    {formatCents(item.total)} EUR
                  </TableCell>
                  <TableCell className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeRow(index)}
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t bg-muted/30 px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-medium">{formatCents(subtotal)} EUR</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA (20%)</span>
              <span className="font-medium">{formatCents(tvaAmount)} EUR</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t">
              <span>Total TTC</span>
              <span>{formatCents(total)} EUR</span>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-md border-dashed">
          Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
        </div>
      )}
    </div>
  );
}

// ============================================================
// Quote form
// ============================================================

function QuoteForm({
  quote,
  prospects,
  enterprises,
  nextNumber,
  onSubmit,
  isPending,
}: {
  quote?: Quote;
  prospects: Prospect[];
  enterprises: Enterprise[];
  nextNumber?: string;
  onSubmit: (data: InsertQuote) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(quote?.title || "");
  const [prospectId, setProspectId] = useState(quote?.prospectId || "");
  const [enterpriseId, setEnterpriseId] = useState(quote?.enterpriseId || "");
  const [validUntil, setValidUntil] = useState(quote?.validUntil || "");
  const [notes, setNotes] = useState(quote?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (quote?.lineItems as LineItem[] | null) || [{ description: "", quantity: 1, unitPrice: 0, total: 0 }]
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 2000;
  const taxAmount = Math.round(subtotal * (taxRate / 10000));
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      number: quote?.number || nextNumber || "",
      title,
      prospectId: prospectId || null,
      enterpriseId: enterpriseId || null,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: quote?.status || "draft",
      validUntil: validUntil || null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quote-number">Numero</Label>
          <Input
            id="quote-number"
            value={quote?.number || nextNumber || ""}
            disabled
            className="bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quote-title">Titre</Label>
          <Input
            id="quote-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du devis"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prospect</Label>
          <Select value={prospectId} onValueChange={setProspectId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un prospect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Aucun --</SelectItem>
              {prospects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.companyName} ({p.contactName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Entreprise</Label>
          <Select value={enterpriseId} onValueChange={setEnterpriseId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner une entreprise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Aucune --</SelectItem>
              {enterprises.map((ent) => (
                <SelectItem key={ent.id} value={ent.id}>
                  {ent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quote-valid-until">Valide jusqu'au</Label>
        <Input
          id="quote-valid-until"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </div>

      <LineItemsEditor items={lineItems} onChange={setLineItems} />

      <div className="space-y-2">
        <Label htmlFor="quote-notes">Notes</Label>
        <Textarea
          id="quote-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes ou conditions particulieres..."
          className="resize-none"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : quote ? "Modifier" : "Creer le devis"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Main Quotes page
// ============================================================

export default function Quotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<Quote | undefined>();
  const { toast } = useToast();

  // Data queries
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: prospects } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects"],
  });

  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });

  const { data: nextNumberData } = useQuery<{ number: string }>({
    queryKey: ["/api/quotes/next-number"],
    enabled: dialogOpen && !editQuote,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InsertQuote) => apiRequest("POST", "/api/quotes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/next-number"] });
      setDialogOpen(false);
      toast({ title: "Devis cree avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la creation", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertQuote }) =>
      apiRequest("PATCH", `/api/quotes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setDialogOpen(false);
      setEditQuote(undefined);
      toast({ title: "Devis modifie avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Devis supprime" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/quotes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Statut mis a jour" });
    },
    onError: () => toast({ title: "Erreur lors du changement de statut", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/quotes/${id}/convert-to-invoice`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Devis converti en facture avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la conversion", variant: "destructive" }),
  });

  // Filtering
  const filtered = (quotes || []).filter((q) => {
    const matchesSearch =
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalQuotes = quotes?.length || 0;
  const totalAmount = quotes?.reduce((sum, q) => sum + q.total, 0) || 0;
  const acceptedCount = quotes?.filter((q) => q.status === "accepted").length || 0;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedCount / totalQuotes) * 100) : 0;

  // Helpers to resolve names
  const prospectName = (id: string | null) => {
    if (!id) return "-";
    const p = prospects?.find((pr) => pr.id === id);
    return p ? p.companyName : "-";
  };
  const enterpriseName = (id: string | null) => {
    if (!id) return "-";
    const e = enterprises?.find((ent) => ent.id === id);
    return e ? e.name : "-";
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Devis</h1>
          <p className="text-muted-foreground mt-1">
            Gerez vos devis et propositions commerciales
          </p>
        </div>
        <Button
          onClick={() => {
            setEditQuote(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau devis
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total devis
            </CardTitle>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
              <FileText className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalQuotes}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Montant total
            </CardTitle>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
              <Euro className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCents(totalAmount)} EUR</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de conversion
            </CardTitle>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
              <TrendingUp className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {acceptedCount} accepte{acceptedCount > 1 ? "s" : ""} / {totalQuotes} devis
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numero ou titre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {QUOTE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucun devis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || statusFilter !== "all"
              ? "Aucun resultat pour votre recherche"
              : "Creez votre premier devis"}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau devis
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Entreprise / Prospect</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-sm">
                      {quote.number}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {quote.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {quote.enterpriseId
                        ? enterpriseName(quote.enterpriseId)
                        : prospectName(quote.prospectId)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(quote.total)} EUR
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 ${statusBadgeClass(quote.status)}`}
                      >
                        {statusIcon(quote.status)}
                        {statusLabel(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {quote.createdAt
                        ? new Date(quote.createdAt).toLocaleDateString("fr-FR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditQuote(quote);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {quote.status !== "sent" && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: quote.id,
                                  status: "sent",
                                })
                              }
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Marquer comme envoye
                            </DropdownMenuItem>
                          )}
                          {quote.status !== "accepted" && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: quote.id,
                                  status: "accepted",
                                })
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marquer comme accepte
                            </DropdownMenuItem>
                          )}
                          {quote.status !== "rejected" && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: quote.id,
                                  status: "rejected",
                                })
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Marquer comme refuse
                            </DropdownMenuItem>
                          )}
                          {quote.status !== "expired" && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeStatusMutation.mutate({
                                  id: quote.id,
                                  status: "expired",
                                })
                              }
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Marquer comme expire
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {quote.status === "accepted" && (
                            <DropdownMenuItem
                              onClick={() => convertMutation.mutate(quote.id)}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Convertir en facture
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(quote.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditQuote(undefined);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editQuote ? "Modifier le devis" : "Nouveau devis"}
            </DialogTitle>
          </DialogHeader>
          <QuoteForm
            quote={editQuote}
            prospects={prospects || []}
            enterprises={enterprises || []}
            nextNumber={nextNumberData?.number}
            onSubmit={(data) =>
              editQuote
                ? updateMutation.mutate({ id: editQuote.id, data })
                : createMutation.mutate(data)
            }
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
