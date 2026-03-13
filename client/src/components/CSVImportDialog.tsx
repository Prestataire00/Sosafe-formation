import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "trainees" | "trainers" | "programs" | "sessions" | "enterprises";
  entityLabel: string;
  queryKey: string;
  requiredFields: string[];
  exampleColumns: { header: string; example: string }[];
}

interface PreviewData {
  headers: string[];
  columnMapping: { csvColumn: string; mappedTo: string | null }[];
  preview: Record<string, any>[];
  totalRows: number;
}

interface ImportResult {
  imported: number;
  total: number;
  errors: string[];
}

export function CSVImportDialog({
  open,
  onOpenChange,
  entityType,
  entityLabel,
  queryKey,
  requiredFields,
  exampleColumns,
}: CSVImportDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append("file", f);
      formData.append("entityType", entityType);
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json() as Promise<PreviewData>;
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep("preview");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append("file", f);
      formData.append("entityType", entityType);
      const res = await fetch("/api/import/execute", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (data.imported > 0) {
        toast({ title: `${data.imported} ${entityLabel} importé(s) avec succès` });
      }
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      previewMutation.mutate(f);
    }
  };

  const handleImport = () => {
    if (file) importMutation.mutate(file);
  };

  const handleClose = () => {
    setFile(null);
    setStep("upload");
    setPreview(null);
    setResult(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const headers = exampleColumns.map((c) => c.header).join(";");
    const example = exampleColumns.map((c) => c.example).join(";");
    const csv = `${headers}\n${example}`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modele_import_${entityType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des {entityLabel}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importez vos {entityLabel} depuis un fichier CSV (séparateur virgule ou point-virgule).
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Champs requis : <strong>{requiredFields.join(", ")}</strong></span>
            </div>

            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger le modèle CSV
            </Button>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {previewMutation.isPending ? (
                <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {file ? file.name : "Cliquez pour sélectionner un fichier CSV"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Format CSV, max 5 Mo
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <strong>{preview.totalRows}</strong> ligne(s) détectée(s)
              </p>
              <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setFile(null); setPreview(null); }}>
                Changer de fichier
              </Button>
            </div>

            {/* Column mapping */}
            <div>
              <p className="text-sm font-medium mb-2">Mapping des colonnes</p>
              <div className="flex flex-wrap gap-2">
                {preview.columnMapping.map((col) => (
                  <Badge
                    key={col.csvColumn}
                    variant={col.mappedTo ? "default" : "outline"}
                    className={col.mappedTo ? "bg-emerald-600" : "text-muted-foreground"}
                  >
                    {col.csvColumn} {col.mappedTo ? `→ ${col.mappedTo}` : "(ignoré)"}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div>
              <p className="text-sm font-medium mb-2">Aperçu (5 premières lignes)</p>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.columnMapping.filter(c => c.mappedTo).map((col) => (
                        <TableHead key={col.mappedTo!} className="text-xs whitespace-nowrap">{col.mappedTo}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map((row, i) => (
                      <TableRow key={i}>
                        {preview.columnMapping.filter(c => c.mappedTo).map((col) => (
                          <TableCell key={col.mappedTo!} className="text-xs">{row[col.mappedTo!] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importer {preview.totalRows} ligne(s)
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {result.imported} / {result.total} importé(s) avec succès
                </p>
                {result.errors.length > 0 && (
                  <p className="text-sm text-muted-foreground">{result.errors.length} erreur(s)</p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-red-600">Erreurs :</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Fermer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
