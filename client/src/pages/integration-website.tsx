import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe, Key, Layout, Link2, Copy, Trash2, MoreHorizontal, Plus,
  Eye, EyeOff, Shield, Clock, ExternalLink, Code, Users,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";

// ============================================================
// SSO Tab
// ============================================================

function SsoTab() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("none");
  const [generatedUrl, setGeneratedUrl] = useState("");

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const generateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/sso/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.url}`;
      setGeneratedUrl(fullUrl);
      toast({ title: "Lien SSO generé", description: "Le lien est valable 5 minutes." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de générer le token SSO", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié", description: "Lien copié dans le presse-papier" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Connexion unifiée (SSO)
          </CardTitle>
          <CardDescription>
            Permettez aux utilisateurs de se connecter au LMS directement depuis so-safe.fr via un lien sécurisé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Comment fonctionne le SSO ?</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Vous générez un lien de connexion unique pour un utilisateur</li>
              <li>Le lien est valable <strong>5 minutes</strong> et utilisable <strong>une seule fois</strong></li>
              <li>L'utilisateur clique sur le lien depuis so-safe.fr</li>
              <li>Il est automatiquement connecté au LMS et redirigé vers son tableau de bord</li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <h4 className="font-medium text-sm">Intégration technique</h4>
            <Badge variant="outline">API</Badge>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <code className="text-xs block whitespace-pre-wrap">
{`POST /api/sso/generate-token
Headers: { "Content-Type": "application/json" }
Body: { "userId": "<user_id>" }

Réponse: {
  "token": "abc123...",
  "expiresAt": "2024-01-01T00:05:00Z",
  "url": "/api/auth/sso?token=abc123..."
}`}
            </code>
          </div>

          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Générer un lien SSO
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer un lien SSO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Utilisateur</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Sélectionner...</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {generatedUrl && (
              <div className="space-y-2">
                <Label>Lien de connexion (valable 5 min)</Label>
                <div className="flex gap-2">
                  <Input value={generatedUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedUrl)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setGeneratedUrl(""); setSelectedUserId("none"); }}>
              Fermer
            </Button>
            <Button
              onClick={() => generateMutation.mutate(selectedUserId)}
              disabled={selectedUserId === "none" || generateMutation.isPending}
            >
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// API Keys Tab
// ============================================================

function ApiKeysTab() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const { data: apiKeys = [] } = useQuery<any[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions: ["catalog:read"] }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "Clé API créée", description: "Copiez la clé maintenant, elle ne sera plus visible." });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "Clé supprimée" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié" });
  };

  const maskKey = (key: string) => key.substring(0, 7) + "..." + key.substring(key.length - 4);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Clés API
              </CardTitle>
              <CardDescription>
                Gérez les clés d'accès à l'API catalogue pour l'intégration sur votre site web.
              </CardDescription>
            </div>
            <Button onClick={() => { setShowDialog(true); setCreatedKey(""); setNewKeyName(""); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle clé
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Aucune clé API. Créez-en une pour commencer l'intégration.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Clé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((k: any) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {showKeys[k.id] ? k.key : maskKey(k.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowKeys((p) => ({ ...p, [k.id]: !p[k.id] }))}
                        >
                          {showKeys[k.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(k.key)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={k.active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: k.id, active: checked })}
                        />
                        <Badge variant={k.active ? "default" : "secondary"}>
                          {k.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("fr-FR") : "Jamais"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(k.id)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle clé API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom de la clé</Label>
              <Input
                placeholder="Ex: Site so-safe.fr"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>

            {createdKey && (
              <div className="space-y-2">
                <Label className="text-amber-600">Clé API (copiez-la maintenant !)</Label>
                <div className="flex gap-2">
                  <Input value={createdKey} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdKey)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-amber-600">
                  Cette clé ne sera plus visible après fermeture de cette fenêtre.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {createdKey ? "Fermer" : "Annuler"}
            </Button>
            {!createdKey && (
              <Button
                onClick={() => createMutation.mutate(newKeyName)}
                disabled={!newKeyName.trim() || createMutation.isPending}
              >
                Créer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Widget Tab
// ============================================================

function WidgetTab() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: "",
    apiKeyId: "none",
    allowedOrigins: "",
    primaryColor: "#2563eb",
    borderRadius: "8px",
    displayMode: "grid",
    showFilters: true,
    maxItems: 10,
  });

  const { data: widgetConfigs = [] } = useQuery<any[]>({
    queryKey: ["/api/widget-configurations"],
  });

  const { data: apiKeys = [] } = useQuery<any[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/widget-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widget-configurations"] });
      setShowDialog(false);
      toast({ title: "Configuration créée" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/widget-configurations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widget-configurations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/widget-configurations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widget-configurations"] });
      toast({ title: "Configuration supprimée" });
    },
  });

  const handleCreate = () => {
    const apiKeyObj = apiKeys.find((k: any) => k.id === configForm.apiKeyId);
    if (!apiKeyObj) return;

    createMutation.mutate({
      name: configForm.name,
      apiKeyId: configForm.apiKeyId,
      allowedOrigins: configForm.allowedOrigins.split(",").map((o: string) => o.trim()).filter(Boolean),
      theme: {
        primaryColor: configForm.primaryColor,
        fontFamily: "system-ui",
        borderRadius: configForm.borderRadius,
      },
      displayMode: configForm.displayMode,
      showFilters: configForm.showFilters,
      maxItems: configForm.maxItems,
    });
  };

  const getEmbedCode = (config: any) => {
    const apiKeyObj = apiKeys.find((k: any) => k.id === config.apiKeyId);
    const apiKeyStr = apiKeyObj?.key || "VOTRE_CLE_API";
    return `<!-- Widget SO'SAFE - Catalogue formations -->
