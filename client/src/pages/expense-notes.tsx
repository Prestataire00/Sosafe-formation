import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Receipt,
  Eye,
  CheckCircle,
  XCircle,
  Banknote,
  Plus,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@shared/schema";
import type { Trainer } from "@shared/schema";

type ExpenseNote = {
  id: string;
  trainerId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  fileUrl: string | null;
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

export default function ExpenseNotes() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("deplacement");
  const [customCategory, setCustomCategory] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";
  const trainerId = user?.trainerId;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-muted-foreground">Veuillez vous connecter.</p>
      </div>
    );
  }

  const { data: allNotes, isLoading } = useQuery<ExpenseNote[]>({
    queryKey: isAdmin ? ["/api/expense-notes"] : [`/api/trainers/${trainerId}/expense-notes`],
    enabled: isAdmin || !!trainerId,
  });

  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/expense-notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-notes"] });
      if (trainerId) queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/expense-notes`] });
      toast({ title: "Statut mis à jour" });
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const handleCreate = async () => {
    if (!title || !amount || !date || !trainerId) return;
    setIsSubmitting(true);
    try {
      let fileUrl = null;
      if (file) {
        const uploaded = await uploadFile(file);
        fileUrl = uploaded.fileUrl;
      }
      await apiRequest("POST", `/api/trainers/${trainerId}/expense-notes`, {
        title,
        amount: Math.round(parseFloat(amount) * 100),
        category: category === "autre" && customCategory ? customCategory : category,
        date,
        notes: notes || null,
        fileUrl,
        status: "submitted",
        reviewedBy: null,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/expense-notes`] });
      toast({ title: "Note de frais créée" });
      setTitle(""); setAmount(""); setCategory("deplacement"); setCustomCategory(""); setDate(""); setNotes(""); setFile(null);
      setShowCreateDialog(false);
    } catch {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const trainerMap: Record<string, string> = {};
  trainers?.forEach((t) => { trainerMap[t.id] = `${t.firstName} ${t.lastName}`; });

  const getCategoryLabel = (cat: string) => {
    const found = EXPENSE_CATEGORIES.find((c) => c.value === cat);
    return found ? found.label : cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const getStatusInfo = (status: string) =>
    EXPENSE_STATUSES.find((s) => s.value === status) || { label: status, color: "" };

  const filtered = (allNotes || []).filter((n) => {
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    if (search) {
      const trainerName = trainerMap[n.trainerId] || "";
      const q = search.toLowerCase();
      if (
        !n.title.toLowerCase().includes(q) &&
        !trainerName.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, n) => sum + n.amount, 0);
  const pendingCount = (allNotes || []).filter((n) => n.status === "submitted").length;

  return (
    <PageLayout>
      <PageHeader
        title="Notes de frais"
        subtitle="Gestion des notes de frais et remboursements"
        actions={
          !isAdmin && trainerId ? (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle note de frais
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{(totalAmount / 100).toFixed(2)} EUR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Notes</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">En attente de validation</div>
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
            {EXPENSE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aucune note de frais"
          description={search || statusFilter !== "all" ? "Aucun résultat pour vos filtres" : "Aucune note de frais pour le moment"}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Formateur</TableHead>}
                  <TableHead>Titre</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Pièce jointe</TableHead>
                  {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((note) => {
                  const statusInfo = getStatusInfo(note.status);
                  return (
                    <TableRow key={note.id}>
                      {isAdmin && (
                        <TableCell className="font-medium">
                          {trainerMap[note.trainerId] || "—"}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{note.title}</TableCell>
                      <TableCell>{(note.amount / 100).toFixed(2)} EUR</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(note.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {note.date ? new Date(note.date).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {note.fileUrl ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={note.fileUrl} target="_blank" rel="noopener noreferrer">
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
                              {EXPENSE_STATUSES.filter((s) => s.value !== note.status).map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  onClick={() => updateMutation.mutate({
                                    id: note.id,
                                    data: {
                                      status: s.value,
                                      ...(s.value === "approved" || s.value === "rejected" ? { reviewedBy: user?.id } : {}),
                                      ...(s.value === "submitted" ? { reviewedBy: null } : {}),
                                    },
                                  })}
                                >
                                  {s.value === "approved" && <CheckCircle className="w-4 h-4 mr-2 text-green-600" />}
                                  {s.value === "rejected" && <XCircle className="w-4 h-4 mr-2 text-red-600" />}
                                  {s.value === "paid" && <Banknote className="w-4 h-4 mr-2 text-indigo-600" />}
                                  {s.value === "submitted" && <Receipt className="w-4 h-4 mr-2" />}
                                  {s.label}
                                </DropdownMenuItem>
                              ))}
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
            <DialogTitle>Nouvelle note de frais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Déplacement Paris-Lyon" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant (EUR)</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); if (v !== "autre") setCustomCategory(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {category === "autre" && (
              <div className="space-y-2">
                <Label>Préciser la catégorie</Label>
                <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Ex: Fournitures, Impression..." required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Détails supplémentaires..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Pièce jointe (optionnel)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleCreate} disabled={!title || !amount || !date || (category === "autre" && !customCategory) || isSubmitting} className="w-full">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création en cours...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Créer la note de frais</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
