import type { Express } from "express";
import { createServer, type Server } from "http";
import Busboy from "busboy";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords, requireAuth, requireRole } from "./auth";
import {
  insertTrainerSchema, insertTraineeSchema, insertProgramSchema,
  insertSessionSchema, insertEnrollmentSchema, insertEnterpriseSchema,
  insertEmailTemplateSchema, insertEmailLogSchema,
  insertDocumentTemplateSchema, insertGeneratedDocumentSchema,
  insertProspectSchema, insertQuoteSchema, insertInvoiceSchema, insertPaymentSchema,
  insertElearningModuleSchema, insertElearningBlockSchema, insertQuizQuestionSchema, insertLearnerProgressSchema,
  insertSurveyTemplateSchema, insertSurveyResponseSchema,
  insertQualityActionSchema,
  insertAttendanceSheetSchema, insertAttendanceRecordSchema,
  insertAutomationRuleSchema, insertOrganizationSettingSchema,
  insertEnterpriseContactSchema, insertTrainerDocumentSchema, insertTrainerEvaluationSchema,
  insertUserDocumentSchema, insertSignatureSchema,
  insertExpenseNoteSchema,
  loginSchema, registerSchema,
  TEMPLATE_VARIABLES,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setupAuth(app);

  // ============================================================
  // FILE UPLOAD (busboy)
  // ============================================================

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ALLOWED_MIMETYPES = [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  app.post("/api/upload", (req, res) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Content-Type doit être multipart/form-data" });
    }

    let fileHandled = false;
    let fileInfo: { fileUrl: string; fileName: string; fileSize: number; mimeType: string } | null = null;
    let writeStream: fs.WriteStream | null = null;
    let filePath = "";

    const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });

    busboy.on("file", (fieldname, stream, info) => {
      const { filename: originalName, mimeType } = info;
      fileHandled = true;

      if (!ALLOWED_MIMETYPES.includes(mimeType)) {
        stream.resume(); // drain
        return;
      }

      const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
      const ext = path.extname(originalName);
      const savedName = uniqueSuffix + ext;
      filePath = path.join(uploadsDir, savedName);
      let size = 0;

      writeStream = fs.createWriteStream(filePath);
      stream.on("data", (chunk: Buffer) => { size += chunk.length; });
      stream.pipe(writeStream);

      stream.on("end", () => {
        fileInfo = {
          fileUrl: `/uploads/${savedName}`,
          fileName: originalName,
          fileSize: size,
          mimeType,
        };
      });

      stream.on("limit", () => {
        writeStream?.destroy();
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fileInfo = null;
      });
    });

    busboy.on("finish", () => {
      if (!fileHandled) {
        return res.status(400).json({ message: "Aucun fichier envoyé" });
      }
      if (!fileInfo) {
        return res.status(400).json({ message: "Type de fichier non autorisé ou fichier trop volumineux" });
      }
      res.json(fileInfo);
    });

    busboy.on("error", (err: Error) => {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(500).json({ message: err.message || "Erreur lors de l'upload" });
    });

    req.pipe(busboy);
  });

  // ============================================================
  // AUTH ROUTES
  // ============================================================

  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) return res.status(409).json({ message: "Ce nom d'utilisateur existe déjà" });

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({
      username: parsed.data.username,
      password: hashedPassword,
      role: parsed.data.role,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email || null,
      trainerId: null,
      traineeId: null,
      enterpriseId: null,
    });

    req.session.userId = user.id;
    res.status(201).json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user) return res.status(401).json({ message: "Identifiants incorrects" });

    const valid = await comparePasswords(parsed.data.password, user.password);
    if (!valid) return res.status(401).json({ message: "Identifiants incorrects" });

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Erreur de déconnexion" });
      res.json({ message: "Déconnecté" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Non authentifié" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Utilisateur non trouvé" });
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, permissions: user.permissions || [], trainerId: user.trainerId, traineeId: user.traineeId, enterpriseId: user.enterpriseId });
  });

  // ============================================================
  // ENTERPRISES
  // ============================================================

  app.get("/api/enterprises", async (_req, res) => {
    const result = await storage.getEnterprises();
    res.json(result);
  });

  app.get("/api/enterprises/:id", async (req, res) => {
    const enterprise = await storage.getEnterprise(req.params.id);
    if (!enterprise) return res.status(404).json({ message: "Entreprise non trouvée" });
    res.json(enterprise);
  });

  app.post("/api/enterprises", async (req, res) => {
    const parsed = insertEnterpriseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enterprise = await storage.createEnterprise(parsed.data);
    res.status(201).json(enterprise);
  });

  app.patch("/api/enterprises/:id", async (req, res) => {
    const parsed = insertEnterpriseSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enterprise = await storage.updateEnterprise(req.params.id, parsed.data);
    if (!enterprise) return res.status(404).json({ message: "Entreprise non trouvée" });
    res.json(enterprise);
  });

  app.delete("/api/enterprises/:id", async (req, res) => {
    await storage.deleteEnterprise(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // TRAINERS
  // ============================================================

  app.get("/api/trainers", async (_req, res) => {
    const result = await storage.getTrainers();
    res.json(result);
  });

  app.get("/api/trainers/:id", async (req, res) => {
    const trainer = await storage.getTrainer(req.params.id);
    if (!trainer) return res.status(404).json({ message: "Formateur non trouvé" });
    res.json(trainer);
  });

  app.post("/api/trainers", async (req, res) => {
    const parsed = insertTrainerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trainer = await storage.createTrainer(parsed.data);
    res.status(201).json(trainer);
  });

  app.patch("/api/trainers/:id", async (req, res) => {
    const parsed = insertTrainerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trainer = await storage.updateTrainer(req.params.id, parsed.data);
    if (!trainer) return res.status(404).json({ message: "Formateur non trouvé" });
    res.json(trainer);
  });

  app.delete("/api/trainers/:id", async (req, res) => {
    await storage.deleteTrainer(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // TRAINEES
  // ============================================================

  app.get("/api/trainees", async (_req, res) => {
    const result = await storage.getTrainees();
    res.json(result);
  });

  app.get("/api/trainees/:id", async (req, res) => {
    const trainee = await storage.getTrainee(req.params.id);
    if (!trainee) return res.status(404).json({ message: "Stagiaire non trouvé" });
    res.json(trainee);
  });

  app.post("/api/trainees", async (req, res) => {
    const parsed = insertTraineeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trainee = await storage.createTrainee(parsed.data);
    res.status(201).json(trainee);
  });

  app.patch("/api/trainees/:id", async (req, res) => {
    const parsed = insertTraineeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trainee = await storage.updateTrainee(req.params.id, parsed.data);
    if (!trainee) return res.status(404).json({ message: "Stagiaire non trouvé" });
    res.json(trainee);
  });

  app.delete("/api/trainees/:id", async (req, res) => {
    await storage.deleteTrainee(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // PROGRAMS
  // ============================================================

  app.get("/api/programs", async (_req, res) => {
    const result = await storage.getPrograms();
    res.json(result);
  });

  app.get("/api/programs/:id", async (req, res) => {
    const program = await storage.getProgram(req.params.id);
    if (!program) return res.status(404).json({ message: "Formation non trouvée" });
    res.json(program);
  });

  app.post("/api/programs", async (req, res) => {
    const parsed = insertProgramSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const program = await storage.createProgram(parsed.data);
    res.status(201).json(program);
  });

  app.patch("/api/programs/:id", async (req, res) => {
    const parsed = insertProgramSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const program = await storage.updateProgram(req.params.id, parsed.data);
    if (!program) return res.status(404).json({ message: "Formation non trouvée" });
    res.json(program);
  });

  app.delete("/api/programs/:id", async (req, res) => {
    await storage.deleteProgram(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // SESSIONS
  // ============================================================

  app.get("/api/sessions", async (_req, res) => {
    const result = await storage.getSessions();
    res.json(result);
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session non trouvée" });
    res.json(session);
  });

  app.get("/api/sessions/:id/enrollment-count", async (req, res) => {
    const count = await storage.getEnrollmentCount(req.params.id);
    res.json({ count });
  });

  app.post("/api/sessions", async (req, res) => {
    const parsed = insertSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const session = await storage.createSession(parsed.data);
    res.status(201).json(session);
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    const parsed = insertSessionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const session = await storage.updateSession(req.params.id, parsed.data);
    if (!session) return res.status(404).json({ message: "Session non trouvée" });
    res.json(session);
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    await storage.deleteSession(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // ENROLLMENTS
  // ============================================================

  app.get("/api/enrollments", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const result = await storage.getEnrollments(sessionId);
    res.json(result);
  });

  app.post("/api/enrollments", async (req, res) => {
    const parsed = insertEnrollmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enrollment = await storage.createEnrollment(parsed.data);
    res.status(201).json(enrollment);
  });

  app.patch("/api/enrollments/:id", async (req, res) => {
    const parsed = insertEnrollmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enrollment = await storage.updateEnrollment(req.params.id, parsed.data);
    if (!enrollment) return res.status(404).json({ message: "Inscription non trouvée" });
    res.json(enrollment);
  });

  app.delete("/api/enrollments/:id", async (req, res) => {
    await storage.deleteEnrollment(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // EMAIL TEMPLATES
  // ============================================================

  app.get("/api/email-templates", async (_req, res) => {
    const result = await storage.getEmailTemplates();
    res.json(result);
  });

  app.get("/api/email-templates/:id", async (req, res) => {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json(template);
  });

  app.post("/api/email-templates", async (req, res) => {
    const parsed = insertEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.createEmailTemplate(parsed.data);
    res.status(201).json(template);
  });

  app.patch("/api/email-templates/:id", async (req, res) => {
    const parsed = insertEmailTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.updateEmailTemplate(req.params.id, parsed.data);
    if (!template) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json(template);
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    await storage.deleteEmailTemplate(req.params.id);
    res.status(204).send();
  });

  app.post("/api/email-templates/:id/preview", async (req, res) => {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Modèle non trouvé" });

    const exampleValues: Record<string, string> = {
      "{nom_apprenant}": "Jean Dupont",
      "{prenom_apprenant}": "Jean",
      "{nom_famille_apprenant}": "Dupont",
      "{email_apprenant}": "jean.dupont@example.com",
      "{entreprise_apprenant}": "Hôpital Saint-Louis",
      "{titre_session}": "AFGSU Niveau 1 - Session Mars",
      "{date_debut}": "15/03/2026",
      "{date_fin}": "17/03/2026",
      "{lieu}": "Paris - Centre de formation",
      "{modalite}": "Présentiel",
      "{titre_formation}": "AFGSU Niveau 1",
      "{duree_formation}": "14 heures",
      "{prix_formation}": "500 EUR",
      "{objectifs_formation}": "Maîtriser les gestes d'urgence",
      "{nom_organisme}": "SO'SAFE Formation",
      "{adresse_organisme}": "12 rue de la Santé, 75013 Paris",
      "{siret_organisme}": "123 456 789 00012",
      "{email_organisme}": "contact@sosafe.fr",
      "{telephone_organisme}": "01 23 45 67 89",
    };

    let renderedSubject = template.subject;
    let renderedBody = template.body;
    for (const [key, value] of Object.entries(exampleValues)) {
      renderedSubject = renderedSubject.replaceAll(key, value);
      renderedBody = renderedBody.replaceAll(key, value);
    }

    res.json({ subject: renderedSubject, body: renderedBody });
  });

  // ============================================================
  // EMAIL LOGS
  // ============================================================

  app.get("/api/email-logs", async (_req, res) => {
    const result = await storage.getEmailLogs();
    res.json(result);
  });

  app.post("/api/email-logs", async (req, res) => {
    const parsed = insertEmailLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createEmailLog(parsed.data);
    res.status(201).json(log);
  });

  // ============================================================
  // DOCUMENT TEMPLATES
  // ============================================================

  app.get("/api/document-templates", async (_req, res) => {
    const result = await storage.getDocumentTemplates();
    res.json(result);
  });

  app.get("/api/document-templates/:id", async (req, res) => {
    const template = await storage.getDocumentTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json(template);
  });

  app.post("/api/document-templates", async (req, res) => {
    const parsed = insertDocumentTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.createDocumentTemplate(parsed.data);
    res.status(201).json(template);
  });

  app.patch("/api/document-templates/:id", async (req, res) => {
    const parsed = insertDocumentTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.updateDocumentTemplate(req.params.id, parsed.data);
    if (!template) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json(template);
  });

  app.delete("/api/document-templates/:id", async (req, res) => {
    await storage.deleteDocumentTemplate(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // GENERATED DOCUMENTS
  // ============================================================

  app.get("/api/generated-documents", async (_req, res) => {
    const result = await storage.getGeneratedDocuments();
    res.json(result);
  });

  app.post("/api/documents/generate", async (req, res) => {
    const { templateId, sessionId, traineeId } = req.body;
    if (!templateId) return res.status(400).json({ message: "templateId requis" });

    const template = await storage.getDocumentTemplate(templateId);
    if (!template) return res.status(404).json({ message: "Modèle non trouvé" });

    let content = template.content;
    const replacements: Record<string, string> = {};

    if (sessionId) {
      const session = await storage.getSession(sessionId);
      if (session) {
        const program = await storage.getProgram(session.programId);
        replacements["{titre_session}"] = session.title;
        replacements["{date_debut}"] = new Date(session.startDate).toLocaleDateString("fr-FR");
        replacements["{date_fin}"] = new Date(session.endDate).toLocaleDateString("fr-FR");
        replacements["{lieu}"] = session.location || "";
        replacements["{modalite}"] = session.modality;
        if (program) {
          replacements["{titre_formation}"] = program.title;
          replacements["{duree_formation}"] = `${program.duration} heures`;
          replacements["{prix_formation}"] = `${program.price} EUR`;
          replacements["{objectifs_formation}"] = program.objectives || "";
        }
      }
    }

    if (traineeId) {
      const trainee = await storage.getTrainee(traineeId);
      if (trainee) {
        replacements["{nom_apprenant}"] = `${trainee.firstName} ${trainee.lastName}`;
        replacements["{prenom_apprenant}"] = trainee.firstName;
        replacements["{nom_famille_apprenant}"] = trainee.lastName;
        replacements["{email_apprenant}"] = trainee.email;
        replacements["{entreprise_apprenant}"] = trainee.company || "";
      }
    }

    const settings = await storage.getOrganizationSettings();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    replacements["{nom_organisme}"] = settingsMap["org_name"] || "SO'SAFE Formation";
    replacements["{adresse_organisme}"] = settingsMap["org_address"] || "";
    replacements["{siret_organisme}"] = settingsMap["org_siret"] || "";
    replacements["{email_organisme}"] = settingsMap["org_email"] || "";
    replacements["{telephone_organisme}"] = settingsMap["org_phone"] || "";

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(key, value);
    }

    const doc = await storage.createGeneratedDocument({
      templateId,
      sessionId: sessionId || null,
      traineeId: traineeId || null,
      title: template.name,
      type: template.type,
      content,
      status: "generated",
    });

    res.status(201).json(doc);
  });

  app.delete("/api/generated-documents/:id", async (req, res) => {
    await storage.deleteGeneratedDocument(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // PROSPECTS
  // ============================================================

  app.get("/api/prospects", async (_req, res) => {
    const result = await storage.getProspects();
    res.json(result);
  });

  app.get("/api/prospects/:id", async (req, res) => {
    const prospect = await storage.getProspect(req.params.id);
    if (!prospect) return res.status(404).json({ message: "Prospect non trouvé" });
    res.json(prospect);
  });

  app.post("/api/prospects", async (req, res) => {
    const parsed = insertProspectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const prospect = await storage.createProspect(parsed.data);
    res.status(201).json(prospect);
  });

  app.patch("/api/prospects/:id", async (req, res) => {
    const parsed = insertProspectSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const prospect = await storage.updateProspect(req.params.id, parsed.data);
    if (!prospect) return res.status(404).json({ message: "Prospect non trouvé" });
    res.json(prospect);
  });

  app.delete("/api/prospects/:id", async (req, res) => {
    await storage.deleteProspect(req.params.id);
    res.status(204).send();
  });

  app.post("/api/prospects/:id/convert", async (req, res) => {
    const prospect = await storage.getProspect(req.params.id);
    if (!prospect) return res.status(404).json({ message: "Prospect non trouvé" });

    const enterprise = await storage.createEnterprise({
      name: prospect.companyName,
      contactName: prospect.contactName,
      contactEmail: prospect.contactEmail,
      contactPhone: prospect.contactPhone,
      status: "active",
      siret: null,
      address: null,
      city: null,
      postalCode: null,
      sector: null,
      formatJuridique: null,
      tvaNumber: null,
      email: null,
      phone: null,
      legalRepName: null,
      legalRepEmail: null,
      legalRepPhone: null,
    });

    await storage.updateProspect(req.params.id, { status: "won" });
    res.status(201).json(enterprise);
  });

  // ============================================================
  // QUOTES
  // ============================================================

  app.get("/api/quotes", async (_req, res) => {
    const result = await storage.getQuotes();
    res.json(result);
  });

  app.get("/api/quotes/next-number", async (_req, res) => {
    const number = await storage.getNextQuoteNumber();
    res.json({ number });
  });

  app.get("/api/quotes/:id", async (req, res) => {
    const quote = await storage.getQuote(req.params.id);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    res.json(quote);
  });

  app.post("/api/quotes", async (req, res) => {
    const parsed = insertQuoteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const quote = await storage.createQuote(parsed.data);
    res.status(201).json(quote);
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    const parsed = insertQuoteSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const quote = await storage.updateQuote(req.params.id, parsed.data);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    res.json(quote);
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    await storage.deleteQuote(req.params.id);
    res.status(204).send();
  });

  app.post("/api/quotes/:id/convert-to-invoice", async (req, res) => {
    const quote = await storage.getQuote(req.params.id);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });

    const invoiceNumber = await storage.getNextInvoiceNumber();
    const invoice = await storage.createInvoice({
      number: invoiceNumber,
      title: quote.title,
      quoteId: quote.id,
      enterpriseId: quote.enterpriseId,
      sessionId: null,
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      paidAmount: 0,
      status: "draft",
      dueDate: null,
      notes: quote.notes,
    });

    await storage.updateQuote(req.params.id, { status: "accepted" });
    res.status(201).json(invoice);
  });

  // ============================================================
  // INVOICES
  // ============================================================

  app.get("/api/invoices", async (_req, res) => {
    const result = await storage.getInvoices();
    res.json(result);
  });

  app.get("/api/invoices/next-number", async (_req, res) => {
    const number = await storage.getNextInvoiceNumber();
    res.json({ number });
  });

  app.get("/api/invoices/stats", async (_req, res) => {
    const allInvoices = await storage.getInvoices();
    const total = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paid = allInvoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + inv.total, 0);
    const pending = allInvoices.filter(i => i.status === "sent" || i.status === "partial").reduce((sum, inv) => sum + inv.total - inv.paidAmount, 0);
    const overdue = allInvoices.filter(i => i.status === "overdue").reduce((sum, inv) => sum + inv.total - inv.paidAmount, 0);
    res.json({ total, paid, pending, overdue, count: allInvoices.length });
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    res.json(invoice);
  });

  app.post("/api/invoices", async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.createInvoice(parsed.data);
    res.status(201).json(invoice);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const parsed = insertInvoiceSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.updateInvoice(req.params.id, parsed.data);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    res.json(invoice);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    await storage.deleteInvoice(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // PAYMENTS
  // ============================================================

  app.get("/api/payments", async (req, res) => {
    const invoiceId = req.query.invoiceId as string | undefined;
    const result = await storage.getPayments(invoiceId);
    res.json(result);
  });

  app.post("/api/payments", async (req, res) => {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const payment = await storage.createPayment(parsed.data);

    // Update invoice paid amount
    const invoice = await storage.getInvoice(parsed.data.invoiceId);
    if (invoice) {
      const allPayments = await storage.getPayments(invoice.id);
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const newStatus = totalPaid >= invoice.total ? "paid" : "partial";
      await storage.updateInvoice(invoice.id, { paidAmount: totalPaid, status: newStatus });
    }

    res.status(201).json(payment);
  });

  // ============================================================
  // E-LEARNING MODULES
  // ============================================================

  app.get("/api/elearning-modules", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const result = await storage.getElearningModules(sessionId);
    res.json(result);
  });

  app.get("/api/elearning-modules/:id", async (req, res) => {
    const module = await storage.getElearningModule(req.params.id);
    if (!module) return res.status(404).json({ message: "Module non trouvé" });
    res.json(module);
  });

  app.post("/api/elearning-modules", async (req, res) => {
    const parsed = insertElearningModuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const module = await storage.createElearningModule(parsed.data);
    res.status(201).json(module);
  });

  app.patch("/api/elearning-modules/:id", async (req, res) => {
    const parsed = insertElearningModuleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const module = await storage.updateElearningModule(req.params.id, parsed.data);
    if (!module) return res.status(404).json({ message: "Module non trouvé" });
    res.json(module);
  });

  app.delete("/api/elearning-modules/:id", async (req, res) => {
    await storage.deleteElearningModule(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // E-LEARNING BLOCKS
  // ============================================================

  app.get("/api/elearning-blocks", async (req, res) => {
    const moduleId = req.query.moduleId as string;
    if (!moduleId) return res.status(400).json({ message: "moduleId requis" });
    const result = await storage.getElearningBlocks(moduleId);
    res.json(result);
  });

  app.post("/api/elearning-blocks", async (req, res) => {
    const parsed = insertElearningBlockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const block = await storage.createElearningBlock(parsed.data);
    res.status(201).json(block);
  });

  app.patch("/api/elearning-blocks/:id", async (req, res) => {
    const parsed = insertElearningBlockSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const block = await storage.updateElearningBlock(req.params.id, parsed.data);
    if (!block) return res.status(404).json({ message: "Bloc non trouvé" });
    res.json(block);
  });

  app.delete("/api/elearning-blocks/:id", async (req, res) => {
    await storage.deleteElearningBlock(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // QUIZ QUESTIONS
  // ============================================================

  app.get("/api/quiz-questions", async (req, res) => {
    const blockId = req.query.blockId as string;
    if (!blockId) return res.status(400).json({ message: "blockId requis" });
    const result = await storage.getQuizQuestions(blockId);
    res.json(result);
  });

  app.post("/api/quiz-questions", async (req, res) => {
    const parsed = insertQuizQuestionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const question = await storage.createQuizQuestion(parsed.data);
    res.status(201).json(question);
  });

  app.patch("/api/quiz-questions/:id", async (req, res) => {
    const parsed = insertQuizQuestionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const question = await storage.updateQuizQuestion(req.params.id, parsed.data);
    if (!question) return res.status(404).json({ message: "Question non trouvée" });
    res.json(question);
  });

  app.delete("/api/quiz-questions/:id", async (req, res) => {
    await storage.deleteQuizQuestion(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // LEARNER PROGRESS
  // ============================================================

  app.get("/api/learner-progress", async (req, res) => {
    const traineeId = req.query.traineeId as string;
    const moduleId = req.query.moduleId as string | undefined;
    if (!traineeId) return res.status(400).json({ message: "traineeId requis" });
    const result = await storage.getLearnerProgress(traineeId, moduleId);
    res.json(result);
  });

  app.post("/api/learner-progress", async (req, res) => {
    const parsed = insertLearnerProgressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const progress = await storage.createLearnerProgress(parsed.data);
    res.status(201).json(progress);
  });

  app.patch("/api/learner-progress/:id", async (req, res) => {
    const parsed = insertLearnerProgressSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const progress = await storage.updateLearnerProgress(req.params.id, parsed.data);
    if (!progress) return res.status(404).json({ message: "Progression non trouvée" });
    res.json(progress);
  });

  // ============================================================
  // SURVEY TEMPLATES
  // ============================================================

  app.get("/api/survey-templates", async (_req, res) => {
    const result = await storage.getSurveyTemplates();
    res.json(result);
  });

  app.get("/api/survey-templates/:id", async (req, res) => {
    const template = await storage.getSurveyTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Enquête non trouvée" });
    res.json(template);
  });

  app.post("/api/survey-templates", async (req, res) => {
    const parsed = insertSurveyTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.createSurveyTemplate(parsed.data);
    res.status(201).json(template);
  });

  app.patch("/api/survey-templates/:id", async (req, res) => {
    const parsed = insertSurveyTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.updateSurveyTemplate(req.params.id, parsed.data);
    if (!template) return res.status(404).json({ message: "Enquête non trouvée" });
    res.json(template);
  });

  app.delete("/api/survey-templates/:id", async (req, res) => {
    await storage.deleteSurveyTemplate(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // SURVEY RESPONSES
  // ============================================================

  app.get("/api/survey-responses", async (req, res) => {
    const surveyId = req.query.surveyId as string | undefined;
    const sessionId = req.query.sessionId as string | undefined;
    const result = await storage.getSurveyResponses(surveyId, sessionId);
    res.json(result);
  });

  app.get("/api/survey-responses/stats", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const responses = await storage.getSurveyResponses(undefined, sessionId);
    const ratings = responses.filter(r => r.rating != null).map(r => r.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    res.json({ totalResponses: responses.length, averageRating: Math.round(avgRating * 10) / 10, ratingsCount: ratings.length });
  });

  app.post("/api/survey-responses", async (req, res) => {
    const parsed = insertSurveyResponseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const response = await storage.createSurveyResponse(parsed.data);
    res.status(201).json(response);
  });

  // ============================================================
  // QUALITY ACTIONS
  // ============================================================

  app.get("/api/quality-actions", async (_req, res) => {
    const result = await storage.getQualityActions();
    res.json(result);
  });

  app.get("/api/quality-actions/:id", async (req, res) => {
    const action = await storage.getQualityAction(req.params.id);
    if (!action) return res.status(404).json({ message: "Action non trouvée" });
    res.json(action);
  });

  app.post("/api/quality-actions", async (req, res) => {
    const parsed = insertQualityActionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const action = await storage.createQualityAction(parsed.data);
    res.status(201).json(action);
  });

  app.patch("/api/quality-actions/:id", async (req, res) => {
    const parsed = insertQualityActionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const action = await storage.updateQualityAction(req.params.id, parsed.data);
    if (!action) return res.status(404).json({ message: "Action non trouvée" });
    res.json(action);
  });

  app.delete("/api/quality-actions/:id", async (req, res) => {
    await storage.deleteQualityAction(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // ATTENDANCE SHEETS
  // ============================================================

  app.get("/api/attendance-sheets", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const result = await storage.getAttendanceSheets(sessionId);
    res.json(result);
  });

  app.post("/api/attendance-sheets", async (req, res) => {
    const parsed = insertAttendanceSheetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const sheet = await storage.createAttendanceSheet(parsed.data);
    res.status(201).json(sheet);
  });

  app.patch("/api/attendance-sheets/:id", async (req, res) => {
    const parsed = insertAttendanceSheetSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const sheet = await storage.updateAttendanceSheet(req.params.id, parsed.data);
    if (!sheet) return res.status(404).json({ message: "Feuille non trouvée" });
    res.json(sheet);
  });

  app.delete("/api/attendance-sheets/:id", async (req, res) => {
    await storage.deleteAttendanceSheet(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // ATTENDANCE RECORDS
  // ============================================================

  app.get("/api/attendance-records", async (req, res) => {
    const sheetId = req.query.sheetId as string | undefined;
    const result = await storage.getAttendanceRecords(sheetId);
    res.json(result);
  });

  app.get("/api/attendance-records/report", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const sheets = await storage.getAttendanceSheets(sessionId);
    const allRecords: Array<{ sheetId: string; traineeId: string; status: string; signedAt: Date | null }> = [];
    for (const sheet of sheets) {
      const records = await storage.getAttendanceRecords(sheet.id);
      allRecords.push(...records.map(r => ({ sheetId: r.sheetId, traineeId: r.traineeId, status: r.status, signedAt: r.signedAt })));
    }
    const total = allRecords.length;
    const present = allRecords.filter(r => r.status === "present").length;
    const absent = allRecords.filter(r => r.status === "absent").length;
    const late = allRecords.filter(r => r.status === "late").length;
    res.json({ total, present, absent, late, rate: total > 0 ? Math.round((present / total) * 100) : 0, sheets: sheets.length });
  });

  app.post("/api/attendance-records", async (req, res) => {
    const parsed = insertAttendanceRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const record = await storage.createAttendanceRecord(parsed.data);
    res.status(201).json(record);
  });

  app.patch("/api/attendance-records/:id", async (req, res) => {
    const parsed = insertAttendanceRecordSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const record = await storage.updateAttendanceRecord(req.params.id, parsed.data);
    if (!record) return res.status(404).json({ message: "Enregistrement non trouvé" });
    res.json(record);
  });

  // ============================================================
  // AUTOMATION RULES
  // ============================================================

  app.get("/api/automation-rules", async (_req, res) => {
    const result = await storage.getAutomationRules();
    res.json(result);
  });

  app.post("/api/automation-rules", async (req, res) => {
    const parsed = insertAutomationRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const rule = await storage.createAutomationRule(parsed.data);
    res.status(201).json(rule);
  });

  app.patch("/api/automation-rules/:id", async (req, res) => {
    const parsed = insertAutomationRuleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const rule = await storage.updateAutomationRule(req.params.id, parsed.data);
    if (!rule) return res.status(404).json({ message: "Règle non trouvée" });
    res.json(rule);
  });

  app.delete("/api/automation-rules/:id", async (req, res) => {
    await storage.deleteAutomationRule(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // ORGANIZATION SETTINGS
  // ============================================================

  app.get("/api/settings", async (_req, res) => {
    const result = await storage.getOrganizationSettings();
    const settingsMap = Object.fromEntries(result.map(s => [s.key, s.value]));
    res.json(settingsMap);
  });

  app.patch("/api/settings", async (req, res) => {
    const settings = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(settings)) {
      await storage.upsertOrganizationSetting({ key, value });
    }
    const result = await storage.getOrganizationSettings();
    const settingsMap = Object.fromEntries(result.map(s => [s.key, s.value]));
    res.json(settingsMap);
  });

  // ============================================================
  // USERS (for admin settings page)
  // ============================================================

  app.get("/api/users", async (_req, res) => {
    const result = await storage.getUsers();
    res.json(result.map(u => ({ id: u.id, username: u.username, role: u.role, firstName: u.firstName, lastName: u.lastName, email: u.email, permissions: u.permissions || [] })));
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role requis" });
    const user = await storage.updateUser(req.params.id, { role });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName });
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { permissions, role } = req.body;
    const updateData: Record<string, unknown> = {};
    if (permissions !== undefined) updateData.permissions = permissions;
    if (role !== undefined) updateData.role = role;
    const user = await storage.updateUser(req.params.id, updateData as any);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, permissions: user.permissions });
  });

  // ============================================================
  // ENTERPRISE CONTACTS
  // ============================================================

  app.get("/api/enterprises/:id/contacts", async (req, res) => {
    const contacts = await storage.getEnterpriseContacts(req.params.id);
    res.json(contacts);
  });

  app.post("/api/enterprises/:id/contacts", async (req, res) => {
    const parsed = insertEnterpriseContactSchema.safeParse({ ...req.body, enterpriseId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const contact = await storage.createEnterpriseContact(parsed.data);
    res.status(201).json(contact);
  });

  app.patch("/api/enterprise-contacts/:id", async (req, res) => {
    const parsed = insertEnterpriseContactSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const contact = await storage.updateEnterpriseContact(req.params.id, parsed.data);
    if (!contact) return res.status(404).json({ message: "Contact non trouvé" });
    res.json(contact);
  });

  app.delete("/api/enterprise-contacts/:id", async (req, res) => {
    await storage.deleteEnterpriseContact(req.params.id);
    res.status(204).send();
  });

  app.get("/api/enterprises/:id/enrollments", async (req, res) => {
    const enrollmentsList = await storage.getEnrollmentsByEnterprise(req.params.id);
    res.json(enrollmentsList);
  });

  // ============================================================
  // SESSION TRAINEES (Trombinoscope)
  // ============================================================

  app.get("/api/sessions/:id/trainees", async (req, res) => {
    const traineesList = await storage.getTraineesBySession(req.params.id);
    res.json(traineesList);
  });

  // ============================================================
  // TRAINER DOCUMENTS
  // ============================================================

  app.get("/api/trainers/:id/documents", async (req, res) => {
    const docs = await storage.getTrainerDocuments(req.params.id);
    res.json(docs);
  });

  app.post("/api/trainers/:id/documents", async (req, res) => {
    const parsed = insertTrainerDocumentSchema.safeParse({ ...req.body, trainerId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.createTrainerDocument(parsed.data);
    res.status(201).json(doc);
  });

  app.patch("/api/trainer-documents/:id", async (req, res) => {
    const parsed = insertTrainerDocumentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.updateTrainerDocument(req.params.id, parsed.data);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });
    res.json(doc);
  });

  app.delete("/api/trainer-documents/:id", async (req, res) => {
    await storage.deleteTrainerDocument(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // TRAINER EVALUATIONS
  // ============================================================

  app.get("/api/trainers/:id/evaluations", async (req, res) => {
    const evals = await storage.getTrainerEvaluations(req.params.id);
    res.json(evals);
  });

  app.post("/api/trainers/:id/evaluations", async (req, res) => {
    const parsed = insertTrainerEvaluationSchema.safeParse({ ...req.body, trainerId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const evaluation = await storage.createTrainerEvaluation(parsed.data);
    res.status(201).json(evaluation);
  });

  app.get("/api/trainers/:id/sessions", async (req, res) => {
    const trainerSessions = await storage.getSessionsByTrainer(req.params.id);
    res.json(trainerSessions);
  });

  // ============================================================
  // SURVEY RESPONSES - Admin override
  // ============================================================

  app.patch("/api/survey-responses/:id", async (req, res) => {
    const parsed = insertSurveyResponseSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const response = await storage.updateSurveyResponse(req.params.id, parsed.data);
    if (!response) return res.status(404).json({ message: "Réponse non trouvée" });
    res.json(response);
  });

  // ============================================================
  // USER DOCUMENTS (Phase 5)
  // ============================================================

  app.get("/api/user-documents", async (req, res) => {
    const ownerId = req.query.ownerId as string;
    const ownerType = req.query.ownerType as string | undefined;
    if (!ownerId) return res.status(400).json({ message: "ownerId requis" });
    const docs = await storage.getUserDocuments(ownerId, ownerType);
    res.json(docs);
  });

  app.post("/api/user-documents", async (req, res) => {
    const parsed = insertUserDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.createUserDocument(parsed.data);
    res.status(201).json(doc);
  });

  app.delete("/api/user-documents/:id", async (req, res) => {
    await storage.deleteUserDocument(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // SIGNATURES (Phase 5)
  // ============================================================

  app.get("/api/signatures", async (req, res) => {
    const signerId = req.query.signerId as string;
    if (!signerId) return res.status(400).json({ message: "signerId requis" });
    const sigs = await storage.getSignatures(signerId);
    res.json(sigs);
  });

  app.post("/api/signatures", async (req, res) => {
    const parsed = insertSignatureSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const sig = await storage.createSignature(parsed.data);
    res.status(201).json(sig);
  });

  // ============================================================
  // EXPENSE NOTES
  // ============================================================

  app.get("/api/trainers/:id/expense-notes", async (req, res) => {
    const notes = await storage.getExpenseNotes(req.params.id);
    res.json(notes);
  });

  app.post("/api/trainers/:id/expense-notes", async (req, res) => {
    const parsed = insertExpenseNoteSchema.safeParse({ ...req.body, trainerId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.createExpenseNote(parsed.data);
    res.status(201).json(note);
  });

  app.patch("/api/expense-notes/:id", async (req, res) => {
    const parsed = insertExpenseNoteSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.updateExpenseNote(req.params.id, parsed.data);
    if (!note) return res.status(404).json({ message: "Note de frais non trouvée" });
    res.json(note);
  });

  // ============================================================
  // ENTERPRISE-SPECIFIC ROUTES (Quotes & Invoices)
  // ============================================================

  app.get("/api/enterprises/:id/quotes", async (req, res) => {
    const result = await storage.getQuotesByEnterprise(req.params.id);
    res.json(result);
  });

  app.get("/api/enterprises/:id/invoices", async (req, res) => {
    const result = await storage.getInvoicesByEnterprise(req.params.id);
    res.json(result);
  });

  return httpServer;
}
