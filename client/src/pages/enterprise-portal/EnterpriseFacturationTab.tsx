import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Invoice, Quote } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Euro,
  Receipt,
  CreditCard,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  quoteStatusLabel,
  quoteStatusColor,
  invoiceStatusLabel,
  invoiceStatusColor,
  paymentMethodLabel,
} from "./helpers";

interface EnterprisePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
  notes: string | null;
  invoiceNumber: string;
  invoiceTitle: string;
}

interface EnterpriseFacturationTabProps {
  enterpriseId: string;
  invoices: Invoice[];
  quotes: Quote[];
}

export default function EnterpriseFacturationTab({
  enterpriseId,
  invoices,
  quotes,
}: EnterpriseFacturationTabProps) {
  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<
    EnterprisePayment[]
  >({
    queryKey: [`/api/enterprises/${enterpriseId}/payments`],
    enabled: !!enterpriseId,
  });

  // Financial summary computations
  const financialSummary = useMemo(() => {
    const totalFacture = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    const totalPaye = invoices.reduce((sum, inv) => sum + (inv.paidAmount ?? 0), 0);

    const enAttente = invoices
      .filter((inv) => inv.status !== "cancelled")
      .reduce((sum, inv) => sum + ((inv.total ?? 0) - (inv.paidAmount ?? 0)), 0);

    const overdueInvoices = invoices.filter((inv) => inv.status === "overdue");
    const overdueCount = overdueInvoices.length;
    const overdueTotal = overdueInvoices.reduce(
      (sum, inv) => sum + ((inv.total ?? 0) - (inv.paidAmount ?? 0)),
      0
    );

    return { totalFacture, totalPaye, enAttente, overdueCount, overdueTotal };
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total facture
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalFacture)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Euro className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total paye
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(financialSummary.totalPaye)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  En attente
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(financialSummary.enAttente)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Factures en retard
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {financialSummary.overdueCount > 0
                    ? `${financialSummary.overdueCount} (${formatCurrency(financialSummary.overdueTotal)})`
                    : "0"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Devis
            <Badge variant="secondary" className="ml-1">
              {quotes.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Aucun devis pour cette entreprise</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Validite</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono text-sm">
                        {quote.number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {quote.title}
                      </TableCell>
                      <TableCell>
                        {quote.createdAt
                          ? formatDate(String(quote.createdAt))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {quote.validUntil
                          ? formatDate(String(quote.validUntil))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={quoteStatusColor[quote.status] || ""}
                        >
                          {quoteStatusLabel[quote.status] || quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(quote.subtotal ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(quote.taxAmount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(quote.total ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factures Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Factures
            <Badge variant="secondary" className="ml-1">
              {invoices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Aucune facture pour cette entreprise</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Echeance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paye</TableHead>
                    <TableHead className="text-right">Reste a payer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const remaining =
                      (invoice.total ?? 0) - (invoice.paidAmount ?? 0);
                    const isOverdue = invoice.status === "overdue";

                    return (
                      <TableRow
                        key={invoice.id}
                        className={
                          isOverdue ? "border-l-4 border-l-red-500" : ""
                        }
                      >
                        <TableCell className="font-mono text-sm">
                          {invoice.number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.title}
                        </TableCell>
                        <TableCell>
                          {invoice.createdAt
                            ? formatDate(String(invoice.createdAt))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate
                            ? formatDate(String(invoice.dueDate))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              invoiceStatusColor[invoice.status] || ""
                            }
                          >
                            {invoiceStatusLabel[invoice.status] ||
                              invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.total ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {formatCurrency(invoice.paidAmount ?? 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            remaining > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {formatCurrency(remaining)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historique des paiements
            {!paymentsLoading && (
              <Badge variant="secondary" className="ml-1">
                {payments.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Aucun paiement enregistre</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Methode</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.paidAt
                          ? formatDate(String(payment.paidAt))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-mono text-sm">
                            {payment.invoiceNumber}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {payment.invoiceTitle}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {paymentMethodLabel[payment.method] || payment.method}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {payment.reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
