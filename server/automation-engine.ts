import { storage } from "./storage";
import { sendEmailNow } from "./email-service";
import { sendSmsNow } from "./sms-service";
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
  quoteId?: string;
  enterpriseId?: string;
  documentId?: string;
  attendanceRecordId?: string;
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

  // Session + Program + Trainer
  if (ctx.sessionId) {
    const session = await storage.getSession(ctx.sessionId);
    if (session) {
      r["{titre_session}"] = session.title;
      r["{date_debut}"] = new Date(session.startDate).toLocaleDateString("fr-FR");
      r["{date_fin}"] = new Date(session.endDate).toLocaleDateString("fr-FR");
      r["{lieu}"] = session.location || "";
      r["{modalite}"] = session.modality;
      r["{adresse_lieu}"] = session.locationAddress || "";
      r["{salle}"] = session.locationRoom || "";
      r["{url_classe_virtuelle}"] = session.virtualClassUrl || "";
      r["{max_participants}"] = String(session.maxParticipants || "");

      // Conditional booleans based on session modality
      const mod = session.modality?.toLowerCase() || "";
      r["{modalite_presentiel}"] = mod === "presentiel" ? "true" : "";
      r["{modalite_distanciel}"] = mod === "distanciel" ? "true" : "";
      r["{modalite_mixte}"] = mod === "blended" ? "true" : "";

      const program = await storage.getProgram(session.programId);
      if (program) {
        r["{titre_formation}"] = program.title;
        r["{duree_formation}"] = `${program.duration} heures`;
        r["{prix_formation}"] = `${program.price} EUR`;
        r["{objectifs_formation}"] = program.objectives || "";
        r["{prerequis_formation}"] = program.prerequisites || "";
        r["{niveau_formation}"] = program.level || "";
        r["{public_cible}"] = program.targetAudience || "";
        r["{methodes_pedagogiques}"] = program.teachingMethods || "";
        r["{contenu_formation}"] = program.programContent || "";
        r["{est_certifiante}"] = program.certifying ? "true" : "";
      }

      // Trainer variables
      if (session.trainerId) {
        const trainer = await storage.getTrainer(session.trainerId);
        if (trainer) {
          r["{nom_formateur}"] = `${trainer.firstName} ${trainer.lastName}`;
          r["{email_formateur}"] = trainer.email;
        }
      }
    }
  }

  // Trainee
  let trainee: Awaited<ReturnType<typeof storage.getTrainee>> | undefined;
  if (ctx.traineeId) {
    trainee = await storage.getTrainee(ctx.traineeId);
    if (trainee) {
      r["{nom_apprenant}"] = `${trainee.firstName} ${trainee.lastName}`;
      r["{prenom_apprenant}"] = trainee.firstName;
      r["{nom_famille_apprenant}"] = trainee.lastName;
      r["{email_apprenant}"] = trainee.email;
      r["{entreprise_apprenant}"] = trainee.company || "";
      r["{profile_type_apprenant}"] = trainee.profileType || "";
      r["{profession_apprenant}"] = trainee.profession || "";
      r["{adresse_apprenant}"] = trainee.address || "";
      r["{ville_apprenant}"] = trainee.city || "";
      r["{code_postal_apprenant}"] = trainee.postalCode || "";
      r["{pays_apprenant}"] = trainee.country || "France";
      // Build formatted postal address block
      const addrParts = [
        `${trainee.civility ? trainee.civility + " " : ""}${trainee.firstName} ${trainee.lastName}`,
        trainee.address,
        `${trainee.postalCode || ""} ${trainee.city || ""}`.trim(),
        trainee.country && trainee.country !== "France" ? trainee.country : "",
      ].filter(Boolean);
      r["{adresse_complete_apprenant}"] = addrParts.join("\n");
    }
  }

  // Enrollment
  if (ctx.enrollmentId) {
    const enrollment = await storage.getEnrollment(ctx.enrollmentId);
    if (enrollment) {
      r["{date_inscription}"] = enrollment.enrolledAt
        ? new Date(enrollment.enrolledAt).toLocaleDateString("fr-FR")
        : "";
      r["{statut_inscription}"] = enrollment.status || "";
    }
  }

  // Enterprise (from ctx.enterpriseId or trainee.enterpriseId)
  const enterpriseId = ctx.enterpriseId || trainee?.enterpriseId;
  if (enterpriseId) {
    const enterprise = await storage.getEnterprise(enterpriseId);
    if (enterprise) {
      r["{nom_entreprise}"] = enterprise.name;
      r["{contact_entreprise}"] = enterprise.contactName || "";
      r["{email_entreprise}"] = enterprise.contactEmail || "";
    }
  }

  // Contract / particulier / VAE variables
  r["{date_du_jour}"] = new Date().toLocaleDateString("fr-FR");
  r["{date_signature}"] = new Date().toLocaleDateString("fr-FR");
  if (trainee) {
    r["{civilite_apprenant}"] = trainee.civility || "";
    r["{date_naissance_apprenant}"] = trainee.dateOfBirth
      ? new Date(trainee.dateOfBirth).toLocaleDateString("fr-FR")
      : "";
    r["{adresse_apprenant}"] = "";
    r["{telephone_apprenant}"] = trainee.phone || "";
    r["{est_particulier}"] = trainee.profileType === "particulier" ? "true" : "";
  }
  // Quote variables
  if (ctx.quoteId) {
    const quote = await storage.getQuote(ctx.quoteId);
    if (quote) {
      r["{numero_devis}"] = quote.number;
      r["{montant_devis}"] = `${(quote.total / 100).toFixed(2)} EUR`;
      r["{montant_ht}"] = `${(quote.subtotal / 100).toFixed(2)} EUR`;
      r["{montant_tva}"] = `${(quote.taxAmount / 100).toFixed(2)} EUR`;
      r["{montant_ttc}"] = `${(quote.total / 100).toFixed(2)} EUR`;
      r["{taux_tva}"] = `${(quote.taxRate / 100).toFixed(2)}%`;
      r["{date_validite_devis}"] = quote.validUntil
        ? new Date(quote.validUntil).toLocaleDateString("fr-FR") : "";
      r["{notes_devis}"] = quote.notes || "";
      // Build line items HTML table
      const lines = (quote.lineItems || []).map(
        (li) => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${(li.unitPrice / 100).toFixed(2)} EUR</td><td>${(li.total / 100).toFixed(2)} EUR</td></tr>`
      ).join("");
      r["{lignes_devis}"] = lines
        ? `<table><thead><tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>`
        : "";
    }
  }
  // Subcontracting variables (from trainer / session)
  if (ctx.sessionId) {
    const sessionForTrainer = await storage.getSession(ctx.sessionId);
    if (sessionForTrainer?.trainerId) {
      const trainer = await storage.getTrainer(sessionForTrainer.trainerId);
      if (trainer) {
        r["{nom_sous_traitant}"] = `${trainer.firstName} ${trainer.lastName}`;
        r["{email_sous_traitant}"] = trainer.email;
        r["{telephone_sous_traitant}"] = trainer.phone || "";
        r["{specialite_sous_traitant}"] = trainer.specialty || "";
      }
    }
  }
  // VAE variables (resolved from program metadata or conditions)
  const programForVae = ctx.sessionId
    ? await (async () => {
        const s = await storage.getSession(ctx.sessionId!);
        return s ? storage.getProgram(s.programId) : undefined;
      })()
    : ctx.programId
    ? await storage.getProgram(ctx.programId)
    : undefined;
  if (programForVae) {
    r["{certification_visee}"] = programForVae.certifying ? programForVae.title : "";
    r["{diplome_vise}"] = programForVae.title;
    r["{duree_accompagnement}"] = `${programForVae.duration} heures`;
    r["{tarif_accompagnement}"] = `${programForVae.price} EUR`;
    r["{est_vae}"] = "";
  }
  r["{modalites_paiement}"] = "";
  r["{delai_retractation}"] = "10 jours";
  r["{organisme_certificateur}"] = "";

  // Invoice variables
  if (ctx.invoiceId) {
    const invoice = await storage.getInvoice(ctx.invoiceId);
    if (invoice) {
      r["{numero_facture}"] = invoice.number;
      r["{titre_facture}"] = invoice.title;
      r["{facture_montant_ht}"] = `${(invoice.subtotal / 100).toFixed(2)} EUR`;
      r["{facture_montant_tva}"] = `${(invoice.taxAmount / 100).toFixed(2)} EUR`;
      r["{facture_montant_ttc}"] = `${(invoice.total / 100).toFixed(2)} EUR`;
      r["{facture_taux_tva}"] = `${(invoice.taxRate / 100).toFixed(2)}%`;
      r["{facture_montant_paye}"] = `${(invoice.paidAmount / 100).toFixed(2)} EUR`;
      r["{facture_reste_du}"] = `${((invoice.total - invoice.paidAmount) / 100).toFixed(2)} EUR`;
      r["{facture_date_echeance}"] = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : "";
      r["{facture_statut}"] = invoice.status;
      r["{facture_notes}"] = invoice.notes || "";
      const invLines = (invoice.lineItems || []).map(
        (li) => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${(li.unitPrice / 100).toFixed(2)} EUR</td><td>${(li.total / 100).toFixed(2)} EUR</td></tr>`
      ).join("");
      r["{facture_lignes}"] = invLines
        ? `<table><thead><tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>${invLines}</tbody></table>`
        : "";
      // Resolve linked quote number
      if (invoice.quoteId) {
        const linkedQuote = await storage.getQuote(invoice.quoteId);
        r["{facture_numero_devis}"] = linkedQuote?.number || "";
      }
    }
  }

  // Formation type conditionals (from session modality)
  if (ctx.sessionId) {
    const sessionForModality = await storage.getSession(ctx.sessionId);
    if (sessionForModality) {
      const mod = sessionForModality.modality?.toLowerCase() || "";
      r["{est_blended}"] = mod === "blended" || mod === "mixte" ? "true" : "";
      r["{est_standard}"] = mod === "presentiel" ? "true" : "";
      r["{est_specifique}"] = mod !== "presentiel" && mod !== "distanciel" && mod !== "blended" && mod !== "mixte" ? "true" : "";
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

  // Substitute all variables
  for (const [key, value] of Object.entries(r)) {
    out = out.replaceAll(key, value);
  }

  // Process conditional blocks: {{#if variable_name}}content{{/if}}
  out = processConditionalBlocks(out, r);

  return out;
}

/**
 * Process conditional blocks in template text.
 * Syntax: {{#if variable_name}}content{{/if}}
 * If the variable is non-empty and not "false", the content is kept; otherwise removed.
 * No nesting support.
 */
function processConditionalBlocks(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName: string, content: string) => {
      // Look up the variable by its template key form {var_name}
      const value = vars[`{${varName}}`] || "";
      return value && value !== "false" ? content : "";
    },
  );
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function resolveTemplateId(rule: AutomationRule, ctx: AutomationContext): string {
  if (!rule.templateId) throw new Error("templateId manquant sur la règle");
  const overrides = (rule.templateOverrides || {}) as Record<string, string>;
  if (ctx.programId && overrides[ctx.programId]) {
    return overrides[ctx.programId];
  }
  return rule.templateId;
}

