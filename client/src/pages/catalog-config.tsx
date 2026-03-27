import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BookOpen, Star, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical,
  ExternalLink, Search, Filter, Globe, LayoutGrid, Sparkles,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";

// ============================================================
// Programs Catalog Tab — publish/unpublish, featured, reorder
// ============================================================

function ProgramsCatalogTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");

  const { data: programs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/programs/${id}`, data);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Erreur de mise à jour");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const togglePublish = (prog: any) => {
    const newStatus = prog.status === "published" ? "draft" : "published";
    updateMutation.mutate({ id: prog.id, data: { status: newStatus } });
    toast({
      title: newStatus === "published" ? "Formation publiée" : "Formation retirée du catalogue",
    });
  };

  const toggleFeatured = (prog: any) => {
    updateMutation.mutate({ id: prog.id, data: { featured: !prog.featured } });
    toast({
      title: prog.featured ? "Retirée de la mise en avant" : "Mise en avant activée",
    });
  };

  const moveOrder = (prog: any, direction: "up" | "down") => {
    const newOrder = direction === "up"
      ? Math.max(0, (prog.featuredOrder || 0) - 1)
      : (prog.featuredOrder || 0) + 1;
    updateMutation.mutate({ id: prog.id, data: { featuredOrder: newOrder } });
  };

  const publishAll = () => {
    const drafts = programs.filter((p: any) => p.status !== "published");
    drafts.forEach((p: any) => {
      updateMutation.mutate({ id: p.id, data: { status: "published" } });
    });
    toast({ title: `${drafts.length} formations publiées` });
  };

  // Filter and sort
  const filtered = programs
    .filter((p: any) => {
      if (filterStatus === "published" && p.status !== "published") return false;
      if (filterStatus === "draft" && p.status === "published") return false;
      if (search) {
        const s = search.toLowerCase();
        return p.title?.toLowerCase().includes(s) || p.categories?.some((c: string) => c.toLowerCase().includes(s));
      }
      return true;
    })
    .sort((a: any, b: any) => {
      // Featured first, then by order, then by title
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.featured && b.featured) return (a.featuredOrder || 0) - (b.featuredOrder || 0);
      return (a.title || "").localeCompare(b.title || "");
    });

  const publishedCount = programs.filter((p: any) => p.status === "published").length;
  const featuredCount = programs.filter((p: any) => p.featured).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Publiées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{featuredCount}</p>
              <p className="text-xs text-muted-foreground">Mises en avant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{programs.length}</p>
              <p className="text-xs text-muted-foreground">Total formations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                Formations du catalogue
              </CardTitle>
              <CardDescription>
                Gérez les formations visibles sur le catalogue public (widget so-safe.fr)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={publishAll}>
                <Globe className="w-4 h-4 mr-2" />
                Tout publier
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/widget/sosafe-catalog.js" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le widget
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une formation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                Toutes ({programs.length})
              </Button>
              <Button
                variant={filterStatus === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("published")}
              >
                Publiées ({publishedCount})
              </Button>
              <Button
                variant={filterStatus === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("draft")}
              >
                Brouillons ({programs.length - publishedCount})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Prix HT</TableHead>
                  <TableHead className="text-center">Durée</TableHead>
                  <TableHead className="text-center">Publié</TableHead>
                  <TableHead className="text-center">Mise en avant</TableHead>
                  <TableHead className="text-center w-20">Ordre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((prog: any) => (
                  <TableRow key={prog.id} className={prog.status !== "published" ? "opacity-50" : ""}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{prog.title}</span>
                        {prog.featured && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {prog.categories?.map((c: string) => (
                        <Badge key={c} variant="outline" className="mr-1 text-xs">
                          {c}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {prog.price ? `${prog.price.toLocaleString("fr-FR")} €` : "-"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {prog.duration ? `${prog.duration}h` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={prog.status === "published"}
                        onCheckedChange={() => togglePublish(prog)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={prog.featured || false}
                        onCheckedChange={() => toggleFeatured(prog)}
                        disabled={prog.status !== "published"}
                      />
                    </TableCell>
                    <TableCell>
                      {prog.featured && (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveOrder(prog, "up")}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground w-4 text-center">
                            {(prog.featuredOrder || 0) + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveOrder(prog, "down")}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Preview Tab — live preview of the public catalog
// ============================================================

function PreviewTab() {
  const widgetUrl = `${window.location.origin}/widget/sosafe-catalog.js`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Apercu du catalogue public
          </CardTitle>
          <CardDescription>
            Visualisez le rendu du catalogue tel qu'il apparait sur so-safe.fr/nos-formations-2/
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-white dark:bg-zinc-950 overflow-hidden" style={{ minHeight: 600 }}>
            <iframe
              src={`/widget-preview`}
              className="w-full border-0"
              style={{ minHeight: 600 }}
              title="Apercu catalogue"
            />
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <p>URL du widget : <code className="bg-muted px-2 py-1 rounded text-xs">{widgetUrl}</code></p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://www.so-safe.fr/nos-formations-2/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir sur so-safe.fr
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function CatalogConfig() {
  return (
    <PageLayout>
      <PageHeader
        title="Catalogue de formations"
        subtitle="Configurez les formations visibles sur le catalogue public"
      />

      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Formations
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Apercu
          </TabsTrigger>
        </TabsList>
        <TabsContent value="programs"><ProgramsCatalogTab /></TabsContent>
        <TabsContent value="preview"><PreviewTab /></TabsContent>
      </Tabs>
    </PageLayout>
  );
}
