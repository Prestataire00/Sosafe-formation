import { storage } from "./storage";
import { triggerSessionAutomation, triggerAutomation } from "./automation-engine";
import { sendEmailNow } from "./email-service";
import { log } from "./index";

const SCAN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Deduplication: track which items we already triggered this day
let processedKeys = new Set<string>();
let lastResetDate = new Date().toDateString();

function resetIfNewDay(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    processedKeys = new Set<string>();
    lastResetDate = today;
  }
}

function dedupKey(type: string, id: string): string {
  return `${type}:${id}:${new Date().toDateString()}`;
}

/**
 * Scan for session reminders (J-7, J-3, J-1) and post-session followup (J+1).
 */
async function scanSessionReminders(): Promise<void> {
  const now = new Date();

  const reminders: Array<{ days: number; event: string }> = [
    { days: 7, event: "session_reminder_7d" },
    { days: 3, event: "session_reminder_3d" },
    { days: 1, event: "session_reminder_1d" },
  ];

  for (const { days, event } of reminders) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const from = new Date(targetDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(targetDate);
    to.setHours(23, 59, 59, 999);

    try {
      const sessions = await storage.getSessionsStartingBetween(from, to);
      for (const session of sessions) {
        const key = dedupKey(event, session.id);
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        log(`Rappel ${event} pour session ${session.id} (${session.title})`, "scheduled");
        await triggerSessionAutomation(event, session.id);
      }
    } catch (err: any) {
      log(`Erreur scan ${event}: ${err.message}`, "scheduled");
    }
  }

  // Post-session followup (J+1): sessions that ended yesterday
  try {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const from = new Date(yesterday);
    from.setHours(0, 0, 0, 0);
    const to = new Date(yesterday);
    to.setHours(23, 59, 59, 999);

    // For post-session followup, we look at endDate.
    // We reuse getSessionsStartingBetween logic but check endDate.
    // Since we don't have getSessionsEndingBetween, fetch all sessions and filter.
    const allSessions = await storage.getSessions();
    for (const session of allSessions) {
      if (!session.endDate) continue;
      const endDate = new Date(session.endDate + "T00:00:00");
      if (endDate >= from && endDate <= to) {
        const key = dedupKey("post_session_followup", session.id);
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        log(`Suivi post-formation pour session ${session.id} (${session.title})`, "scheduled");
        await triggerSessionAutomation("post_session_followup", session.id);
      }
    }
  } catch (err: any) {
    log(`Erreur scan post_session_followup: ${err.message}`, "scheduled");
  }
}

/**
 * Scan for expiring certifications (90d and 30d).
 */
async function scanExpiringCertifications(): Promise<void> {
  const windows: Array<{ days: number; event: string }> = [
    { days: 90, event: "certification_expiring_90d" },
    { days: 30, event: "certification_expiring_30d" },
  ];

  for (const { days, event } of windows) {
    try {
      const certs = await storage.getExpiringCertifications(days);
      for (const cert of certs) {
        const key = dedupKey(event, cert.id);
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        log(`Certification ${cert.id} expire dans ${days}j pour trainee ${cert.traineeId}`, "scheduled");
        await triggerAutomation(event, {
          traineeId: cert.traineeId,
          programId: cert.programId || undefined,
        });
      }
    } catch (err: any) {
      log(`Erreur scan ${event}: ${err.message}`, "scheduled");
    }
  }
}

/**
 * Scan for recycling reminders (AFGSU / Certibiocide / other certifications).
 * Sends notifications at M-10, M-6, and M-2 before certification expiry.
 * Uses a 7-day window around the target date and a persistent dedup set
 * (not reset daily) to ensure each certification gets each reminder only once.
 */
const processedRecyclingKeys = new Set<string>();

async function scanRecyclingReminders(): Promise<void> {
  const windows: Array<{ fromDays: number; toDays: number; event: string; label: string }> = [
    { fromDays: 297, toDays: 304, event: "recycling_reminder_10m", label: "M-10" },
    { fromDays: 176, toDays: 183, event: "recycling_reminder_6m",  label: "M-6" },
    { fromDays: 57,  toDays: 64,  event: "recycling_reminder_2m",  label: "M-2" },
  ];

  for (const { fromDays, toDays, event, label } of windows) {
    try {
      const certs = await storage.getCertificationsExpiringInRange(fromDays, toDays);
      for (const cert of certs) {
        const key = `${event}:${cert.id}`;
        if (processedRecyclingKeys.has(key)) continue;
        processedRecyclingKeys.add(key);

        log(
          `Relance recyclage ${label} pour certification ${cert.id} (${cert.label}) — trainee ${cert.traineeId}`,
          "scheduled",
        );
        await triggerAutomation(event, {
          traineeId: cert.traineeId,
          programId: cert.programId || undefined,
        });
      }
    } catch (err: any) {
      log(`Erreur scan ${event}: ${err.message}`, "scheduled");
    }
  }
}

