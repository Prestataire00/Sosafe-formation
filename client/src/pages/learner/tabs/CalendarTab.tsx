import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "../helpers";
import type { Enrollment, Session } from "@shared/schema";

export function LearnerCalendarTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map enrolled session IDs
  const enrolledSessionIds = new Set(enrollments.map((e) => e.sessionId));
  const enrolledSessions = sessions.filter((s) => enrolledSessionIds.has(s.id));

  // Fetch intervention dates for all enrolled sessions
  const { data: allSessionDates } = useQuery<any[]>({
    queryKey: ["/api/session-dates"],
  });

  // Filter intervention dates to only enrolled sessions
  const interventionDates = useMemo(() => {
    if (!allSessionDates) return [];
    return allSessionDates.filter((sd: any) => enrolledSessionIds.has(sd.sessionId));
  }, [allSessionDates, enrolledSessionIds]);

  // Check if a date has intervention or session
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];

    // Check intervention dates first (specific days)
    const interventions = interventionDates.filter((sd: any) => sd.date === dateStr);

    // Check general session ranges
    const sessionMatches = enrolledSessions.filter((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });

    return { interventions, sessions: sessionMatches };
  };

  const hasEvent = (day: number) => {
    const date = new Date(year, month, day);
    const events = getEventsForDate(date);
    return events.interventions.length > 0 || events.sessions.length > 0;
  };

  const hasIntervention = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split("T")[0];
    return interventionDates.some((sd: any) => sd.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const selectedEvents = selectedDay ? getEventsForDate(selectedDay) : { interventions: [], sessions: [] };

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  // Build calendar grid cells
  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const hasSess = hasEvent(day);
    const hasInterv = hasIntervention(day);
    const today = isToday(day);
    const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month && selectedDay?.getFullYear() === year;

    cells.push(
      <button
        key={day}
        type="button"
        onClick={() => setSelectedDay(new Date(year, month, day))}
        className={cn(
          "h-10 rounded-lg text-sm font-medium transition-colors relative",
          today && "ring-2 ring-primary",
          isSelected
            ? "bg-primary text-primary-foreground"
            : hasInterv
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200"
            : hasSess
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200"
            : "hover:bg-accent"
        )}
      >
        {day}
        {hasSess && !isSelected && (
          <span className={cn(
            "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
            hasInterv ? "bg-emerald-500" : "bg-blue-500"
          )} />
        )}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-medium">
              {monthNames[month]} {year}
            </h3>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Jour d'intervention
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Période de session
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" />
              Aujourd'hui
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Right sidebar: selected day + upcoming */}
      <div className="space-y-4">
        {/* Selected day events */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 capitalize">
              {selectedDay
                ? selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                : "Sélectionnez un jour"}
            </h4>
            {selectedDay && selectedEvents.interventions.length === 0 && selectedEvents.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement ce jour.</p>
            ) : (
              <div className="space-y-2">
                {/* Intervention dates with times */}
                {selectedEvents.interventions.map((sd: any) => {
                  const sess = enrolledSessions.find((s) => s.id === sd.sessionId);
                  return (
                    <div key={sd.id} className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="text-sm font-medium truncate">{sess?.title || "Session"}</p>
                      </div>
                      {(sd.startTime || sd.endTime) && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ml-6">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {sd.startTime || "—"} → {sd.endTime || "—"}
                        </p>
                      )}
                      {sd.notes && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{sd.notes}</p>
                      )}
                    </div>
                  );
                })}

                {/* General session matches (only if no specific intervention) */}
                {selectedEvents.sessions
                  .filter((s) => !selectedEvents.interventions.some((sd: any) => sd.sessionId === s.id))
                  .map((s) => (
                    <div key={s.id} className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        <p className="text-sm font-medium truncate">{s.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {formatDate(s.startDate)} — {formatDate(s.endDate)}
                      </p>
                      {s.location && (
                        <p className="text-xs text-muted-foreground ml-6">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {s.location}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming sessions summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Prochaines échéances
            </h4>
            {enrolledSessions
              .filter((s) => new Date(s.endDate) >= new Date())
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .slice(0, 5)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    {s.location && <p className="text-xs text-muted-foreground">{s.location}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">
                    {formatDate(s.startDate)}
                  </Badge>
                </div>
              ))}
            {enrolledSessions.filter((s) => new Date(s.endDate) >= new Date()).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune session à venir.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
