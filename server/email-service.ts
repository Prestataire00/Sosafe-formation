import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { storage } from "./storage";
import { log } from "./index";

const MAX_RETRIES = 3;
const WORKER_INTERVAL_MS = 30_000; // 30 seconds

let transporter: Transporter | null = null;

/**
 * Get SMTP config from env vars with fallback to organization_settings in DB.
 */
async function getSmtpConfig(): Promise<{
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
} | null> {
  // Priority 1: environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.SMTP_FROM_NAME || "SO'SAFE Formation",
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }

  // Priority 2: organization settings in DB
  try {
    const settings = await storage.getOrganizationSettings();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    if (map.smtp_host && map.smtp_user && map.smtp_pass) {
      return {
        host: map.smtp_host,
        port: parseInt(map.smtp_port || "587", 10),
        secure: map.smtp_secure === "true",
        user: map.smtp_user,
        pass: map.smtp_pass,
        fromName: map.smtp_from_name || "SO'SAFE Formation",
        fromEmail: map.smtp_from_email || map.smtp_user,
      };
    }
  } catch {
    // DB not ready yet
  }

  return null;
}

async function getTransporter(): Promise<Transporter | null> {
  if (transporter) return transporter;

  const config = await getSmtpConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

/**
 * Reset the cached transporter (call when SMTP settings change).
 */
export function resetTransporter(): void {
  transporter = null;
}

/**
 * Test SMTP connection with current config.
 */
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getSmtpConfig();
    if (!config) {
      return { success: false, error: "Aucune configuration SMTP trouvée" };
    }

    const testTransport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await testTransport.verify();
    testTransport.close();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de connexion SMTP" };
  }
}

/**
 * Send a single email by its log ID.
 */
export async function sendEmail(logId: string): Promise<void> {
  const emailLog = await storage.getEmailLog(logId);
  if (!emailLog) throw new Error(`Email log ${logId} introuvable`);
  if (emailLog.status === "sent") return;

  const transport = await getTransporter();
  if (!transport) {
    await storage.updateEmailLog(logId, {
      status: "failed",
      error: "SMTP non configuré",
    } as any);
    return;
  }

  const config = await getSmtpConfig();
  if (!config) return;

  try {
    // Inject tracking pixel into email body
    const appUrl = process.env.APP_URL
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
      || "http://localhost:5000";
    const trackingPixel = `<img src="${appUrl}/t/${emailLog.trackingId}" width="1" height="1" style="display:none" alt="" />`;
    let htmlBody = emailLog.body;
    if (htmlBody.includes("</body>")) {
      htmlBody = htmlBody.replace("</body>", `${trackingPixel}</body>`);
    } else {
      htmlBody = htmlBody + trackingPixel;
    }

    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: emailLog.recipient,
      subject: emailLog.subject,
      html: htmlBody,
    });

    await storage.updateEmailLog(logId, {
      status: "sent",
      sentAt: new Date(),
      error: null,
    } as any);

    log(`Email envoyé avec succès à ${emailLog.recipient} (log ${logId})`, "email");
  } catch (err: any) {
    const retryCount = (emailLog.retryCount || 0) + 1;
    const status = retryCount >= MAX_RETRIES ? "failed" : "pending";

    await storage.updateEmailLog(logId, {
      status,
      error: err.message || "Erreur d'envoi",
      retryCount,
    } as any);

    if (status === "failed") {
      log(`Email échoué définitivement pour ${emailLog.recipient} (log ${logId}): ${err.message}`, "email");
    } else {
      log(`Email échoué (tentative ${retryCount}/${MAX_RETRIES}) pour ${emailLog.recipient}: ${err.message}`, "email");
    }
  }
}

/**
 * Alias for immediate send attempt (used by automation engine).
 */
export async function sendEmailNow(logId: string): Promise<void> {
  return sendEmail(logId);
}

/**
 * Wrap email content in a professional Digiforma-style HTML layout.
 * Provides consistent branding across all outgoing emails.
 */
export function wrapEmailHtml({
  title,
  preheader,
  body,
  ctaLabel,
  ctaUrl,
  footerText,
}: {
  title?: string;
  preheader?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerText?: string;
}): string {
  const brandColor = "#1e3a5f";
  const accentColor = "#2563eb";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title || "SO'SAFE Formation"}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<!-- Header -->
<tr>
<td style="background-color:${brandColor};padding:24px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:0.5px;">SO'SAFE Formation</h1>
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:32px 32px 16px 32px;">
${title ? `<h2 style="margin:0 0 20px 0;color:${brandColor};font-size:18px;font-weight:600;">${title}</h2>` : ""}
<div style="color:#374151;font-size:14px;line-height:1.7;">
${body}
</div>
</td>
</tr>
${ctaLabel && ctaUrl ? `
<!-- CTA Button -->
<tr>
<td style="padding:8px 32px 24px 32px;text-align:center;">
<a href="${ctaUrl}" style="display:inline-block;background-color:${accentColor};color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">${ctaLabel}</a>
</td>
</tr>` : ""}
<!-- Divider -->
<tr>
<td style="padding:0 32px;">
<hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
</td>
</tr>
<!-- Footer -->
<tr>
<td style="padding:20px 32px 24px 32px;text-align:center;">
${footerText ? `<p style="margin:0 0 8px 0;color:#6b7280;font-size:12px;">${footerText}</p>` : ""}
<p style="margin:0;color:#9ca3af;font-size:11px;">SO'SAFE Formation &copy; ${year} &mdash; Tous droits réservés</p>
<p style="margin:4px 0 0 0;color:#9ca3af;font-size:11px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Process all pending emails that are due.
 */
export async function processPendingEmails(): Promise<void> {
  try {
    const pending = await storage.getPendingEmailLogs();
    for (const emailLog of pending) {
      if (emailLog.retryCount && emailLog.retryCount >= MAX_RETRIES) continue;
      try {
        await sendEmail(emailLog.id);
      } catch (err: any) {
        log(`Erreur traitement email ${emailLog.id}: ${err.message}`, "email-worker");
      }
    }
  } catch (err: any) {
    log(`Erreur worker email: ${err.message}`, "email-worker");
  }
}

let workerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the email processing worker (runs every 30s).
 */
export function startEmailWorker(): void {
  if (workerInterval) return;
  log("Démarrage du worker email (intervalle: 30s)", "email-worker");
  workerInterval = setInterval(processPendingEmails, WORKER_INTERVAL_MS);
  // Run once immediately
  processPendingEmails();
}
