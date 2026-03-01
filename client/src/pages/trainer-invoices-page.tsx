import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Eye,
  CheckCircle,
  XCircle,
  Banknote,
  ClipboardCheck,
  Plus,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TRAINER_INVOICE_STATUSES } from "@shared/schema";
import type { Trainer } from "@shared/schema";

type TrainerInvoice = {
  id: string;
  trainerId: string;
  number: string;
  title: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalTtc: number;
  fileUrl: string | null;
  status: string;
  submittedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  reviewedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  return res.json() as Promise<{ fileUrl: string }>;
}

export default function TrainerInvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [amountHt, setAmountHt] = useState("");
  const [taxRate, setTaxRate] = useState("20");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";
  const trainerId = user?.trainerId;

  const { data: allInvoices, isLoading } = useQuery<TrainerInvoice[]>({
    queryKey: isAdmin ? ["/api/trainer-invoices"] : [`/api/trainers/${trainerId}/invoices`],
    enabled: isAdmin || !!trainerId,
  });

  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/trainer-invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-invoices"] });
      if (trainerId) queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/invoices`] });
      toast({ title: "Statut mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const computedTax = useMemo(() => {
    const ht = Math.round(parseFloat(amountHt || "0") * 100);
    const rate = parseInt(taxRate || "20", 10);
    const taxAmount = Math.round(ht * rate / 100);
    const totalTtc = ht + taxAmount;
    return { ht, rate: rate * 100, taxAmount, totalTtc };
  }, [amountHt, taxRate]);

  const handleCreate = async () => {
    if (!title || !number || !amountHt || !file || !trainerId) return;
    setIsSubmitting(true);
    try {
      const uploaded = await uploadFile(file);
      await apiRequest("POST", `/api/trainers/${trainerId}/invoices`, {
        number,
        title,
        amount: computedTax.ht,
        taxRate: computedTax.rate,
        taxAmount: computedTax.taxAmount,
        totalTtc: computedTax.totalTtc,
        fileUrl: uploaded.fileUrl,
        status: "submitted",
        paidAt: null,
        notes: notes || null,
        reviewedBy: null,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/invoices`] });
      toast({ title: "Facture soumise" });
      setTitle(""); setNumber(""); setAmountHt(""); setTaxRate("20"); setNotes(""); setFile(null);
      setShowCreateDialog(false);
    } catch {
      toast({ title: "Erreur lors de la soumission", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const trainerMap: Record<string, string> = {};
  trainers?.forEach((t) => { trainerMap[t.id] = `${t.firstName} ${t.lastName}`; });

  const getStatusInfo = (status: string) =>
    TRAINER_INVOICE_STATUSES.find((s) => s.value === status) || { label: status, color: "" };

  const filtered = (allInvoices || []).filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (search) {
      const trainerName = trainerMap[inv.trainerId] || "";
      const q = search.toLowerCase();
      if (
        !inv.title.toLowerCase().includes(q) &&
        !inv.number.toLowerCase().includes(q) &&
        !trainerName.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalTtc = filtered.reduce((sum, inv) => sum + inv.totalTtc, 0);
  const pendingCount = (allInvoices || []).filter((inv) => inv.status === "submitted" || inv.status === "under_review").length;

  return (
    <PageLayout>
      <PageHeader
        title="Factures formateur"
        subtitle="Gestion des factures des formateurs"
        actions={
          !isAdmin && trainerId ? (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total TTC</div>
            <div className="text-2xl font-bold">{(totalTtc / 100).toFixed(2)} EUR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Factures</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">En attente de traitement</div>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {TRAINER_INVOICE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucune facture"
          description={search || statusFilter !== "all" ? "Aucun résultat pour vos filtres" : "Aucune facture pour le moment"}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Formateur</TableHead>}
                  <TableHead>Référence</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead className="text-right">HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">TTC</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>PDF</TableHead>
                  {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status);
                  return (
                    <TableRow key={inv.id}>
                      {isAdmin && (
                        <TableCell className="font-medium">{trainerMap[inv.trainerId] || "—"}</TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                      <TableCell className="font-medium">{inv.title}</TableCell>
                      <TableCell className="text-right">{(inv.amount / 100).toFixed(2)} EUR</TableCell>
                      <TableCell className="text-right">{(inv.taxAmount / 100).toFixed(2)} EUR</TableCell>
                      <TableCell className="text-right font-medium">{(inv.totalTtc / 100).toFixed(2)} EUR</TableCell>
                      <TableCell className="text-sm">
                        {inv.submittedAt ? new Date(inv.submittedAt).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {inv.fileUrl ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {inv.status === "submitted" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "under_review", reviewedBy: user?.id } })}>
                                  <ClipboardCheck className="w-4 h-4 mr-2 text-amber-600" />Passer en examen
                                </DropdownMenuItem>
                              )}
                              {(inv.status === "submitted" || inv.status === "under_review") && (
                                <>
                                  <DropdownMenuItem onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "approved", reviewedBy: user?.id } })}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />Approuver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "rejected", reviewedBy: user?.id } })}>
                                    <XCircle className="w-4 h-4 mr-2 text-red-600" />Rejeter
                                  </DropdownMenuItem>
                                </>
                              )}
                              {inv.status === "approved" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "paid", paidAt: new Date().toISOString() } })}>
                                  <Banknote className="w-4 h-4 mr-2 text-indigo-600" />Marquer payée
                                </DropdownMenuItem>
                              )}
                              {inv.status === "rejected" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "submitted", reviewedBy: null } })}>
                                  <CreditCard className="w-4 h-4 mr-2" />Remettre en attente
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog création (formateur) */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soumettre une facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° de référence</Label>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="FAC-2026-001" />
              </div>
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prestation session AFGSU" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant HT (EUR)</Label>
                <Input type="number" step="0.01" min="0" value={amountHt} onChange={(e) => setAmountHt(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Taux TVA (%)</Label>
                <Select value={taxRate} onValueChange={setTaxRate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5.5">5.5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {amountHt && parseFloat(amountHt) > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between"><span>Montant HT</span><span>{(computedTax.ht / 100).toFixed(2)} EUR</span></div>
                <div className="flex justify-between"><span>TVA ({taxRate}%)</span><span>{(computedTax.taxAmount / 100).toFixed(2)} EUR</span></div>
                <div className="flex justify-between font-medium border-t pt-1"><span>Total TTC</span><span>{(computedTax.totalTtc / 100).toFixed(2)} EUR</span></div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Détails supplémentaires..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Fichier PDF (obligatoire)</Label>
              <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleCreate} disabled={!title || !number || !amountHt || !file || isSubmitting} className="w-full">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Soumettre la facture</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
