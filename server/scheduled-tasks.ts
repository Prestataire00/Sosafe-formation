import { storage } from "./storage";
import { triggerSessionAutomation, triggerAutomation } from "./automation-engine";
import { sendEmailNow, wrapEmailHtml } from "./email-service";
import { log } from "./index";

const SCAN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (was 1h, reduced for emargement scheduling)

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
 * Scan for sessions starting in the next 15-25 minutes and auto-send emargement emails.
 * For each session date (or session startDate), if the start time is within the window:
 *  1. Auto-create attendance sheet if it doesn't exist
 *  2. Create emargement records for all enrolled trainees
 *  3. Send emargement email links to each trainee
 */
const processedEmargementKeys = new Set<string>();

async function scanAutoEmargement(): Promise<void> {
  try {
    const now = new Date();
    const allSessions = await storage.getSessions();

    // Get app URL for emargement links
    const appUrl = process.env.APP_URL
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
      || `http://localhost:${process.env.PORT || 3000}`;

    for (const session of allSessions) {
      if (session.status === "completed" || session.status === "cancelled") continue;

      // Get session dates (explicit intervention dates)
      const sessionDates = await storage.getSessionDates(session.id);

      // Build list of { date, startTime } to check
      const datesToCheck: Array<{ dateStr: string; startTime: string; period: string }> = [];

      if (sessionDates.length > 0) {
        for (const sd of sessionDates) {
          const dateStr = typeof sd.date === "string" ? sd.date : new Date(sd.date).toISOString().split("T")[0];
          datesToCheck.push({
            dateStr,
            startTime: sd.startTime || "09:00",
            period: "journee",
          });
        }
      } else {
        // Fallback: use session startDate/endDate, one per day
        const start = new Date(session.startDate + "T00:00:00");
        const end = new Date(session.endDate + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
          datesToCheck.push({
            dateStr: d.toISOString().split("T")[0],
            startTime: "09:00",
            period: "journee",
          });
        }
      }

      for (const { dateStr, startTime, period } of datesToCheck) {
        // Parse date + time into a timestamp
        const [hours, minutes] = startTime.split(":").map(Number);
        const sessionStart = new Date(dateStr + "T00:00:00");
        sessionStart.setHours(hours || 9, minutes || 0, 0, 0);

        // Calculate time until session starts (in minutes)
        const minutesUntilStart = (sessionStart.getTime() - now.getTime()) / (1000 * 60);

        // Send emails when session starts in 10-20 minutes (captures ~15 min before)
        if (minutesUntilStart < 10 || minutesUntilStart > 20) continue;

        const emargKey = `emargement_auto:${session.id}:${dateStr}:${period}`;
        if (processedEmargementKeys.has(emargKey)) continue;
        processedEmargementKeys.add(emargKey);

        log(`Auto-emargement pour session "${session.title}" le ${dateStr} (debut dans ${Math.round(minutesUntilStart)} min)`, "scheduled");

        // 1. Auto-create attendance sheet if it doesn't exist
        const existingSheets = await storage.getAttendanceSheets(session.id);
        let sheet = existingSheets.find((s: any) => {
          const sheetDate = typeof s.date === "string" ? s.date : new Date(s.date).toISOString().split("T")[0];
          return sheetDate === dateStr && s.period === period;
        });

        if (!sheet) {
          sheet = await storage.createAttendanceSheet({
            sessionId: session.id,
            date: dateStr,
            period,
          });
          log(`Feuille d'emargement auto-creee pour ${dateStr}`, "scheduled");
        }

        // 2. Get enrolled trainees and send emargement emails
        const enrollments = await storage.getEnrollments(session.id);
        const activeEnrollments = enrollments.filter((e: any) => e.status !== "cancelled");

        const existingRecords = await storage.getAttendanceRecords(sheet.id);

        let sentCount = 0;
        for (const enrollment of activeEnrollments) {
          const trainee = await storage.getTrainee(enrollment.traineeId);
          if (!trainee?.email) continue;

          // Check if record already exists and has a token
          let record = existingRecords.find((r: any) => r.traineeId === enrollment.traineeId);
          if (record?.signedAt) continue; // Already signed

          // Create record if needed
          if (!record) {
            record = await storage.createAttendanceRecord({
              sheetId: sheet.id,
              traineeId: enrollment.traineeId,
              status: "absent",
            });
          }

          // Generate token if needed
          let token = record.emargementToken;
          if (!token) {
            const crypto = await import("crypto");
            token = crypto.randomUUID();
            await storage.updateAttendanceRecord(record.id, { emargementToken: token } as any);
          }

          const signUrl = `${appUrl}/emargement/${token}`;
          const periodLabel = period === "matin" ? "Matin" : period === "apres-midi" ? "Apres-midi" : "Journee entiere";
          const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR");

          const subject = `Émargement — ${session.title} — ${dateDisplay}`;
          const body = await wrapEmailHtml({
            title: "Émargement de présence",
            preheader: `Confirmez votre présence — ${session.title}`,
            body: `
              <p>Bonjour <strong>${trainee.firstName}</strong>,</p>
              <p>Votre formation <strong>${session.title}</strong> commence bientôt. Merci de confirmer votre présence en cliquant sur le bouton ci-dessous.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px 12px;color:#6b7280;width:120px;">Date</td><td style="padding:8px 12px;font-weight:600;">${dateDisplay}</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px 12px;color:#6b7280;">Période</td><td style="padding:8px 12px;font-weight:600;">${periodLabel}</td></tr>
                <tr><td style="padding:8px 12px;color:#6b7280;">Heure</td><td style="padding:8px 12px;font-weight:600;">${startTime}</td></tr>
                ${session.location ? `<tr style="background:#f9fafb;"><td style="padding:8px 12px;color:#6b7280;">Lieu</td><td style="padding:8px 12px;font-weight:600;">${session.location}</td></tr>` : ""}
              </table>`,
            ctaLabel: "Confirmer ma présence",
            ctaUrl: signUrl,
            footerText: "Ce lien est personnel et unique. Ne le partagez pas.",
          });

          await storage.createEmailLog({
            templateId: null,
            recipient: trainee.email,
            subject,
            body,
            status: "pending",
          });
          sentCount++;
        }

        if (sentCount > 0) {
          log(`${sentCount} email(s) d'emargement programme(s) pour session "${session.title}" (${dateStr})`, "scheduled");
        }
      }
    }
  } catch (err: any) {
    log(`Erreur scan auto-emargement: ${err.message}`, "scheduled");
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
    await scanAutoEmargement();
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
  log("Démarrage du scanner de rappels et emargement (intervalle: 10min)", "scheduled");
  scanInterval = setInterval(runScheduledScans, SCAN_INTERVAL_MS);
  // Run once after a short delay to let the app stabilize
  setTimeout(runScheduledScans, 10_000);
}
