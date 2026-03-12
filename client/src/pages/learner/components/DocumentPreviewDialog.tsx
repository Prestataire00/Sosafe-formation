import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download } from "lucide-react";

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  mimeType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
}) {
  if (!fileUrl) return null;
  const isPdf = mimeType === "application/pdf" || fileUrl.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{fileName || "Apercu du document"}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-[70vh] rounded-lg border" title={fileName || "PDF"} />
          ) : isImage ? (
            <div className="flex items-center justify-center">
              <img src={fileUrl} alt={fileName || "Image"} className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">L'apercu n'est pas disponible pour ce type de fichier.</p>
              <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Telecharger
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
