import { storage } from "./storage";
import { triggerSessionAutomation, triggerAutomation } from "./automation-engine";
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
 * Run all scheduled scans.
 */
async function runScheduledScans(): Promise<void> {
  resetIfNewDay();
  try {
    await scanSessionReminders();
    await scanExpiringCertifications();
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
