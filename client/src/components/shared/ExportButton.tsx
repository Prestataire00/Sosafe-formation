import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps {
  data: Record<string, any>[];
  columns: { key: string; label: string }[];
  filename: string;
}

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function ExportButton({ data, columns, filename }: ExportButtonProps) {
  const handleExport = () => {
    const BOM = "\uFEFF";
    const header = columns.map((col) => escapeCsvValue(col.label)).join(";");
    const rows = data.map((item) =>
      columns.map((col) => escapeCsvValue(item[col.key])).join(";"),
    );
    const csv = BOM + [header, ...rows].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Exporter
    </Button>
  );
}
