import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Database, Archive, FileUp, CheckCircle, XCircle, AlertTriangle,
  Clock, Download, Shield, Calendar, RefreshCw, FileJson, Info,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/shared/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";

// ============================================================
// Migration Tab (Import Digiforma)
// ============================================================

const ENTITY_TYPES = [
  { value: "trainee", label: "Apprenants", fields: "firstName, lastName, email, phone, company, civility, rppsNumber, profession, address, city, postalCode" },
  { value: "trainer", label: "Formateurs", fields: "firstName, lastName, email, phone, specialty, bio" },
  { value: "program", label: "Formations", fields: "title, description, duration, price, level, objectives, prerequisites, modality" },
  { value: "enterprise", label: "Entreprises", fields: "name, siret, address, city, postalCode, contactName, contactEmail, contactPhone" },
];

function MigrationTab() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entityType, setEntityType] = useState("none");
  const [jsonData, setJsonData] = useState("");
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const { data: imports = [] } = useQuery<any[]>({
    queryKey: ["/api/data-imports"],
  });

  const importMutation = useMutation({
    mutationFn: async (data: { entityType: string; data: any[] }) => {
      const res = await fetch("/api/data-imports/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source: "digiforma" }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      setShowResultDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/data-imports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enterprises"] });
      toast({ title: "Import terminé", description: `${result.imported} enregistrements importés` });
    },
    onError: () => {
      toast({ title: "Erreur d'import", variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (file.name.endsWith(".json")) {
        setJsonData(text);
        tryParse(text);
      } else if (file.name.endsWith(".csv")) {
        // Parse CSV to JSON
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          setParseError("Le fichier CSV doit contenir au moins un en-tête et une ligne de données");
          return;
        }
        const separator = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ""));
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => { obj[h] = values[idx] || ""; });
          rows.push(obj);
        }
        const jsonStr = JSON.stringify(rows, null, 2);
        setJsonData(jsonStr);
        setParsedData(rows);
        setParseError("");
      }
    };
    reader.readAsText(file);
  };

  const tryParse = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setParseError("Le JSON doit être un tableau d'objets");
        setParsedData(null);
        return;
      }
      setParsedData(parsed);
      setParseError("");
    } catch {
      setParseError("JSON invalide");
      setParsedData(null);
    }
  };

  const selectedEntity = ENTITY_TYPES.find((e) => e.value === entityType);

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import de données Digiforma
          </CardTitle>
          <CardDescription>
            Importez vos données existantes depuis Digiforma au format CSV ou JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 text-blue-500" />
              <div className="text-sm">
                <p className="font-medium">Instructions</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1 mt-1">
                  <li>Exportez vos données depuis Digiforma (CSV ou JSON)</li>
                  <li>Sélectionnez le type d'entité à importer</li>
                  <li>Chargez le fichier ou collez les données JSON</li>
                  <li>Vérifiez l'aperçu puis lancez l'import</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type de données</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Sélectionner...</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEntity && (
                <p className="text-xs text-muted-foreground mt-1">
                  Champs : {selectedEntity.fields}
                </p>
              )}
            </div>

            <div>
              <Label>Fichier CSV ou JSON</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Données JSON (ou collez directement)</Label>
            <Textarea
              placeholder='[{"firstName": "Jean", "lastName": "Dupont", "email": "jean@example.com"}, ...]'
              value={jsonData}
              onChange={(e) => { setJsonData(e.target.value); tryParse(e.target.value); }}
              rows={6}
              className="font-mono text-xs"
            />
            {parseError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {parseError}
              </p>
            )}
          </div>

          {parsedData && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{parsedData.length} enregistrement(s) détecté(s)</span>
              </div>
              {parsedData.length > 0 && (
                <div className="bg-muted rounded-lg p-3 overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-2">Aperçu (3 premiers) :</p>
                  <pre className="text-xs">{JSON.stringify(parsedData.slice(0, 3), null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => importMutation.mutate({ entityType, data: parsedData! })}
            disabled={!parsedData || parsedData.length === 0 || entityType === "none" || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Import en cours...</>
            ) : (
              <><FileUp className="w-4 h-4 mr-2" /> Lancer l'import</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des imports</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Aucun import réalisé</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Importés</TableHead>
                  <TableHead>Ignorés</TableHead>
                  <TableHead>Erreurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp: any) => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(imp.createdAt).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{imp.source}</Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{imp.entityType}</TableCell>
                    <TableCell className="text-sm text-green-600">{imp.importedRows}/{imp.totalRows}</TableCell>
                    <TableCell className="text-sm text-amber-600">{imp.skippedRows}</TableCell>
                    <TableCell className="text-sm text-red-600">{imp.errorRows}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[imp.status] || ""}>
                        {imp.status === "completed" ? "Terminé" : imp.status === "failed" ? "Échoué" : imp.status === "processing" ? "En cours" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{imp.importedByName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Result dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résultat de l'import</DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-xs text-muted-foreground">Importés</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 mx-auto text-amber-500 mb-1" />
                  <p className="text-lg font-bold text-amber-600">{importResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Ignorés (doublons)</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="w-6 h-6 mx-auto text-red-500 mb-1" />
                  <p className="text-lg font-bold text-red-600">{importResult.errors}</p>
                  <p className="text-xs text-muted-foreground">Erreurs</p>
                </div>
              </div>

              {importResult.errorDetails?.length > 0 && (
                <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium mb-2">Détail des erreurs :</p>
                  {importResult.errorDetails.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-600">
                      Ligne {e.row} - {e.field} : {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Archive Tab (Conservation historique 10+ ans)
// ============================================================

function ArchiveTab() {
  const { toast } = useToast();

  const { data: archives = [] } = useQuery<any[]>({
    queryKey: ["/api/data-archives"],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/data-archives/stats"],
  });

  const autoArchiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/data-archives/auto-archive", { method: "POST" });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-archives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/data-archives/stats"] });
      toast({ title: "Archivage terminé", description: `${data.archived} session(s) archivée(s)` });
    },
  });

  const archiveStatusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    deleted: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total archivés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.active || 0}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">10+</p>
              <p className="text-xs text-muted-foreground">Années de conservation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.expired || 0}</p>
              <p className="text-xs text-muted-foreground">Expirés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Conservation de l'historique
              </CardTitle>
              <CardDescription>
                Garantit la conservation et l'accès à l'historique des formations sur plus de 10 ans.
              </CardDescription>
            </div>
            <Button onClick={() => autoArchiveMutation.mutate()} disabled={autoArchiveMutation.isPending}>
              {autoArchiveMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archivage automatique
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 text-blue-500" />
              <div className="text-sm text-muted-foreground">
                <p>L'archivage automatique conserve les sessions terminées depuis plus de 6 mois avec une rétention de <strong>10 ans</strong>.</p>
                <p className="mt-1">Les données archivées restent accessibles dans les espaces clients (portail apprenant, portail entreprise).</p>
              </div>
            </div>
          </div>

          {stats?.byType && Object.keys(stats.byType).length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Répartition par type</p>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-sm">
                    {type} : {String(count)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {archives.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée archivée. Cliquez sur "Archivage automatique" pour commencer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date d'archivage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Conservation</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((a: any) => {
                  const isExpired = new Date(a.expiresAt) < new Date();
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{a.entityType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-64 truncate">{a.entityLabel}</TableCell>
                      <TableCell className="text-sm">{a.retentionYears} ans</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(a.expiresAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge className={archiveStatusColors[isExpired ? "expired" : a.status] || ""}>
                          {isExpired ? "Expiré" : a.status === "active" ? "Actif" : a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.archivedByName}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function DataMigration() {
  return (
    <PageLayout>
      <PageHeader
        title="Migration & Archivage"
        subtitle="Importez, exportez et archivez vos données"
      />

      <Tabs defaultValue="migration">
        <TabsList>
          <TabsTrigger value="migration" className="gap-2">
            <Upload className="w-4 h-4" />
            Migration Digiforma
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-2">
            <Archive className="w-4 h-4" />
            Conservation historique
          </TabsTrigger>
        </TabsList>
        <TabsContent value="migration"><MigrationTab /></TabsContent>
        <TabsContent value="archive"><ArchiveTab /></TabsContent>
      </Tabs>
    </PageLayout>
  );
}
