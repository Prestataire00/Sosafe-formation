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
  CalendarClock,
  Landmark,
  Link2,
  Ban,
  Percent,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
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
import type { Invoice, InsertInvoice, Enterprise, Session, PaymentSchedule, BankTransaction } from "@shared/schema";
import { INVOICE_STATUSES, PAYMENT_METHODS, INVOICE_TYPES, PAYMENT_SCHEDULE_STATUSES, RECONCILIATION_STATUSES } from "@shared/schema";

// ============================================================
// Types
// ============================================================

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
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
  const labels: Record<string, string> = {};
  INVOICE_STATUSES.forEach((s) => {
    labels[s.value] = s.label;
  });
  return (
    <StatusBadge status={status} label={labels[status] || status} />
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
// Line Items Editor (with discounts)
// ============================================================

function LineItemsEditor({
  lineItems,
  onChange,
  globalDiscountPercent,
  globalDiscountAmount,
  onGlobalDiscountChange,
}: {
  lineItems: LineItem[];
  onChange: (items: LineItem[]) => void;
  globalDiscountPercent: number;
  globalDiscountAmount: number;
  onGlobalDiscountChange: (percent: number, amount: number) => void;
}) {
  const addItem = () => {
    onChange([...lineItems, { description: "", quantity: 1, unitPrice: 0, discountPercent: 0, discountAmount: 0, total: 0 }]);
  };

  const calcItemTotal = (qty: number, price: number, discPct: number, discAmt: number): number => {
    const lineTotal = qty * price;
    const percentDiscount = Math.round(lineTotal * (discPct / 100));
    return Math.max(0, lineTotal - percentDiscount - discAmt);
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    const item = { ...updated[index] };

    if (field === "description") {
      item.description = value as string;
    } else if (field === "quantity") {
      item.quantity = typeof value === "string" ? parseInt(value) || 0 : value;
    } else if (field === "unitPrice") {
      item.unitPrice = typeof value === "string" ? eurosToCentimes(value) : value;
    } else if (field === "discountPercent") {
      item.discountPercent = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else if (field === "discountAmount") {
      item.discountAmount = typeof value === "string" ? eurosToCentimes(value) : value;
    }

    item.total = calcItemTotal(item.quantity, item.unitPrice, item.discountPercent || 0, item.discountAmount || 0);
    updated[index] = item;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const subtotalBeforeGlobal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const globalPercentDisc = Math.round(subtotalBeforeGlobal * (globalDiscountPercent / 100));
  const subtotal = Math.max(0, subtotalBeforeGlobal - globalPercentDisc - globalDiscountAmount);
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
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Quantite</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    data-testid={`input-line-qty-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prix unit. (EUR)</Label>
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
                  <Label className="text-xs text-muted-foreground">Remise %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={item.discountPercent || 0}
                    onChange={(e) => updateItem(index, "discountPercent", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remise (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={centimesToEuros(item.discountAmount || 0)}
                    onChange={(e) => updateItem(index, "discountAmount", e.target.value)}
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
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total lignes</span>
            <span>{formatEuros(subtotalBeforeGlobal)}</span>
          </div>

          <div className="bg-muted/30 rounded-md p-3 space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Remise commerciale globale
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Remise %</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={globalDiscountPercent}
                  onChange={(e) => onGlobalDiscountChange(parseFloat(e.target.value) || 0, globalDiscountAmount)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Remise fixe (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={centimesToEuros(globalDiscountAmount)}
                  onChange={(e) => onGlobalDiscountChange(globalDiscountPercent, eurosToCentimes(e.target.value))}
                />
              </div>
            </div>
            {(globalPercentDisc > 0 || globalDiscountAmount > 0) && (
              <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                <span>Remise totale</span>
                <span>-{formatEuros(globalPercentDisc + globalDiscountAmount)}</span>
              </div>
            )}
          </div>

          <div className="space-y-1 text-sm">
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
  const [invoiceType, setInvoiceType] = useState(invoice?.invoiceType || "standard");
  const [enterpriseId, setEnterpriseId] = useState(invoice?.enterpriseId || "");
  const [sessionId, setSessionId] = useState(invoice?.sessionId || "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate || "");
  const [status, setStatus] = useState(invoice?.status || "draft");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (invoice?.lineItems as LineItem[]) || []
  );
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(
    (invoice?.globalDiscountPercent || 0) / 100
  );
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState(
    invoice?.globalDiscountAmount || 0
  );
  const isEdit = !!invoice;

  const { data: nextNumber } = useQuery<{ number: string }>({
    queryKey: ["/api/invoices/next-number"],
    enabled: !isEdit,
  });

  if (!isEdit && nextNumber?.number && !number) {
    setNumber(nextNumber.number);
  }

  const subtotalBeforeGlobal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const globalPercentDisc = Math.round(subtotalBeforeGlobal * (globalDiscountPercent / 100));
  const subtotal = Math.max(0, subtotalBeforeGlobal - globalPercentDisc - globalDiscountAmount);
  const taxRate = 2000;
  const taxAmount = Math.round(subtotal * 0.2);
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      number,
      title,
      invoiceType,
      quoteId: invoice?.quoteId || null,
      enterpriseId: enterpriseId || null,
      sessionId: sessionId || null,
      lineItems,
      subtotal,
      globalDiscountPercent: Math.round(globalDiscountPercent * 100),
      globalDiscountAmount,
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
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice-number">Numero de facture</Label>
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
          <Label>Type de facture</Label>
          <Select value={invoiceType} onValueChange={setInvoiceType}>
            <SelectTrigger data-testid="select-invoice-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <SelectValue placeholder="Selectionner" />
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
              <SelectValue placeholder="Selectionner" />
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
        <Label htmlFor="invoice-due-date">Date d'echeance</Label>
        <Input
          id="invoice-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          data-testid="input-invoice-due-date"
        />
      </div>

      <LineItemsEditor
        lineItems={lineItems}
        onChange={setLineItems}
        globalDiscountPercent={globalDiscountPercent}
        globalDiscountAmount={globalDiscountAmount}
        onGlobalDiscountChange={(pct, amt) => {
          setGlobalDiscountPercent(pct);
          setGlobalDiscountAmount(amt);
        }}
      />

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
          {isPending ? "Enregistrement..." : isEdit ? "Modifier" : "Creer"}
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
          <span className="text-muted-foreground">Deja paye</span>
          <span className="font-medium">{formatEuros(invoice.paidAmount)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="font-medium">Reste a payer</span>
          <span className="font-semibold text-primary">{formatEuros(remaining)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-amount">Montant du paiement (EUR)</Label>
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
        <Label htmlFor="payment-reference">Reference</Label>
        <Input
          id="payment-reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Numero de cheque, virement..."
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
// Payment Schedule Form
// ============================================================

function PaymentScheduleForm({
  invoice,
  existingSchedules,
  onSubmit,
  isPending,
}: {
  invoice: Invoice;
  existingSchedules: PaymentSchedule[];
  onSubmit: (data: { invoiceId: string; installments: Array<{ amount: number; dueDate: string; notes?: string }> }) => void;
  isPending: boolean;
}) {
  const [numInstallments, setNumInstallments] = useState(
    existingSchedules.length > 0 ? existingSchedules.length : 3
  );
  const [installments, setInstallments] = useState<Array<{ amount: string; dueDate: string; notes: string }>>(
    existingSchedules.length > 0
      ? existingSchedules.map((s) => ({
          amount: centimesToEuros(s.amount),
          dueDate: s.dueDate || "",
          notes: s.notes || "",
        }))
      : generateEqualInstallments(invoice.total, 3)
  );

  function generateEqualInstallments(total: number, count: number) {
    const perInstallment = Math.floor(total / count);
    const remainder = total - perInstallment * count;
    const today = new Date();
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i + 1);
      return {
        amount: centimesToEuros(i === count - 1 ? perInstallment + remainder : perInstallment),
        dueDate: date.toISOString().split("T")[0],
        notes: "",
      };
    });
  }

  const handleNumChange = (val: string) => {
    const n = Math.max(2, Math.min(12, parseInt(val) || 2));
    setNumInstallments(n);
    setInstallments(generateEqualInstallments(invoice.total, n));
  };

  const updateInstallment = (index: number, field: string, value: string) => {
    const updated = [...installments];
    updated[index] = { ...updated[index], [field]: value };
    setInstallments(updated);
  };

  const totalScheduled = installments.reduce((sum, i) => sum + eurosToCentimes(i.amount), 0);
  const difference = invoice.total - totalScheduled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      invoiceId: invoice.id,
      installments: installments.map((i) => ({
        amount: eurosToCentimes(i.amount),
        dueDate: i.dueDate,
        notes: i.notes || undefined,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total facture</span>
          <span className="font-semibold">{formatEuros(invoice.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Deja paye</span>
          <span>{formatEuros(invoice.paidAmount)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nombre d'echeances</Label>
        <Input
          type="number"
          min="2"
          max="12"
          value={numInstallments}
          onChange={(e) => handleNumChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {installments.map((inst, index) => (
          <div key={index} className="border rounded-md p-3 space-y-2">
            <div className="text-sm font-medium">Echeance {index + 1}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Montant (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inst.amount}
                  onChange={(e) => updateInstallment(index, "amount", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date d'echeance</Label>
                <Input
                  type="date"
                  value={inst.dueDate}
                  onChange={(e) => updateInstallment(index, "dueDate", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`text-sm flex justify-between ${Math.abs(difference) > 1 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
        <span>Total echeances : {formatEuros(totalScheduled)}</span>
        {Math.abs(difference) > 1 && <span>Difference : {formatEuros(difference)}</span>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending || Math.abs(difference) > 1}>
          {isPending ? "Enregistrement..." : "Enregistrer l'echeancier"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Payment Schedules Tab
// ============================================================

function PaymentSchedulesTab({ invoices, enterprises }: { invoices: Invoice[]; enterprises: Enterprise[] }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const { toast } = useToast();

  const invoicesWithSchedules = invoices.filter(
    (inv) => inv.status !== "cancelled" && inv.status !== "paid"
  );

  const { data: schedules, isLoading } = useQuery<PaymentSchedule[]>({
    queryKey: ["/api/payment-schedules", selectedInvoiceId],
    queryFn: () => apiRequest("GET", `/api/payment-schedules?invoiceId=${selectedInvoiceId}`).then(r => r as unknown as PaymentSchedule[]),
    enabled: !!selectedInvoiceId,
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      apiRequest("POST", `/api/payment-schedules/${id}/mark-paid`, { method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      toast({ title: "Echeance marquee comme payee" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md space-y-2">
          <Label>Selectionner une facture</Label>
          <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une facture..." />
            </SelectTrigger>
            <SelectContent>
              {invoicesWithSchedules.map((inv) => {
                const ent = enterprises.find((e) => e.id === inv.enterpriseId);
                return (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.number} - {inv.title} {ent ? `(${ent.name})` : ""} - {formatEuros(inv.total)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedInvoiceId && selectedInvoice && (
        <>
          <div className="bg-muted/50 rounded-md p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{selectedInvoice.number} - {selectedInvoice.title}</p>
              <p className="text-sm text-muted-foreground">
                Total : {formatEuros(selectedInvoice.total)} | Paye : {formatEuros(selectedInvoice.paidAmount)} | Reste : {formatEuros(selectedInvoice.total - selectedInvoice.paidAmount)}
              </p>
            </div>
            <InvoiceStatusBadge status={selectedInvoice.status} />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !schedules || schedules.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Aucun echeancier pour cette facture"
              description="Creez un echeancier depuis le menu de la facture"
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Echeance</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Paye le</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => {
                      const statusInfo = PAYMENT_SCHEDULE_STATUSES.find((s) => s.value === schedule.status);
                      const isOverdue = schedule.status === "pending" && schedule.dueDate && new Date(schedule.dueDate) < new Date();
                      return (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {schedule.installmentNumber}/{schedule.totalInstallments}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatEuros(schedule.amount)}
                          </TableCell>
                          <TableCell>
                            <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                              {schedule.dueDate ? new Date(schedule.dueDate).toLocaleDateString("fr-FR") : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <StatusBadge status="overdue" label="En retard" />
                            ) : (
                              <StatusBadge status={schedule.status} label={statusInfo?.label || schedule.status} />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {schedule.paidAt ? new Date(schedule.paidAt).toLocaleDateString("fr-FR") : "-"}
                          </TableCell>
                          <TableCell>
                            {schedule.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markPaidMutation.mutate({ id: schedule.id, method: "virement" })}
                                disabled={markPaidMutation.isPending}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paye
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Bank Reconciliation Tab
// ============================================================

function BankReconciliationTab({ invoices, enterprises }: { invoices: Invoice[]; enterprises: Enterprise[] }) {
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | undefined>();
  const [matchInvoiceId, setMatchInvoiceId] = useState("");
  const { toast } = useToast();

  const { data: transactions, isLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/bank-transactions"],
  });

  const matchMutation = useMutation({
    mutationFn: ({ txId, invoiceId }: { txId: string; invoiceId: string }) =>
      apiRequest("POST", `/api/bank-transactions/${txId}/match`, { invoiceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      setMatchDialogOpen(false);
      setSelectedTx(undefined);
      toast({ title: "Transaction rapprochee avec succes" });
    },
    onError: () => toast({ title: "Erreur lors du rapprochement", variant: "destructive" }),
  });

  const ignoreMutation = useMutation({
    mutationFn: (txId: string) =>
      apiRequest("PATCH", `/api/bank-transactions/${txId}`, { reconciliationStatus: "ignored" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      toast({ title: "Transaction ignoree" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/bank-transactions/sync-ponto", {
        transactions: [
          {
            externalId: `PONTO-${Date.now()}`,
            accountId: "FR76-DEMO",
            amount: -(Math.floor(Math.random() * 500000) + 10000),
            description: `Virement SEPA - Client ${Math.floor(Math.random() * 1000)}`,
            counterpartName: "Entreprise Demo",
            executionDate: new Date().toISOString().split("T")[0],
            valueDate: new Date().toISOString().split("T")[0],
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      toast({ title: "Synchronisation Ponto effectuee" });
    },
    onError: () => toast({ title: "Erreur de synchronisation", variant: "destructive" }),
  });

  const unmatchedInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "cancelled"
  );

  const unmatchedCount = transactions?.filter((t) => t.reconciliationStatus === "unmatched").length || 0;
  const matchedCount = transactions?.filter((t) => t.reconciliationStatus === "matched").length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge status="draft" label={`${unmatchedCount} non rapproche${unmatchedCount > 1 ? "s" : ""}`} />
            <StatusBadge status="paid" label={`${matchedCount} rapproche${matchedCount > 1 ? "s" : ""}`} />
          </div>
        </div>
        <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} variant="outline">
          <Landmark className="w-4 h-4 mr-2" />
          {syncMutation.isPending ? "Synchronisation..." : "Sync MyPonto"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Aucune transaction bancaire"
          description="Synchronisez avec MyPonto pour importer les transactions"
          action={
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <Landmark className="w-4 h-4 mr-2" />
              Synchroniser MyPonto
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Contrepartie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Facture liee</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const statusInfo = RECONCILIATION_STATUSES.find((s) => s.value === tx.reconciliationStatus);
                  const matchedInvoice = tx.matchedInvoiceId ? invoices.find((i) => i.id === tx.matchedInvoiceId) : null;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {tx.executionDate ? new Date(tx.executionDate).toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.counterpartName || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={tx.amount >= 0 ? "text-green-600 dark:text-green-400" : ""}>
                          {formatEuros(Math.abs(tx.amount))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo?.color || ""}>
                          {statusInfo?.label || tx.reconciliationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {matchedInvoice ? (
                          <span className="font-mono text-xs">{matchedInvoice.number}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {tx.reconciliationStatus === "unmatched" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedTx(tx);
                                setMatchInvoiceId("");
                                setMatchDialogOpen(true);
                              }}>
                                <Link2 className="w-4 h-4 mr-2" />
                                Rapprocher avec facture
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => ignoreMutation.mutate(tx.id)}>
                                <Ban className="w-4 h-4 mr-2" />
                                Ignorer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={(open) => { setMatchDialogOpen(open); if (!open) setSelectedTx(undefined); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rapprocher la transaction</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold">{formatEuros(Math.abs(selectedTx.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contrepartie</span>
                  <span>{selectedTx.counterpartName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="text-right max-w-[200px] truncate">{selectedTx.description || "-"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Facture a rapprocher</Label>
                <Select value={matchInvoiceId} onValueChange={setMatchInvoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner une facture..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unmatchedInvoices.map((inv) => {
                      const ent = enterprises.find((e) => e.id === inv.enterpriseId);
                      const remaining = inv.total - inv.paidAmount;
                      return (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.number} - {ent?.name || inv.title} - Reste: {formatEuros(remaining)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>Annuler</Button>
                <Button
                  onClick={() => {
                    if (selectedTx && matchInvoiceId) {
                      matchMutation.mutate({ txId: selectedTx.id, invoiceId: matchInvoiceId });
                    }
                  }}
                  disabled={!matchInvoiceId || matchMutation.isPending}
                >
                  {matchMutation.isPending ? "Rapprochement..." : "Rapprocher"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleInvoice, setScheduleInvoice] = useState<Invoice | undefined>();
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

  const { data: scheduleForDialog } = useQuery<PaymentSchedule[]>({
    queryKey: ["/api/payment-schedules", scheduleInvoice?.id],
    queryFn: () => apiRequest("GET", `/api/payment-schedules?invoiceId=${scheduleInvoice?.id}`).then(r => r as unknown as PaymentSchedule[]),
    enabled: !!scheduleInvoice?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InsertInvoice) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/next-number"] });
      setDialogOpen(false);
      toast({ title: "Facture creee avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la creation", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertInvoice }) =>
      apiRequest("PATCH", `/api/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      setDialogOpen(false);
      setEditInvoice(undefined);
      toast({ title: "Facture modifiee avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la modification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      toast({ title: "Facture supprimee" });
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
      toast({ title: "Paiement enregistre avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de l'enregistrement du paiement", variant: "destructive" }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: { invoiceId: string; installments: Array<{ amount: number; dueDate: string; notes?: string }> }) =>
      apiRequest("POST", "/api/payment-schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-schedules"] });
      setScheduleDialogOpen(false);
      setScheduleInvoice(undefined);
      toast({ title: "Echeancier enregistre avec succes" });
    },
    onError: () => toast({ title: "Erreur lors de la creation de l'echeancier", variant: "destructive" }),
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

  const invoiceTypeLabel = (type: string) => {
    const found = INVOICE_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader
        title="Factures"
        subtitle="Gérez vos factures et paiements"
        actions={
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
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total facture"
          value={formatEuros(stats?.totalAmount || 0)}
          icon={Euro}
          subtitle={`${stats?.totalCount || 0} facture${(stats?.totalCount || 0) > 1 ? "s" : ""}`}
          loading={loadingStats}
          testId="stat-total"
        />
        <StatCard
          title="Paye"
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

      {/* Tabs: Factures / Echeanciers / Rapprochement */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices" className="gap-1">
            <FileText className="w-4 h-4" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-1">
            <CalendarClock className="w-4 h-4" />
            Echeanciers
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1">
            <Landmark className="w-4 h-4" />
            Rapprochement bancaire
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
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
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher une facture..."
            className="max-w-sm"
          />

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune facture"
              description={
                search || statusFilter !== "all"
                  ? "Aucun resultat pour vos filtres"
                  : "Creez votre premiere facture"
              }
              action={
                !search && statusFilter === "all" ? (
                  <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-invoice">
                    <Plus className="w-4 h-4 mr-2" />
                    Creer une facture
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paye</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Echeance</TableHead>
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
                            <Badge variant="outline" className="text-xs">
                              {invoiceTypeLabel(invoice.invoiceType)}
                            </Badge>
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
                                {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setScheduleInvoice(invoice);
                                      setScheduleDialogOpen(true);
                                    }}
                                  >
                                    <CalendarClock className="w-4 h-4 mr-2" />
                                    Echeancier
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
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <PaymentSchedulesTab invoices={invoices || []} enterprises={enterprises || []} />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-4">
          <BankReconciliationTab invoices={invoices || []} enterprises={enterprises || []} />
        </TabsContent>
      </Tabs>

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

      {/* Payment Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setScheduleInvoice(undefined);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Echeancier de paiement
              {scheduleInvoice && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {scheduleInvoice.number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {scheduleInvoice && (
            <PaymentScheduleForm
              invoice={scheduleInvoice}
              existingSchedules={scheduleForDialog || []}
              onSubmit={(data) => scheduleMutation.mutate(data)}
              isPending={scheduleMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
