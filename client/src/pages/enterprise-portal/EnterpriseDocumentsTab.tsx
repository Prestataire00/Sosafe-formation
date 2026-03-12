import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Eye, Download, Upload, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import {
  formatDate,
  DocumentTypeBadge,
  UploadDocumentDialog,
  type UserDocument,
} from "./helpers";
import type { Session, GeneratedDocument } from "@shared/schema";
import { DOCUMENT_STATUSES, ENTERPRISE_DOCUMENT_CATEGORIES } from "@shared/schema";

interface DocumentsTabProps {
  enterpriseId: string;
  generatedDocs: GeneratedDocument[] | undefined;
  documents: UserDocument[] | undefined;
  documentsLoading: boolean;
  sessionMap: Map<string, Session>;
  onPreview: (doc: { fileUrl: string | null; fileName: string | null; mimeType: string | null; htmlContent?: string | null }) => void;
  onUpload: () => void;
  onDelete: (id: string) => void;
}

export default function EnterpriseDocumentsTab({
  enterpriseId,
  generatedDocs,
  documents,
  documentsLoading,
  sessionMap,
  onPreview,
  onUpload,
  onDelete,
}: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      {/* GED - Documents generes (Conventions, Attestations, etc.) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Gestion documentaire
              {generatedDocs && generatedDocs.length > 0 && (
                <Badge variant="secondary" className="ml-2">{generatedDocs.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!generatedDocs || generatedDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun document disponible. Les conventions seront generees automatiquement apres la signature des devis.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedDocs.map((doc) => {
                  const session = doc.sessionId ? sessionMap.get(doc.sessionId) : undefined;
                  const statusInfo = DOCUMENT_STATUSES.find(s => s.value === doc.status);
                  const statusColor = doc.status === "signed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : doc.status === "shared" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : doc.status === "sent" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {doc.title}
                          {doc.quoteId && (
                            <Badge variant="outline" className="text-xs">Devis</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DocumentTypeBadge type={doc.type} />
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor}>
                          {doc.status === "signed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {statusInfo?.label || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {session?.title || "-"}
                      </TableCell>
                      <TableCell>
                        {doc.createdAt ? formatDate(doc.createdAt as unknown as string) : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreview({
                            fileUrl: null,
                            fileName: doc.title,
                            mimeType: null,
                            htmlContent: doc.content,
                          })}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documents deposes (with delete) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Documents deposes</CardTitle>
            <Button size="sm" onClick={onUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Deposer un document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun document depose pour le moment.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Nom du fichier</TableHead>
                  <TableHead>Date d'ajout</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const catLabel = ENTERPRISE_DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category || "Autre";
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{catLabel}</Badge>
                      </TableCell>
                      <TableCell>{doc.fileName || "-"}</TableCell>
                      <TableCell>
                        {doc.uploadedAt ? formatDate(doc.uploadedAt) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {doc.fileUrl && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onPreview({ fileUrl: doc.fileUrl, fileName: doc.fileName, mimeType: doc.mimeType })}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => onDelete(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
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
