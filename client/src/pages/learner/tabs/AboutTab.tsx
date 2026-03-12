import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  PenTool,
  FolderOpen,
  ClipboardCheck,
  CalendarCheck,
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  Info,
} from "lucide-react";
import type { Enrollment, Session } from "@shared/schema";

export default function LearnerAboutTab({
  enrollments,
  sessions,
}: {
  enrollments: Enrollment[];
  sessions: Session[];
}) {
  const { data: orgSettings } = useQuery<any[]>({
    queryKey: ["/api/learner/session-info"],
    queryFn: async () => {
      const mySessionIds = enrollments.map(e => e.sessionId);
      if (mySessionIds.length === 0) return [];
      const results = await Promise.all(
        mySessionIds.slice(0, 3).map(sid =>
          apiRequest("GET", `/api/learner/session-info?sessionId=${sid}`)
            .then(r => r.json())
            .catch(() => null)
        )
      );
      return results.filter(Boolean);
    },
    enabled: enrollments.length > 0,
  });

  const mySessionIds = enrollments.map(e => e.sessionId);
  const mySessions = sessions.filter(s => mySessionIds.includes(s.id));
  const locations = Array.from(new Set(mySessions.filter(s => s.location).map(s => s.location)));

  return (
    <div className="space-y-4">
      {/* Guide plateforme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Bienvenue sur SO'SAFE Formation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Formations
              </h4>
              <p className="text-sm text-muted-foreground">
                Consultez vos inscriptions, accédez aux modules e-learning et suivez votre progression dans chaque formation.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <PenTool className="w-4 h-4 text-green-500" /> Signature
              </h4>
              <p className="text-sm text-muted-foreground">
                Signez vos feuilles d'émargement directement en ligne pour chaque session de formation.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <FolderOpen className="w-4 h-4 text-amber-500" /> Documents
              </h4>
              <p className="text-sm text-muted-foreground">
                Retrouvez vos attestations, certificats et documents administratifs liés à vos formations.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-4 h-4 text-purple-500" /> Évaluations
              </h4>
              <p className="text-sm text-muted-foreground">
                Remplissez vos enquêtes de satisfaction et évaluations pour améliorer nos formations.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CalendarCheck className="w-4 h-4 text-cyan-500" /> Calendrier
              </h4>
              <p className="text-sm text-muted-foreground">
                Visualisez vos sessions planifiées et les échéances à venir dans votre calendrier personnel.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> Forum
              </h4>
              <p className="text-sm text-muted-foreground">
                Échangez avec les autres apprenants et votre formateur sur le forum de votre session.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lieux de formation */}
      {mySessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Lieux de formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mySessions.map(session => (
                <div key={session.id} className="border rounded-lg p-4">
                  <h4 className="font-medium">{session.title}</h4>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {session.location && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> {session.location}
                      </p>
                    )}
                    {(session as any).locationAddress && (
                      <p className="ml-5">{(session as any).locationAddress}</p>
                    )}
                    {(session as any).locationRoom && (
                      <p className="ml-5">Salle : {(session as any).locationRoom}</p>
                    )}
                    <p className="flex items-center gap-2">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Du {new Date(session.startDate).toLocaleDateString("fr-FR")} au {new Date(session.endDate).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.modality === "presentiel" ? "Présentiel" :
                         session.modality === "distanciel" ? "Distanciel" : "Mixte"}
                      </Badge>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact & Assistance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Pour toute question concernant votre formation, n'hésitez pas à contacter l'équipe administrative
              via la messagerie intégrée ou aux coordonnées ci-dessous.
            </p>
            <div className="border rounded-lg p-4 space-y-2">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">contact@sosafe-formation.fr</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">01 23 45 67 89</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