async function handleSendEmail(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  const effectiveTemplateId = resolveTemplateId(rule, ctx);

  const template = await storage.getEmailTemplate(effectiveTemplateId);
  if (!template) throw new Error(`Template email ${effectiveTemplateId} introuvable`);

  // Resolve recipient
  let recipient = "";
  if (ctx.traineeId) {
    const trainee = await storage.getTrainee(ctx.traineeId);
    if (trainee) recipient = trainee.email;
  }
  if (!recipient) throw new Error("Aucun destinataire trouvable");

  const subject = await resolveVariables(template.subject, ctx);
  const body = await resolveVariables(template.body, ctx);

  // Create email log and attempt immediate send
  const log = await storage.createEmailLog({
    templateId: effectiveTemplateId,
    recipient,
    subject,
    body,
    status: "pending",
  });

  // Fire-and-forget: the worker will retry on failure
  try { await sendEmailNow(log.id); } catch {}

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

async function handleSendEmailEnterprise(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  const effectiveTemplateId = resolveTemplateId(rule, ctx);

  const template = await storage.getEmailTemplate(effectiveTemplateId);
  if (!template) throw new Error(`Template email ${effectiveTemplateId} introuvable`);

  // Resolve enterprise recipient
  let recipient = "";
  const enterpriseId = ctx.enterpriseId || (ctx.traineeId ? (await storage.getTrainee(ctx.traineeId))?.enterpriseId : undefined);
  if (enterpriseId) {
    const enterprise = await storage.getEnterprise(enterpriseId);
    if (enterprise) recipient = enterprise.contactEmail || "";
  }
  if (!recipient) throw new Error("Aucun email entreprise trouvable");

  const subject = await resolveVariables(template.subject, ctx);
  const body = await resolveVariables(template.body, ctx);

  const log = await storage.createEmailLog({
    templateId: effectiveTemplateId,
    recipient,
    subject,
    body,
    status: "pending",
  });

  // Fire-and-forget: the worker will retry on failure
  try { await sendEmailNow(log.id); } catch {}

  return `Email entreprise créé (log ${log.id}) pour ${recipient}`;
}

async function handleGenerateDocumentAndSend(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  // Step 1: Generate the document
  const docMessage = await handleGenerateDocument(rule, ctx);

  // Step 2: If an email template is specified in conditions, also send an email
  const cond = rule.conditions as Record<string, unknown> | null;
  const emailTemplateId = cond?.emailTemplateId as string | undefined;
  if (emailTemplateId) {
    const emailTemplate = await storage.getEmailTemplate(emailTemplateId);
    if (emailTemplate) {
      let recipient = "";
      if (ctx.traineeId) {
        const trainee = await storage.getTrainee(ctx.traineeId);
        if (trainee) recipient = trainee.email;
      }
      if (recipient) {
        const subject = await resolveVariables(emailTemplate.subject, ctx);
        const body = await resolveVariables(emailTemplate.body, ctx);
        const emailLog = await storage.createEmailLog({
          templateId: emailTemplateId,
          recipient,
          subject,
          body,
          status: "pending",
        });
        // Fire-and-forget: the worker will retry on failure
        try { await sendEmailNow(emailLog.id); } catch {}
      }
    }
  }

  return docMessage + " (+ envoi email)";
}

async function handleCreateInvoice(
  _rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  // Resolve session and program for line items
  let sessionTitle = "Formation";
  let price = 0;
  let enterpriseId = ctx.enterpriseId;

  if (ctx.sessionId) {
    const session = await storage.getSession(ctx.sessionId);
    if (session) {
      sessionTitle = session.title;
      if (!enterpriseId && ctx.traineeId) {
        const trainee = await storage.getTrainee(ctx.traineeId);
        enterpriseId = trainee?.enterpriseId || undefined;
      }
      const program = await storage.getProgram(session.programId);
      if (program) {
        price = program.price || 0;
      }
    }
  }

  const invoiceNumber = await storage.getNextInvoiceNumber();
  const lineItems = [
    {
      description: sessionTitle,
      quantity: 1,
      unitPrice: price,
      total: price,
    },
  ];
  const subtotal = price;
  const taxRate = 2000; // 20%
  const taxAmount = Math.round(subtotal * taxRate / 10000);
  const total = subtotal + taxAmount;

  const invoice = await storage.createInvoice({
    number: invoiceNumber,
    title: `Facture - ${sessionTitle}`,
    enterpriseId: enterpriseId || null,
    sessionId: ctx.sessionId || null,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    paidAmount: 0,
    status: "draft",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  });

  return `Facture ${invoiceNumber} créée (${invoice.id})`;
}

async function handleBlockCertificate(
  _rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  if (!ctx.enrollmentId) throw new Error("enrollmentId manquant");

  const enrollment = await storage.getEnrollment(ctx.enrollmentId);
  if (!enrollment) throw new Error(`Enrollment ${ctx.enrollmentId} introuvable`);

  await storage.updateEnrollment(ctx.enrollmentId, { certificateBlocked: true } as any);

  return `Certificat bloqué pour l'inscription ${ctx.enrollmentId}`;
}

async function handleSendSms(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  const effectiveTemplateId = resolveTemplateId(rule, ctx);

  const template = await storage.getSmsTemplate(effectiveTemplateId);
  if (!template) throw new Error(`Template SMS ${effectiveTemplateId} introuvable`);

  // Resolve recipient phone
  let recipient = "";
  if (ctx.traineeId) {
    const trainee = await storage.getTrainee(ctx.traineeId);
    if (trainee) recipient = trainee.phone || "";
  }
  if (!recipient) throw new Error("Aucun numéro de téléphone trouvable");

  const body = await resolveVariables(template.body, ctx);

  const smsLog = await storage.createSmsLog({
    templateId: effectiveTemplateId,
    recipient,
    body,
    status: "pending",
  });

  try { await sendSmsNow(smsLog.id); } catch {}

  return `SMS créé (log ${smsLog.id}) pour ${recipient}`;
}

async function handleSendSmsEnterprise(
  rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  const effectiveTemplateId = resolveTemplateId(rule, ctx);

  const template = await storage.getSmsTemplate(effectiveTemplateId);
  if (!template) throw new Error(`Template SMS ${effectiveTemplateId} introuvable`);

  // Resolve enterprise recipient phone
  let recipient = "";
  const enterpriseId = ctx.enterpriseId || (ctx.traineeId ? (await storage.getTrainee(ctx.traineeId))?.enterpriseId : undefined);
  if (enterpriseId) {
    const enterprise = await storage.getEnterprise(enterpriseId);
    if (enterprise) recipient = enterprise.contactPhone || enterprise.phone || "";
  }
  if (!recipient) throw new Error("Aucun téléphone entreprise trouvable");

  const body = await resolveVariables(template.body, ctx);

  const smsLog = await storage.createSmsLog({
    templateId: effectiveTemplateId,
    recipient,
    body,
    status: "pending",
  });

  try { await sendSmsNow(smsLog.id); } catch {}

  return `SMS entreprise créé (log ${smsLog.id}) pour ${recipient}`;
}

async function handleGenerateConvention(
  _rule: AutomationRule,
  ctx: AutomationContext,
): Promise<string> {
  const templates = await storage.getDocumentTemplates();
  const conventionTemplate = templates.find(t => t.type === "convention");
  if (!conventionTemplate) throw new Error("Aucun modèle de convention trouvé");

  const content = await resolveVariables(conventionTemplate.content, ctx);
  const enterpriseId = ctx.enterpriseId || (ctx.traineeId ? (await storage.getTrainee(ctx.traineeId))?.enterpriseId : undefined);

  const doc = await storage.createGeneratedDocument({
    templateId: conventionTemplate.id,
    sessionId: ctx.sessionId || null,
    traineeId: ctx.traineeId || null,
    enterpriseId: enterpriseId || null,
    quoteId: ctx.quoteId || null,
    title: `Convention de formation`,
    type: "convention",
    content,
    status: "generated",
    visibility: "enterprise",
    sharedAt: new Date(),
  });

  return `Convention "${doc.title}" générée (${doc.id})`;
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
        case "send_email_enterprise":
          message = await handleSendEmailEnterprise(rule, ctx);
          break;
        case "generate_document_and_send":
          message = await handleGenerateDocumentAndSend(rule, ctx);
          break;
        case "create_invoice":
          message = await handleCreateInvoice(rule, ctx);
          break;
        case "block_certificate":
          message = await handleBlockCertificate(rule, ctx);
          break;
        case "generate_convention":
          message = await handleGenerateConvention(rule, ctx);
          break;
        case "send_sms":
          message = await handleSendSms(rule, ctx);
          break;
        case "send_sms_enterprise":
          message = await handleSendSmsEnterprise(rule, ctx);
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

    // Pre-load trainee and program for condition checks
    let traineeForConditions: Awaited<ReturnType<typeof storage.getTrainee>> | undefined;
    let programForConditions: Awaited<ReturnType<typeof storage.getProgram>> | undefined;
    if (ctx.traineeId) {
      traineeForConditions = await storage.getTrainee(ctx.traineeId);
    }
    if (ctx.programId) {
      programForConditions = await storage.getProgram(ctx.programId);
    }

    // Check conditions for each rule
    const applicableRules = rules.filter((rule) => {
      const cond = rule.conditions as Record<string, unknown> | null;
      if (!cond || Object.keys(cond).length === 0) return true;

      // Simple condition matching against context meta
      if (cond.programId && ctx.programId && cond.programId !== ctx.programId) return false;
      if (cond.sessionId && ctx.sessionId && cond.sessionId !== ctx.sessionId) return false;

      // Profile type condition
      if (cond.profileType && traineeForConditions) {
        if (traineeForConditions.profileType !== cond.profileType) return false;
      }

      // Program category condition
      if (cond.programCategory && programForConditions) {
        const cats = (programForConditions.categories as string[]) || [];
        if (!cats.includes(cond.programCategory as string)) return false;
      }

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
      case "send_email_enterprise":
        message = await handleSendEmailEnterprise(rule, ctx);
        break;
      case "generate_document_and_send":
        message = await handleGenerateDocumentAndSend(rule, ctx);
        break;
      case "create_invoice":
        message = await handleCreateInvoice(rule, ctx);
        break;
      case "block_certificate":
        message = await handleBlockCertificate(rule, ctx);
        break;
      case "generate_convention":
        message = await handleGenerateConvention(rule, ctx);
        break;
      case "send_sms":
        message = await handleSendSms(rule, ctx);
        break;
      case "send_sms_enterprise":
        message = await handleSendSmsEnterprise(rule, ctx);
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
