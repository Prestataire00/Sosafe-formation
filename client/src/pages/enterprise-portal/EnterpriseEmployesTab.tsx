import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Users, Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import {
  formatDate,
  EnrollmentStatusBadge,
  RecyclingStatusBadge,
  getRecyclingStatus,
  type EnterpriseCertification,
} from "./helpers";
import type { Enrollment, Session, Trainee, Program } from "@shared/schema";

interface EmployesTabProps {
  trainees: Trainee[] | undefined;
  traineesLoading: boolean;
  enrollments: Enrollment[] | undefined;
  certifications: EnterpriseCertification[] | undefined;
  employeeStats: Map<string, { count: number; lastDate: string | null; enrollments: Enrollment[] }>;
  expandedEmployee: string | null;
  onExpandEmployee: (id: string | null) => void;
  sessionMap: Map<string, Session>;
  programMap: Map<string, Program>;
}

export default function EnterpriseEmployesTab({
  trainees,
  traineesLoading,
  enrollments,
  certifications,
  employeeStats,
  expandedEmployee,
  onExpandEmployee,
  sessionMap,
  programMap,
}: EmployesTabProps) {
  // Build a map of traineeId -> certifications
  const traineeCertMap = useMemo(() => {
    const map = new Map<string, EnterpriseCertification[]>();
    if (!certifications) return map;
    for (const cert of certifications) {
      const existing = map.get(cert.traineeId) || [];
      existing.push(cert);
      map.set(cert.traineeId, existing);
    }
    return map;
  }, [certifications]);

  if (traineesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trainees || trainees.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucun employe</h3>
        <p className="text-sm text-muted-foreground">
          Aucun employe n'est rattache a votre entreprise pour le moment.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Employes rattaches</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Prenom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Formations</TableHead>
              <TableHead>Taux de completion</TableHead>
              <TableHead>Certifications</TableHead>
              <TableHead>Derniere session</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainees.map((trainee) => {
              const stats = employeeStats.get(trainee.id);
              const isExpanded = expandedEmployee === trainee.id;
              const traineeCerts = traineeCertMap.get(trainee.id) || [];

              // Compute completion rate
              const totalEnrollments = stats?.enrollments.length || 0;
              const completedEnrollments = stats?.enrollments.filter(
                (e) => e.status === "completed"
              ).length || 0;
              const completionRate = totalEnrollments > 0
                ? Math.round((completedEnrollments / totalEnrollments) * 100)
                : 0;

              // Compute certification status summary
              const certCount = traineeCerts.length;
              let certColorClass = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
              if (certCount > 0) {
                const hasExpired = traineeCerts.some(
                  (c) => c.computedExpiresAt && getRecyclingStatus(c.computedExpiresAt).status === "expired"
                );
                const hasWarning = traineeCerts.some(
                  (c) => c.computedExpiresAt && ["warning", "critical"].includes(getRecyclingStatus(c.computedExpiresAt).status)
                );
                if (hasExpired) {
                  certColorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                } else if (hasWarning) {
                  certColorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                } else {
                  certColorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                }
              }

              return (
                <>
                  <TableRow
                    key={trainee.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onExpandEmployee(isExpanded ? null : trainee.id)}
                  >
                    <TableCell>
                      {(stats && stats.count > 0) || traineeCerts.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">{trainee.lastName}</TableCell>
                    <TableCell>{trainee.firstName}</TableCell>
                    <TableCell>{trainee.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{stats?.count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {totalEnrollments > 0 ? (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={completionRate} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {completionRate}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {certCount > 0 ? (
                        <Badge variant="outline" className={`text-xs ${certColorClass}`}>
                          {certCount}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stats?.lastDate ? formatDate(stats.lastDate) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          trainee.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }
                      >
                        {trainee.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${trainee.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <div className="px-8 py-3 space-y-4">
                          {/* Enrollment history */}
                          {stats && stats.enrollments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Historique des formations</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Session</TableHead>
                                    <TableHead className="text-xs">Formation</TableHead>
                                    <TableHead className="text-xs">Date</TableHead>
                                    <TableHead className="text-xs">Statut</TableHead>
                                    <TableHead className="text-xs">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {stats.enrollments.map((enr) => {
                                    const session = sessionMap.get(enr.sessionId);
                                    const program = session ? programMap.get(session.programId) : undefined;
                                    return (
                                      <TableRow key={enr.id}>
                                        <TableCell className="text-sm">{session?.title || "-"}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{program?.title || "-"}</TableCell>
                                        <TableCell className="text-sm">{session ? formatDate(session.startDate) : "-"}</TableCell>
                                        <TableCell><EnrollmentStatusBadge status={enr.status} /></TableCell>
                                        <TableCell>
                                          {enr.status === "completed" && (
                                            <a href={`/inscription?email=${encodeURIComponent(trainee.email || "")}`}>
                                              <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 gap-1">
                                                <RefreshCw className="w-3 h-3" />
                                                Réinscrire
                                              </Badge>
                                            </a>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {/* Certifications sub-table */}
                          {traineeCerts.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Certifications</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Certification</TableHead>
                                    <TableHead className="text-xs">Programme</TableHead>
                                    <TableHead className="text-xs">Obtenue le</TableHead>
                                    <TableHead className="text-xs">Echeance</TableHead>
                                    <TableHead className="text-xs">Statut</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {traineeCerts.map((cert) => (
                                    <TableRow key={cert.id}>
                                      <TableCell className="text-sm">{cert.label}</TableCell>
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
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {/* Empty state if no enrollments and no certs */}
                          {(!stats || stats.enrollments.length === 0) && traineeCerts.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Aucune donnee disponible pour cet employe.
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
