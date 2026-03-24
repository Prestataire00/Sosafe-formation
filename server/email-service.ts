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
 * Wrap email content in a Digiforma-style HTML layout.
 * Reads org settings dynamically for logo, name, address, SIRET, NDA.
 */
export async function wrapEmailHtml({
  title,
  preheader,
  body,
  ctaLabel,
  ctaUrl,
  footerText,
  orgSettings,
}: {
  title?: string;
  preheader?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerText?: string;
  orgSettings?: Record<string, string>;
}): Promise<string> {
  // Load org settings if not provided
  let org = orgSettings;
  if (!org) {
    try {
      const allSettings = await storage.getOrganizationSettings();
      org = {};
      for (const s of allSettings) {
        org[s.key] = s.value;
      }
    } catch {
      org = {};
    }
  }

  const orgName = org["org_name"] || "SO'SAFE Formation";
  const orgAddress = org["org_address"] || "";
  const orgPhone = org["org_phone"] || "";
  const orgEmail = org["org_email"] || "";
  const orgSiret = org["org_siret"] || "";
  const orgNda = org["org_nda"] || "";
  const orgWebsite = org["org_website"] || "";
  const orgLogoUrl = org["org_logo_url"] || "";
  const appUrl = process.env.APP_URL || "https://sosafe-formation.onrender.com";
  const year = new Date().getFullYear();

  // Build logo: if relative path, prepend APP_URL
  const logoSrc = orgLogoUrl
    ? (orgLogoUrl.startsWith("http") ? orgLogoUrl : `${appUrl}${orgLogoUrl}`)
    : "";

  // Build footer info lines
  const footerLines: string[] = [];
  if (orgAddress) footerLines.push(orgAddress);
  const contactParts: string[] = [];
  if (orgPhone) contactParts.push(`Tél. ${orgPhone}`);
  if (orgEmail) contactParts.push(orgEmail);
  if (orgWebsite) contactParts.push(orgWebsite);
  if (contactParts.length) footerLines.push(contactParts.join(" — "));
  const legalParts: string[] = [];
  if (orgSiret) legalParts.push(`SIRET : ${orgSiret}`);
  if (orgNda) legalParts.push(`N° de déclaration d'activité : ${orgNda}`);
  if (legalParts.length) footerLines.push(legalParts.join(" — "));

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title || orgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
${preheader ? `<div style="display:none;font-size:1px;color:#f2f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f2f4f6;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Container 600px -->
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;margin:0 auto;">

<!-- Logo Header -->
<tr>
<td align="center" style="padding:0 0 24px 0;">
${logoSrc
  ? `<a href="${appUrl}" target="_blank" style="display:inline-block;"><img src="${logoSrc}" alt="${orgName}" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;" /></a>`
  : `<a href="${appUrl}" target="_blank" style="display:inline-block;text-decoration:none;"><span style="font-size:26px;font-weight:700;color:#1a2b49;letter-spacing:1px;">${orgName}</span></a>`
}
</td>
</tr>

<!-- Email Card -->
<tr>
<td>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Title bar -->
${title ? `<tr>
<td style="padding:28px 36px 0 36px;">
<h1 style="margin:0;font-size:20px;font-weight:600;color:#1a2b49;line-height:1.4;">${title}</h1>
</td>
</tr>` : ""}

<!-- Body content -->
<tr>
<td style="padding:24px 36px 28px 36px;">
<div style="color:#51545e;font-size:15px;line-height:1.75;">
${body}
</div>
</td>
</tr>

${ctaLabel && ctaUrl ? `
<!-- CTA Button -->
<tr>
<td style="padding:0 36px 32px 36px;">
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
<tr>
<td align="center" style="border-radius:6px;background-color:#3869d4;">
<a href="${ctaUrl}" target="_blank" style="display:inline-block;background-color:#3869d4;color:#ffffff;padding:13px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.3px;mso-padding-alt:0;text-align:center;">
<!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:26pt">&nbsp;</i><![endif]-->
<span style="mso-text-raise:13pt;">${ctaLabel}</span>
<!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
</a>
</td>
</tr>
</table>
</td>
</tr>` : ""}

</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:24px 0 0 0;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">

${footerText ? `<tr>
<td align="center" style="padding:0 0 12px 0;">
<p style="margin:0;color:#6b6e76;font-size:13px;line-height:1.5;">${footerText}</p>
</td>
</tr>` : ""}

<tr>
<td align="center" style="padding:0 0 4px 0;">
<p style="margin:0;color:#a8aaaf;font-size:12px;line-height:1.6;font-weight:600;">${orgName}</p>
</td>
</tr>

${footerLines.map(line => `<tr>
<td align="center" style="padding:0;">
<p style="margin:0;color:#a8aaaf;font-size:11px;line-height:1.6;">${line}</p>
</td>
</tr>`).join("\n")}

<tr>
<td align="center" style="padding:12px 0 0 0;">
<p style="margin:0;color:#a8aaaf;font-size:11px;">&copy; ${year} ${orgName} &mdash; Tous droits réservés</p>
</td>
</tr>

</table>
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
