import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PenTool, CalendarCheck, CheckCircle, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SignatureCanvas } from "../components/SignatureCanvas";
import { DocumentSignatureViewer } from "../components/DocumentSignatureViewer";
import { formatDate, PERIOD_LABELS } from "../helpers";
import type { Enrollment, Session, AttendanceSheet, AttendanceRecord } from "@shared/schema";

export default function LearnerSignatureTab({
  traineeId,
  enrollments: myEnrollments,
  sessions,
}: {
  traineeId: string;
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { toast } = useToast();
  const [signingSheetId, setSigningSheetId] = useState<string | null>(null);

  // Fetch attendance sheets for the learner's sessions
  const sessionIds = useMemo(
    () => myEnrollments.map((e) => e.sessionId),
    [myEnrollments],
  );

  const { data: allSheets } = useQuery<AttendanceSheet[]>({
    queryKey: ["/api/attendance-sheets"],
  });

  const { data: allRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance-records"],
  });

  const { data: signatures } = useQuery<Array<{ id: string; signerId: string; documentType: string; relatedId: string | null; signedAt: string | null }>>({
    queryKey: [`/api/signatures?signerId=${traineeId}`],
    enabled: !!traineeId,
  });

  const mySheets = useMemo(() => {
    if (!allSheets) return [];
    return allSheets
      .filter((s) => sessionIds.includes(s.sessionId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSheets, sessionIds]);

  const myRecords = useMemo(() => {
    if (!allRecords) return [];
    const sheetIds = new Set(mySheets.map((s) => s.id));
    return allRecords.filter(
      (r) => r.traineeId === traineeId && sheetIds.has(r.sheetId),
    );
  }, [allRecords, mySheets, traineeId]);

  const signedSheetIds = useMemo(() => {
    const signed = new Set<string>();
    myRecords.forEach((r) => {
      if (r.signedAt) signed.add(r.sheetId);
    });
    signatures?.forEach((s) => {
      if (s.documentType === "emargement" && s.relatedId) {
        signed.add(s.relatedId);
      }
    });
    return signed;
  }, [myRecords, signatures]);

  // Also update the attendance record to "present" when signing
  const signAttendanceMutation = useMutation({
    mutationFn: async ({ sheetId, signatureData }: { sheetId: string; signatureData: string }) => {
      const record = myRecords.find((r) => r.sheetId === sheetId);
      if (record) {
        await apiRequest("PATCH", `/api/attendance-records/${record.id}`, {
          status: "present",
          signedAt: new Date().toISOString(),
        });
      }
      await apiRequest("POST", "/api/signatures", {
        signerId: traineeId,
        signerType: "trainee",
        documentType: "emargement",
        relatedId: sheetId,
        signatureData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-records"] });
      toast({ title: "Émargement signé avec succès" });
      setSigningSheetId(null);
    },
    onError: () =>
      toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  // --- Pending document signatures ---
  const { data: pendingDocs } = useQuery<Array<{ id: string; title: string; type: string; content: string }>>({
    queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`],
    enabled: !!traineeId,
  });

  const [viewingDoc, setViewingDoc] = useState<{ id: string; title: string; type: string; content: string } | null>(null);
  const [showBatchSign, setShowBatchSign] = useState(false);

  const signDocumentMutation = useMutation({
    mutationFn: (data: { documentId: string; signatureData: string }) =>
      apiRequest("POST", `/api/pending-signatures/${data.documentId}/sign`, {
        signerId: traineeId,
        signerType: "trainee",
        signatureData: data.signatureData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`] });
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      toast({ title: "Document signé et retourné à l'administrateur" });
      setViewingDoc(null);
    },
    onError: () => toast({ title: "Erreur lors de la signature", variant: "destructive" }),
  });

  const batchSignMutation = useMutation({
    mutationFn: (data: { documentIds: string[]; signatureData: string }) =>
      apiRequest("POST", "/api/pending-signatures/batch-sign", {
        documentIds: data.documentIds,
        signerId: traineeId,
        signerType: "trainee",
        signatureData: data.signatureData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`] });
      queryClient.invalidateQueries({ queryKey: [`/api/signatures?signerId=${traineeId}`] });
      toast({ title: "Tous les documents ont été signés et retournés" });
      setShowBatchSign(false);
    },
    onError: () => toast({ title: "Erreur lors de la signature en lot", variant: "destructive" }),
  });

  const pendingSheets = mySheets.filter((s) => !signedSheetIds.has(s.id));
  const completedSheets = mySheets.filter((s) => signedSheetIds.has(s.id));

  return (
    <>
      <div className="space-y-4">
        {/* Pending document signatures */}
        {pendingDocs && pendingDocs.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-blue-600" />
                  Documents à signer ({pendingDocs.length})
                </CardTitle>
                {pendingDocs.length > 1 && !showBatchSign && (
                  <Button size="sm" variant="outline" onClick={() => setShowBatchSign(true)}>
                    Tout signer
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showBatchSign && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                  <p className="text-sm font-medium">Signer les {pendingDocs.length} documents en une fois</p>
                  <SignatureCanvas
                    onSign={(sig: string) =>
                      batchSignMutation.mutate({
                        documentIds: pendingDocs.map((d) => d.id),
                        signatureData: sig,
                      })
                    }
                    isPending={batchSignMutation.isPending}
                    label="Signez ci-dessous pour valider tous les documents en attente. Ils seront automatiquement retournés à l'administrateur."
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowBatchSign(false)}>
                    Annuler
                  </Button>
                </div>
              )}
              {!showBatchSign &&
                pendingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setViewingDoc(doc)}
                      className="gap-2 shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                      Consulter et signer
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Pending attendance signatures */}
        {pendingSheets.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                Émargements à signer ({pendingSheets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSheets.map((sheet) => {
                const session = sessions.find((s) => s.id === sheet.sessionId);
                const isSigning = signingSheetId === sheet.id;
                return (
                  <div key={sheet.id} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{session?.title || "Session"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sheet.date)} — {PERIOD_LABELS[sheet.period] || sheet.period}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isSigning ? "secondary" : "default"}
                        onClick={() => setSigningSheetId(isSigning ? null : sheet.id)}
                      >
                        <PenTool className="w-4 h-4 mr-2" />
                        {isSigning ? "Annuler" : "Signer"}
                      </Button>
                    </div>
                    {isSigning && (
                      <div className="px-3 pb-3 border-t border-amber-200 dark:border-amber-800 pt-3">
                        <SignatureCanvas
                          onSign={(sig: string) => signAttendanceMutation.mutate({ sheetId: sheet.id, signatureData: sig })}
                          isPending={signAttendanceMutation.isPending}
                          label="Signez ci-dessous pour confirmer votre présence."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Completed attendance signatures */}
        {completedSheets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Émargements signés ({completedSheets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedSheets.map((sheet) => {
                  const session = sessions.find((s) => s.id === sheet.sessionId);
                  return (
                    <div key={sheet.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{session?.title || "Session"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sheet.date)} — {PERIOD_LABELS[sheet.period] || sheet.period}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Signé
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No pending items message */}
        {(!pendingDocs || pendingDocs.length === 0) && pendingSheets.length === 0 && completedSheets.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Aucune signature en attente</h3>
            <p className="text-sm text-muted-foreground">
              Vous n'avez aucun document ou émargement à signer pour le moment.
            </p>
          </div>
        )}
      </div>

      {/* Full-screen document viewer with signature */}
      {viewingDoc &&
        createPortal(
          <DocumentSignatureViewer
            title={viewingDoc.title}
            type={viewingDoc.type}
            content={viewingDoc.content}
            onSign={(sig) => signDocumentMutation.mutate({ documentId: viewingDoc.id, signatureData: sig })}
            onClose={() => setViewingDoc(null)}
            isPending={signDocumentMutation.isPending}
          />,
          document.body
        )}
    </>
  );
}
