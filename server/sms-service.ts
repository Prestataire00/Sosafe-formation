import { storage } from "./storage";
import { log } from "./index";

const MAX_RETRIES = 3;
const WORKER_INTERVAL_MS = 30_000; // 30 seconds

let cachedConfig: BrevoSmsConfig | null = null;

interface BrevoSmsConfig {
  apiKey: string;
  sender: string;
}

/**
 * Get Brevo SMS config from env vars with fallback to organization_settings in DB.
 */
async function getBrevoSmsConfig(): Promise<BrevoSmsConfig | null> {
  if (cachedConfig) return cachedConfig;

  // Priority 1: environment variables
  if (process.env.BREVO_API_KEY && process.env.BREVO_SMS_SENDER) {
    cachedConfig = {
      apiKey: process.env.BREVO_API_KEY,
      sender: process.env.BREVO_SMS_SENDER,
    };
    return cachedConfig;
  }

  // Priority 2: organization settings in DB
  try {
    const settings = await storage.getOrganizationSettings();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    if (map.brevo_api_key && map.brevo_sms_sender) {
      cachedConfig = {
        apiKey: map.brevo_api_key,
        sender: map.brevo_sms_sender,
      };
      return cachedConfig;
    }
  } catch {
    // DB not ready yet
  }

  return null;
}

/**
 * Reset the cached Brevo SMS config (call when settings change).
 */
export function resetBrevoSmsConfig(): void {
  cachedConfig = null;
}

/**
 * Test Brevo SMS connection with current config.
 * Uses GET /v3/account to verify the API key is valid.
 */
export async function testBrevoSmsConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getBrevoSmsConfig();
    if (!config) {
      return { success: false, error: "Aucune configuration Brevo SMS trouvée" };
    }

    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": config.apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `Brevo API error ${response.status}: ${body}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de connexion Brevo" };
  }
}

/**
 * Send a single SMS by its log ID via Brevo transactional SMS API.
 */
export async function sendSms(logId: string): Promise<void> {
  const smsLog = await storage.getSmsLog(logId);
  if (!smsLog) throw new Error(`SMS log ${logId} introuvable`);
  if (smsLog.status === "sent") return;

  const config = await getBrevoSmsConfig();
  if (!config) {
    await storage.updateSmsLog(logId, {
      status: "failed",
      error: "Brevo SMS non configuré",
    } as any);
    return;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "transactional",
        sender: config.sender,
        recipient: smsLog.recipient,
        content: smsLog.body,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${errorBody}`);
    }

    const result = await response.json();

    await storage.updateSmsLog(logId, {
      status: "sent",
      sentAt: new Date(),
      error: null,
      messageId: result.messageId || result.reference || null,
    } as any);

    log(`SMS envoyé avec succès à ${smsLog.recipient} (log ${logId})`, "sms");
  } catch (err: any) {
    const retryCount = (smsLog.retryCount || 0) + 1;
    const status = retryCount >= MAX_RETRIES ? "failed" : "pending";

    await storage.updateSmsLog(logId, {
      status,
      error: err.message || "Erreur d'envoi SMS",
      retryCount,
    } as any);

    if (status === "failed") {
      log(`SMS échoué définitivement pour ${smsLog.recipient} (log ${logId}): ${err.message}`, "sms");
    } else {
      log(`SMS échoué (tentative ${retryCount}/${MAX_RETRIES}) pour ${smsLog.recipient}: ${err.message}`, "sms");
    }
  }
}

/**
 * Alias for immediate send attempt (used by automation engine).
 */
export async function sendSmsNow(logId: string): Promise<void> {
  return sendSms(logId);
}

/**
 * Process all pending SMS that are due.
 */
export async function processPendingSms(): Promise<void> {
  try {
    const pending = await storage.getPendingSmsLogs();
    for (const smsLog of pending) {
      if (smsLog.retryCount && smsLog.retryCount >= MAX_RETRIES) continue;
      try {
        await sendSms(smsLog.id);
      } catch (err: any) {
        log(`Erreur traitement SMS ${smsLog.id}: ${err.message}`, "sms-worker");
      }
    }
  } catch (err: any) {
    log(`Erreur worker SMS: ${err.message}`, "sms-worker");
  }
}

let workerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the SMS processing worker (runs every 30s).
 */
export function startSmsWorker(): void {
  if (workerInterval) return;
  log("Démarrage du worker SMS (intervalle: 30s)", "sms-worker");
  workerInterval = setInterval(processPendingSms, WORKER_INTERVAL_MS);
  // Run once immediately
  processPendingSms();
}
