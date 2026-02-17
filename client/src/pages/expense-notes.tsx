import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Search,
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("deplacement");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";
  const trainerId = user?.trainerId;

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
        category,
        date,
        notes: notes || null,
        fileUrl,
        status: "submitted",
        reviewedBy: null,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trainers/${trainerId}/expense-notes`] });
      toast({ title: "Note de frais créée" });
      setTitle(""); setAmount(""); setCategory("deplacement"); setDate(""); setNotes(""); setFile(null);
      setShowCreateDialog(false);
    } catch {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const trainerMap: Record<string, string> = {};
  trainers?.forEach((t) => { trainerMap[t.id] = `${t.firstName} ${t.lastName}`; });

  const getCategoryLabel = (cat: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat;

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notes de frais</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Gérez les notes de frais des formateurs" : "Gérez vos notes de frais"}
          </p>
        </div>
        {!isAdmin && trainerId && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle note de frais
          </Button>
        )}
      </div>

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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-medium mb-1">Aucune note de frais</h3>
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all" ? "Aucun résultat pour vos filtres" : "Aucune note de frais pour le moment"}
              </p>
            </div>
          </CardContent>
        </Card>
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
                        {new Date(note.date).toLocaleDateString("fr-FR")}
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
                              {note.status === "submitted" && (
                                <>
                                  <DropdownMenuItem onClick={() => updateMutation.mutate({ id: note.id, data: { status: "approved", reviewedBy: user?.id } })}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />Approuver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateMutation.mutate({ id: note.id, data: { status: "rejected", reviewedBy: user?.id } })}>
                                    <XCircle className="w-4 h-4 mr-2 text-red-600" />Rejeter
                                  </DropdownMenuItem>
                                </>
                              )}
                              {note.status === "approved" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: note.id, data: { status: "paid" } })}>
                                  <Banknote className="w-4 h-4 mr-2 text-indigo-600" />Marquer payée
                                </DropdownMenuItem>
                              )}
                              {note.status === "rejected" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: note.id, data: { status: "submitted", reviewedBy: null } })}>
                                  <Receipt className="w-4 h-4 mr-2" />Remettre en attente
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
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <Button onClick={handleCreate} disabled={!title || !amount || !date || isSubmitting} className="w-full">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création en cours...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Créer la note de frais</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
