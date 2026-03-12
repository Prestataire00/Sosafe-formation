import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/shared/SearchInput";
import { ClipboardList } from "lucide-react";
import { formatDate, EnrollmentStatusBadge } from "./helpers";
import type { Enrollment, Session, Trainee, Program } from "@shared/schema";

interface FormationsTabProps {
  enrollments: Enrollment[] | undefined;
  filteredEnrollments: Enrollment[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  yearFilter: string;
  onYearFilterChange: (year: string) => void;
  availableYears: string[];
  sessionMap: Map<string, Session>;
  traineeMap: Map<string, Trainee>;
  programMap: Map<string, Program>;
}

export default function EnterpriseFormationsTab({
  enrollments,
  filteredEnrollments,
  searchQuery,
  onSearchChange,
  yearFilter,
  onYearFilterChange,
  availableYears,
  sessionMap,
  traineeMap,
  programMap,
}: FormationsTabProps) {
  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucune inscription</h3>
        <p className="text-sm text-muted-foreground">
          Aucun employe n'est inscrit a une session de formation pour le moment.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg">Inscriptions aux formations</CardTitle>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Rechercher..."
              className="w-[220px]"
            />
            {availableYears.length > 0 && (
              <Select value={yearFilter} onValueChange={onYearFilterChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filtrer par annee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les annees</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employe</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Date de debut</TableHead>
              <TableHead>Date de fin</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEnrollments.map((enrollment) => {
              const session = sessionMap.get(enrollment.sessionId);
              const trainee = traineeMap.get(enrollment.traineeId);
              const program = session ? programMap.get(session.programId) : undefined;
              return (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {trainee ? `${trainee.firstName} ${trainee.lastName}` : "-"}
                  </TableCell>
                  <TableCell>
                    {session?.title || "Session inconnue"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {program?.title || "-"}
                  </TableCell>
                  <TableCell>
                    {session ? formatDate(session.startDate) : "-"}
                  </TableCell>
                  <TableCell>
                    {session ? formatDate(session.endDate) : "-"}
                  </TableCell>
                  <TableCell>
                    {session?.location || "-"}
                  </TableCell>
                  <TableCell>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredEnrollments.length === 0 && searchQuery && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Aucun resultat pour "{searchQuery}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
