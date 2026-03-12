import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, AlertTriangle, Clock } from "lucide-react";
import {
  formatDate,
  RecyclingStatusBadge,
  type EnterpriseCertification,
} from "./helpers";

interface RecyclageTabProps {
  certifications: EnterpriseCertification[] | undefined;
  recyclingAlerts: { expired: number; critical: number; warning: number; total: number };
}

export default function EnterpriseRecyclageTab({
  certifications,
  recyclingAlerts,
}: RecyclageTabProps) {
  if (!certifications || certifications.length === 0) {
    return (
      <div className="text-center py-16">
        <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucune certification</h3>
        <p className="text-sm text-muted-foreground">
          Aucune certification n'est enregistree pour vos employes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className={recyclingAlerts.expired > 0 ? "border-red-300 dark:border-red-700" : ""}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className={`w-4 h-4 ${recyclingAlerts.expired > 0 ? "text-red-500" : "text-muted-foreground/40"}`} />
            <div>
              <p className="text-lg font-bold">{recyclingAlerts.expired}</p>
              <p className="text-xs text-muted-foreground">Certifications expirees</p>
            </div>
          </CardContent>
        </Card>
        <Card className={recyclingAlerts.critical > 0 ? "border-orange-300 dark:border-orange-700" : ""}>
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className={`w-4 h-4 ${recyclingAlerts.critical > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
            <div>
              <p className="text-lg font-bold">{recyclingAlerts.critical}</p>
              <p className="text-xs text-muted-foreground">Expirent sous 3 mois</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className={`w-4 h-4 ${recyclingAlerts.warning > 0 ? "text-amber-500" : "text-muted-foreground/40"}`} />
            <div>
              <p className="text-lg font-bold">{recyclingAlerts.warning}</p>
              <p className="text-xs text-muted-foreground">Expirent sous 6 mois</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certifications table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Suivi des certifications et recyclages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employe</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Obtenue le</TableHead>
                <TableHead>Echeance</TableHead>
                <TableHead>Statut recyclage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certifications
                .filter((c) => c.computedExpiresAt)
                .sort((a, b) => {
                  // Sort: expired first, then by expiry date ascending
                  const da = a.computedExpiresAt ? new Date(a.computedExpiresAt).getTime() : Infinity;
                  const db = b.computedExpiresAt ? new Date(b.computedExpiresAt).getTime() : Infinity;
                  return da - db;
                })
                .map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">
                      {cert.traineeFirstName} {cert.traineeLastName}
                    </TableCell>
                    <TableCell>{cert.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cert.programTitle || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(cert.obtainedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cert.computedExpiresAt ? formatDate(cert.computedExpiresAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <RecyclingStatusBadge expiresAt={cert.computedExpiresAt} />
                    </TableCell>
                  </TableRow>
                ))}
              {certifications.filter((c) => !c.computedExpiresAt).length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 text-xs font-medium text-muted-foreground py-2">
                      Certifications sans echeance de recyclage
                    </TableCell>
                  </TableRow>
                  {certifications
                    .filter((c) => !c.computedExpiresAt)
                    .map((cert) => (
                      <TableRow key={cert.id} className="opacity-60">
                        <TableCell className="font-medium">
                          {cert.traineeFirstName} {cert.traineeLastName}
                        </TableCell>
                        <TableCell>{cert.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cert.programTitle || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(cert.obtainedAt)}
                        </TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Non soumis
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
