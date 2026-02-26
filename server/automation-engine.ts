import { storage } from "./storage";
import type { AutomationRule } from "@shared/schema";

/**
 * Context passed to every automation trigger.
 * Provides IDs the engine uses to load entities and resolve template variables.
 */
export interface AutomationContext {
  enrollmentId?: string;
  sessionId?: string;
  traineeId?: string;
  programId?: string;
  invoiceId?: string;
  surveyId?: string;
  /** Allows passing extra metadata (e.g. old status) */
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Template variable resolution (shared by emails & documents)
// ---------------------------------------------------------------------------
async function resolveVariables(
  template: string,
  ctx: AutomationContext,
): Promise<string> {
  let out = template;
  const r: Record<string, string> = {};

  // Session + Program
  if (ctx.sessionId) {
    const session = await storage.getSession(ctx.sessionId);
    if (session) {
      r["{titre_session}"] = session.title;
      r["{date_debut}"] = new Date(session.startDate).toLocaleDateString("fr-FR");
      r["{date_fin}"] = new Date(session.endDate).toLocaleDateString("fr-FR");
      r["{lieu}"] = session.location || "";
      r["{modalite}"] = session.modality;

      const program = await storage.getProgram(session.programId);
      if (program) {
        r["{titre_formation}"] = program.title;
        r["{duree_formation}"] = `${program.duration} heures`;
        r["{prix_formation}"] = `${program.price} EUR`;
        r["{objectifs_formation}"] = program.objectives || "";
      }
    }
  }

  // Trainee
  if (ctx.traineeId) {
    const trainee = await storage.getTrainee(ctx.traineeId);
    if (trainee) {
      r["{nom_apprenant}"] = `${trainee.firstName} ${trainee.lastName}`;
      r["{prenom_apprenant}"] = trainee.firstName;
      r["{nom_famille_apprenant}"] = trainee.lastName;
      r["{email_apprenant}"] = trainee.email;
      r["{entreprise_apprenant}"] = trainee.company || "";
    }
  }

  // Organization
  const settings = await storage.getOrganizationSettings();
  const m = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  r["{nom_organisme}"] = m["org_name"] || "SO'SAFE Formation";
  r["{adresse_organisme}"] = m["org_address"] || "";
  r["{siret_organisme}"] = m["org_siret"] || "";
  r["{email_organisme}"] = m["org_email"] || "";
  r["{telephone_organisme}"] = m["org_phone"] || "";

  for (const [key, value] of Object.entries(r)) {
    out = out.replaceAll(key, value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleSendEmail(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  if (!rule.templateId) throw new Error("templateId manquant sur la règle");

  const template = await storage.getEmailTemplate(rule.templateId);
  if (!template) throw new Error(`Template email ${rule.templateId} introuvable`);

  // Resolve recipient
  let recipient = "";
  if (ctx.traineeId) {
    const trainee = await storage.getTrainee(ctx.traineeId);
    if (trainee) recipient = trainee.email;
  }
  if (!recipient) throw new Error("Aucun destinataire trouvable");

  const subject = await resolveVariables(template.subject, ctx);
  const body = await resolveVariables(template.body, ctx);

  // Create email log (ready to be sent by an SMTP worker)
  const log = await storage.createEmailLog({
    templateId: rule.templateId,
    recipient,
    subject,
    body,
    status: "pending",
  });

  return `Email créé (log ${log.id}) pour ${recipient}`;
}

async function handleGenerateDocument(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  if (!rule.templateId) throw new Error("templateId manquant sur la règle");

  const template = await storage.getDocumentTemplate(rule.templateId);
  if (!template) throw new Error(`Template document ${rule.templateId} introuvable`);

  const content = await resolveVariables(template.content, ctx);

  const doc = await storage.createGeneratedDocument({
    templateId: rule.templateId,
    sessionId: ctx.sessionId || null,
    traineeId: ctx.traineeId || null,
    title: template.name,
    type: template.type,
    content,
    status: "generated",
  });

  return `Document "${template.name}" généré (${doc.id})`;
}

async function handleCreateAttendance(
  _rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  if (!ctx.sessionId) throw new Error("sessionId manquant");

  const session = await storage.getSession(ctx.sessionId);
  if (!session) throw new Error("Session introuvable");

  // Create one attendance sheet per day of the session
  const start = new Date(session.startDate);
  const end = new Date(session.endDate);
  const created: string[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];

    // Check if sheet already exists for that date
    const existing = await storage.getAttendanceSheets(ctx.sessionId);
    if (existing.some((s) => s.date === dateStr)) continue;

    const sheet = await storage.createAttendanceSheet({
      sessionId: ctx.sessionId,
      date: dateStr,
      period: "journee",
    });
    created.push(sheet.id);
  }

  return created.length > 0
    ? `${created.length} feuille(s) d'émargement créée(s)`
    : "Feuilles d'émargement déjà existantes";
}

async function handleSendSurvey(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  // Combines email sending with a survey link concept
  // Uses the email template to send a satisfaction survey invitation
  if (!rule.templateId) throw new Error("templateId manquant sur la règle");
  // Delegate to the email handler — the template should contain the survey link
  return handleSendEmail(rule, ctx);
}

// ---------------------------------------------------------------------------
// Core engine: execute a single rule
// ---------------------------------------------------------------------------

async function executeRule(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<void> {
  const exec = async () => {
    try {
      let message: string;
      switch (rule.action) {
        case "send_email":
          message = await handleSendEmail(rule, ctx);
          break;
        case "generate_document":
          message = await handleGenerateDocument(rule, ctx);
          break;
        case "create_attendance":
          message = await handleCreateAttendance(rule, ctx);
          break;
        case "send_survey":
          message = await handleSendSurvey(rule, ctx);
          break;
        default:
          throw new Error(`Action inconnue: ${rule.action}`);
      }

      await storage.createAutomationLog({
        ruleId: rule.id,
        event: rule.event,
        action: rule.action,
        status: "success",
        targetType: ctx.traineeId ? "trainee" : ctx.sessionId ? "session" : null,
        targetId: ctx.traineeId || ctx.sessionId || null,
        details: { message, context: ctx },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error(`[automation] Rule ${rule.id} (${rule.name}) failed:`, errorMessage);

      await storage.createAutomationLog({
        ruleId: rule.id,
        event: rule.event,
        action: rule.action,
        status: "error",
        targetType: ctx.traineeId ? "trainee" : ctx.sessionId ? "session" : null,
        targetId: ctx.traineeId || ctx.sessionId || null,
        details: { context: ctx },
        error: errorMessage,
      });
    }
  };

  // Respect configured delay (stored in minutes, 0 = immediate)
  const delayMs = (rule.delay || 0) * 60_000;
  if (delayMs > 0) {
    setTimeout(exec, delayMs);
  } else {
    await exec();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Trigger all active automation rules matching the given event.
 * Fire-and-forget: errors are logged, never thrown to the caller.
 */
export async function triggerAutomation(
  event: string,
  ctx: AutomationContext,
): Promise<void> {
  try {
    const rules = await storage.getAutomationRulesByEvent(event);
    if (rules.length === 0) return;

    // Check conditions for each rule
    const applicableRules = rules.filter((rule) => {
      const cond = rule.conditions as Record<string, unknown> | null;
      if (!cond || Object.keys(cond).length === 0) return true;

      // Simple condition matching against context meta
      if (cond.programId && ctx.programId && cond.programId !== ctx.programId) return false;
      if (cond.sessionId && ctx.sessionId && cond.sessionId !== ctx.sessionId) return false;

      return true;
    });

    console.log(`[automation] Event "${event}" → ${applicableRules.length} rule(s) to execute`);

    // Execute rules — for enrollment events, iterate per trainee if needed
    for (const rule of applicableRules) {
      await executeRule(rule, ctx);
    }
  } catch (err) {
    console.error(`[automation] triggerAutomation("${event}") failed:`, err);
  }
}

/**
 * Manually execute a single rule with the given context.
 * Used by admins to re-trigger automations (e.g. resend a document).
 */
export async function executeRuleManually(
  ruleId: string,
  ctx: AutomationContext,
): Promise<{ success: boolean; message: string }> {
  const rule = await storage.getAutomationRule(ruleId);
  if (!rule) return { success: false, message: "Règle introuvable" };

  try {
    let message: string;
    switch (rule.action) {
      case "send_email":
        message = await handleSendEmail(rule, ctx);
        break;
      case "generate_document":
        message = await handleGenerateDocument(rule, ctx);
        break;
      case "create_attendance":
        message = await handleCreateAttendance(rule, ctx);
        break;
      case "send_survey":
        message = await handleSendSurvey(rule, ctx);
        break;
      default:
        throw new Error(`Action inconnue: ${rule.action}`);
    }

    await storage.createAutomationLog({
      ruleId: rule.id,
      event: "manual_trigger",
      action: rule.action,
      status: "success",
      targetType: ctx.traineeId ? "trainee" : ctx.sessionId ? "session" : null,
      targetId: ctx.traineeId || ctx.sessionId || null,
      details: { message, context: ctx, manual: true },
    });

    return { success: true, message };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";

    await storage.createAutomationLog({
      ruleId: rule.id,
      event: "manual_trigger",
      action: rule.action,
      status: "error",
      targetType: ctx.traineeId ? "trainee" : ctx.sessionId ? "session" : null,
      targetId: ctx.traineeId || ctx.sessionId || null,
      details: { context: ctx, manual: true },
      error: errorMessage,
    });

    return { success: false, message: errorMessage };
  }
}

/**
 * Trigger enrollment cascade for all enrolled trainees of a session.
 * Used for session-level events (session_starting, session_completed).
 */
export async function triggerSessionAutomation(
  event: string,
  sessionId: string,
): Promise<void> {
  const session = await storage.getSession(sessionId);
  if (!session) return;

  const enrollments = await storage.getEnrollments(sessionId);
  const activeEnrollments = enrollments.filter(
    (e) => e.status !== "cancelled" && e.status !== "no_show"
  );

  // Trigger session-level rules (no trainee — e.g. create_attendance)
  await triggerAutomation(event, {
    sessionId,
    programId: session.programId,
  });

  // Trigger per-trainee rules (e.g. send_email, generate_document)
  for (const enrollment of activeEnrollments) {
    await triggerAutomation(event, {
      enrollmentId: enrollment.id,
      sessionId,
      traineeId: enrollment.traineeId,
      programId: session.programId,
    });
  }
}
