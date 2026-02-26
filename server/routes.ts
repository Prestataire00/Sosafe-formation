import type { Express } from "express";
import { createServer, type Server } from "http";
import Busboy from "busboy";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords, requireAuth, requireRole, requirePermission } from "./auth";
import { triggerAutomation, triggerSessionAutomation, executeRuleManually } from "./automation-engine";
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
  insertTrainerInvoiceSchema,
  insertTrainerCompetencySchema,
  insertProgramPrerequisiteSchema,
  insertTraineeCertificationSchema,
  loginSchema, registerSchema,
  TEMPLATE_VARIABLES,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setupAuth(app);

  const ALLOWED_MIMETYPES = [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // ============================================================
  // PUBLIC ROUTES (no auth required)
  // ============================================================

  // GET /api/public/sessions — available sessions with remaining spots
  app.get("/api/public/sessions", async (_req, res) => {
    try {
      const allSessions = await storage.getSessions();
      const activeSessions = allSessions.filter(s => s.status === "planned" || s.status === "ongoing");

      const results = [];
      for (const session of activeSessions) {
        const enrollmentCount = await storage.getEnrollmentCount(session.id);
        if (enrollmentCount >= session.maxParticipants) continue;

        const program = await storage.getProgram(session.programId);
        const prerequisites = program ? await storage.getProgramPrerequisites(program.id) : [];

        results.push({
          id: session.id,
          title: session.title,
          startDate: session.startDate,
          endDate: session.endDate,
          location: session.location,
          modality: session.modality,
          maxParticipants: session.maxParticipants,
          enrollmentCount,
          remainingSpots: session.maxParticipants - enrollmentCount,
          status: session.status,
          program: program ? {
            id: program.id,
            title: program.title,
            duration: program.duration,
            price: program.price,
            categories: program.categories,
            fundingTypes: program.fundingTypes,
            certifying: program.certifying,
            recyclingMonths: program.recyclingMonths,
          } : null,
          prerequisites: prerequisites.map(p => ({
            id: p.id,
            requiresRpps: p.requiresRpps,
            requiresDiploma: p.requiresDiploma,
            maxMonthsSinceCompletion: p.maxMonthsSinceCompletion,
            minMonthsSinceCompletion: p.minMonthsSinceCompletion,
            requiredProfessions: p.requiredProfessions,
            description: p.description,
          })),
        });
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des sessions" });
    }
  });

  // GET /api/public/check-email — auto-detect existing trainee by email
  app.get("/api/public/check-email", async (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ message: "Email requis" });

    const trainee = await storage.getTraineeByEmail(email);
    if (trainee) {
      res.json({
        exists: true,
        trainee: {
          firstName: trainee.firstName,
          lastName: trainee.lastName,
          phone: trainee.phone,
          company: trainee.company,
          rppsNumber: trainee.rppsNumber,
          profession: trainee.profession,
        },
      });
    } else {
      res.json({ exists: false });
    }
  });

  // GET /api/public/check-recycling — check certification validity for a trainee/program
  app.get("/api/public/check-recycling", async (req, res) => {
    try {
      const email = req.query.email as string;
      const programId = req.query.programId as string;
      if (!email || !programId) {
        return res.status(400).json({ message: "Email et programId requis" });
      }

      const trainee = await storage.getTraineeByEmail(email);
      if (!trainee) {
        return res.json({ found: false });
      }

      const program = await storage.getProgram(programId);
      if (!program) {
        return res.json({ found: false });
      }

      // Get certifications for this trainee
      const certifications = await storage.getTraineeCertifications(trainee.id);

      // Find certifications matching this program or its category
      const matchingCerts = certifications.filter(c =>
        c.programId === programId ||
        (program.categories && c.label && (program.categories as string[]).some(cat =>
          c.label.toLowerCase().includes(cat.toLowerCase())
        ))
      );

      if (matchingCerts.length === 0) {
        return res.json({ found: false });
      }

      // Get the most recent certification
      const latestCert = matchingCerts.sort((a, b) =>
        new Date(b.obtainedAt).getTime() - new Date(a.obtainedAt).getTime()
      )[0];

      const obtainedDate = new Date(latestCert.obtainedAt);
      const now = new Date();
      const recyclingMonths = program.recyclingMonths || 48;

      // Month-to-month calculation: add recyclingMonths to obtainedDate
      const expiryDate = new Date(obtainedDate);
      expiryDate.setMonth(expiryDate.getMonth() + recyclingMonths);

      const isValid = now < expiryDate;

      // Calculate remaining months
      const remainingMs = expiryDate.getTime() - now.getTime();
      const remainingMonths = Math.floor(remainingMs / (1000 * 60 * 60 * 24 * 30.44));

      res.json({
        found: true,
        certification: {
          id: latestCert.id,
          label: latestCert.label,
          obtainedAt: latestCert.obtainedAt,
          expiresAt: expiryDate.toISOString().split("T")[0],
          status: latestCert.status,
          isValid,
          remainingMonths: isValid ? remainingMonths : 0,
          recyclingMonths,
        },
      });
    } catch (error) {
      console.error("Check recycling error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification" });
    }
  });

  // POST /api/public/enrollments — public enrollment
  app.post("/api/public/enrollments", async (req, res) => {
    try {
      const { sessionId, firstName, lastName, email, phone, company, documents, rppsNumber, profession } = req.body;

      // Validate required fields
      if (!sessionId || !firstName || !lastName || !email) {
        return res.status(400).json({ message: "Les champs sessionId, firstName, lastName et email sont requis" });
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Format d'email invalide" });
      }

      // Validate RPPS format if provided (Issue 3)
      if (rppsNumber && !/^\d{11}$/.test(rppsNumber)) {
        return res.status(400).json({ message: "Le numéro RPPS doit contenir exactement 11 chiffres" });
      }

      // Check session exists and is available
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session non trouvée" });
      }
      if (session.status !== "planned" && session.status !== "ongoing") {
        return res.status(400).json({ message: "Cette session n'accepte plus les inscriptions" });
      }

      // Check remaining spots
      const enrollmentCount = await storage.getEnrollmentCount(sessionId);
      if (enrollmentCount >= session.maxParticipants) {
        return res.status(400).json({ message: "Cette session est complète" });
      }

      // Find or create trainee
      let trainee = await storage.getTraineeByEmail(email);
      if (trainee) {
        // Update phone/company/rpps/profession if provided
        const updates: Record<string, string> = {};
        if (phone && !trainee.phone) updates.phone = phone;
        if (company && !trainee.company) updates.company = company;
        if (rppsNumber) updates.rppsNumber = rppsNumber;
        if (profession && !trainee.profession) updates.profession = profession;
        if (Object.keys(updates).length > 0) {
          await storage.updateTrainee(trainee.id, updates);
        }
      } else {
        trainee = await storage.createTrainee({
          firstName,
          lastName,
          email,
          phone: phone || null,
          company: company || null,
          rppsNumber: rppsNumber || null,
          profession: profession || null,
          status: "active",
        });
      }

      // Validate prerequisites (Issue 1 — non-blocking warnings)
      const program = await storage.getProgram(session.programId);
      const prerequisites = program ? await storage.getProgramPrerequisites(program.id) : [];
      const prerequisitesWarnings: string[] = [];

      for (const prereq of prerequisites) {
        if (prereq.requiresRpps && !trainee.rppsNumber && !rppsNumber) {
          prerequisitesWarnings.push("Numéro RPPS requis mais non renseigné");
        }
        if (prereq.requiredProfessions && Array.isArray(prereq.requiredProfessions) && prereq.requiredProfessions.length > 0) {
          const traineeProfession = trainee.profession || profession;
          if (!traineeProfession || !(prereq.requiredProfessions as string[]).includes(traineeProfession)) {
            prerequisitesWarnings.push(`Profession requise : ${(prereq.requiredProfessions as string[]).join(", ")}`);
          }
        }
        if (prereq.requiresDiploma && (!documents || !Array.isArray(documents) || documents.length === 0)) {
          prerequisitesWarnings.push("Un diplôme ou justificatif est requis mais aucun document n'a été fourni");
        }
        if (prereq.requiredProgramId || prereq.requiredCategory) {
          const certifications = await storage.getTraineeCertifications(trainee.id);
          const matchingCert = certifications.find(c => {
            if (prereq.requiredProgramId && c.programId === prereq.requiredProgramId) return true;
            if (prereq.requiredCategory && c.label && c.label.toLowerCase().includes((prereq.requiredCategory as string).toLowerCase())) return true;
            return false;
          });
          if (!matchingCert) {
            prerequisitesWarnings.push(
              prereq.requiredCategory
                ? `Certification requise dans la catégorie "${prereq.requiredCategory}" non trouvée`
                : "Certification prérequise non trouvée"
            );
          } else if (prereq.maxMonthsSinceCompletion && matchingCert.obtainedAt) {
            const obtainedDate = new Date(matchingCert.obtainedAt);
            const expiryDate = new Date(obtainedDate);
            expiryDate.setMonth(expiryDate.getMonth() + prereq.maxMonthsSinceCompletion);
            if (new Date() > expiryDate) {
              prerequisitesWarnings.push("La certification prérequise a expiré");
            }
          }
        }
      }

      // Check for duplicate enrollment
      const existingEnrollments = await storage.getEnrollments(sessionId);
      const alreadyEnrolled = existingEnrollments.some(e => e.traineeId === trainee!.id && e.status !== "cancelled");
      if (alreadyEnrolled) {
        return res.status(409).json({ message: "Vous êtes déjà inscrit(e) à cette session" });
      }

      // Create enrollment
      const enrollment = await storage.createEnrollment({
        sessionId,
        traineeId: trainee.id,
        status: "pending",
      });

      // Create user documents if provided
      const documentIds: string[] = [];
      if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
          if (doc.title && doc.fileUrl) {
            const userDoc = await storage.createUserDocument({
              ownerId: trainee.id,
              ownerType: "trainee",
              title: doc.title,
              fileName: doc.fileName || null,
              fileUrl: doc.fileUrl,
              fileSize: doc.fileSize || null,
              mimeType: doc.mimeType || null,
              category: "justificatif",
              uploadedBy: null,
            });

            documentIds.push(userDoc.id);

            // Set linkedSessionId and trigger AI analysis (fire-and-forget)
            await storage.updateUserDocument(userDoc.id, { linkedSessionId: sessionId });
            import("./ai-document").then(m => m.processDocumentValidation(userDoc.id, trainee.id, sessionId)).catch((err) => {
              console.error(`AI analysis failed for document ${userDoc.id}:`, err);
            });
          }
        }
      }

      res.status(201).json({
        message: "Inscription enregistrée avec succès",
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
        },
        session: {
          title: session.title,
          startDate: session.startDate,
          endDate: session.endDate,
          location: session.location,
          modality: session.modality,
        },
        program: program ? { title: program.title } : null,
        documentIds,
        prerequisitesWarnings,
      });

      // Fire-and-forget: trigger cascade automations for new enrollment
      triggerAutomation("enrollment_created", {
        enrollmentId: enrollment.id,
        sessionId,
        traineeId: trainee.id,
        programId: session.programId,
      }).catch(err => console.error("[automation] enrollment_created trigger error:", err));
    } catch (error) {
      console.error("Public enrollment error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  // POST /api/public/upload — public file upload (no auth)
  app.post("/api/public/upload", (req, res) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Content-Type doit être multipart/form-data" });
    }

    let fileHandled = false;
    let fileMeta: { originalName: string; mimeType: string; savedName: string } | null = null;
    let chunks: Buffer[] = [];
    let size = 0;
    let limitExceeded = false;

    const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });

    busboy.on("file", (fieldname, stream, info) => {
      const { filename: originalName, mimeType } = info;
      fileHandled = true;

      if (!ALLOWED_MIMETYPES.includes(mimeType)) {
        stream.resume();
        return;
      }

      const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
      const ext = path.extname(originalName);
      const savedName = uniqueSuffix + ext;

      fileMeta = { originalName, mimeType, savedName };

      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      stream.on("limit", () => {
        limitExceeded = true;
        chunks = [];
        fileMeta = null;
      });
    });

    busboy.on("finish", async () => {
      if (!fileHandled) {
        return res.status(400).json({ message: "Aucun fichier envoyé" });
      }
      if (!fileMeta || limitExceeded) {
        return res.status(400).json({ message: "Type de fichier non autorisé ou fichier trop volumineux" });
      }

      const buffer = Buffer.concat(chunks);
      chunks = [];

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, fileMeta.savedName), buffer);

      res.json({
        fileUrl: `/uploads/${fileMeta.savedName}`,
        fileName: fileMeta.originalName,
        fileSize: size,
        mimeType: fileMeta.mimeType,
      });
    });

    busboy.on("error", (err: Error) => {
      res.status(500).json({ message: err.message || "Erreur lors de l'upload" });
    });

    req.pipe(busboy);
  });

  // GET /api/public/documents/:id/status — public document AI status (Issue 2)
  app.get("/api/public/documents/:id/status", async (req, res) => {
    try {
      const doc = await storage.getUserDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document non trouvé" });
      }
      res.json({
        id: doc.id,
        status: doc.status,
        aiStatus: doc.aiStatus,
        aiExtractedDate: doc.aiExtractedDate,
        aiConfidence: doc.aiConfidence,
        aiError: doc.aiError,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération du statut" });
    }
  });

  // ============================================================
  // ROUTE PERMISSION MIDDLEWARE
  // Applied via app.use() to preserve Express type inference
  // ============================================================

  // Auth-only routes (portals, shared resources)
  app.use("/api/upload", requireAuth);
  app.use("/api/user-documents", requireAuth);
  app.use("/api/signatures", requireAuth);
  app.use("/api/trainer-documents", requireAuth);
  app.use("/api/trainer-invoices", requireAuth);
  app.use("/api/trainer-competencies", requireAuth);
  app.use("/api/expense-notes", requireAuth);

  // Trainer routes: requireAuth for all, requirePermission only for CRUD (not portal sub-routes)
  app.use("/api/trainers", requireAuth, (req, res, next) => {
    // Portal sub-routes (/api/trainers/:id/sessions, /documents, etc.) skip permission check
    const parts = req.path.split("/").filter(Boolean);
    if (parts.length > 1) return next();
    // Main CRUD routes need manage_trainers permission
    requirePermission("manage_trainers")(req, res, next);
  });

  // Enterprise routes: requireAuth for all, enterprise users can access their own sub-routes
  app.use("/api/enterprises", requireAuth, async (req, res, next) => {
    // Sub-routes (/api/enterprises/:id/...) - allow enterprise users to access their own data
    const parts = req.path.split("/").filter(Boolean);
    if (parts.length > 1 && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user && user.role === "enterprise" && user.enterpriseId === parts[0]) {
        return next();
      }
    }
    // Main CRUD routes need manage_enterprises permission
    requirePermission("manage_enterprises")(req, res, next);
  });
  app.use("/api/enterprise-contacts", requireAuth, requirePermission("manage_enterprises"));
  app.use("/api/trainees", requireAuth, requirePermission("manage_trainees"));
  app.use("/api/programs", requireAuth, requirePermission("manage_programs"));
  app.use("/api/sessions", requireAuth, requirePermission("manage_sessions"));
  app.use("/api/enrollments", requireAuth, requirePermission("manage_enrollments"));
  app.use("/api/email-templates", requireAuth, requirePermission("manage_templates"));
  app.use("/api/email-logs", requireAuth, requirePermission("manage_templates"));
  app.use("/api/document-templates", requireAuth, requirePermission("manage_documents"));
  app.use("/api/generated-documents", requireAuth, requirePermission("manage_documents"));
  app.use("/api/documents", requireAuth, requirePermission("manage_documents"));
  app.use("/api/prospects", requireAuth, requirePermission("manage_prospects"));
  app.use("/api/quotes", requireAuth, requirePermission("manage_quotes"));
  app.use("/api/invoices", requireAuth, requirePermission("manage_invoices"));
  app.use("/api/payments", requireAuth, requirePermission("manage_invoices"));
  app.use("/api/elearning-modules", requireAuth, requirePermission("manage_elearning"));
  app.use("/api/elearning-blocks", requireAuth, requirePermission("manage_elearning"));
  app.use("/api/quiz-questions", requireAuth, requirePermission("manage_elearning"));
  app.use("/api/learner-progress", requireAuth, requirePermission("manage_elearning"));
  app.use("/api/survey-templates", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/survey-responses", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/quality-actions", requireAuth, requirePermission("manage_quality_actions"));
  app.use("/api/attendance-sheets", requireAuth, requirePermission("manage_attendance"));
  app.use("/api/attendance-records", requireAuth, requirePermission("manage_attendance"));
  app.use("/api/automation-rules", requireAuth, requirePermission("manage_automation"));
  app.use("/api/automation-logs", requireAuth, requirePermission("manage_automation"));
  app.use("/api/settings", requireAuth, requirePermission("manage_settings"));
  app.use("/api/users", requireAuth, requirePermission("manage_users"));
  app.use("/api/program-prerequisites", requireAuth, requirePermission("manage_programs"));
  app.use("/api/trainee-certifications", requireAuth, requirePermission("manage_trainees"));

  // ============================================================
  // FILE UPLOAD (busboy → Supabase Storage)
  // ============================================================

  app.post("/api/upload", (req, res) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Content-Type doit être multipart/form-data" });
    }

    let fileHandled = false;
    let fileMeta: { originalName: string; mimeType: string; savedName: string } | null = null;
    let chunks: Buffer[] = [];
    let size = 0;
    let limitExceeded = false;

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

      fileMeta = { originalName, mimeType, savedName };

      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      stream.on("limit", () => {
        limitExceeded = true;
        chunks = [];
        fileMeta = null;
      });
    });

    busboy.on("finish", async () => {
      if (!fileHandled) {
        return res.status(400).json({ message: "Aucun fichier envoyé" });
      }
      if (!fileMeta || limitExceeded) {
        return res.status(400).json({ message: "Type de fichier non autorisé ou fichier trop volumineux" });
      }

      const buffer = Buffer.concat(chunks);
      chunks = [];

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, fileMeta.savedName), buffer);

      res.json({
        fileUrl: `/uploads/${fileMeta.savedName}`,
        fileName: fileMeta.originalName,
        fileSize: size,
        mimeType: fileMeta.mimeType,
      });
    });

    busboy.on("error", (err: Error) => {
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

    const identifier = parsed.data.username;
    const user = identifier.includes("@")
      ? await storage.getUserByEmail(identifier)
      : await storage.getUserByUsername(identifier);
    if (!user) return res.status(401).json({ message: "Identifiants incorrects" });

    const valid = await comparePasswords(parsed.data.password, user.password);
    if (!valid) return res.status(401).json({ message: "Identifiants incorrects" });

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, permissions: user.permissions || [], trainerId: user.trainerId, traineeId: user.traineeId, enterpriseId: user.enterpriseId });
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
    const { password, ...trainerData } = req.body;
    const parsed = insertTrainerSchema.safeParse(trainerData);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const trainer = await storage.createTrainer(parsed.data);

    // Auto-create user account if password provided (uses trainer email as login)
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Mot de passe trop court (min 6 caractères)" });
      }
      if (!parsed.data.email) {
        return res.status(400).json({ message: "L'email est requis pour créer un compte d'accès" });
      }
      const existingByEmail = await storage.getUserByEmail(parsed.data.email);
      const existingByUsername = await storage.getUserByUsername(parsed.data.email);
      if (existingByEmail || existingByUsername) {
        return res.status(409).json({ message: "Un compte existe déjà avec cet email" });
      }
      const hashedPassword = await hashPassword(password);
      await storage.createUser({
        username: parsed.data.email,
        password: hashedPassword,
        role: "trainer",
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        trainerId: trainer.id,
        traineeId: null,
        enterpriseId: null,
      });
    }

    res.status(201).json(trainer);
  });

  app.patch("/api/trainers/:id", async (req, res) => {
    const parsed = insertTrainerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trainer = await storage.updateTrainer(req.params.id, parsed.data);
    if (!trainer) return res.status(404).json({ message: "Formateur non trouvé" });
    res.json(trainer);
  });

  app.patch("/api/trainers/:id/password", async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Mot de passe requis (min 6 caractères)" });
    }
    const user = await storage.getUserByTrainerId(req.params.id);
    if (!user) return res.status(404).json({ message: "Aucun compte utilisateur associé à ce formateur" });
    const hashedPassword = await hashPassword(password);
    await storage.updateUser(user.id, { password: hashedPassword });
    res.json({ message: "Mot de passe modifié" });
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

  app.get("/api/programs/catalog-pdf", async (req, res) => {
    try {
      const allPrograms = await storage.getPrograms();
      const published = allPrograms.filter((p) => p.status === "published");

      // Optional category filter
      const categoriesParam = req.query.categories as string | undefined;
      let filtered = published;
      if (categoriesParam) {
        const cats = categoriesParam.split(",").map((c) => c.trim());
        filtered = published.filter((p) =>
          p.categories?.some((c) => cats.includes(c)),
        );
      }

      const settings = await storage.getOrganizationSettings();
      const { generateCatalogPdf } = await import("./catalog-pdf");
      const buffer = await generateCatalogPdf(filtered, settings);

      const orgSettings = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      const orgName = orgSettings["org_name"] || "Catalogue";
      const fileName = `Catalogue_Formations_${orgName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().getFullYear()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating catalog PDF:", error);
      res.status(500).json({ message: "Erreur lors de la génération du catalogue PDF" });
    }
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

    // Fire-and-forget: trigger cascade automations on session status change
    if (parsed.data.status) {
      const sessionEventMap: Record<string, string> = {
        ongoing: "session_starting",
        completed: "session_completed",
      };
      const event = sessionEventMap[parsed.data.status];
      if (event) {
        triggerSessionAutomation(event, session.id)
          .catch(err => console.error(`[automation] ${event} trigger error:`, err));
      }
    }
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

    // Check prerequisites and return warnings (non-blocking)
    const _warnings: string[] = [];
    try {
      const session = await storage.getSession(parsed.data.sessionId);
      if (session) {
        const prerequisites = await storage.getProgramPrerequisites(session.programId);
        if (prerequisites.length > 0) {
          const trainee = await storage.getTrainee(parsed.data.traineeId);
          if (trainee) {
            const traineeCerts = await storage.getTraineeCertifications(trainee.id);
            for (const prereq of prerequisites) {
              if (prereq.requiresRpps && !trainee.rppsNumber) {
                _warnings.push("N° RPPS requis mais non renseigné pour ce stagiaire");
              }
              if (prereq.requiredProfessions && (prereq.requiredProfessions as string[]).length > 0) {
                if (!trainee.profession || !(prereq.requiredProfessions as string[]).includes(trainee.profession)) {
                  _warnings.push(`Profession requise : ${(prereq.requiredProfessions as string[]).join(", ")}`);
                }
              }
              if (prereq.requiredProgramId || prereq.requiredCategory) {
                const matchingCert = traineeCerts.find(c => {
                  if (prereq.requiredProgramId && c.programId === prereq.requiredProgramId) return true;
                  if (prereq.requiredCategory && c.type.toLowerCase().includes(prereq.requiredCategory.toLowerCase())) return true;
                  return false;
                });
                if (!matchingCert) {
                  _warnings.push(prereq.description || "Certification préalable requise manquante");
                } else if (prereq.maxMonthsSinceCompletion && matchingCert.obtainedAt) {
                  const obtainedDate = new Date(matchingCert.obtainedAt);
                  const maxDate = new Date(obtainedDate);
                  maxDate.setMonth(maxDate.getMonth() + prereq.maxMonthsSinceCompletion);
                  if (new Date() > maxDate) {
                    _warnings.push(`Certification expirée (obtenue le ${matchingCert.obtainedAt}, validité ${prereq.maxMonthsSinceCompletion} mois)`);
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Don't block enrollment on prerequisite check errors
    }

    const enrollment = await storage.createEnrollment(parsed.data);
    res.status(201).json({ ...enrollment, _warnings });

    // Fire-and-forget: trigger cascade automations
    const _session = await storage.getSession(parsed.data.sessionId);
    triggerAutomation("enrollment_created", {
      enrollmentId: enrollment.id,
      sessionId: parsed.data.sessionId,
      traineeId: parsed.data.traineeId,
      programId: _session?.programId,
    }).catch(err => console.error("[automation] enrollment_created trigger error:", err));
  });

  app.patch("/api/enrollments/:id", async (req, res) => {
    const parsed = insertEnrollmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const enrollment = await storage.updateEnrollment(req.params.id, parsed.data);
    if (!enrollment) return res.status(404).json({ message: "Inscription non trouvée" });

    // Auto-create certification when enrollment is completed on a certifying program
    if (parsed.data.status === "completed") {
      if (enrollment.certificateBlocked) {
        console.log(`[enrollment] Certificate blocked for ${enrollment.id} — skipping certification`);
      } else try {
        const session = await storage.getSession(enrollment.sessionId);
        if (session) {
          const program = await storage.getProgram(session.programId);
          if (program && program.certifying) {
            const now = new Date().toISOString().split("T")[0];
            let expiresAt: string | null = null;
            if (program.recyclingMonths) {
              const expDate = new Date();
              expDate.setMonth(expDate.getMonth() + program.recyclingMonths);
              expiresAt = expDate.toISOString().split("T")[0];
            }
            // Derive certification type from program categories
            let certType = "autre";
            const cats = program.categories as string[] || [];
            if (cats.includes("AFGSU")) {
              certType = program.title.includes("2") ? "AFGSU2" : "AFGSU1";
            } else if (cats.includes("Certibiocide")) {
              certType = "Certibiocide";
            } else if (cats.includes("Certificat de décès")) {
              certType = "CertificatDeces";
            } else if (cats.includes("DPC")) {
              certType = "DPC";
            }
            await storage.createTraineeCertification({
              traineeId: enrollment.traineeId,
              programId: program.id,
              enrollmentId: enrollment.id,
              type: certType,
              label: program.title,
              obtainedAt: now,
              expiresAt,
              status: "valid",
              documentUrl: enrollment.certificateUrl,
            });
          }
        }
      } catch (e) {
        // Don't block enrollment update on certification creation error
        console.error("Error auto-creating certification:", e);
      }
    }

    res.json(enrollment);

    // Fire-and-forget: trigger cascade automations on status change
    if (parsed.data.status) {
      const statusEventMap: Record<string, string> = {
        confirmed: "enrollment_confirmed",
        completed: "enrollment_completed",
        cancelled: "enrollment_cancelled",
      };
      const event = statusEventMap[parsed.data.status];
      if (event) {
        const _session = await storage.getSession(enrollment.sessionId);
        triggerAutomation(event, {
          enrollmentId: enrollment.id,
          sessionId: enrollment.sessionId,
          traineeId: enrollment.traineeId,
          programId: _session?.programId,
        }).catch(err => console.error(`[automation] ${event} trigger error:`, err));
      }
    }
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
    const excused = allRecords.filter(r => r.status === "excused").length;
    res.json({
      totalRecords: total,
      present,
      absent,
      late,
      excused,
      percentPresent: total > 0 ? (present / total) * 100 : 0,
      percentAbsent: total > 0 ? (absent / total) * 100 : 0,
      percentLate: total > 0 ? (late / total) * 100 : 0,
      percentExcused: total > 0 ? (excused / total) * 100 : 0,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      sheets: sheets.length,
    });
  });

  app.post("/api/attendance-records", async (req, res) => {
    const parsed = insertAttendanceRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const record = await storage.createAttendanceRecord(parsed.data);
    res.status(201).json(record);

    // Fire-and-forget: trigger absence_detected if absent
    if (record.status === "absent" && record.sheetId) {
      try {
        const sheet = await storage.getAttendanceSheet(record.sheetId);
        if (sheet) {
          const session = await storage.getSession(sheet.sessionId);
          const allEnrollments = await storage.getEnrollments(sheet.sessionId);
          const enrollment = allEnrollments.find(e => e.traineeId === record.traineeId);
          triggerAutomation("absence_detected", {
            sessionId: sheet.sessionId,
            traineeId: record.traineeId,
            enrollmentId: enrollment?.id,
            programId: session?.programId,
            enterpriseId: enrollment?.enterpriseId || undefined,
            attendanceRecordId: record.id,
          }).catch(err => console.error("[automation] absence_detected trigger error:", err));
        }
      } catch (err) {
        console.error("[automation] attendance trigger error:", err);
      }
    }
  });

  app.patch("/api/attendance-records/:id", async (req, res) => {
    const parsed = insertAttendanceRecordSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const record = await storage.updateAttendanceRecord(req.params.id, parsed.data);
    if (!record) return res.status(404).json({ message: "Enregistrement non trouvé" });
    res.json(record);

    // Fire-and-forget: trigger absence_detected if status changed to absent
    if (parsed.data.status === "absent" && record.sheetId) {
      try {
        const sheet = await storage.getAttendanceSheet(record.sheetId);
        if (sheet) {
          const session = await storage.getSession(sheet.sessionId);
          const allEnrollments = await storage.getEnrollments(sheet.sessionId);
          const enrollment = allEnrollments.find(e => e.traineeId === record.traineeId);
          triggerAutomation("absence_detected", {
            sessionId: sheet.sessionId,
            traineeId: record.traineeId,
            enrollmentId: enrollment?.id,
            programId: session?.programId,
            enterpriseId: enrollment?.enterpriseId || undefined,
            attendanceRecordId: record.id,
          }).catch(err => console.error("[automation] absence_detected trigger error:", err));
        }
      } catch (err) {
        console.error("[automation] attendance trigger error:", err);
      }
    }
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

  // POST /api/automation-rules/:id/execute — manually trigger an automation rule
  app.post("/api/automation-rules/:id/execute", async (req, res) => {
    const { sessionId, traineeId, enrollmentId } = req.body;
    if (!sessionId && !traineeId) {
      return res.status(400).json({ message: "sessionId ou traineeId requis" });
    }

    let programId: string | undefined;
    if (sessionId) {
      const session = await storage.getSession(sessionId);
      programId = session?.programId;
    }

    const result = await executeRuleManually(req.params.id, {
      sessionId,
      traineeId,
      enrollmentId,
      programId,
    });

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ message: result.message });
    }
  });

  // GET /api/automation-logs — view execution history
  app.get("/api/automation-logs", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await storage.getAutomationLogs(limit);
    res.json(logs);
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
    res.json(result.map(u => ({ id: u.id, username: u.username, role: u.role, firstName: u.firstName, lastName: u.lastName, email: u.email, permissions: u.permissions || [], trainerId: u.trainerId, traineeId: u.traineeId, enterpriseId: u.enterpriseId })));
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role requis" });
    const user = await storage.updateUser(req.params.id, { role });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName });
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { permissions, role, trainerId, traineeId, enterpriseId } = req.body;
    const updateData: Record<string, unknown> = {};
    if (permissions !== undefined) updateData.permissions = permissions;
    if (role !== undefined) updateData.role = role;
    if (trainerId !== undefined) updateData.trainerId = trainerId;
    if (traineeId !== undefined) updateData.traineeId = traineeId;
    if (enterpriseId !== undefined) updateData.enterpriseId = enterpriseId;
    const user = await storage.updateUser(req.params.id, updateData as any);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, permissions: user.permissions, trainerId: user.trainerId, traineeId: user.traineeId, enterpriseId: user.enterpriseId });
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

  // GET /api/user-documents/:id — get single document with AI results
  app.get("/api/user-documents/:id", async (req, res) => {
    const doc = await storage.getUserDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });
    res.json(doc);
  });

  // PATCH /api/user-documents/:id — manual validation
  app.patch("/api/user-documents/:id", async (req, res) => {
    const { isManuallyValidated, validationNotes, status } = req.body;
    const updateData: Record<string, unknown> = {};

    if (typeof isManuallyValidated === "boolean") {
      updateData.isManuallyValidated = isManuallyValidated;
      if (isManuallyValidated) {
        updateData.status = "manually_validated";
        updateData.validatedBy = (req.session as any)?.userId || null;
        updateData.validatedAt = new Date();
      }
    }
    if (validationNotes !== undefined) updateData.validationNotes = validationNotes;
    if (status) updateData.status = status;

    const doc = await storage.updateUserDocument(req.params.id, updateData);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });
    res.json(doc);
  });

  // POST /api/user-documents/:id/reanalyze — re-run AI analysis
  app.post("/api/user-documents/:id/reanalyze", async (req, res) => {
    const doc = await storage.getUserDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });

    // Reset AI fields and re-trigger analysis
    await storage.updateUserDocument(doc.id, {
      aiStatus: "pending",
      status: "pending",
      aiError: null,
      aiExtractedDate: null,
      aiConfidence: null,
      aiRawResponse: null,
    });

    import("./ai-document").then(m => m.processDocumentValidation(doc.id, doc.ownerId, doc.linkedSessionId || undefined)).catch((err) => {
      console.error(`AI re-analysis failed for document ${doc.id}:`, err);
    });

    res.json({ message: "Analyse relancée" });
  });

  // GET /api/trainees/:id/documents — get trainee's justificatif documents
  app.get("/api/trainees/:id/documents", async (req, res) => {
    const docs = await storage.getUserDocuments(req.params.id, "trainee");
    res.json(docs);
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

    // Fire-and-forget: trigger cascade automations on signature
    try {
      const docType = parsed.data.documentType;
      if (docType === "quote" || docType === "devis") {
        // Resolve context from signer
        const traineeId = parsed.data.signerType === "trainee" ? parsed.data.signerId : undefined;
        let enterpriseId: string | undefined;
        if (traineeId) {
          const trainee = await storage.getTrainee(traineeId);
          enterpriseId = trainee?.enterpriseId || undefined;
        } else if (parsed.data.signerType === "enterprise") {
          enterpriseId = parsed.data.signerId;
        }
        // Resolve programId and sessionId from quote lineItems
        let programId: string | undefined;
        let sessionId: string | undefined;
        const quoteId = parsed.data.relatedId || undefined;
        if (quoteId) {
          const quote = await storage.getQuote(quoteId);
          if (quote?.lineItems && quote.lineItems.length > 0) {
            programId = quote.lineItems[0].programId;
          }
          if (programId) {
            const allSessions = await storage.getSessions();
            const activeSession = allSessions.find(
              (s) => s.programId === programId && s.status !== "cancelled"
            );
            if (activeSession) sessionId = activeSession.id;
          }
        }
        triggerAutomation("quote_signed", {
          quoteId,
          enterpriseId,
          traineeId,
          programId,
          sessionId,
        }).catch(err => console.error("[automation] quote_signed trigger error:", err));
      } else if (docType === "convention") {
        const traineeId = parsed.data.signerType === "trainee" ? parsed.data.signerId : undefined;
        let sessionId: string | undefined;
        let enterpriseId: string | undefined;
        // Try to resolve sessionId from the related document
        if (parsed.data.relatedId) {
          const doc = await storage.getGeneratedDocument(parsed.data.relatedId);
          if (doc) sessionId = doc.sessionId || undefined;
        }
        if (traineeId) {
          const trainee = await storage.getTrainee(traineeId);
          enterpriseId = trainee?.enterpriseId || undefined;
        } else if (parsed.data.signerType === "enterprise") {
          enterpriseId = parsed.data.signerId;
        }
        let programId: string | undefined;
        if (sessionId) {
          const session = await storage.getSession(sessionId);
          programId = session?.programId;
        }
        triggerAutomation("convention_signed", {
          documentId: parsed.data.relatedId || undefined,
          sessionId,
          traineeId,
          enterpriseId,
          programId,
        }).catch(err => console.error("[automation] convention_signed trigger error:", err));
      }
    } catch (err) {
      console.error("[automation] signature trigger error:", err);
    }
  });

  // ============================================================
  // EXPENSE NOTES
  // ============================================================

  app.get("/api/expense-notes", async (req, res) => {
    const notes = await storage.getAllExpenseNotes();
    res.json(notes);
  });

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
  // TRAINER INVOICES
  // ============================================================

  app.get("/api/trainer-invoices", async (req, res) => {
    const invoicesList = await storage.getAllTrainerInvoices();
    res.json(invoicesList);
  });

  app.get("/api/trainers/:id/invoices", async (req, res) => {
    const invoicesList = await storage.getTrainerInvoices(req.params.id);
    res.json(invoicesList);
  });

  app.post("/api/trainers/:id/invoices", async (req, res) => {
    const parsed = insertTrainerInvoiceSchema.safeParse({ ...req.body, trainerId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.createTrainerInvoice(parsed.data);
    res.status(201).json(invoice);
  });

  app.patch("/api/trainer-invoices/:id", async (req, res) => {
    const parsed = insertTrainerInvoiceSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.updateTrainerInvoice(req.params.id, parsed.data);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    res.json(invoice);
  });

  // ============================================================
  // TRAINER COMPETENCIES
  // ============================================================

  app.get("/api/trainer-competencies", async (_req, res) => {
    const competencies = await storage.getAllTrainerCompetencies();
    res.json(competencies);
  });

  app.get("/api/trainers/:id/competencies", async (req, res) => {
    const competencies = await storage.getTrainerCompetencies(req.params.id);
    res.json(competencies);
  });

  app.post("/api/trainers/:id/competencies", async (req, res) => {
    const parsed = insertTrainerCompetencySchema.safeParse({ ...req.body, trainerId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const competency = await storage.createTrainerCompetency(parsed.data);
    res.status(201).json(competency);
  });

  app.patch("/api/trainer-competencies/:id", async (req, res) => {
    const parsed = insertTrainerCompetencySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const competency = await storage.updateTrainerCompetency(req.params.id, parsed.data);
    if (!competency) return res.status(404).json({ message: "Compétence non trouvée" });
    res.json(competency);
  });

  app.delete("/api/trainer-competencies/:id", async (req, res) => {
    await storage.deleteTrainerCompetency(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // TRAINER SATISFACTION STATS (auto-calculated from surveys)
  // ============================================================

  app.get("/api/trainers/:id/satisfaction-stats", async (req, res) => {
    const trainerId = req.params.id;
    const trainerSessions = await storage.getSessionsByTrainer(trainerId);

    let totalRatings = 0;
    let sumRatings = 0;
    let totalResponses = 0;
    const perYear: Record<number, { sum: number; count: number }> = {};

    for (const session of trainerSessions) {
      const responses = await storage.getSurveyResponses(undefined, session.id);
      for (const r of responses) {
        totalResponses++;
        if (r.rating != null) {
          totalRatings++;
          sumRatings += r.rating;
          const year = new Date(session.startDate).getFullYear();
          if (!perYear[year]) perYear[year] = { sum: 0, count: 0 };
          perYear[year].sum += r.rating;
          perYear[year].count++;
        }
      }
    }

    const avgRating = totalRatings > 0 ? Math.round((sumRatings / totalRatings) * 10) / 10 : 0;
    const satisfactionScore = totalRatings > 0 ? Math.round((avgRating / 5) * 100) : 0;

    res.json({
      avgRating,
      totalResponses,
      satisfactionScore,
      perYear: Object.entries(perYear)
        .map(([year, data]) => ({
          year: parseInt(year),
          avgRating: Math.round((data.sum / data.count) * 10) / 10,
          count: data.count,
        }))
        .sort((a, b) => b.year - a.year),
    });
  });

  // ============================================================
  // TRAINER QUALIOPI STATUS
  // ============================================================

  app.get("/api/trainers/:id/qualiopi-status", async (req, res) => {
    const trainerId = req.params.id;
    const currentYear = new Date().getFullYear();

    // Documents
    const docs = await storage.getTrainerDocuments(trainerId);
    const requiredDocTypes = ["cv", "diplome", "contrat", "assurance"];
    const validatedDocs = docs.filter(d => d.status === "validated");
    const docCoverage = requiredDocTypes.map(type => ({
      type,
      present: validatedDocs.some(d => d.type === type),
    }));
    const docScore = Math.round((docCoverage.filter(d => d.present).length / requiredDocTypes.length) * 100);

    // Competencies
    const competencies = await storage.getTrainerCompetencies(trainerId);
    const activeCompetencies = competencies.filter(c => c.status === "active");
    const expiredCompetencies = competencies.filter(c => c.status === "expired");
    const renewalCompetencies = competencies.filter(c => c.status === "renewal");
    const compScore = competencies.length > 0 ? Math.round((activeCompetencies.length / competencies.length) * 100) : 0;

    // Evaluations
    const evaluations = await storage.getTrainerEvaluations(trainerId);
    const currentYearEval = evaluations.find(e => e.year === currentYear);
    const evalScore = currentYearEval ? 100 : 0;

    // Sessions
    const trainerSessions = await storage.getSessionsByTrainer(trainerId);
    const sessionCount = trainerSessions.length;

    const globalScore = Math.round((docScore + compScore + evalScore) / 3);

    res.json({
      globalScore,
      documents: { score: docScore, coverage: docCoverage, total: docs.length, validated: validatedDocs.length },
      competencies: { score: compScore, total: competencies.length, active: activeCompetencies.length, expired: expiredCompetencies.length, renewal: renewalCompetencies.length },
      evaluations: { score: evalScore, hasCurrentYear: !!currentYearEval, total: evaluations.length },
      sessions: { count: sessionCount },
    });
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

  app.get("/api/enterprises/:id/trainees", async (req, res) => {
    const result = await storage.getEnterpriseTrainees(req.params.id);
    res.json(result);
  });

  app.get("/api/enterprises/:id/sessions", async (req, res) => {
    const result = await storage.getEnterpriseSessions(req.params.id);
    res.json(result);
  });

  app.get("/api/enterprises/:id/programs", async (req, res) => {
    const result = await storage.getEnterprisePrograms(req.params.id);
    res.json(result);
  });

  app.get("/api/enterprises/:id/generated-documents", async (req, res) => {
    const result = await storage.getGeneratedDocumentsByEnterprise(req.params.id);
    res.json(result);
  });

  // ============================================================
  // PROGRAM PREREQUISITES
  // ============================================================

  app.get("/api/programs/:id/prerequisites", async (req, res) => {
    const prerequisites = await storage.getProgramPrerequisites(req.params.id);
    res.json(prerequisites);
  });

  app.post("/api/programs/:id/prerequisites", async (req, res) => {
    const parsed = insertProgramPrerequisiteSchema.safeParse({ ...req.body, programId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const prerequisite = await storage.createProgramPrerequisite(parsed.data);
    res.status(201).json(prerequisite);
  });

  app.delete("/api/program-prerequisites/:id", async (req, res) => {
    await storage.deleteProgramPrerequisite(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // TRAINEE CERTIFICATIONS
  // ============================================================

  app.get("/api/trainees/:id/certifications", async (req, res) => {
    const certifications = await storage.getTraineeCertifications(req.params.id);
    res.json(certifications);
  });

  app.post("/api/trainees/:id/certifications", async (req, res) => {
    const parsed = insertTraineeCertificationSchema.safeParse({ ...req.body, traineeId: req.params.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const certification = await storage.createTraineeCertification(parsed.data);
    res.status(201).json(certification);
  });

  app.patch("/api/trainee-certifications/:id", async (req, res) => {
    const parsed = insertTraineeCertificationSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const certification = await storage.updateTraineeCertification(req.params.id, parsed.data);
    if (!certification) return res.status(404).json({ message: "Certification non trouvée" });
    res.json(certification);
  });

  app.delete("/api/trainee-certifications/:id", async (req, res) => {
    await storage.deleteTraineeCertification(req.params.id);
    res.status(204).send();
  });

  app.get("/api/certifications/expiring", async (req, res) => {
    const days = parseInt(req.query.days as string) || 90;
    const certifications = await storage.getExpiringCertifications(days);
    res.json(certifications);
  });

  return httpServer;
}
