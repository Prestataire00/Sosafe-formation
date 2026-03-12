import { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";
import { formatDate } from "./helpers";
import type {
  Enrollment,
  Session,
  Program,
  ElearningModule,
  LearnerProgress,
} from "@shared/schema";

// Components
import { EnrollmentCard } from "./components/EnrollmentCard";
import { ImmersiveModuleViewer } from "./components/ImmersiveModuleViewer";
import LearnerDashboard from "./components/LearnerDashboard";

// Tabs
import { LearnerSessionsTab } from "./tabs/SessionsTab";
import LearnerSignatureTab from "./tabs/SignatureTab";
import LearnerDocumentsTab from "./tabs/DocumentsTab";
import { LearnerEvaluationsTab } from "./tabs/EvaluationsTab";
import { LearnerCalendarTab } from "./tabs/CalendarTab";
import { LearnerForumTab } from "./tabs/ForumTab";
import LearnerVisioTab from "./tabs/VisioTab";
import LearnerBadgesTab from "./tabs/BadgesTab";
import LearnerAboutTab from "./tabs/AboutTab";

export default function LearnerPortal({ params }: { params?: { section?: string } }) {
  const { user } = useAuth();
  const traineeId = user?.traineeId;

  const [, setLocation] = useLocation();
  const activeTab = params?.section || "dashboard";
  const navigateTab = useCallback((tab: string) => setLocation(`/learner-portal/${tab}`), [setLocation]);

  // ---- Data fetching ----
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/learner/my-enrollments"],
  });
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });
  const { data: modules } = useQuery<ElearningModule[]>({
    queryKey: ["/api/elearning-modules"],
  });
  const { data: progressData } = useQuery<LearnerProgress[]>({
    queryKey: ["/api/learner-progress", `?traineeId=${traineeId}`],
    enabled: !!traineeId,
  });
  const { data: pendingSignatures } = useQuery<any[]>({
    queryKey: [`/api/pending-signatures?signerId=${traineeId}&signerType=trainee`],
    enabled: !!traineeId,
  });
  const { data: evalAssignments } = useQuery<any[]>({
    queryKey: [`/api/evaluation-assignments?traineeId=${traineeId}`],
    enabled: !!traineeId,
  });

  const myEnrollments = enrollments || [];

  // Stats
  const activeSessions = myEnrollments.filter(
    (e) => e.status !== "completed" && e.status !== "cancelled"
  ).length;
  const completedSessions = myEnrollments.filter((e) => e.status === "completed").length;

  // Global progress
  const globalProgress = useMemo(() => {
    if (!modules || !progressData || !sessions || myEnrollments.length === 0) return 0;
    const enrolledSessionIds = new Set(myEnrollments.map((e) => e.sessionId));
    const enrolledSessions = sessions.filter((s) => enrolledSessionIds.has(s.id));
    const relevantModules = (modules || []).filter(
      (m) =>
        (m as any).status === "published" &&
        enrolledSessions.some(
          (s) => m.sessionId === s.id || (m.programId === s.programId && !m.sessionId)
        )
    );
    if (relevantModules.length === 0) return 0;
    const moduleIds = new Set(relevantModules.map((m) => m.id));
    const relevant = progressData.filter((p) => moduleIds.has(p.moduleId));
    if (relevant.length === 0) return 0;
    const completed = relevant.filter((p) => p.completed).length;
    return Math.round((completed / relevant.length) * 100);
  }, [modules, progressData, sessions, myEnrollments]);

  // Pending counts
  const pendingSignatureCount = pendingSignatures?.filter((ps: any) => !ps.signedAt)?.length || 0;
  const pendingEvalCount = evalAssignments?.filter((ea: any) => !ea.completedAt)?.length || 0;

  // Immersive mode
  const [immersiveState, setImmersiveState] = useState<{
    enrollmentId: string;
    sessionId: string;
    moduleId: string;
    blockIndex: number;
  } | null>(null);

  const enterImmersiveMode = useCallback(
    (enrollmentId: string, sessionId: string, moduleId: string, blockIndex?: number) => {
      setImmersiveState({ enrollmentId, sessionId, moduleId, blockIndex: blockIndex ?? 0 });
    },
    []
  );

  const exitImmersiveMode = useCallback(() => {
    setImmersiveState(null);
  }, []);

  const isLoading = enrollmentsLoading;


  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium mb-1">Accès non autorisé</h3>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour accéder à votre espace apprenant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageLayout>
        {/* Personalized welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bonjour {user.firstName} {user.lastName} !</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeSessions > 0
                ? `Vous avez ${activeSessions} formation${activeSessions > 1 ? "s" : ""} en cours`
                : completedSessions > 0
                ? "Toutes vos formations sont terminées"
                : "Bienvenue sur votre espace de formation"}
            </p>
          </div>
          {globalProgress > 0 && (
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Progression globale</p>
                <p className="text-lg font-bold">{globalProgress}%</p>
              </div>
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted/30" />
                  <circle
                    cx="28" cy="28" r="24"
                    stroke="currentColor" strokeWidth="4" fill="none"
                    className="text-primary"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - globalProgress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <LearnerDashboard
            traineeId={traineeId || ""}
            enrollments={myEnrollments}
            sessions={sessions || []}
            programs={programs || []}
            modules={modules || []}
            progressData={progressData || []}
            pendingSignatureCount={pendingSignatureCount}
            pendingEvalCount={pendingEvalCount}
            onChangeTab={navigateTab}
            onEnterImmersive={(eid, sid, mid, bi) => enterImmersiveMode(eid, sid, mid, bi)}
          />
        )}

          {/* FORMATIONS */}
          {activeTab === "formations" && (
            isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : myEnrollments.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-medium mb-1">Aucune inscription</h3>
                <p className="text-sm text-muted-foreground">
                  Vous n'êtes inscrit à aucune session de formation pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {myEnrollments.map((enrollment) => {
                  const session = sessions?.find((s) => s.id === enrollment.sessionId);
                  if (!session) return null;
                  const program = programs?.find((p) => p.id === session.programId);
                  const sessionModules = (modules || []).filter(
                    (m) =>
                      (m as any).status === "published" &&
                      (m.sessionId === session.id ||
                        (m.programId === session.programId && !m.sessionId))
                  );
                  return (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      session={session}
                      program={program}
                      modules={sessionModules}
                      progressData={progressData || []}
                      traineeId={traineeId!}
                      onEnterImmersive={(moduleId: string, blockIndex?: number) =>
                        enterImmersiveMode(enrollment.id, session.id, moduleId, blockIndex)
                      }
                    />
                  );
                })}
              </div>
            )
          )}

          {/* CALENDAR */}
          {activeTab === "calendar" && (
            <LearnerCalendarTab enrollments={myEnrollments} sessions={sessions || []} />
          )}

          {/* DOCUMENTS */}
          {activeTab === "documents" && (
            <LearnerDocumentsTab
              traineeId={traineeId || ""}
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          )}

          {/* BADGES */}
          {activeTab === "badges" && traineeId && (
            <LearnerBadgesTab
              traineeId={traineeId}
              progressData={progressData || []}
              modules={modules || []}
            />
          )}

          {/* SESSIONS */}
          {activeTab === "sessions" && (
            <LearnerSessionsTab traineeId={traineeId!} />
          )}

          {/* SIGNATURE */}
          {activeTab === "signature" && (
            <LearnerSignatureTab
              traineeId={traineeId || ""}
              enrollments={myEnrollments}
              sessions={sessions || []}
            />
          )}

          {/* EVALUATIONS */}
          {activeTab === "evaluations" && (
            <LearnerEvaluationsTab traineeId={traineeId || ""} />
          )}

          {/* FORUM */}
          {activeTab === "forum" && (
            <LearnerForumTab enrollments={myEnrollments} sessions={sessions || []} />
          )}

          {/* VISIO */}
          {activeTab === "visio" && (
            <LearnerVisioTab enrollments={myEnrollments} sessions={sessions || []} />
          )}

          {/* ABOUT */}
          {activeTab === "about" && (
            <LearnerAboutTab enrollments={myEnrollments} sessions={sessions || []} />
          )}
      </PageLayout>

      {/* Immersive module viewer portal */}
      {immersiveState &&
        (() => {
          const enrollment = myEnrollments.find((e) => e.id === immersiveState.enrollmentId);
          const session = sessions?.find((s) => s.id === immersiveState.sessionId);
          if (!enrollment || !session) return null;
          if (!["confirmed", "attended", "completed"].includes(enrollment.status)) return null;
          const sessionModules = (modules || []).filter(
            (m) =>
              (m as any).status === "published" &&
              (m.sessionId === session.id ||
                (m.programId === session.programId && !m.sessionId))
          );
          return createPortal(
            <ImmersiveModuleViewer
              initialModuleId={immersiveState.moduleId}
              initialBlockIndex={immersiveState.blockIndex}
              modules={sessionModules}
              progressData={progressData || []}
              traineeId={traineeId!}
              onExit={exitImmersiveMode}
            />,
            document.body
          );
        })()}
    </>
  );
}
