import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadFile } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FileText, FileCheck, FolderOpen, Upload, Eye, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreviewDialog } from "../components/DocumentPreviewDialog";
import { formatDate, DOC_TYPE_LABELS } from "../helpers";
import type { UserDocument } from "../helpers";
import type { Enrollment, Session, GeneratedDocument } from "@shared/schema";

export default function LearnerDocumentsTab({
  traineeId,
  enrollments: myEnrollments,
  sessions,
}: {
  traineeId: string;
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [previewGenDoc, setPreviewGenDoc] = useState<GeneratedDocument | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("autre");
  const [uploadFile_, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Personal documents
  const { data: documents, isLoading: docsLoading } = useQuery<UserDocument[]>({
    queryKey: [`/api/user-documents?ownerId=${traineeId}&ownerType=trainee`],
    enabled: !!traineeId,
  });

  // Training documents (generated documents linked to the trainee or their sessions)
  const { data: generatedDocs, isLoading: genDocsLoading } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/generated-documents"],
  });

  const sessionIds = useMemo(
    () => new Set(myEnrollments.map((e) => e.sessionId)),
    [myEnrollments],
  );

  const trainingDocuments = useMemo(() => {
    if (!generatedDocs) return [];
    return generatedDocs.filter(
      (d) =>
        d.traineeId === traineeId ||
        (d.sessionId && sessionIds.has(d.sessionId)),
    );
  }, [generatedDocs, traineeId, sessionIds]);

  const handleUpload = async () => {
    if (!uploadFile_ || !uploadTitle) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(uploadFile_);
      await apiRequest("POST", "/api/user-documents", {
        ownerId: traineeId,
        ownerType: "trainee",
        title: uploadTitle,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        category: uploadCategory,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-documents?ownerId=${traineeId}&ownerType=trainee`] });
      toast({ title: "Document déposé avec succès" });
      setUploadTitle("");
      setUploadCategory("autre");
      setUploadFile(null);
      setShowUploadDialog(false);
    } catch {
      toast({ title: "Erreur lors du dépôt", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = docsLoading || genDocsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Training documents (generated) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Documents de formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucun document de formation disponible pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {trainingDocuments.map((doc) => {
                  const session = sessions.find((s) => s.id === doc.sessionId);
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOC_TYPE_LABELS[doc.type] || doc.type}
                            {session ? ` — ${session.title}` : ""}
                            {doc.createdAt ? ` — ${formatDate(String(doc.createdAt))}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewGenDoc(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal documents + upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mes documents personnels
              </CardTitle>
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Déposer un document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucun document personnel déposé pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category || "Document"} {doc.uploadedAt ? `— ${formatDate(doc.uploadedAt)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.fileUrl && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déposer un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre du document</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Ex: Justificatif d'identité" />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="identite">Identité</SelectItem>
                  <SelectItem value="administratif">Administratif</SelectItem>
                  <SelectItem value="attestation">Attestation</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleUpload} disabled={!uploadFile_ || !uploadTitle || isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Déposer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Personal document preview */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open: boolean) => { if (!open) setPreviewDoc(null); }}
        fileUrl={previewDoc?.fileUrl || null}
        fileName={previewDoc?.fileName || null}
        mimeType={previewDoc?.mimeType || null}
      />

      {/* Generated document preview (rendered HTML) */}
      <Dialog open={!!previewGenDoc} onOpenChange={(open) => { if (!open) setPreviewGenDoc(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle>{previewGenDoc?.title || "Document"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 p-6">
            <div className="max-w-[850px] mx-auto bg-white dark:bg-gray-950 shadow-lg rounded-sm border">
              <div
                className="document-render"
                dangerouslySetInnerHTML={{ __html: previewGenDoc?.content || "" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