/**
 * Scan for scheduled evaluation assignments (cold evaluations) whose scheduledFor has passed.
 */
async function scanPendingEvaluations(): Promise<void> {
  try {
    const now = new Date();
    const pendingAssignments = await storage.getScheduledEvaluationAssignments(now);

    for (const assignment of pendingAssignments) {
      const key = dedupKey("evaluation_send", assignment.id);
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);

      if (!assignment.respondentEmail) continue;

      log(`Envoi evaluation programmee ${assignment.id} (${assignment.respondentType})`, "scheduled");

      const template = await storage.getSurveyTemplate(assignment.templateId);
      if (!template) continue;

      const settings = await storage.getOrganizationSettings();
      const orgName = settings.find((s: any) => s.key === "nom_organisme")?.value || "SO'SAFE Formation";
      const baseUrl = settings.find((s: any) => s.key === "app_url")?.value || "";

      const evalUrl = `${baseUrl}/evaluation/${assignment.token}`;
      const subject = `${orgName} — Evaluation: ${template.title}`;
      const body = `<p>Bonjour ${assignment.respondentName || ""},</p>
<p>Vous etes invite(e) a completer l'evaluation suivante : <strong>${template.title}</strong></p>
<p><a href="${evalUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">Completer l'evaluation</a></p>
<p>Cordialement,<br/>${orgName}</p>`;

      const emailLog = await storage.createEmailLog({
        templateId: null,
        recipient: assignment.respondentEmail,
        subject,
        body,
        status: "pending",
      });

      try { await sendEmailNow(emailLog.id); } catch {}

      await storage.updateEvaluationAssignment(assignment.id, {
        status: "sent",
        sentAt: now,
      });
    }
  } catch (err: any) {
    log(`Erreur scan evaluations programmees: ${err.message}`, "scheduled");
  }
}

/**
 * Scan veille entries with upcoming or overdue action deadlines.
 * Sends notifications to admins at J-7, J-3, J-1 and when overdue.
 */
async function scanVeilleDeadlines(): Promise<void> {
  try {
    const entries = await storage.getVeilleEntries({});
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Get admin users to notify
    const users = await storage.getUsers();
    const admins = users.filter((u: any) => u.role === "admin");
    if (admins.length === 0) return;

    const alerts: Array<{ daysLabel: string; daysDiff: number }> = [
      { daysLabel: "J-7", daysDiff: 7 },
      { daysLabel: "J-3", daysDiff: 3 },
      { daysLabel: "J-1", daysDiff: 1 },
      { daysLabel: "overdue", daysDiff: 0 },
    ];

    for (const entry of entries) {
      if (!entry.actionDeadline) continue;
      if (entry.status === "implemented" || entry.status === "archived") continue;

      const deadline = new Date(entry.actionDeadline + "T00:00:00");
      const diffMs = deadline.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      for (const { daysLabel, daysDiff } of alerts) {
        const isMatch = daysLabel === "overdue" ? diffDays < 0 : diffDays === daysDiff;
        if (!isMatch) continue;

        const key = dedupKey(`veille_deadline_${daysLabel}`, entry.id);
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        const title = daysLabel === "overdue"
          ? `Veille en retard : ${entry.title}`
          : `Veille ${daysLabel} : ${entry.title}`;
        const description = daysLabel === "overdue"
          ? `L'action "${entry.actionRequired || entry.title}" a dépassé sa date limite du ${new Date(entry.actionDeadline + "T00:00:00").toLocaleDateString("fr-FR")}.`
          : `L'action "${entry.actionRequired || entry.title}" est due le ${new Date(entry.actionDeadline + "T00:00:00").toLocaleDateString("fr-FR")} (${daysLabel}).`;

        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            category: "reminder",
            title,
            description,
            href: "/quality-improvement",
            relatedId: entry.id,
            relatedType: "veille",
          });
        }

        log(`Alerte veille ${daysLabel} pour "${entry.title}" (deadline: ${entry.actionDeadline})`, "scheduled");
      }
    }
  } catch (err: any) {
    log(`Erreur scan veille deadlines: ${err.message}`, "scheduled");
  }
}

/**
 * Run all scheduled scans.
 */
async function runScheduledScans(): Promise<void> {
  resetIfNewDay();
  try {
    await scanSessionReminders();
    await scanExpiringCertifications();
    await scanRecyclingReminders();
    await scanPendingEvaluations();
    await scanVeilleDeadlines();
  } catch (err: any) {
    log(`Erreur globale scheduled scans: ${err.message}`, "scheduled");
  }
}

let scanInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the scheduled tasks scanner (runs every hour).
 */
export function startScheduledTasks(): void {
  if (scanInterval) return;
  log("Démarrage du scanner de rappels (intervalle: 60min)", "scheduled");
  scanInterval = setInterval(runScheduledScans, SCAN_INTERVAL_MS);
  // Run once after a short delay to let the app stabilize
  setTimeout(runScheduledScans, 10_000);
}