<div id="sosafe-catalog"></div>
<script src="${window.location.origin}/widget/sosafe-catalog.js"
        data-api-key="${apiKeyStr}"
        data-widget-id="${config.id}"></script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Code copié" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Widget catalogue
              </CardTitle>
              <CardDescription>
                Intégrez le catalogue de formations sur votre site web sans créer de nouvelles pages (SEO préservé).
              </CardDescription>
            </div>
            <Button onClick={() => {
              setShowDialog(true);
              setConfigForm({ name: "", apiKeyId: "none", allowedOrigins: "", primaryColor: "#2563eb", borderRadius: "8px", displayMode: "grid", showFilters: true, maxItems: 10 });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {widgetConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Aucune configuration widget. Créez-en une pour intégrer le catalogue sur votre site.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {widgetConfigs.map((config: any) => {
                const apiKeyObj = apiKeys.find((k: any) => k.id === config.apiKeyId);
                return (
                  <Card key={config.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{config.name}</h4>
                            <Badge variant={config.active ? "default" : "secondary"}>
                              {config.active ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Clé API : {apiKeyObj?.name || "Inconnue"}</p>
                            <p>Mode : {config.displayMode === "grid" ? "Grille" : config.displayMode === "list" ? "Liste" : "Calendrier"}</p>
                            <p>Origines : {config.allowedOrigins?.join(", ") || "Toutes"}</p>
                            {config.theme && (
                              <div className="flex items-center gap-2">
                                <span>Couleur :</span>
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: config.theme.primaryColor }}
                                />
                                <span className="text-xs">{config.theme.primaryColor}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: config.id, active: checked })}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => copyToClipboard(getEmbedCode(config))}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copier le code
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMutation.mutate(config.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground mb-1 block">Code d'intégration</Label>
                        <div className="relative">
                          <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
                            <code>{getEmbedCode(config)}</code>
                          </pre>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(getEmbedCode(config))}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copier
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle configuration widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom</Label>
              <Input
                placeholder="Ex: Widget so-safe.fr"
                value={configForm.name}
                onChange={(e) => setConfigForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Clé API associée</Label>
              <Select
                value={configForm.apiKeyId}
                onValueChange={(v) => setConfigForm((p) => ({ ...p, apiKeyId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une clé API" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Sélectionner...</SelectItem>
                  {apiKeys.filter((k: any) => k.active).map((k: any) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Origines autorisées (domaines séparés par des virgules)</Label>
              <Input
                placeholder="https://so-safe.fr, https://www.so-safe.fr"
                value={configForm.allowedOrigins}
                onChange={(e) => setConfigForm((p) => ({ ...p, allowedOrigins: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Domaines depuis lesquels le widget peut être chargé.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Couleur primaire</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={configForm.primaryColor}
                    onChange={(e) => setConfigForm((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={configForm.primaryColor}
                    onChange={(e) => setConfigForm((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label>Border radius</Label>
                <Select
                  value={configForm.borderRadius}
                  onValueChange={(v) => setConfigForm((p) => ({ ...p, borderRadius: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0px">Carré (0px)</SelectItem>
                    <SelectItem value="4px">Léger (4px)</SelectItem>
                    <SelectItem value="8px">Moyen (8px)</SelectItem>
                    <SelectItem value="12px">Arrondi (12px)</SelectItem>
                    <SelectItem value="16px">Très arrondi (16px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mode d'affichage</Label>
                <Select
                  value={configForm.displayMode}
                  onValueChange={(v) => setConfigForm((p) => ({ ...p, displayMode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grille</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                    <SelectItem value="calendar">Calendrier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nombre max de formations</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={configForm.maxItems}
                  onChange={(e) => setConfigForm((p) => ({ ...p, maxItems: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={configForm.showFilters}
                onCheckedChange={(checked) => setConfigForm((p) => ({ ...p, showFilters: checked }))}
              />
              <Label>Afficher les filtres par catégorie</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={!configForm.name.trim() || configForm.apiKeyId === "none" || createMutation.isPending}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function IntegrationWebsite() {
  return (
    <PageLayout>
      <PageHeader
        title="Ma marque"
        subtitle="Personnalisez et intégrez votre catalogue sur votre site web"
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">SSO</p>
              <p className="text-xs text-muted-foreground">Connexion unifiée</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">API Catalogue</p>
              <p className="text-xs text-muted-foreground">Données temps réel</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Widget</p>
              <p className="text-xs text-muted-foreground">SEO optimisé</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sso">
        <TabsList>
          <TabsTrigger value="sso" className="gap-2">
            <Link2 className="w-4 h-4" />
            Connexion SSO
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="w-4 h-4" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-2">
            <Layout className="w-4 h-4" />
            Widget catalogue
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sso"><SsoTab /></TabsContent>
        <TabsContent value="api-keys"><ApiKeysTab /></TabsContent>
        <TabsContent value="widget"><WidgetTab /></TabsContent>
      </Tabs>
    </PageLayout>
  );
}
