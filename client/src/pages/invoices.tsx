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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Euro,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  X,
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
import type { Invoice, InsertInvoice, Enterprise, Session } from "@shared/schema";
import { INVOICE_STATUSES, PAYMENT_METHODS } from "@shared/schema";

// ============================================================
// Types
// ============================================================

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceStats {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

// ============================================================
// Helpers
// ============================================================

function centimesToEuros(centimes: number): string {
  return (centimes / 100).toFixed(2).replace(".", ",");
}

function eurosToCentimes(euros: string): number {
  const cleaned = euros.replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

function formatEuros(centimes: number): string {
  return `${centimesToEuros(centimes)} €`;
}

// ============================================================
// Status Badge
// ============================================================

function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-destructive/10 text-destructive",
  };
  const labels: Record<string, string> = {};
  INVOICE_STATUSES.forEach((s) => {
    labels[s.value] = s.label;
  });
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

// ============================================================
// Stats Card
// ============================================================

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
  testId,
}: {
  title: string;
  value: string | number;
  icon: typeof Euro;
  subtitle?: string;
  loading?: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Line Items Editor
// ============================================================

function LineItemsEditor({
  lineItems,
  onChange,
}: {
  lineItems: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const addItem = () => {
    onChange([...lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    const item = { ...updated[index] };

    if (field === "description") {
      item.description = value as string;
    } else if (field === "quantity") {
      item.quantity = typeof value === "string" ? parseInt(value) || 0 : value;
      item.total = item.quantity * item.unitPrice;
    } else if (field === "unitPrice") {
      item.unitPrice = typeof value === "string" ? eurosToCentimes(value) : value;
      item.total = item.quantity * item.unitPrice;
    }

    updated[index] = item;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * 0.2);
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Lignes de facturation</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-line-item">
          <Plus className="w-3 h-3 mr-1" />
          Ajouter
        </Button>
      </div>

      {lineItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune ligne. Cliquez sur "Ajouter" pour commencer.
        </p>
      )}

      {lineItems.map((item, index) => (
        <div key={index} className="border rounded-md p-3 space-y-2" data-testid={`line-item-${index}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
                data-testid={`input-line-description-${index}`}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    data-testid={`input-line-qty-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prix unitaire (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={centimesToEuros(item.unitPrice)}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    data-testid={`input-line-price-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <Input
                    value={formatEuros(item.total)}
                    disabled
                    className="bg-muted"
                    data-testid={`input-line-total-${index}`}
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 mt-1 text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(index)}
              data-testid={`button-remove-line-${index}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {lineItems.length > 0 && (
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span>{formatEuros(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TVA (20%)</span>
            <span>{formatEuros(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1 border-t">
            <span>Total TTC</span>
            <span>{formatEuros(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Invoice Form
// ============================================================

function InvoiceForm({
  invoice,
  enterprises,
  sessions,
  onSubmit,
  isPending,
}: {
  invoice?: Invoice;
  enterprises: Enterprise[];
  sessions: Session[];
  onSubmit: (data: InsertInvoice) => void;
  isPending: boolean;
}) {
  const [number, setNumber] = useState(invoice?.number || "");
  const [title, setTitle] = useState(invoice?.title || "");
  const [enterpriseId, setEnterpriseId] = useState(invoice?.enterpriseId || "");
  const [sessionId, setSessionId] = useState(invoice?.sessionId || "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate || "");
  const [status, setStatus] = useState(invoice?.status || "draft");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (invoice?.lineItems as LineItem[]) || []
  );
  const isEdit = !!invoice;

  // Fetch next number for new invoices
  const { data: nextNumber } = useQuery<{ number: string }>({
    queryKey: ["/api/invoices/next-number"],
    enabled: !isEdit,
  });

  // Set auto number when available
  useState(() => {
    if (!isEdit && nextNumber?.number && !number) {
      setNumber(nextNumber.number);
    }
  });

  // Update number when nextNumber loads
  if (!isEdit && nextNumber?.number && !number) {
    setNumber(nextNumber.number);
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 2000; // 20%
  const taxAmount = Math.round(subtotal * 0.2);
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      number,
      title,
      quoteId: invoice?.quoteId || null,
      enterpriseId: enterpriseId || null,
      sessionId: sessionId || null,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paidAmount: invoice?.paidAmount || 0,
      status,
      dueDate: dueDate || null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice-number">Numéro de facture</Label>
          <Input
            id="invoice-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="FAC-0001"
            required
            data-testid="input-invoice-number"
          />
        </div>
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-invoice-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoice-title">Titre</Label>
        <Input
          id="invoice-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Facture formation AFGSU..."
          required
          data-testid="input-invoice-title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entreprise</Label>
          <Select value={enterpriseId} onValueChange={setEnterpriseId}>
            <SelectTrigger data-testid="select-invoice-enterprise">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {enterprises.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Session</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger data-testid="select-invoice-session">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoice-due-date">Date d'échéance</Label>
        <Input
          id="invoice-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          data-testid="input-invoice-due-date"
        />
      </div>

      <LineItemsEditor lineItems={lineItems} onChange={setLineItems} />

      <div className="space-y-2">
        <Label htmlFor="invoice-notes">Notes</Label>
        <Textarea
          id="invoice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes ou conditions..."
          className="resize-none"
          data-testid="input-invoice-notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-invoice-submit">
          {isPending ? "Enregistrement..." : isEdit ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Payment Form
// ============================================================

function PaymentForm({
  invoice,
  onSubmit,
  isPending,
}: {
  invoice: Invoice;
  onSubmit: (data: { invoiceId: string; amount: number; method: string; reference: string | null; paidAt: string | null; notes: string | null }) => void;
  isPending: boolean;
}) {
  const remaining = invoice.total - invoice.paidAmount;
  const [amountStr, setAmountStr] = useState(centimesToEuros(remaining));
  const [method, setMethod] = useState("virement");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      invoiceId: invoice.id,
      amount: eurosToCentimes(amountStr),
      method,
      reference: reference || null,
      paidAt: paidAt || null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total facture</span>
          <span className="font-medium">{formatEuros(invoice.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Déjà payé</span>
          <span className="font-medium">{formatEuros(invoice.paidAmount)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="font-medium">Reste à payer</span>
          <span className="font-semibold text-primary">{formatEuros(remaining)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-amount">Montant du paiement (€)</Label>
        <Input
          id="payment-amount"
          type="number"
          step="0.01"
          min="0.01"
          max={centimesToEuros(remaining)}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          required
          data-testid="input-payment-amount"
        />
      </div>

      <div className="space-y-2">
        <Label>Mode de paiement</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger data-testid="select-payment-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-reference">Référence</Label>
        <Input
          id="payment-reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Numéro de chèque, virement..."
          data-testid="input-payment-reference"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-date">Date du paiement</Label>
        <Input
          id="payment-date"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
          data-testid="input-payment-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-notes">Notes</Label>
        <Textarea
          id="payment-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes sur le paiement..."
          className="resize-none"
          data-testid="input-payment-notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-payment-submit">
          {isPending ? "Enregistrement..." : "Enregistrer le paiement"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | undefined>();
  const { toast } = useToast();

  // Data queries
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: stats, isLoading: loadingStats } = useQuery<InvoiceStats>({
    queryKey: ["/api/invoices/stats"],
  });
  const { data: enterprises } = useQuery<Enterprise[]>({
    queryKey: ["/api/enterprises"],
  });
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InsertInvoice) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/next-number"] });
      setDialogOpen(false);
      toast({ title: "Facture créée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertInvoice }) =>
      apiRequest("PATCH", `/api/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      setDialogOpen(false);
      setEditInvoice(undefined);
      toast({ title: "Facture modifiée avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      toast({ title: "Facture supprimée" });
    },
    onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: (data: { invoiceId: string; amount: number; method: string; reference: string | null; paidAt: string | null; notes: string | null }) =>
      apiRequest("POST", "/api/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setPaymentDialogOpen(false);
      setPaymentInvoice(undefined);
      toast({ title: "Paiement enregistré avec succès" });
    },
    onError: () => toast({ title: "Erreur lors de l'enregistrement du paiement", variant: "destructive" }),
  });

  // Filtering
  const filtered = invoices?.filter((inv) => {
    const enterprise = enterprises?.find((e) => e.id === inv.enterpriseId);
    const matchesSearch =
      search === "" ||
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.title.toLowerCase().includes(search.toLowerCase()) ||
      (enterprise?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const statusCounts: Record<string, number> = { all: invoices?.length || 0 };
  INVOICE_STATUSES.forEach((s) => {
    statusCounts[s.value] = invoices?.filter((inv) => inv.status === s.value).length || 0;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Factures</h1>
          <p className="text-muted-foreground mt-1">Gérez vos factures et suivez les paiements</p>
        </div>
        <Button
          onClick={() => {
            setEditInvoice(undefined);
            setDialogOpen(true);
          }}
          data-testid="button-create-invoice"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total facturé"
          value={formatEuros(stats?.totalAmount || 0)}
          icon={Euro}
          subtitle={`${stats?.totalCount || 0} facture${(stats?.totalCount || 0) > 1 ? "s" : ""}`}
          loading={loadingStats}
          testId="stat-total"
        />
        <StatCard
          title="Payé"
          value={formatEuros(stats?.paidAmount || 0)}
          icon={CheckCircle}
          subtitle={`${stats?.paidCount || 0} facture${(stats?.paidCount || 0) > 1 ? "s" : ""}`}
          loading={loadingStats}
          testId="stat-paid"
        />
        <StatCard
          title="En attente"
          value={formatEuros(stats?.pendingAmount || 0)}
          icon={Clock}
          subtitle={`${stats?.pendingCount || 0} facture${(stats?.pendingCount || 0) > 1 ? "s" : ""}`}
          loading={loadingStats}
          testId="stat-pending"
        />
        <StatCard
          title="En retard"
          value={formatEuros(stats?.overdueAmount || 0)}
          icon={AlertTriangle}
          subtitle={`${stats?.overdueCount || 0} facture${(stats?.overdueCount || 0) > 1 ? "s" : ""}`}
          loading={loadingStats}
          testId="stat-overdue"
        />
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Toutes" },
          ...INVOICE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
        ].map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s.value)}
            data-testid={`button-filter-${s.value}`}
          >
            {s.label} ({statusCounts[s.value] || 0})
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une facture..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-invoices"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Aucune facture</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || statusFilter !== "all"
              ? "Aucun résultat pour vos filtres"
              : "Créez votre première facture"}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-invoice">
              <Plus className="w-4 h-4 mr-2" />
              Créer une facture
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => {
                  const enterprise = enterprises?.find((e) => e.id === invoice.enterpriseId);
                  return (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{invoice.number}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium truncate max-w-[200px]">{invoice.title}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{enterprise?.name || "-"}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">{formatEuros(invoice.total)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-muted-foreground">{formatEuros(invoice.paidAmount)}</span>
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {invoice.dueDate
                            ? new Date(invoice.dueDate).toLocaleDateString("fr-FR")
                            : "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-invoice-menu-${invoice.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditInvoice(invoice);
                                setDialogOpen(true);
                              }}
                              data-testid={`button-edit-invoice-${invoice.id}`}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPaymentInvoice(invoice);
                                  setPaymentDialogOpen(true);
                                }}
                                data-testid={`button-payment-invoice-${invoice.id}`}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Enregistrer paiement
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(invoice.id)}
                              data-testid={`button-delete-invoice-${invoice.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoice Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditInvoice(undefined);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editInvoice ? "Modifier la facture" : "Nouvelle facture"}
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={editInvoice}
            enterprises={enterprises || []}
            sessions={sessions || []}
            onSubmit={(data) => {
              const cleanData = {
                ...data,
                enterpriseId: data.enterpriseId === "none" ? null : data.enterpriseId,
                sessionId: data.sessionId === "none" ? null : data.sessionId,
              };
              editInvoice
                ? updateMutation.mutate({ id: editInvoice.id, data: cleanData })
                : createMutation.mutate(cleanData);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setPaymentInvoice(undefined);
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Enregistrer un paiement
              {paymentInvoice && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {paymentInvoice.number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <PaymentForm
              invoice={paymentInvoice}
              onSubmit={(data) => paymentMutation.mutate(data)}
              isPending={paymentMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
