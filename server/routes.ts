import type { Express } from "express";
import { createServer, type Server } from "http";
import Busboy from "busboy";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { storage } from "./storage";
import { wrapWithBranding, applyBranding } from "./document-utils";
import { setupAuth, hashPassword, comparePasswords, requireAuth, requireRole, requirePermission } from "./auth";
import { triggerAutomation, triggerSessionAutomation, executeRuleManually } from "./automation-engine";
import {
  insertTrainerSchema, insertTraineeSchema, insertProgramSchema,
  insertSessionSchema, insertEnrollmentSchema, insertEnterpriseSchema,
  insertEmailTemplateSchema, insertEmailLogSchema,
  insertSmsTemplateSchema, insertSmsLogSchema,
  insertDocumentTemplateSchema, insertGeneratedDocumentSchema,
  insertProspectSchema, insertQuoteSchema, insertInvoiceSchema, insertPaymentSchema,
  insertElearningModuleSchema, insertElearningBlockSchema, insertQuizQuestionSchema, insertLearnerProgressSchema,
  insertSurveyTemplateSchema, insertSurveyResponseSchema, insertEvaluationAssignmentSchema,
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
  insertSessionResourceSchema, insertScormPackageSchema, insertFormativeSubmissionSchema,
  insertForumPostSchema, insertForumReplySchema, insertForumMuteSchema,
  insertAnalysisCommentSchema,
  insertConversationSchema, insertConversationParticipantSchema, insertDirectMessageSchema,
  insertContactTagSchema, insertContactTagAssignmentSchema,
  insertMarketingCampaignSchema, insertProspectActivitySchema,
  insertPaymentScheduleSchema, insertBankTransactionSchema,
  insertConnectionLogSchema,
  insertAbsenceRecordSchema, insertQualityIncidentSchema, insertVeilleEntrySchema,
  insertDigitalBadgeSchema, insertBadgeAwardSchema, insertTaskListSchema, insertTaskItemSchema,
  insertAiDocumentAnalysisSchema, insertCesuSubmissionSchema,
  insertSsoTokenSchema, insertApiKeySchema, insertWidgetConfigurationSchema,
  insertAuditLogSchema, insertRgpdRequestSchema,
  insertDataImportSchema, insertDataArchiveSchema,
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

  // 1x1 transparent GIF pixel (pre-allocated buffer)
  const TRANSPARENT_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  // GET /t/:trackingId — email open tracking pixel
  app.get("/t/:trackingId", (req, res) => {
    // Send the pixel immediately before any DB work
    res.set({
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.end(TRANSPARENT_GIF);

    // Fire-and-forget: record the open event
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;
    storage.recordEmailOpen(req.params.trackingId, ip, userAgent).catch(() => {});
  });

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
  // PUBLIC EMARGEMENT ROUTES (no auth — Section 8.1)
  // ============================================================

  // GET /api/public/emargement/:token — fetch emargement info
  app.get("/api/public/emargement/:token", async (req, res) => {
    try {
      const record = await storage.getAttendanceRecordByToken(req.params.token);
      if (!record) return res.status(404).json({ message: "Lien d'emargement invalide" });

      const sheet = await storage.getAttendanceSheet(record.sheetId);
      const trainee = await storage.getTrainee(record.traineeId);
      let sessionTitle = "";
      let modality = "presentiel";
      if (sheet) {
        const session = await storage.getSession(sheet.sessionId);
        if (session) {
          sessionTitle = session.title || "";
          modality = session.modality || "presentiel";
        }
      }
      const periodLabel = sheet?.period === "matin" ? "Matin"
        : sheet?.period === "apres-midi" ? "Apres-midi" : "Journee entiere";

      res.json({
        traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : "Stagiaire",
        sessionTitle,
        date: sheet?.date || "",
        period: periodLabel,
        modality,
        alreadySigned: !!record.signedAt,
      });
    } catch (err) {
      console.error("[emargement] public GET error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/public/emargement/:token — sign attendance via token
  app.post("/api/public/emargement/:token", async (req, res) => {
    try {
      const record = await storage.getAttendanceRecordByToken(req.params.token);
      if (!record) return res.status(404).json({ message: "Lien d'emargement invalide ou expire" });
      if (record.signedAt) return res.status(409).json({ message: "Emargement deja effectue" });

      const { signatureData } = req.body;
      await storage.updateAttendanceRecord(record.id, {
        status: "present",
        signedAt: new Date(),
        signatureData: signatureData || null,
      });

      res.json({ success: true, message: "Emargement enregistre avec succes" });
    } catch (err) {
      console.error("[emargement] public POST error:", err);
      res.status(500).json({ message: "Erreur lors de l'emargement" });
    }
  });

  // GET /api/public/evaluation/:token — fetch evaluation info for external respondent
  app.get("/api/public/evaluation/:token", async (req, res) => {
    try {
      const assignment = await storage.getEvaluationAssignmentByToken(req.params.token);
      if (!assignment) return res.status(404).json({ message: "Lien d'evaluation invalide ou expire" });
      if (assignment.status === "completed") {
        return res.json({ alreadyCompleted: true, respondentName: assignment.respondentName });
      }
      const template = await storage.getSurveyTemplate(assignment.templateId);
      if (!template) return res.status(404).json({ message: "Template introuvable" });
      const trainee = assignment.traineeId ? await storage.getTrainee(assignment.traineeId) : null;
      const session = await storage.getSession(assignment.sessionId);
      res.json({
        alreadyCompleted: false,
        templateTitle: template.title,
        templateDescription: template.description,
        questions: template.questions,
        sections: template.sections,
        evaluationType: template.evaluationType,
        traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : null,
        sessionTitle: session?.title || "",
        respondentName: assignment.respondentName,
        respondentType: assignment.respondentType,
      });
    } catch (err) {
      console.error("[evaluation] public GET error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // POST /api/public/evaluation/:token — submit evaluation response
  app.post("/api/public/evaluation/:token", async (req, res) => {
    try {
      const assignment = await storage.getEvaluationAssignmentByToken(req.params.token);
      if (!assignment) return res.status(404).json({ message: "Lien invalide" });
      if (assignment.status === "completed") return res.status(409).json({ message: "Evaluation deja completee" });

      const { answers, rating, comments } = req.body;
      const template = await storage.getSurveyTemplate(assignment.templateId);

      // Calculate weighted score for commissioner evaluations
      let weightedScore: number | undefined;
      if (template?.evaluationType === "commissioner_eval" && template.sections && Array.isArray(template.sections)) {
        const sections = template.sections as Array<{ title: string; type: string; questionIndices: number[]; coefficient?: number }>;
        let totalWeight = 0;
        let weightedSum = 0;
        for (const section of sections) {
          if (section.type !== "scored") continue;
          const coeff = section.coefficient || 1;
          const sectionAnswers = (answers || []).filter((a: any) =>
            section.questionIndices.includes(a.questionIndex) && typeof a.answer === "number"
          );
          if (sectionAnswers.length === 0) continue;
          const sectionAvg = sectionAnswers.reduce((sum: number, a: any) => sum + a.answer, 0) / sectionAnswers.length;
          weightedSum += sectionAvg * coeff;
          totalWeight += coeff;
        }
        weightedScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : undefined;
      }

      const response = await storage.createSurveyResponse({
        surveyId: assignment.templateId,
        sessionId: assignment.sessionId,
        traineeId: assignment.traineeId || undefined,
        answers: answers || [],
        rating: rating || null,
        comments: comments || null,
        respondentType: assignment.respondentType,
        respondentEmail: assignment.respondentEmail || undefined,
        respondentName: assignment.respondentName || undefined,
        evaluationType: template?.evaluationType || undefined,
        weightedScore: weightedScore ? Math.round(weightedScore) : undefined,
        assignmentId: assignment.id,
      });

      await storage.updateEvaluationAssignment(assignment.id, {
        status: "completed",
        completedAt: new Date(),
        responseId: response.id,
      });

      res.json({ success: true, message: "Evaluation enregistree" });
    } catch (err) {
      console.error("[evaluation] public POST error:", err);
      res.status(500).json({ message: "Erreur serveur" });
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
  app.use("/api/pending-signatures", requireAuth);
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
  app.use("/api/session-resources", requireAuth, requirePermission("manage_elearning"));
  app.use("/api/scorm-packages", requireAuth, requirePermission("manage_elearning"));
  app.use("/api/formative-submissions", requireAuth);
  app.use("/api/survey-templates", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/survey-responses", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/evaluation-assignments", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/evaluation-stats", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/quality-actions", requireAuth, requirePermission("manage_quality_actions"));
  app.use("/api/analysis-comments", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/analysis-stats", requireAuth, requirePermission("manage_surveys"));
  app.use("/api/conversations", requireAuth);
  app.use("/api/messages", requireAuth);
  app.use("/api/contact-tags", requireAuth, requirePermission("manage_prospects"));
  app.use("/api/tag-assignments", requireAuth, requirePermission("manage_prospects"));
  app.use("/api/marketing-campaigns", requireAuth, requirePermission("manage_prospects"));
  app.use("/api/prospect-activities", requireAuth, requirePermission("manage_prospects"));
  app.use("/api/crm-stats", requireAuth, requirePermission("manage_prospects"));
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

      // Auto-generate and send attendance report on session completion (Section 8.2)
      if (parsed.data.status === "completed") {
        (async () => {
          try {
            const internalReq = { body: { sessionId: session.id, sendToEnterprise: true } } as any;
            const internalRes = {
              json: () => {},
              status: () => ({ json: () => {} }),
            } as any;
            // Reuse the generate-report logic inline
            const sheets = await storage.getAttendanceSheets(session.id);
            if (sheets.length === 0) return;

            const program = session.programId ? await storage.getProgram(session.programId) : null;
            const enrollments = await storage.getEnrollments(session.id);
            const activeEnrollments = enrollments.filter((e: any) => e.status !== "cancelled");
            const orgSettings = await storage.getOrganizationSettings();
            const sMap: Record<string, string> = {};
            orgSettings.forEach((s: any) => { sMap[s.key] = s.value; });
            const orgName = sMap["org_name"] || "SO'SAFE Formation";

            const allRecordsBySheet = new Map<string, any[]>();
            for (const sheet of sheets) {
              const records = await storage.getAttendanceRecords(sheet.id);
              allRecordsBySheet.set(sheet.id, records);
            }

            let html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">`;
            html += `<h1 style="text-align:center;font-size:20px;margin-bottom:5px;">Rapport d'emargement</h1>`;
            html += `<p style="text-align:center;color:#666;margin-bottom:20px;">${orgName}</p>`;
            html += `<table style="width:100%;margin-bottom:20px;"><tr>
              <td><strong>Formation :</strong> ${program?.title || session.title}</td>
              <td><strong>Session :</strong> ${session.title}</td>
            </tr><tr>
              <td><strong>Du :</strong> ${new Date(session.startDate).toLocaleDateString("fr-FR")} <strong>au</strong> ${new Date(session.endDate).toLocaleDateString("fr-FR")}</td>
              <td><strong>Lieu :</strong> ${session.location || "-"}</td>
            </tr></table>`;

            html += `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:left;">Stagiaire</th>`;
            for (const sheet of sheets) {
              const dateStr = new Date(sheet.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
              const periodStr = sheet.period === "matin" ? "M" : sheet.period === "apres-midi" ? "AM" : "J";
              html += `<th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:center;font-size:11px;">${dateStr}<br/>${periodStr}</th>`;
            }
            html += `<th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:center;">Taux</th></tr></thead><tbody>`;

            for (const enrollment of activeEnrollments) {
              const trainee = await storage.getTrainee(enrollment.traineeId);
              if (!trainee) continue;
              let present = 0, total = 0;
              html += `<tr><td style="border:1px solid #999;padding:6px;font-size:12px;">${trainee.firstName} ${trainee.lastName}</td>`;
              for (const sheet of sheets) {
                const records = allRecordsBySheet.get(sheet.id) || [];
                const record = records.find((r: any) => r.traineeId === enrollment.traineeId);
                const status = record?.status || "absent";
                total++;
                if (status === "present") present++;
                const color = status === "present" ? "#16a34a" : status === "late" ? "#d97706" : status === "excused" ? "#2563eb" : "#dc2626";
                const label = status === "present" ? "P" : status === "late" ? "R" : status === "excused" ? "E" : "A";
                html += `<td style="border:1px solid #999;padding:6px;text-align:center;color:${color};font-weight:600;font-size:12px;">${label}</td>`;
              }
              const rate = total > 0 ? Math.round((present / total) * 100) : 0;
              html += `<td style="border:1px solid #999;padding:6px;text-align:center;font-weight:600;">${rate}%</td></tr>`;
            }
            html += `</tbody></table>`;
            html += `<p style="margin-top:15px;font-size:11px;color:#666;">P = Present, A = Absent, R = Retard, E = Excuse</p>`;
            html += `<p style="margin-top:20px;font-size:12px;color:#666;">Rapport genere automatiquement le ${new Date().toLocaleDateString("fr-FR")}</p></div>`;

            await storage.createGeneratedDocument({
              templateId: "rapport_emargement_auto",
              sessionId: session.id,
              traineeId: null,
              enterpriseId: null,
              quoteId: null,
              title: `Rapport emargement — ${session.title}`,
              type: "rapport_emargement",
              content: html,
              status: "generated",
              visibility: "enterprise",
              sharedAt: new Date(),
            });

            // Send to enterprise contacts
            const enterpriseIds = Array.from(new Set(activeEnrollments.map((e: any) => e.enterpriseId).filter(Boolean)));
            for (const entId of enterpriseIds) {
              const enterprise = await storage.getEnterprise(entId as string);
              if (!enterprise?.email) continue;
              const emailLog = await storage.createEmailLog({
                recipient: enterprise.email,
                subject: `Rapport d'emargement — ${session.title}`,
                body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                  <h2>Rapport d'emargement</h2>
                  <p>Bonjour,</p>
                  <p>La formation <strong>${session.title}</strong> est terminee. Veuillez trouver ci-dessous le rapport d'emargement.</p>
                  ${html}
                  <p style="color:#666;font-size:12px;margin-top:30px;">Ce rapport est disponible dans votre espace entreprise.</p>
                </div>`,
                status: "pending",
              });
              try {
                const { sendEmailNow } = await import("./email-service");
                await sendEmailNow(emailLog.id);
              } catch {}
            }
            console.log(`[attendance-report] Auto-generated report for completed session ${session.id}`);
          } catch (err) {
            console.error("[attendance-report] auto-generate error:", err);
          }
        })();
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
      "{profile_type_apprenant}": "salarie",
      "{profession_apprenant}": "Infirmier(ère)",
      "{nom_entreprise}": "Hôpital Saint-Louis",
      "{contact_entreprise}": "Marie Martin",
      "{email_entreprise}": "contact@hopital-stlouis.fr",
      "{titre_session}": "AFGSU Niveau 1 - Session Mars",
      "{date_debut}": "15/03/2026",
      "{date_fin}": "17/03/2026",
      "{lieu}": "Paris - Centre de formation",
      "{modalite}": "Présentiel",
      "{adresse_lieu}": "12 rue de la Santé, 75013 Paris",
      "{salle}": "Salle A - 2ème étage",
      "{url_classe_virtuelle}": "https://meet.example.com/session-mars",
      "{max_participants}": "12",
      "{titre_formation}": "AFGSU Niveau 1",
      "{duree_formation}": "14 heures",
      "{prix_formation}": "500 EUR",
      "{objectifs_formation}": "Maîtriser les gestes d'urgence",
      "{prerequis_formation}": "Aucun prérequis",
      "{niveau_formation}": "beginner",
      "{public_cible}": "Professionnels de santé",
      "{methodes_pedagogiques}": "Mises en situation, ateliers pratiques",
      "{contenu_formation}": "Module 1: Urgences vitales, Module 2: Urgences potentielles",
      "{nom_formateur}": "Dr. Sophie Bernard",
      "{email_formateur}": "sophie.bernard@sosafe.fr",
      "{date_inscription}": "01/02/2026",
      "{statut_inscription}": "confirmed",
      "{modalite_presentiel}": "true",
      "{modalite_distanciel}": "",
      "{modalite_mixte}": "",
      "{est_certifiante}": "true",
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

    // Process conditional blocks for preview
    const processConditionalBlocks = (text: string) =>
      text.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (_match: string, varName: string, content: string) => {
          const value = exampleValues[`{${varName}}`] || "";
          return value && value !== "false" ? content : "";
        },
      );
    renderedSubject = processConditionalBlocks(renderedSubject);
    renderedBody = processConditionalBlocks(renderedBody);

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
    const { templateId, sessionId, traineeId, enterpriseId, quoteId, invoiceId, visibility } = req.body;
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
        replacements["{civilite_apprenant}"] = trainee.civility || "";
        replacements["{date_naissance_apprenant}"] = trainee.dateOfBirth
          ? new Date(trainee.dateOfBirth).toLocaleDateString("fr-FR") : "";
        replacements["{telephone_apprenant}"] = trainee.phone || "";
        replacements["{est_particulier}"] = trainee.profileType === "particulier" ? "true" : "";
        replacements["{adresse_apprenant}"] = trainee.address || "";
        replacements["{ville_apprenant}"] = trainee.city || "";
        replacements["{code_postal_apprenant}"] = trainee.postalCode || "";
        replacements["{pays_apprenant}"] = trainee.country || "France";
        const addrParts = [
          `${trainee.civility ? trainee.civility + " " : ""}${trainee.firstName} ${trainee.lastName}`,
          trainee.address,
          `${trainee.postalCode || ""} ${trainee.city || ""}`.trim(),
          trainee.country && trainee.country !== "France" ? trainee.country : "",
        ].filter(Boolean);
        replacements["{adresse_complete_apprenant}"] = addrParts.join("<br>");
      }
    }

    if (enterpriseId) {
      const enterprise = await storage.getEnterprise(enterpriseId);
      if (enterprise) {
        replacements["{nom_entreprise}"] = enterprise.name;
        replacements["{contact_entreprise}"] = enterprise.contactName || "";
        replacements["{email_entreprise}"] = enterprise.contactEmail || "";
      }
    }

    // Quote / contract variables
    if (quoteId) {
      const quote = await storage.getQuote(quoteId);
      if (quote) {
        replacements["{numero_devis}"] = quote.number;
        replacements["{montant_devis}"] = `${(quote.total / 100).toFixed(2)} EUR`;
        replacements["{montant_ht}"] = `${(quote.subtotal / 100).toFixed(2)} EUR`;
        replacements["{montant_tva}"] = `${(quote.taxAmount / 100).toFixed(2)} EUR`;
        replacements["{montant_ttc}"] = `${(quote.total / 100).toFixed(2)} EUR`;
        replacements["{taux_tva}"] = `${(quote.taxRate / 100).toFixed(2)}%`;
        replacements["{date_validite_devis}"] = quote.validUntil
          ? new Date(quote.validUntil).toLocaleDateString("fr-FR") : "";
        replacements["{notes_devis}"] = quote.notes || "";
        const lines = (quote.lineItems || []).map(
          (li) => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${(li.unitPrice / 100).toFixed(2)} EUR</td><td>${(li.total / 100).toFixed(2)} EUR</td></tr>`
        ).join("");
        replacements["{lignes_devis}"] = lines
          ? `<table><thead><tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>`
          : "";
      }
    }

    // Subcontracting variables (from session trainer)
    if (sessionId) {
      const sessionForTrainer = await storage.getSession(sessionId);
      if (sessionForTrainer?.trainerId) {
        const trainer = await storage.getTrainer(sessionForTrainer.trainerId);
        if (trainer) {
          replacements["{nom_sous_traitant}"] = `${trainer.firstName} ${trainer.lastName}`;
          replacements["{email_sous_traitant}"] = trainer.email;
          replacements["{telephone_sous_traitant}"] = trainer.phone || "";
          replacements["{specialite_sous_traitant}"] = trainer.specialty || "";
        }
      }
    }

    // Invoice variables
    if (invoiceId) {
      const invoice = await storage.getInvoice(invoiceId);
      if (invoice) {
        replacements["{numero_facture}"] = invoice.number;
        replacements["{titre_facture}"] = invoice.title;
        replacements["{facture_montant_ht}"] = `${(invoice.subtotal / 100).toFixed(2)} EUR`;
        replacements["{facture_montant_tva}"] = `${(invoice.taxAmount / 100).toFixed(2)} EUR`;
        replacements["{facture_montant_ttc}"] = `${(invoice.total / 100).toFixed(2)} EUR`;
        replacements["{facture_taux_tva}"] = `${(invoice.taxRate / 100).toFixed(2)}%`;
        replacements["{facture_montant_paye}"] = `${(invoice.paidAmount / 100).toFixed(2)} EUR`;
        replacements["{facture_reste_du}"] = `${((invoice.total - invoice.paidAmount) / 100).toFixed(2)} EUR`;
        replacements["{facture_date_echeance}"] = invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : "";
        replacements["{facture_statut}"] = invoice.status;
        replacements["{facture_notes}"] = invoice.notes || "";
        const invLines = (invoice.lineItems || []).map(
          (li) => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${(li.unitPrice / 100).toFixed(2)} EUR</td><td>${(li.total / 100).toFixed(2)} EUR</td></tr>`
        ).join("");
        replacements["{facture_lignes}"] = invLines
          ? `<table><thead><tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>${invLines}</tbody></table>`
          : "";
        if (invoice.quoteId) {
          const linkedQuote = await storage.getQuote(invoice.quoteId);
          replacements["{facture_numero_devis}"] = linkedQuote?.number || "";
        }
      }
    }

    // Formation type conditionals
    if (sessionId) {
      const sessionForModality = await storage.getSession(sessionId);
      if (sessionForModality) {
        const mod = sessionForModality.modality?.toLowerCase() || "";
        replacements["{est_blended}"] = mod === "blended" || mod === "mixte" ? "true" : "";
        replacements["{est_standard}"] = mod === "presentiel" ? "true" : "";
        replacements["{est_specifique}"] = mod !== "presentiel" && mod !== "distanciel" && mod !== "blended" && mod !== "mixte" ? "true" : "";
      }
    }

    replacements["{date_du_jour}"] = new Date().toLocaleDateString("fr-FR");
    replacements["{date_signature}"] = new Date().toLocaleDateString("fr-FR");
    replacements["{delai_retractation}"] = "10 jours";

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

    // Habillage branded du document généré
    content = wrapWithBranding(content, {
      brandColor: template.brandColor,
      fontFamily: template.fontFamily,
      logoUrl: template.logoUrl,
      headerHtml: template.headerHtml,
      footerHtml: template.footerHtml,
      orgName: settingsMap["org_name"] || "SO'SAFE",
      orgAddress: settingsMap["org_address"] || "",
      orgPhone: settingsMap["org_phone"] || "",
      orgEmail: settingsMap["org_email"] || "",
      orgSiret: settingsMap["org_siret"] || "",
    });

    const effectiveVisibility = visibility || "admin_only";
    const doc = await storage.createGeneratedDocument({
      templateId,
      sessionId: sessionId || null,
      traineeId: traineeId || null,
      enterpriseId: enterpriseId || null,
      quoteId: quoteId || null,
      title: template.name,
      type: template.type,
      content,
      status: "generated",
      visibility: effectiveVisibility,
      sharedAt: effectiveVisibility !== "admin_only" ? new Date() : null,
    });

    res.status(201).json(doc);
  });

  app.patch("/api/generated-documents/:id", async (req, res) => {
    const { visibility, status, signatureStatus, signatureRequestedFor, signatureRequestedAt, content } = req.body;
    const updates: Record<string, any> = {};
    if (visibility) {
      updates.visibility = visibility;
      if (visibility !== "admin_only" && !req.body.sharedAt) {
        updates.sharedAt = new Date();
      }
    }
    if (status) updates.status = status;
    if (signatureStatus) updates.signatureStatus = signatureStatus;
    if (signatureRequestedFor !== undefined) updates.signatureRequestedFor = signatureRequestedFor;
    if (signatureRequestedAt !== undefined) updates.signatureRequestedAt = signatureRequestedAt;
    if (content !== undefined) updates.content = content;
    const doc = await storage.updateGeneratedDocument(req.params.id, updates);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });
    res.json(doc);
  });

  app.delete("/api/generated-documents/:id", async (req, res) => {
    await storage.deleteGeneratedDocument(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // SIGNATURE REQUESTS (admin — manage_documents guard applies)
  // ============================================================
  app.post("/api/generated-documents/:id/request-signature", async (req, res) => {
    const doc = await storage.getGeneratedDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });

    const { signers } = req.body;
    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({ message: "Au moins un signataire requis" });
    }

    const signatureRequestedFor = signers.map((s: any) => ({
      signerId: s.signerId,
      signerType: s.signerType,
      signerName: s.signerName,
      status: "pending" as const,
      signedAt: null,
    }));

    const updated = await storage.updateGeneratedDocument(req.params.id, {
      signatureStatus: "pending",
      signatureRequestedFor,
      signatureRequestedAt: new Date(),
      status: "shared",
      visibility: "all",
      sharedAt: (doc as any).sharedAt || new Date(),
    } as any);

    res.json(updated);
  });

  app.post("/api/generated-documents/batch-request-signature", async (req, res) => {
    const { documentIds, signers } = req.body;
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: "Au moins un document requis" });
    }
    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({ message: "Au moins un signataire requis" });
    }

    const results = [];
    for (const docId of documentIds) {
      const doc = await storage.getGeneratedDocument(docId);
      if (!doc) continue;

      const signatureRequestedFor = signers.map((s: any) => ({
        signerId: s.signerId,
        signerType: s.signerType,
        signerName: s.signerName,
        status: "pending" as const,
        signedAt: null,
      }));

      const updated = await storage.updateGeneratedDocument(docId, {
        signatureStatus: "pending",
        signatureRequestedFor,
        signatureRequestedAt: new Date(),
        status: "shared",
        visibility: "all",
        sharedAt: (doc as any).sharedAt || new Date(),
      } as any);
      if (updated) results.push(updated);
    }

    res.json(results);
  });

  app.get("/api/quotes/:quoteId/documents", async (req, res) => {
    const docs = await storage.getGeneratedDocumentsByQuote(req.params.quoteId);
    res.json(docs);
  });

  // ============================================================
  // FILLABLE PDF — Generic generated-document to PDF download
  // GET /api/generated-documents/:id/pdf
  // ============================================================
  app.get("/api/generated-documents/:id/pdf", async (req, res) => {
    const doc = await storage.getGeneratedDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });

    // Build a simple, clean PDF with pdf-lib
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;   // A4
    const pageHeight = 841.89;
    const margin = 50;
    const lineHeight = 16;
    const maxWidth = pageWidth - margin * 2;

    // Strip HTML tags for plain-text PDF export
    const plainText = doc.content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-3]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<td[^>]*>/gi, "  |  ")
      .replace(/<th[^>]*>/gi, "  |  ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#8239;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const lines = plainText.split("\n");

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Title
    const titleSize = 16;
    page.drawText(doc.title, { x: margin, y, font: fontBold, size: titleSize, color: rgb(0.1, 0.1, 0.1) });
    y -= titleSize + 14;
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: pageWidth - margin, y: y + 4 }, thickness: 1, color: rgb(0.1, 0.34, 0.86) });
    y -= 12;

    for (const line of lines) {
      const text = line.trimEnd();
      if (!text) { y -= lineHeight * 0.5; continue; }

      // Simple word-wrap
      const words = text.split(/\s+/);
      let currentLine = "";
      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(test, 11);
        if (testWidth > maxWidth && currentLine) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(currentLine, { x: margin, y, font, size: 11, color: rgb(0.1, 0.1, 0.1) });
          y -= lineHeight;
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, { x: margin, y, font, size: 11, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const safeName = doc.title.replace(/[^a-zA-Z0-9àâéèêëïôùûüÀÂÉÈÊËÏÔÙÛÜçÇ _-]/g, "_");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Content-Length": pdfBytes.length.toString(),
    });
    res.send(Buffer.from(pdfBytes));
  });

  // ============================================================
  // FILLABLE PDF — Attestation FIFPL with form fields
  // GET /api/generated-documents/:id/pdf-fillable
  // ============================================================
  app.get("/api/generated-documents/:id/pdf-fillable", async (req, res) => {
    const doc = await storage.getGeneratedDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const form = pdfDoc.getForm();

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let y = pageHeight - margin;

    // Helper to draw label + form field
    const drawField = (label: string, fieldName: string, defaultValue: string, width = 250) => {
      if (y < margin + 40) return; // safety
      page.drawText(label, { x: margin, y, font: fontBold, size: 10, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
      const textField = form.createTextField(fieldName);
      textField.setText(defaultValue);
      textField.addToPage(page, { x: margin, y: y - 4, width, height: 20 });
      y -= 30;
    };

    // --- Org settings ---
    const settings = await storage.getOrganizationSettings();
    const m = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const orgName = m["org_name"] || "SO'SAFE";

    // --- Resolve trainee & session for pre-fill ---
    let traineeName = "";
    let sessionName = "";
    let trainerName = "";
    let startDate = "";
    let endDate = "";
    let duration = "";
    let location = "";

    if (doc.traineeId) {
      const trainee = await storage.getTrainee(doc.traineeId);
      if (trainee) traineeName = `${trainee.firstName} ${trainee.lastName}`;
    }
    if (doc.sessionId) {
      const session = await storage.getSession(doc.sessionId);
      if (session) {
        sessionName = session.title || "";
        startDate = session.startDate ? new Date(session.startDate).toLocaleDateString("fr-FR") : "";
        endDate = session.endDate ? new Date(session.endDate).toLocaleDateString("fr-FR") : "";
        location = session.location || "";
        // Duration comes from the program
        const program = await storage.getProgram(session.programId);
        if (program) duration = `${program.duration}h`;
        if (session.trainerId) {
          const trainer = await storage.getTrainer(session.trainerId);
          if (trainer) trainerName = `${trainer.firstName} ${trainer.lastName}`;
        }
      }
    }

    // Title
    const titleColor = rgb(0.1, 0.34, 0.86);
    page.drawText("ATTESTATION DE PRÉSENCE", { x: margin, y, font: fontBold, size: 18, color: titleColor });
    y -= 22;
    page.drawText("FINANCEMENT FIFPL", { x: margin, y, font: fontBold, size: 14, color: titleColor });
    y -= 16;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 2, color: titleColor });
    y -= 28;

    // Org header
    page.drawText(`Organisme de formation : ${orgName}`, { x: margin, y, font, size: 10, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
    page.drawText(`N° SIRET : ${m["org_siret"] || "_______________"}`, { x: margin, y, font, size: 10, color: rgb(0.3, 0.3, 0.3) });
    y -= 28;

    // Section: Stagiaire
    page.drawText("INFORMATIONS STAGIAIRE", { x: margin, y, font: fontBold, size: 12, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
    drawField("Nom et prénom du stagiaire :", "nom_stagiaire", traineeName, 300);
    drawField("N° de dossier FIFPL :", "numero_fifpl", "", 200);

    // Section: Formation
    page.drawText("INFORMATIONS FORMATION", { x: margin, y, font: fontBold, size: 12, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
    drawField("Intitulé de la formation :", "nom_formation", sessionName, 350);
    drawField("Date de début :", "date_debut", startDate, 150);
    drawField("Date de fin :", "date_fin", endDate, 150);
    drawField("Durée totale :", "duree_formation", duration, 100);
    drawField("Heures réalisées :", "heures_realisees", duration, 100);
    drawField("Taux de présence (%) :", "taux_presence", "100", 80);
    drawField("Lieu :", "lieu_session", location, 300);
    drawField("Formateur :", "nom_formateur", trainerName, 250);

    // Section: Certification
    y -= 10;
    page.drawText("CERTIFICATION", { x: margin, y, font: fontBold, size: 12, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
    page.drawText(
      "Je soussigné(e), responsable de l'organisme de formation, certifie que le(la)",
      { x: margin, y, font, size: 10, color: rgb(0.1, 0.1, 0.1) }
    );
    y -= 14;
    page.drawText(
      "stagiaire désigné(e) ci-dessus a bien suivi la formation indiquée.",
      { x: margin, y, font, size: 10, color: rgb(0.1, 0.1, 0.1) }
    );
    y -= 28;

    drawField("Fait à :", "fait_a", location || "", 200);
    drawField("Le :", "date_delivrance", new Date().toLocaleDateString("fr-FR"), 150);

    y -= 10;
    page.drawText("Signature et cachet de l'organisme :", { x: margin, y, font: fontBold, size: 10, color: rgb(0.2, 0.2, 0.2) });
    y -= 60;
    // Signature box
    page.drawRectangle({ x: margin, y, width: 200, height: 50, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });

    const pdfBytes = await pdfDoc.save();
    const safeName = `Attestation_FIFPL_${traineeName.replace(/\s+/g, "_") || "stagiaire"}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Content-Length": pdfBytes.length.toString(),
    });
    res.send(Buffer.from(pdfBytes));
  });

  // ============================================================
  // GENERATE BPF (Bilan Pédagogique et Financier)
  // POST /api/documents/generate-bpf   body: { year?: number }
  // ============================================================
  app.post("/api/documents/generate-bpf", async (req, res) => {
    const year = Number(req.body?.year) || new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

    const [allSessions, allInvoices, allPrograms, allEnrollments, settings] = await Promise.all([
      storage.getSessions(),
      storage.getInvoices(),
      storage.getPrograms(),
      storage.getEnrollments(),
      storage.getOrganizationSettings(),
    ]);

    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const orgName = settingsMap["org_name"] || "SO'SAFE Formation";
    const orgAddress = settingsMap["org_address"] || "";
    const orgSiret = settingsMap["org_siret"] || "";

    // Filter sessions for the year
    const yearSessions = allSessions.filter(s => {
      const d = new Date(s.startDate);
      return d >= yearStart && d <= yearEnd;
    });

    const sessionIds = new Set(yearSessions.map(s => s.id));

    // Filter invoices for the year
    const yearInvoices = allInvoices.filter(inv => {
      if (inv.status === "cancelled") return false;
      if (inv.sessionId && sessionIds.has(inv.sessionId)) return true;
      if (!inv.sessionId) {
        const d = new Date((inv as any).createdAt || yearStart);
        return d >= yearStart && d <= yearEnd;
      }
      return false;
    });

    // Filter enrollments for year sessions
    const yearEnrollments = allEnrollments.filter(e => sessionIds.has(e.sessionId));
    const attendedEnrollments = yearEnrollments.filter(e => e.status === "attended" || e.status === "completed");

    // Unique trainees
    const uniqueTraineeIds = new Set(yearEnrollments.map(e => e.traineeId));
    const uniqueAttendedIds = new Set(attendedEnrollments.map(e => e.traineeId));

    // Total financials
    const totalCA = yearInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = yearInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalPending = totalCA - totalPaid;

    // Per-program breakdown
    const programMap = Object.fromEntries(allPrograms.map(p => [p.id, p]));
    const byProgram: Record<string, { title: string; sessions: number; apprenants: Set<string>; heures: number; ca: number; paid: number }> = {};

    for (const session of yearSessions) {
      const prog = programMap[session.programId];
      if (!prog) continue;
      if (!byProgram[session.programId]) {
        byProgram[session.programId] = { title: prog.title, sessions: 0, apprenants: new Set(), heures: 0, ca: 0, paid: 0 };
      }
      byProgram[session.programId].sessions++;
      byProgram[session.programId].heures += prog.duration || 0;
      const sessEnrollments = yearEnrollments.filter(e => e.sessionId === session.id);
      sessEnrollments.forEach(e => byProgram[session.programId].apprenants.add(e.traineeId));
    }

    for (const inv of yearInvoices) {
      if (inv.sessionId) {
        const sess = yearSessions.find(s => s.id === inv.sessionId);
        if (sess && byProgram[sess.programId]) {
          byProgram[sess.programId].ca += inv.total;
          byProgram[sess.programId].paid += inv.paidAmount;
        }
      }
    }

    const programRows = Object.values(byProgram).sort((a, b) => b.ca - a.ca);
    const fmt = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";

    const programTableRows = programRows.map(row => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${row.title}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${row.sessions}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${row.apprenants.size}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${row.heures}h</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(row.ca)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(row.paid)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${row.ca > 0 ? Math.round((row.paid / row.ca) * 100) : 0}%</td>
      </tr>`).join("");

    const content = `
<div style="font-family:Arial,sans-serif;color:#111827;max-width:900px;margin:0 auto;padding:30px">
  <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #1e40af;padding-bottom:20px">
    <h1 style="font-size:20pt;color:#1e40af;margin:0">BILAN PÉDAGOGIQUE ET FINANCIER</h1>
    <p style="margin:4px 0;font-size:14pt;font-weight:600">Année ${year}</p>
    <p style="margin:4px 0;font-size:10pt;color:#6b7280">${orgName} — SIRET : ${orgSiret}</p>
    <p style="margin:4px 0;font-size:10pt;color:#6b7280">${orgAddress}</p>
    <p style="margin:4px 0;font-size:9pt;color:#9ca3af">Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
  </div>

  <h2 style="font-size:13pt;color:#1e40af;margin-top:24px;margin-bottom:8px">1. Indicateurs clés</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr style="background:#eff6ff">
      <td style="padding:10px 14px;font-weight:600;width:50%">Sessions réalisées</td>
      <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14pt">${yearSessions.length}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;font-weight:600">Stagiaires inscrits</td>
      <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14pt">${uniqueTraineeIds.size}</td>
    </tr>
    <tr style="background:#eff6ff">
      <td style="padding:10px 14px;font-weight:600">Stagiaires ayant suivi (présents)</td>
      <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14pt">${uniqueAttendedIds.size}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;font-weight:600">Chiffre d'affaires total</td>
      <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14pt;color:#15803d">${fmt(totalCA)}</td>
    </tr>
    <tr style="background:#eff6ff">
      <td style="padding:10px 14px;font-weight:600">Encaissé</td>
      <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14pt;color:#15803d">${fmt(totalPaid)}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;font-weight:600">Restant dû</td>
      <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14pt;color:#b45309">${fmt(totalPending)}</td>
    </tr>
  </table>

  <h2 style="font-size:13pt;color:#1e40af;margin-top:24px;margin-bottom:8px">2. Détail par formation</h2>
  <table style="width:100%;border-collapse:collapse;font-size:9pt">
    <thead>
      <tr style="background:#1e40af;color:white">
        <th style="padding:8px 10px;text-align:left">Formation</th>
        <th style="padding:8px 10px;text-align:center">Sessions</th>
        <th style="padding:8px 10px;text-align:center">Stagiaires</th>
        <th style="padding:8px 10px;text-align:center">Heures</th>
        <th style="padding:8px 10px;text-align:right">CA</th>
        <th style="padding:8px 10px;text-align:right">Encaissé</th>
        <th style="padding:8px 10px;text-align:right">Taux</th>
      </tr>
    </thead>
    <tbody>
      ${programTableRows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#9ca3af">Aucune donnée</td></tr>'}
      <tr style="background:#f3f4f6;font-weight:700;border-top:2px solid #1e40af">
        <td style="padding:8px 10px">TOTAL</td>
        <td style="padding:8px 10px;text-align:center">${yearSessions.length}</td>
        <td style="padding:8px 10px;text-align:center">${uniqueTraineeIds.size}</td>
        <td style="padding:8px 10px;text-align:center">—</td>
        <td style="padding:8px 10px;text-align:right">${fmt(totalCA)}</td>
        <td style="padding:8px 10px;text-align:right">${fmt(totalPaid)}</td>
        <td style="padding:8px 10px;text-align:right">${totalCA > 0 ? Math.round((totalPaid / totalCA) * 100) : 0}%</td>
      </tr>
    </tbody>
  </table>

  <p style="margin-top:40px;font-size:9pt;color:#9ca3af;text-align:center">
    Document généré automatiquement par la plateforme SO'SAFE Formation — ${new Date().toLocaleDateString("fr-FR")}
  </p>
</div>`;

    const doc = await storage.createGeneratedDocument({
      templateId: "bpf-auto",
      sessionId: null,
      traineeId: null,
      enterpriseId: null,
      quoteId: null,
      title: `Bilan Pédagogique et Financier ${year}`,
      type: "bpf",
      content,
      status: "generated",
      visibility: "admin_only",
      sharedAt: null,
    });

    res.status(201).json(doc);
  });

  // Generate a postal label (étiquette d'envoi) for a trainee
  app.post("/api/trainees/:id/etiquette-envoi", async (req, res) => {
    const trainee = await storage.getTrainee(req.params.id);
    if (!trainee) return res.status(404).json({ message: "Stagiaire non trouvé" });

    if (!trainee.address) {
      return res.status(400).json({ message: "Adresse postale manquante pour ce stagiaire" });
    }

    const addrLines = [
      `${trainee.civility ? trainee.civility + " " : ""}${trainee.firstName} ${trainee.lastName}`,
      trainee.address,
      `${trainee.postalCode || ""} ${trainee.city || ""}`.trim(),
      trainee.country && trainee.country !== "France" ? trainee.country : "",
    ].filter(Boolean);

    const settings = await storage.getOrganizationSettings();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const orgName = settingsMap["org_name"] || "SO'SAFE Formation";
    const orgAddress = settingsMap["org_address"] || "";

    const content = `
      <div style="font-family: Arial, sans-serif; padding: 20mm;">
        <div style="margin-bottom: 40mm; font-size: 10pt; color: #666;">
          <strong>${orgName}</strong><br>${orgAddress}
        </div>
        <div style="font-size: 14pt; line-height: 1.8; padding: 10mm; border: 1px solid #ccc;">
          ${addrLines.map(l => `<div>${l}</div>`).join("")}
        </div>
      </div>`;

    const doc = await storage.createGeneratedDocument({
      templateId: "etiquette-envoi-auto",
      sessionId: null,
      traineeId: trainee.id,
      enterpriseId: trainee.enterpriseId || null,
      quoteId: null,
      title: `Envoi postal - ${trainee.firstName} ${trainee.lastName}`,
      type: "etiquette_envoi",
      content,
      status: "generated",
      visibility: "admin_only",
      sharedAt: null,
    });

    res.status(201).json(doc);
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
  // PAYMENT SCHEDULES (ECHEANCIERS)
  // ============================================================

  app.get("/api/payment-schedules", async (req, res) => {
    const invoiceId = req.query.invoiceId as string;
    if (!invoiceId) return res.status(400).json({ message: "invoiceId requis" });
    const result = await storage.getPaymentSchedules(invoiceId);
    res.json(result);
  });

  app.post("/api/payment-schedules", async (req, res) => {
    const { invoiceId, installments } = req.body;
    if (!invoiceId || !installments || !Array.isArray(installments)) {
      return res.status(400).json({ message: "invoiceId et installments requis" });
    }
    // Delete existing schedules for this invoice before creating new ones
    await storage.deletePaymentSchedulesByInvoice(invoiceId);
    const results = [];
    for (let i = 0; i < installments.length; i++) {
      const schedule = await storage.createPaymentSchedule({
        invoiceId,
        installmentNumber: i + 1,
        totalInstallments: installments.length,
        amount: installments[i].amount,
        dueDate: installments[i].dueDate,
        status: "pending",
        notes: installments[i].notes || null,
      });
      results.push(schedule);
    }
    res.status(201).json(results);
  });

  app.patch("/api/payment-schedules/:id", async (req, res) => {
    const result = await storage.updatePaymentSchedule(req.params.id, req.body);
    if (!result) return res.status(404).json({ message: "Échéance non trouvée" });
    res.json(result);
  });

  app.post("/api/payment-schedules/:id/mark-paid", async (req, res) => {
    const schedule = await storage.updatePaymentSchedule(req.params.id, {
      status: "paid",
      paidAt: new Date(),
    });
    if (!schedule) return res.status(404).json({ message: "Échéance non trouvée" });

    // Create associated payment
    const payment = await storage.createPayment({
      invoiceId: schedule.invoiceId,
      amount: schedule.amount,
      method: req.body.method || "virement",
      reference: req.body.reference || `ECH-${schedule.installmentNumber}/${schedule.totalInstallments}`,
      notes: `Échéance ${schedule.installmentNumber}/${schedule.totalInstallments}`,
    });

    // Update schedule with payment reference
    await storage.updatePaymentSchedule(schedule.id, { paymentId: payment.id });

    // Update invoice paid amount
    const invoice = await storage.getInvoice(schedule.invoiceId);
    if (invoice) {
      const allPayments = await storage.getPayments(invoice.id);
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const newStatus = totalPaid >= invoice.total ? "paid" : "partial";
      await storage.updateInvoice(invoice.id, { paidAmount: totalPaid, status: newStatus });
    }

    res.json({ schedule, payment });
  });

  // ============================================================
  // BANK RECONCILIATION (RAPPROCHEMENT BANCAIRE)
  // ============================================================

  app.get("/api/bank-transactions", async (_req, res) => {
    const result = await storage.getBankTransactions();
    res.json(result);
  });

  app.post("/api/bank-transactions", async (req, res) => {
    const parsed = insertBankTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const tx = await storage.createBankTransaction(parsed.data);
    res.status(201).json(tx);
  });

  app.post("/api/bank-transactions/sync-ponto", async (req, res) => {
    // Simulates Ponto sync - in production would call MyPonto API
    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ message: "transactions array requis" });
    }
    const results = [];
    for (const tx of transactions) {
      const existing = await storage.getBankTransactions();
      const duplicate = existing.find(e => e.externalId === tx.externalId);
      if (!duplicate) {
        const created = await storage.createBankTransaction({
          externalId: tx.externalId,
          accountId: tx.accountId,
          amount: tx.amount,
          currency: tx.currency || "EUR",
          description: tx.description,
          counterpartName: tx.counterpartName,
          counterpartIban: tx.counterpartIban,
          executionDate: tx.executionDate,
          valueDate: tx.valueDate,
          reconciliationStatus: "unmatched",
          pontoSyncedAt: new Date(),
        });
        results.push(created);
      }
    }
    res.json({ imported: results.length, transactions: results });
  });

  app.post("/api/bank-transactions/:id/match", async (req, res) => {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ message: "invoiceId requis" });

    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });

    // Create payment from bank transaction
    const bankTx = (await storage.getBankTransactions()).find(t => t.id === req.params.id);
    if (!bankTx) return res.status(404).json({ message: "Transaction non trouvée" });

    const payment = await storage.createPayment({
      invoiceId,
      amount: Math.abs(bankTx.amount),
      method: "virement",
      reference: bankTx.externalId || bankTx.description || undefined,
      notes: `Rapprochement bancaire - ${bankTx.counterpartName || ""}`,
    });

    // Match bank transaction
    const matched = await storage.matchBankTransaction(req.params.id, invoiceId, payment.id);

    // Update invoice paid amount
    const allPayments = await storage.getPayments(invoice.id);
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus = totalPaid >= invoice.total ? "paid" : "partial";
    await storage.updateInvoice(invoice.id, { paidAmount: totalPaid, status: newStatus });

    res.json({ bankTransaction: matched, payment });
  });

  app.patch("/api/bank-transactions/:id", async (req, res) => {
    const result = await storage.updateBankTransaction(req.params.id, req.body);
    if (!result) return res.status(404).json({ message: "Transaction non trouvée" });
    res.json(result);
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
  // SESSION RESOURCES
  // ============================================================

  app.get("/api/session-resources", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const result = await storage.getSessionResources(sessionId);
    res.json(result);
  });

  app.post("/api/session-resources", async (req, res) => {
    const parsed = insertSessionResourceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const resource = await storage.createSessionResource(parsed.data);
    res.status(201).json(resource);
  });

  app.patch("/api/session-resources/:id", async (req, res) => {
    const parsed = insertSessionResourceSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const resource = await storage.updateSessionResource(req.params.id, parsed.data);
    if (!resource) return res.status(404).json({ message: "Ressource non trouvée" });
    res.json(resource);
  });

  app.delete("/api/session-resources/:id", async (req, res) => {
    await storage.deleteSessionResource(req.params.id);
    res.status(204).send();
  });

  // Learner access to session resources (visible only)
  app.get("/api/learner/session-resources", requireAuth, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const resources = await storage.getSessionResources(sessionId);
    res.json(resources.filter(r => r.visible));
  });

  // Learner: session info enrichi (session + programme + formateur)
  app.get("/api/learner/session-info", requireAuth, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session non trouvee" });
    const program = session.programId ? await storage.getProgram(session.programId) : null;
    const trainer = session.trainerId ? await storage.getTrainer(session.trainerId) : null;
    res.json({
      session,
      program: program ? {
        title: program.title,
        description: program.description,
        objectives: program.objectives,
        prerequisites: program.prerequisites,
        programContent: program.programContent,
        targetAudience: program.targetAudience,
        teachingMethods: program.teachingMethods,
        evaluationMethods: program.evaluationMethods,
        technicalMeans: program.technicalMeans,
        accessibilityInfo: program.accessibilityInfo,
        duration: program.duration,
        modality: program.modality,
        level: program.level,
      } : null,
      trainer: trainer ? {
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        specialty: trainer.specialty,
        bio: trainer.bio,
      } : null,
    });
  });

  // ============================================================
  // FORUM / ESPACE COLLABORATIF
  // ============================================================

  app.get("/api/learner/forum-posts", requireAuth, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const posts = await storage.getForumPosts(sessionId);
    res.json(posts);
  });

  app.post("/api/learner/forum-posts", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const data = {
      ...req.body,
      authorId: user.id,
      authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      authorRole: user.role || "learner",
    };
    const parsed = insertForumPostSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const post = await storage.createForumPost(parsed.data);
    res.status(201).json(post);
  });

  app.delete("/api/learner/forum-posts/:id", requireAuth, async (req, res) => {
    await storage.deleteForumPost(req.params.id as string);
    res.status(204).send();
  });

  app.get("/api/learner/forum-replies", requireAuth, async (req, res) => {
    const postId = req.query.postId as string;
    if (!postId) return res.status(400).json({ message: "postId requis" });
    const replies = await storage.getForumReplies(postId);
    res.json(replies);
  });

  app.post("/api/learner/forum-replies", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const data = {
      ...req.body,
      authorId: user.id,
      authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      authorRole: user.role || "learner",
    };
    const parsed = insertForumReplySchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const reply = await storage.createForumReply(parsed.data);
    res.status(201).json(reply);
  });

  app.delete("/api/learner/forum-replies/:id", requireAuth, async (req, res) => {
    await storage.deleteForumReply(req.params.id as string);
    res.status(204).send();
  });

  app.get("/api/learner/forum-mute", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const mute = await storage.getForumMute(user.id, sessionId);
    res.json({ muted: !!mute });
  });

  app.post("/api/learner/forum-mute", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const existing = await storage.getForumMute(user.id, sessionId);
    if (existing) return res.json({ muted: true });
    await storage.createForumMute({ userId: user.id, sessionId });
    res.status(201).json({ muted: true });
  });

  app.delete("/api/learner/forum-mute", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    await storage.deleteForumMute(user.id, sessionId);
    res.json({ muted: false });
  });

  // ============================================================
  // SCORM PACKAGES
  // ============================================================

  app.get("/api/scorm-packages", async (_req, res) => {
    const result = await storage.getScormPackages();
    res.json(result);
  });

  app.get("/api/scorm-packages/:id", async (req, res) => {
    const pkg = await storage.getScormPackage(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package SCORM non trouvé" });
    res.json(pkg);
  });

  app.delete("/api/scorm-packages/:id", async (req, res) => {
    await storage.deleteScormPackage(req.params.id);
    res.status(204).send();
  });

  // SCORM ZIP upload + extract
  app.post("/api/scorm-packages/upload", (req, res) => {
    const AdmZip = require("adm-zip");
    const { XMLParser } = require("fast-xml-parser");

    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
    let title = "Module SCORM";
    const chunks: Buffer[] = [];
    let originalName = "scorm.zip";

    busboy.on("field", (name: string, val: string) => {
      if (name === "title") title = val;
    });

    busboy.on("file", (_fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      originalName = info.filename || "scorm.zip";
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
    });

    busboy.on("finish", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const packageId = crypto.randomUUID();
        const extractDir = path.resolve(process.cwd(), "uploads/scorm", packageId);
        fs.mkdirSync(extractDir, { recursive: true });

        const zip = new AdmZip(buffer);
        zip.extractAllTo(extractDir, true);

        // Parse imsmanifest.xml
        let entryPoint = "index.html";
        let version = "1.2";
        const manifestPath = path.join(extractDir, "imsmanifest.xml");
        if (fs.existsSync(manifestPath)) {
          const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
          const manifest = parser.parse(fs.readFileSync(manifestPath, "utf-8"));
          // Detect version
          const schemaVersion = manifest?.manifest?.metadata?.schemaversion;
          if (schemaVersion && String(schemaVersion).includes("2004")) version = "2004";
          // Find entry point from resources
          const resources = manifest?.manifest?.resources?.resource;
          if (resources) {
            const res0 = Array.isArray(resources) ? resources[0] : resources;
            if (res0?.["@_href"]) entryPoint = res0["@_href"];
          }
        }

        const pkg = await storage.createScormPackage({
          title,
          version,
          fileName: originalName,
          entryPoint,
          extractPath: `/uploads/scorm/${packageId}/`,
          fileSize: buffer.length,
          uploadedBy: (req as any).user?.id || null,
        });

        res.status(201).json(pkg);
      } catch (err) {
        console.error("SCORM upload error:", err);
        res.status(500).json({ message: "Erreur lors du traitement du fichier SCORM" });
      }
    });

    req.pipe(busboy);
  });

  // ============================================================
  // FORMATIVE SUBMISSIONS
  // ============================================================

  app.get("/api/formative-submissions", async (req, res) => {
    const blockId = req.query.blockId as string | undefined;
    const traineeId = req.query.traineeId as string | undefined;
    const result = await storage.getFormativeSubmissions(blockId, traineeId);
    res.json(result);
  });

  app.post("/api/formative-submissions", async (req, res) => {
    const parsed = insertFormativeSubmissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const submission = await storage.createFormativeSubmission(parsed.data);
    res.status(201).json(submission);
  });

  app.patch("/api/formative-submissions/:id", async (req, res) => {
    const parsed = insertFormativeSubmissionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const submission = await storage.updateFormativeSubmission(req.params.id, parsed.data);
    if (!submission) return res.status(404).json({ message: "Soumission non trouvée" });
    res.json(submission);
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

    // Enforce single response: if assignmentId provided, check not already completed
    if (parsed.data.assignmentId) {
      const assignment = await storage.getEvaluationAssignment(parsed.data.assignmentId);
      if (assignment && assignment.status === "completed") {
        return res.status(409).json({ message: "Cette evaluation a deja ete completee et ne peut plus etre modifiee." });
      }
    }

    const response = await storage.createSurveyResponse(parsed.data);

    // If linked to an evaluation assignment, mark it completed
    if (parsed.data.assignmentId) {
      await storage.updateEvaluationAssignment(parsed.data.assignmentId, {
        status: "completed",
        completedAt: new Date(),
        responseId: response.id,
      });
    }

    res.status(201).json(response);
  });

  // ============================================================
  // EVALUATION ASSIGNMENTS
  // ============================================================

  app.get("/api/evaluation-assignments", async (req, res) => {
    const { sessionId, traineeId } = req.query;
    const assignments = await storage.getEvaluationAssignments(
      sessionId as string | undefined,
      traineeId as string | undefined
    );
    res.json(assignments);
  });

  app.post("/api/evaluation-assignments/batch", async (req, res) => {
    try {
      const { sessionId, evaluationType, templateId } = req.body;
      if (!sessionId || !evaluationType) {
        return res.status(400).json({ message: "sessionId et evaluationType requis" });
      }

      const template = templateId
        ? await storage.getSurveyTemplate(templateId)
        : null;

      // If no specific template, find active one matching type
      let tmpl = template;
      if (!tmpl) {
        const allTemplates = await storage.getSurveyTemplates();
        tmpl = allTemplates.find(t => t.evaluationType === evaluationType && t.status === "active") || null;
      }
      if (!tmpl) {
        return res.status(404).json({ message: `Aucun template actif pour le type ${evaluationType}` });
      }

      // Get all enrollments for this session
      const enrollments = await storage.getEnrollments(sessionId);
      const activeEnrollments = enrollments.filter((e: any) => e.status !== "cancelled");

      const created: any[] = [];
      for (const enrollment of activeEnrollments) {
        const trainee = await storage.getTrainee(enrollment.traineeId);
        if (!trainee) continue;

        let respondentType = "trainee";
        let respondentEmail = trainee.email;
        let respondentName = `${trainee.firstName} ${trainee.lastName}`;

        if (evaluationType === "manager_eval") {
          respondentType = "manager";
          respondentEmail = trainee.managerEmail || "";
          respondentName = trainee.managerName || "";
          if (!respondentEmail) continue; // Skip if no manager email
        } else if (evaluationType === "commissioner_eval") {
          respondentType = "enterprise";
          if (trainee.enterpriseId) {
            const enterprise = await storage.getEnterprise(trainee.enterpriseId);
            respondentEmail = enterprise?.contactEmail || "";
            respondentName = enterprise?.contactName || enterprise?.name || "";
          }
          if (!respondentEmail) continue;
        }

        // Check if already assigned
        const existing = await storage.getEvaluationAssignments(sessionId, enrollment.traineeId);
        const alreadyAssigned = existing.some((a: any) => a.templateId === tmpl!.id);
        if (alreadyAssigned) continue;

        const token = crypto.randomUUID();
        const isDelayed = evaluationType === "evaluation_cold" && tmpl.coldDelayDays;
        const scheduledFor = isDelayed
          ? new Date(Date.now() + (tmpl.coldDelayDays! * 86400000))
          : null;

        const assignment = await storage.createEvaluationAssignment({
          templateId: tmpl.id,
          sessionId,
          traineeId: enrollment.traineeId,
          respondentType,
          respondentEmail,
          respondentName,
          token,
          status: isDelayed ? "pending" : "sent",
          scheduledFor,
        });

        created.push(assignment);
      }

      res.json({ created: created.length, assignments: created });
    } catch (err) {
      console.error("[evaluation-assignments] batch error:", err);
      res.status(500).json({ message: "Erreur lors de la creation des affectations" });
    }
  });

  app.patch("/api/evaluation-assignments/:id", async (req, res) => {
    const updated = await storage.updateEvaluationAssignment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Affectation non trouvee" });
    res.json(updated);
  });

  app.delete("/api/evaluation-assignments/:id", async (req, res) => {
    const assignment = await storage.getEvaluationAssignment(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Affectation non trouvee" });
    // Soft delete: mark as expired
    await storage.updateEvaluationAssignment(req.params.id, { status: "expired" });
    res.json({ success: true });
  });

  app.get("/api/evaluation-stats", async (req, res) => {
    try {
      const { sessionId, evaluationType } = req.query;
      const assignments = await storage.getEvaluationAssignments(
        sessionId as string | undefined
      );

      const filtered = evaluationType
        ? assignments.filter((a: any) => {
            // Need to check template evaluationType
            return true; // Will filter after loading templates
          })
        : assignments;

      const total = filtered.length;
      const completed = filtered.filter((a: any) => a.status === "completed").length;
      const sent = filtered.filter((a: any) => a.status === "sent").length;
      const pending = filtered.filter((a: any) => a.status === "pending").length;

      // Get responses for completed assignments to calculate scores
      const completedAssignments = filtered.filter((a: any) => a.responseId);
      let avgScore: number | null = null;
      if (completedAssignments.length > 0) {
        const responses = await storage.getSurveyResponses();
        const relevantResponses = responses.filter((r: any) =>
          completedAssignments.some((a: any) => a.responseId === r.id)
        );
        const scores = relevantResponses
          .map((r: any) => r.weightedScore || r.rating)
          .filter((s: any) => s != null);
        if (scores.length > 0) {
          avgScore = Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100;
        }
      }

      res.json({ total, completed, sent, pending, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0, avgScore });
    } catch (err) {
      console.error("[evaluation-stats] error:", err);
      res.status(500).json({ message: "Erreur" });
    }
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
  // ANALYSIS COMMENTS (post-évaluation)
  // ============================================================

  app.get("/api/analysis-comments", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const visibility = req.query.visibility as string | undefined;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });
    const result = await storage.getAnalysisComments(sessionId, visibility);
    res.json(result);
  });

  app.post("/api/analysis-comments", async (req, res) => {
    const user = (req as any).user;
    const parsed = insertAnalysisCommentSchema.safeParse({
      ...req.body,
      authorId: user.id,
      authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const comment = await storage.createAnalysisComment(parsed.data);
    res.status(201).json(comment);
  });

  app.patch("/api/analysis-comments/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await storage.getAnalysisComment(id);
    if (!existing) return res.status(404).json({ message: "Commentaire non trouvé" });
    const updated = await storage.updateAnalysisComment(id, req.body);
    res.json(updated);
  });

  app.delete("/api/analysis-comments/:id", async (req, res) => {
    const id = req.params.id as string;
    await storage.deleteAnalysisComment(id);
    res.status(204).send();
  });

  // Analyse détaillée par session (stats enrichies)
  app.get("/api/analysis-stats", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ message: "sessionId requis" });

    const responses = await storage.getSurveyResponses(undefined, sessionId);
    const assignments = await storage.getEvaluationAssignments(sessionId);

    // Grouper les réponses par type d'évaluation
    const byType: Record<string, typeof responses> = {};
    for (const r of responses) {
      const type = r.evaluationType || r.respondentType || "satisfaction";
      if (!byType[type]) byType[type] = [];
      byType[type].push(r);
    }

    // Calcul stats par type
    const typeStats = Object.entries(byType).map(([type, resps]) => {
      const ratings = resps.filter(r => r.rating != null).map(r => r.rating!);
      const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
      const weightedScores = resps.filter(r => r.weightedScore != null).map(r => r.weightedScore!);
      const avgWeighted = weightedScores.length > 0 ? Math.round((weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length) * 10) / 10 : null;
      return { type, count: resps.length, avgRating, avgWeighted };
    });

    // Analyse par question (agrégation des réponses)
    const questionAnalysis: Record<number, { question: string; ratings: number[]; texts: string[] }> = {};
    for (const r of responses) {
      const answers = (r.answers || []) as Array<{ questionIndex: number; answer: string | number }>;
      for (const a of answers) {
        if (!questionAnalysis[a.questionIndex]) {
          questionAnalysis[a.questionIndex] = { question: `Question ${a.questionIndex + 1}`, ratings: [], texts: [] };
        }
        if (typeof a.answer === "number") {
          questionAnalysis[a.questionIndex].ratings.push(a.answer);
        } else if (typeof a.answer === "string" && a.answer.trim()) {
          questionAnalysis[a.questionIndex].texts.push(a.answer);
        }
      }
    }

    const questionStats = Object.entries(questionAnalysis).map(([idx, data]) => ({
      questionIndex: parseInt(idx),
      question: data.question,
      avgRating: data.ratings.length > 0 ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10 : null,
      ratingCount: data.ratings.length,
      textResponses: data.texts,
    }));

    // Taux de complétion
    const total = assignments.length;
    const completed = assignments.filter((a: any) => a.status === "completed").length;

    res.json({
      totalResponses: responses.length,
      totalAssignments: total,
      completedAssignments: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      typeStats,
      questionStats,
    });
  });

  // ============================================================
  // MESSAGING (messagerie intégrée)
  // ============================================================

  // Liste des conversations de l'utilisateur connecté
  app.get("/api/conversations", async (req, res) => {
    const user = (req as any).user;
    const convs = await storage.getConversations(user.id);
    // Enrichir avec participants et dernier message
    const enriched = await Promise.all(convs.map(async (c) => {
      const participants = await storage.getConversationParticipants(c.id);
      const messages = await storage.getMessages(c.id);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const myParticipation = participants.find(p => p.userId === user.id);
      const unreadCount = myParticipation?.lastReadAt
        ? messages.filter(m => new Date(m.createdAt!) > new Date(myParticipation.lastReadAt!) && m.senderId !== user.id).length
        : messages.filter(m => m.senderId !== user.id).length;
      return { ...c, participants, lastMessage, unreadCount };
    }));
    res.json(enriched);
  });

  // Créer une conversation (direct ou group)
  app.post("/api/conversations", async (req, res) => {
    const user = (req as any).user;
    const { type, title, participantIds } = req.body;

    // Pour les conversations directes, vérifier si elle existe déjà
    if (type === "direct" && participantIds?.length === 1) {
      const existing = await storage.findDirectConversation(user.id, participantIds[0]);
      if (existing) {
        const participants = await storage.getConversationParticipants(existing.id);
        return res.json({ ...existing, participants });
      }
    }

    const conv = await storage.createConversation({ type: type || "direct", title, createdBy: user.id });

    // Ajouter le créateur comme participant
    await storage.addConversationParticipant({
      conversationId: conv.id,
      userId: user.id,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      userRole: user.role,
    });

    // Ajouter les autres participants
    if (participantIds && Array.isArray(participantIds)) {
      for (const pid of participantIds) {
        const pUser = await storage.getUser(pid);
        if (pUser) {
          await storage.addConversationParticipant({
            conversationId: conv.id,
            userId: pUser.id,
            userName: `${pUser.firstName || ""} ${pUser.lastName || ""}`.trim() || pUser.username,
            userRole: pUser.role,
          });
        }
      }
    }

    const participants = await storage.getConversationParticipants(conv.id);
    res.status(201).json({ ...conv, participants });
  });

  // Supprimer une conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    await storage.deleteConversation(req.params.id as string);
    res.status(204).send();
  });

  // Obtenir les participants d'une conversation
  app.get("/api/conversations/:id/participants", async (req, res) => {
    const participants = await storage.getConversationParticipants(req.params.id as string);
    res.json(participants);
  });

  // Obtenir les messages d'une conversation
  app.get("/api/messages", async (req, res) => {
    const conversationId = req.query.conversationId as string;
    if (!conversationId) return res.status(400).json({ message: "conversationId requis" });
    const user = (req as any).user;
    // Marquer comme lu
    await storage.updateLastRead(conversationId, user.id);
    const msgs = await storage.getMessages(conversationId);
    res.json(msgs);
  });

  // Envoyer un message
  app.post("/api/messages", async (req, res) => {
    const user = (req as any).user;
    const { conversationId, content } = req.body;
    if (!conversationId || !content) return res.status(400).json({ message: "conversationId et content requis" });
    const msg = await storage.createMessage({
      conversationId,
      senderId: user.id,
      senderName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      senderRole: user.role,
      content,
    });
    res.status(201).json(msg);
  });

  // Supprimer un message
  app.delete("/api/messages/:id", async (req, res) => {
    await storage.deleteMessage(req.params.id as string);
    res.status(204).send();
  });

  // Liste des utilisateurs pour démarrer une conversation
  app.get("/api/conversations/available-users", async (req, res) => {
    const user = (req as any).user;
    const allUsers = await storage.getUsers();
    const filtered = allUsers
      .filter(u => u.id !== user.id)
      .map(u => ({ id: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username, role: u.role }));
    res.json(filtered);
  });

  // ============================================================
  // CRM & MARKETING
  // ============================================================

  // Contact Tags
  app.get("/api/contact-tags", async (_req, res) => {
    const tags = await storage.getContactTags();
    res.json(tags);
  });

  app.post("/api/contact-tags", async (req, res) => {
    const parsed = insertContactTagSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const tag = await storage.createContactTag(parsed.data);
    res.status(201).json(tag);
  });

  app.patch("/api/contact-tags/:id", async (req, res) => {
    const tag = await storage.updateContactTag(req.params.id as string, req.body);
    if (!tag) return res.status(404).json({ message: "Tag non trouvé" });
    res.json(tag);
  });

  app.delete("/api/contact-tags/:id", async (req, res) => {
    await storage.deleteContactTag(req.params.id as string);
    res.status(204).send();
  });

  // Tag Assignments
  app.get("/api/tag-assignments", async (req, res) => {
    const { contactType, contactId } = req.query;
    const assignments = await storage.getContactTagAssignments(contactType as string | undefined, contactId as string | undefined);
    res.json(assignments);
  });

  app.post("/api/tag-assignments", async (req, res) => {
    const parsed = insertContactTagAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const assignment = await storage.assignTag(parsed.data);
    res.status(201).json(assignment);
  });

  app.delete("/api/tag-assignments", async (req, res) => {
    const { tagId, contactType, contactId } = req.query;
    if (!tagId || !contactType || !contactId) return res.status(400).json({ message: "tagId, contactType et contactId requis" });
    await storage.removeTagAssignment(tagId as string, contactType as string, contactId as string);
    res.status(204).send();
  });

  // Marketing Campaigns
  app.get("/api/marketing-campaigns", async (_req, res) => {
    const campaigns = await storage.getMarketingCampaigns();
    res.json(campaigns);
  });

  app.get("/api/marketing-campaigns/:id", async (req, res) => {
    const campaign = await storage.getMarketingCampaign(req.params.id as string);
    if (!campaign) return res.status(404).json({ message: "Campagne non trouvée" });
    const recipients = await storage.getCampaignRecipients(campaign.id);
    res.json({ ...campaign, recipients });
  });

  app.post("/api/marketing-campaigns", async (req, res) => {
    const user = (req as any).user;
    const parsed = insertMarketingCampaignSchema.safeParse({
      ...req.body,
      createdBy: user.id,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const campaign = await storage.createMarketingCampaign(parsed.data);
    res.status(201).json(campaign);
  });

  app.patch("/api/marketing-campaigns/:id", async (req, res) => {
    const campaign = await storage.updateMarketingCampaign(req.params.id as string, req.body);
    if (!campaign) return res.status(404).json({ message: "Campagne non trouvée" });
    res.json(campaign);
  });

  app.delete("/api/marketing-campaigns/:id", async (req, res) => {
    await storage.deleteMarketingCampaign(req.params.id as string);
    res.status(204).send();
  });

  // Envoyer la campagne (simulé — collecte les destinataires et marque comme envoyée)
  app.post("/api/marketing-campaigns/:id/send", async (req, res) => {
    const campaign = await storage.getMarketingCampaign(req.params.id as string);
    if (!campaign) return res.status(404).json({ message: "Campagne non trouvée" });

    // Collecter les destinataires selon le ciblage
    const recipients: Array<{ email: string; name: string; contactType: string; contactId: string }> = [];

    const addTrainees = async () => {
      const all = await storage.getTrainees();
      if (campaign.targetType === "tag" && campaign.targetTagIds && (campaign.targetTagIds as string[]).length > 0) {
        const assignments = await storage.getContactTagAssignments("trainee");
        const taggedIds = assignments.filter(a => (campaign.targetTagIds as string[]).includes(a.tagId)).map(a => a.contactId);
        all.filter(t => taggedIds.includes(t.id) && t.email).forEach(t => recipients.push({ email: t.email, name: `${t.firstName} ${t.lastName}`, contactType: "trainee", contactId: t.id }));
      } else {
        all.filter(t => t.email).forEach(t => recipients.push({ email: t.email, name: `${t.firstName} ${t.lastName}`, contactType: "trainee", contactId: t.id }));
      }
    };

    const addEnterprises = async () => {
      const all = await storage.getEnterprises();
      if (campaign.targetType === "tag" && campaign.targetTagIds && (campaign.targetTagIds as string[]).length > 0) {
        const assignments = await storage.getContactTagAssignments("enterprise");
        const taggedIds = assignments.filter(a => (campaign.targetTagIds as string[]).includes(a.tagId)).map(a => a.contactId);
        all.filter(e => taggedIds.includes(e.id) && e.contactEmail).forEach(e => recipients.push({ email: e.contactEmail!, name: e.name, contactType: "enterprise", contactId: e.id }));
      } else {
        all.filter(e => e.contactEmail).forEach(e => recipients.push({ email: e.contactEmail!, name: e.name, contactType: "enterprise", contactId: e.id }));
      }
    };

    const addProspects = async () => {
      const all = await storage.getProspects();
      if (campaign.targetType === "tag" && campaign.targetTagIds && (campaign.targetTagIds as string[]).length > 0) {
        const assignments = await storage.getContactTagAssignments("prospect");
        const taggedIds = assignments.filter(a => (campaign.targetTagIds as string[]).includes(a.tagId)).map(a => a.contactId);
        all.filter(p => taggedIds.includes(p.id) && p.contactEmail).forEach(p => recipients.push({ email: p.contactEmail!, name: p.contactName, contactType: "prospect", contactId: p.id }));
      } else {
        all.filter(p => p.contactEmail).forEach(p => recipients.push({ email: p.contactEmail!, name: p.contactName, contactType: "prospect", contactId: p.id }));
      }
    };

    const ct = campaign.targetContactType || "all";
    if (ct === "all" || ct === "trainee") await addTrainees();
    if (ct === "all" || ct === "enterprise") await addEnterprises();
    if (ct === "all" || ct === "prospect") await addProspects();

    // Ajouter les destinataires
    if (recipients.length > 0) {
      await storage.addCampaignRecipients(recipients.map(r => ({
        campaignId: campaign.id,
        email: r.email,
        name: r.name,
        contactType: r.contactType,
        contactId: r.contactId,
        status: "sent",
        sentAt: new Date(),
      })));
    }

    await storage.updateMarketingCampaign(campaign.id, {
      status: "sent",
      sentAt: new Date(),
      totalRecipients: recipients.length,
      sentCount: recipients.length,
    });

    res.json({ sent: recipients.length });
  });

  // Prospect Activities
  app.get("/api/prospect-activities", async (req, res) => {
    const prospectId = req.query.prospectId as string;
    if (!prospectId) return res.status(400).json({ message: "prospectId requis" });
    const activities = await storage.getProspectActivities(prospectId);
    res.json(activities);
  });

  app.post("/api/prospect-activities", async (req, res) => {
    const user = (req as any).user;
    const parsed = insertProspectActivitySchema.safeParse({
      ...req.body,
      authorId: user.id,
      authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const activity = await storage.createProspectActivity(parsed.data);
    res.status(201).json(activity);
  });

  // CRM Stats
  app.get("/api/crm-stats", async (_req, res) => {
    const prospects = await storage.getProspects();
    const enterprises = await storage.getEnterprises();
    const trainees = await storage.getTrainees();
    const campaigns = await storage.getMarketingCampaigns();

    const pipelineStats = {
      prospect: prospects.filter(p => p.status === "prospect").length,
      contact: prospects.filter(p => p.status === "contact").length,
      qualified: prospects.filter(p => p.status === "qualified").length,
      negotiation: prospects.filter(p => p.status === "negotiation").length,
      won: prospects.filter(p => p.status === "won").length,
      lost: prospects.filter(p => p.status === "lost").length,
    };

    const totalRevenue = prospects
      .filter(p => p.status === "won" && p.estimatedRevenue)
      .reduce((sum, p) => sum + (p.estimatedRevenue || 0), 0);

    const pipelineRevenue = prospects
      .filter(p => !["won", "lost"].includes(p.status) && p.estimatedRevenue)
      .reduce((sum, p) => sum + (p.estimatedRevenue || 0), 0);

    const sentCampaigns = campaigns.filter(c => c.status === "sent").length;
    const totalEmails = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);

    res.json({
      totalProspects: prospects.length,
      totalEnterprises: enterprises.length,
      totalTrainees: trainees.length,
      pipelineStats,
      totalRevenue,
      pipelineRevenue,
      sentCampaigns,
      totalEmails,
    });
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
  // EMARGEMENT — Send emails & QR codes (Section 8.1)
  // ============================================================

  // POST /api/attendance-records/send-emargement — send emargement emails for a sheet
  app.post("/api/attendance-records/send-emargement", async (req, res) => {
    try {
      const { sheetId } = req.body;
      if (!sheetId) return res.status(400).json({ message: "sheetId requis" });

      const sheet = await storage.getAttendanceSheet(sheetId);
      if (!sheet) return res.status(404).json({ message: "Feuille introuvable" });

      const session = await storage.getSession(sheet.sessionId);
      const enrollments = await storage.getEnrollments(sheet.sessionId);
      const activeEnrollments = enrollments.filter((e: any) => e.status !== "cancelled");

      const appUrl = process.env.APP_URL
        || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
        || "http://localhost:5000";

      let sentCount = 0;

      for (const enrollment of activeEnrollments) {
        const trainee = await storage.getTrainee(enrollment.traineeId);
        if (!trainee?.email) continue;

        // Find or create attendance record
        const records = await storage.getAttendanceRecords(sheetId);
        let record = records.find((r: any) => r.traineeId === enrollment.traineeId);

        if (!record) {
          record = await storage.createAttendanceRecord({
            sheetId,
            traineeId: enrollment.traineeId,
            status: "absent",
          });
        }

        // Skip if already signed
        if (record.signedAt) continue;

        // Generate token if needed
        let token = record.emargementToken;
        if (!token) {
          token = crypto.randomUUID();
          await storage.updateAttendanceRecord(record.id, { emargementToken: token } as any);
        }

        const signUrl = `${appUrl}/emargement/${token}`;
        const periodLabel = sheet.period === "matin" ? "Matin"
          : sheet.period === "apres-midi" ? "Apres-midi" : "Journee entiere";
        const dateStr = new Date(sheet.date).toLocaleDateString("fr-FR");

        const subject = `Emargement - ${session?.title || "Formation"} - ${dateStr} ${periodLabel}`;
        const body = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1a1a1a;">Emargement de presence</h2>
          <p>Bonjour ${trainee.firstName},</p>
          <p>Merci de confirmer votre presence pour :</p>
          <ul>
            <li><strong>Formation :</strong> ${session?.title || ""}</li>
            <li><strong>Date :</strong> ${dateStr}</li>
            <li><strong>Periode :</strong> ${periodLabel}</li>
          </ul>
          <p><a href="${signUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Signer mon emargement</a></p>
          <p style="color:#666;font-size:12px;margin-top:20px;">Ce lien est personnel et unique. Ne le partagez pas.</p>
        </div>`;

        const emailLog = await storage.createEmailLog({
          recipient: trainee.email,
          subject,
          body,
          status: "pending",
        });

        try {
          const { sendEmailNow } = await import("./email-service");
          await sendEmailNow(emailLog.id);
        } catch {}

        sentCount++;
      }

      res.json({ success: true, sentCount });
    } catch (err) {
      console.error("[emargement] send error:", err);
      res.status(500).json({ message: "Erreur lors de l'envoi" });
    }
  });

  // GET /api/attendance-records/:id/qrcode — generate QR code for a record
  app.get("/api/attendance-records/:id/qrcode", async (req, res) => {
    try {
      const records = await storage.getAttendanceRecords();
      const record = records.find((r: any) => r.id === req.params.id);
      if (!record) return res.status(404).json({ message: "Enregistrement introuvable" });

      let token = record.emargementToken;
      if (!token) {
        token = crypto.randomUUID();
        await storage.updateAttendanceRecord(record.id, { emargementToken: token } as any);
      }

      const appUrl = process.env.APP_URL
        || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
        || "http://localhost:5000";

      const QRCode = (await import("qrcode")).default;
      const url = `${appUrl}/emargement/${token}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });

      res.json({ qrDataUrl, url });
    } catch (err) {
      console.error("[emargement] QR error:", err);
      res.status(500).json({ message: "Erreur generation QR" });
    }
  });

  // ============================================================
  // ATTENDANCE REPORTS (Section 8.2)
  // ============================================================

  // GET /api/attendance-records/report-detail — detailed report with per-trainee breakdown
  app.get("/api/attendance-records/report-detail", async (req, res) => {
    try {
      const { sessionId, traineeId, enterpriseId } = req.query as Record<string, string>;
      if (!sessionId) return res.status(400).json({ message: "sessionId requis" });

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session introuvable" });

      const program = session.programId ? await storage.getProgram(session.programId) : null;
      const sheets = await storage.getAttendanceSheets(sessionId);
      const enrollments = await storage.getEnrollments(sessionId);
      const activeEnrollments = enrollments.filter((e: any) => e.status !== "cancelled");

      // Filter by enterprise if requested
      const filteredEnrollments = enterpriseId
        ? activeEnrollments.filter((e: any) => e.enterpriseId === enterpriseId)
        : activeEnrollments;

      // Filter by trainee if requested
      const targetEnrollments = traineeId
        ? filteredEnrollments.filter((e: any) => e.traineeId === traineeId)
        : filteredEnrollments;

      // Gather all records
      const allRecordsBySheet = new Map<string, any[]>();
      for (const sheet of sheets) {
        const records = await storage.getAttendanceRecords(sheet.id);
        allRecordsBySheet.set(sheet.id, records);
      }

      // Build per-trainee data
      const traineeDetails = [];
      for (const enrollment of targetEnrollments) {
        const trainee = await storage.getTrainee(enrollment.traineeId);
        if (!trainee) continue;

        let present = 0, absent = 0, late = 0, excused = 0, total = 0;
        const sheetEntries: any[] = [];

        for (const sheet of sheets) {
          const records = allRecordsBySheet.get(sheet.id) || [];
          const record = records.find((r: any) => r.traineeId === enrollment.traineeId);
          const status = record?.status || "absent";
          total++;
          if (status === "present") present++;
          else if (status === "absent") absent++;
          else if (status === "late") late++;
          else if (status === "excused") excused++;

          sheetEntries.push({
            date: sheet.date,
            period: sheet.period,
            status,
            signedAt: record?.signedAt || null,
            hasSignature: !!(record as any)?.signatureData,
          });
        }

        const enterprise = enrollment.enterpriseId ? await storage.getEnterprise(enrollment.enterpriseId) : null;

        traineeDetails.push({
          traineeId: trainee.id,
          traineeName: `${trainee.firstName} ${trainee.lastName}`,
          traineeEmail: trainee.email || "",
          enterpriseId: enrollment.enterpriseId || null,
          enterpriseName: enterprise?.name || null,
          total,
          present,
          absent,
          late,
          excused,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
          sheets: sheetEntries,
        });
      }

      // Global stats
      const globalTotal = traineeDetails.reduce((s, t) => s + t.total, 0);
      const globalPresent = traineeDetails.reduce((s, t) => s + t.present, 0);

      res.json({
        session: {
          id: session.id,
          title: session.title,
          startDate: session.startDate,
          endDate: session.endDate,
          location: session.location,
          modality: session.modality,
        },
        programTitle: program?.title || null,
        sheetsCount: sheets.length,
        traineesCount: traineeDetails.length,
        globalRate: globalTotal > 0 ? Math.round((globalPresent / globalTotal) * 100) : 0,
        trainees: traineeDetails,
      });
    } catch (err) {
      console.error("[attendance-report] detail error:", err);
      res.status(500).json({ message: "Erreur generation rapport" });
    }
  });

  // POST /api/attendance-records/generate-report — generate report as a document + optionally send to enterprise
  app.post("/api/attendance-records/generate-report", async (req, res) => {
    try {
      const { sessionId, sendToEnterprise } = req.body;
      if (!sessionId) return res.status(400).json({ message: "sessionId requis" });

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session introuvable" });

      const program = session.programId ? await storage.getProgram(session.programId) : null;
      const sheets = await storage.getAttendanceSheets(sessionId);
      const enrollments = await storage.getEnrollments(sessionId);
      const activeEnrollments = enrollments.filter((e: any) => e.status !== "cancelled");

      // Org settings for branding
      const orgSettings = await storage.getOrganizationSettings();
      const settingsMap: Record<string, string> = {};
      orgSettings.forEach((s: any) => { settingsMap[s.key] = s.value; });
      const orgName = settingsMap["org_name"] || "SO'SAFE Formation";

      // Gather records
      const allRecordsBySheet = new Map<string, any[]>();
      for (const sheet of sheets) {
        const records = await storage.getAttendanceRecords(sheet.id);
        allRecordsBySheet.set(sheet.id, records);
      }

      // Build HTML report
      let html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">`;
      html += `<h1 style="text-align:center;font-size:20px;margin-bottom:5px;">Rapport d'emargement</h1>`;
      html += `<p style="text-align:center;color:#666;margin-bottom:20px;">${orgName}</p>`;
      html += `<table style="width:100%;margin-bottom:20px;"><tr>
        <td><strong>Formation :</strong> ${program?.title || session.title}</td>
        <td><strong>Session :</strong> ${session.title}</td>
      </tr><tr>
        <td><strong>Du :</strong> ${new Date(session.startDate).toLocaleDateString("fr-FR")} <strong>au</strong> ${new Date(session.endDate).toLocaleDateString("fr-FR")}</td>
        <td><strong>Lieu :</strong> ${session.location || "-"}</td>
      </tr><tr>
        <td><strong>Modalite :</strong> ${session.modality || "-"}</td>
        <td><strong>Nombre de feuilles :</strong> ${sheets.length}</td>
      </tr></table>`;

      // Table header
      html += `<table style="width:100%;border-collapse:collapse;">`;
      html += `<thead><tr><th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:left;">Stagiaire</th>`;
      for (const sheet of sheets) {
        const dateStr = new Date(sheet.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        const periodStr = sheet.period === "matin" ? "M" : sheet.period === "apres-midi" ? "AM" : "J";
        html += `<th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:center;font-size:11px;">${dateStr}<br/>${periodStr}</th>`;
      }
      html += `<th style="border:1px solid #999;padding:6px;background:#f0f0f0;text-align:center;">Taux</th></tr></thead><tbody>`;

      // Rows per trainee
      const enterpriseMap = new Map<string, string>();
      for (const enrollment of activeEnrollments) {
        const trainee = await storage.getTrainee(enrollment.traineeId);
        if (!trainee) continue;

        if (enrollment.enterpriseId && !enterpriseMap.has(enrollment.enterpriseId)) {
          const ent = await storage.getEnterprise(enrollment.enterpriseId);
          if (ent) enterpriseMap.set(enrollment.enterpriseId, ent.name);
        }

        let present = 0, total = 0;
        html += `<tr><td style="border:1px solid #999;padding:6px;font-size:12px;">${trainee.firstName} ${trainee.lastName}</td>`;
        for (const sheet of sheets) {
          const records = allRecordsBySheet.get(sheet.id) || [];
          const record = records.find((r: any) => r.traineeId === enrollment.traineeId);
          const status = record?.status || "absent";
          total++;
          if (status === "present") present++;
          const color = status === "present" ? "#16a34a" : status === "late" ? "#d97706" : status === "excused" ? "#2563eb" : "#dc2626";
          const label = status === "present" ? "P" : status === "late" ? "R" : status === "excused" ? "E" : "A";
          html += `<td style="border:1px solid #999;padding:6px;text-align:center;color:${color};font-weight:600;font-size:12px;">${label}</td>`;
        }
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        html += `<td style="border:1px solid #999;padding:6px;text-align:center;font-weight:600;">${rate}%</td></tr>`;
      }
      html += `</tbody></table>`;
      html += `<p style="margin-top:15px;font-size:11px;color:#666;">P = Present, A = Absent, R = Retard, E = Excuse</p>`;
      html += `<p style="margin-top:20px;font-size:12px;color:#666;">Rapport genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>`;
      html += `</div>`;

      // Save as generated document
      const doc = await storage.createGeneratedDocument({
        templateId: "rapport_emargement_auto",
        sessionId,
        traineeId: null,
        enterpriseId: null,
        quoteId: null,
        title: `Rapport emargement — ${session.title}`,
        type: "rapport_emargement",
        content: html,
        status: "generated",
        visibility: sendToEnterprise ? "enterprise" : "admin_only",
        sharedAt: sendToEnterprise ? new Date() : null,
      });

      // Auto-send to enterprise contacts if requested
      if (sendToEnterprise) {
        const enterpriseIds = Array.from(new Set(activeEnrollments.map((e: any) => e.enterpriseId).filter(Boolean)));
        for (const entId of enterpriseIds) {
          const enterprise = await storage.getEnterprise(entId as string);
          if (!enterprise?.email) continue;

          const emailLog = await storage.createEmailLog({
            recipient: enterprise.email,
            subject: `Rapport d'emargement — ${session.title}`,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2>Rapport d'emargement</h2>
              <p>Bonjour,</p>
              <p>Veuillez trouver ci-dessous le rapport d'emargement pour la formation <strong>${session.title}</strong>
              (${new Date(session.startDate).toLocaleDateString("fr-FR")} — ${new Date(session.endDate).toLocaleDateString("fr-FR")}).</p>
              ${html}
              <p style="color:#666;font-size:12px;margin-top:30px;">Ce rapport est egalement disponible dans votre espace entreprise sur la plateforme.</p>
            </div>`,
            status: "pending",
          });

          try {
            const { sendEmailNow } = await import("./email-service");
            await sendEmailNow(emailLog.id);
          } catch {}
        }
      }

      res.json({ success: true, documentId: doc.id });
    } catch (err) {
      console.error("[attendance-report] generate error:", err);
      res.status(500).json({ message: "Erreur generation rapport" });
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
    const smtpKeys = ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from_name", "smtp_from_email"];
    const brevoSmsKeys = ["brevo_api_key", "brevo_sms_sender"];
    let smtpChanged = false;
    let brevoSmsChanged = false;
    for (const [key, value] of Object.entries(settings)) {
      await storage.upsertOrganizationSetting({ key, value });
      if (smtpKeys.includes(key)) smtpChanged = true;
      if (brevoSmsKeys.includes(key)) brevoSmsChanged = true;
    }
    if (smtpChanged) {
      const { resetTransporter } = await import("./email-service");
      resetTransporter();
    }
    if (brevoSmsChanged) {
      const { resetBrevoSmsConfig } = await import("./sms-service");
      resetBrevoSmsConfig();
    }
    const result = await storage.getOrganizationSettings();
    const settingsMap = Object.fromEntries(result.map(s => [s.key, s.value]));
    res.json(settingsMap);
  });

  // SMTP test connection
  app.post("/api/settings/smtp-test", async (_req, res) => {
    const { testSmtpConnection } = await import("./email-service");
    const result = await testSmtpConnection();
    res.json(result);
  });

  // Email log detail
  app.get("/api/email-logs/:id", async (req, res) => {
    const emailLog = await storage.getEmailLog(req.params.id);
    if (!emailLog) return res.status(404).json({ message: "Email log introuvable" });
    res.json(emailLog);
  });

  // Email tracking events for a specific log
  app.get("/api/email-logs/:id/tracking", async (req, res) => {
    const emailLog = await storage.getEmailLog(req.params.id);
    if (!emailLog) return res.status(404).json({ message: "Email log introuvable" });
    const events = await storage.getEmailTrackingEvents(req.params.id);
    res.json(events);
  });

  // Resend a failed email
  app.post("/api/email-logs/:id/resend", async (req, res) => {
    const emailLog = await storage.getEmailLog(req.params.id);
    if (!emailLog) return res.status(404).json({ message: "Email log introuvable" });
    // Reset status to pending and retry count
    await storage.updateEmailLog(req.params.id, {
      status: "pending",
      error: null,
      retryCount: 0,
    } as any);
    const { sendEmailNow } = await import("./email-service");
    try {
      await sendEmailNow(req.params.id);
      const updated = await storage.getEmailLog(req.params.id);
      res.json(updated);
    } catch (err: any) {
      const updated = await storage.getEmailLog(req.params.id);
      res.json(updated);
    }
  });

  // ============================================================
  // SMS TEMPLATES
  // ============================================================

  app.get("/api/sms-templates", async (_req, res) => {
    const result = await storage.getSmsTemplates();
    res.json(result);
  });

  app.get("/api/sms-templates/:id", async (req, res) => {
    const template = await storage.getSmsTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Modèle SMS non trouvé" });
    res.json(template);
  });

  app.post("/api/sms-templates", async (req, res) => {
    const parsed = insertSmsTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.createSmsTemplate(parsed.data);
    res.status(201).json(template);
  });

  app.patch("/api/sms-templates/:id", async (req, res) => {
    const parsed = insertSmsTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.updateSmsTemplate(req.params.id, parsed.data);
    if (!template) return res.status(404).json({ message: "Modèle SMS non trouvé" });
    res.json(template);
  });

  app.delete("/api/sms-templates/:id", async (req, res) => {
    await storage.deleteSmsTemplate(req.params.id);
    res.status(204).send();
  });

  // ============================================================
  // SMS LOGS
  // ============================================================

  app.get("/api/sms-logs", async (_req, res) => {
    const result = await storage.getSmsLogs();
    res.json(result);
  });

  app.post("/api/sms-logs/:id/resend", async (req, res) => {
    const smsLog = await storage.getSmsLog(req.params.id);
    if (!smsLog) return res.status(404).json({ message: "SMS log introuvable" });
    await storage.updateSmsLog(req.params.id, {
      status: "pending",
      error: null,
      retryCount: 0,
    } as any);
    const { sendSmsNow } = await import("./sms-service");
    try {
      await sendSmsNow(req.params.id);
      const updated = await storage.getSmsLog(req.params.id);
      res.json(updated);
    } catch (err: any) {
      const updated = await storage.getSmsLog(req.params.id);
      res.json(updated);
    }
  });

  // Brevo SMS test connection
  app.post("/api/settings/brevo-sms-test", async (_req, res) => {
    const { testBrevoSmsConnection } = await import("./sms-service");
    const result = await testBrevoSmsConnection();
    res.json(result);
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
  // GENERATE TRAINER CONTRACT (convention d'intervention / contrat cadre)
  // POST /api/trainers/:id/generate-contract
  // Body: { type: "convention_intervention" | "contrat_cadre", sessionId?: string }
  // ============================================================
  app.post("/api/trainers/:id/generate-contract", async (req, res) => {
    const trainer = await storage.getTrainer(req.params.id);
    if (!trainer) return res.status(404).json({ message: "Formateur non trouvé" });

    const { type = "convention_intervention", sessionId } = req.body as {
      type?: string;
      sessionId?: string;
    };

    if (!["convention_intervention", "contrat_cadre"].includes(type)) {
      return res.status(400).json({ message: "Type invalide. Valeurs: convention_intervention, contrat_cadre" });
    }

    // Find matching template
    const templates = await storage.getDocumentTemplates();
    const template = templates.find(t => t.type === type);
    if (!template) {
      return res.status(404).json({
        message: `Aucun modèle de type "${type}" trouvé. Créez-en un dans la GED.`,
      });
    }

    // Resolve session data if provided
    let sessionData: Awaited<ReturnType<typeof storage.getSession>> | undefined;
    let programData: Awaited<ReturnType<typeof storage.getProgram>> | undefined;
    if (sessionId) {
      sessionData = await storage.getSession(sessionId) || undefined;
      if (sessionData) programData = await storage.getProgram(sessionData.programId) || undefined;
    }

    // Resolve organization settings
    const settings = await storage.getOrganizationSettings();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    // Build replacements
    const replacements: Record<string, string> = {
      "{date_du_jour}": new Date().toLocaleDateString("fr-FR"),
      "{date_signature}": new Date().toLocaleDateString("fr-FR"),
      "{nom_organisme}": settingsMap["org_name"] || "SO'SAFE Formation",
      "{adresse_organisme}": settingsMap["org_address"] || "",
      "{siret_organisme}": settingsMap["org_siret"] || "",
      "{email_organisme}": settingsMap["org_email"] || "",
      "{telephone_organisme}": settingsMap["org_phone"] || "",
      // Trainer fields
      "{nom_sous_traitant}": `${trainer.firstName} ${trainer.lastName}`,
      "{nom_formateur}": `${trainer.firstName} ${trainer.lastName}`,
      "{email_sous_traitant}": trainer.email,
      "{email_formateur}": trainer.email,
      "{telephone_sous_traitant}": trainer.phone || "",
      "{specialite_sous_traitant}": trainer.specialty || "",
      "{statut_formateur}": (trainer as any).legalStatus || "",
      "{siret_formateur}": (trainer as any).siret || "",
      "{adresse_formateur}": (trainer as any).address || "",
      "{rib_formateur}": (trainer as any).iban || "",
      "{taux_journalier}": (trainer as any).dailyRate ? `${(trainer as any).dailyRate} EUR` : "",
    };

    if (sessionData && programData) {
      const startDate = new Date(sessionData.startDate);
      const endDate = new Date(sessionData.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
      const honoraires = (trainer as any).dailyRate
        ? `${((trainer as any).dailyRate * days).toFixed(2)} EUR`
        : `${programData.price} EUR`;

      replacements["{objet_mission}"] = sessionData.title;
      replacements["{objet_prestation}"] = sessionData.title;
      replacements["{titre_session}"] = sessionData.title;
      replacements["{titre_formation}"] = programData.title;
      replacements["{date_debut_mission}"] = startDate.toLocaleDateString("fr-FR");
      replacements["{date_debut}"] = startDate.toLocaleDateString("fr-FR");
      replacements["{date_fin_mission}"] = endDate.toLocaleDateString("fr-FR");
      replacements["{date_fin}"] = endDate.toLocaleDateString("fr-FR");
      replacements["{lieu_mission}"] = sessionData.location || "";
      replacements["{lieu}"] = sessionData.location || "";
      replacements["{modalite}"] = sessionData.modality;
      replacements["{duree_formation}"] = `${programData.duration} heures`;
      replacements["{nombre_jours_mission}"] = String(days);
      replacements["{honoraires_session}"] = honoraires;
      replacements["{montant_prestation}"] = honoraires;
    }

    let content = template.content;
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(key, value);
    }

    // Habillage branded
    content = wrapWithBranding(content, {
      brandColor: template.brandColor,
      fontFamily: template.fontFamily,
      logoUrl: template.logoUrl,
      headerHtml: template.headerHtml,
      footerHtml: template.footerHtml,
      orgName: settingsMap["org_name"] || "SO'SAFE",
      orgAddress: settingsMap["org_address"] || "",
      orgPhone: settingsMap["org_phone"] || "",
      orgEmail: settingsMap["org_email"] || "",
      orgSiret: settingsMap["org_siret"] || "",
    });

    const typeLabels: Record<string, string> = {
      convention_intervention: "Convention d'intervention",
      contrat_cadre: "Contrat cadre",
    };

    const doc = await storage.createGeneratedDocument({
      templateId: template.id,
      sessionId: sessionId || null,
      traineeId: null,
      enterpriseId: null,
      quoteId: null,
      title: `${typeLabels[type]} - ${trainer.firstName} ${trainer.lastName}${sessionData ? ` - ${sessionData.title}` : ""}`,
      type,
      content,
      status: "generated",
      visibility: "admin_only",
      sharedAt: null,
    });

    res.status(201).json(doc);
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
  // PENDING SIGNATURES — Portal-accessible (requireAuth only)
  // ============================================================

  app.get("/api/pending-signatures", async (req, res) => {
    const signerId = req.query.signerId as string;
    const signerType = req.query.signerType as string;
    if (!signerId || !signerType) {
      return res.status(400).json({ message: "signerId et signerType requis" });
    }
    const docs = await storage.getGeneratedDocumentsPendingSignature(signerId, signerType);
    res.json(docs);
  });

  app.post("/api/pending-signatures/:id/sign", async (req, res) => {
    const { signerId, signerType, signatureData } = req.body;
    if (!signerId || !signerType || !signatureData) {
      return res.status(400).json({ message: "signerId, signerType et signatureData requis" });
    }

    const doc = await storage.getGeneratedDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document non trouvé" });

    // Verify this signer is authorised
    const requestedFor = ((doc as any).signatureRequestedFor as any[]) || [];
    const signerEntry = requestedFor.find(
      (r: any) => r.signerId === signerId && r.signerType === signerType && r.status === "pending"
    );
    if (!signerEntry) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à signer ce document" });
    }

    // Create signature record
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
    const sig = await storage.createSignature({
      signerId,
      signerType,
      documentType: doc.type,
      relatedId: doc.id,
      signatureData,
      ipAddress: ip,
    });

    // Update signer status in JSONB
    const updatedRequestedFor = requestedFor.map((r: any) => {
      if (r.signerId === signerId && r.signerType === signerType) {
        return { ...r, status: "signed", signedAt: new Date().toISOString() };
      }
      return r;
    });
    const allSigned = updatedRequestedFor.every((r: any) => r.status === "signed");

    await storage.updateGeneratedDocument(doc.id, {
      signatureRequestedFor: updatedRequestedFor,
      signatureStatus: allSigned ? "signed" : "pending",
      status: allSigned ? "signed" : doc.status,
    } as any);

    // Trigger automation cascades when all signers done
    if (allSigned) {
      try {
        if (doc.type === "devis" || doc.type === "quote") {
          triggerAutomation("quote_signed", {
            quoteId: doc.quoteId || undefined,
            traineeId: doc.traineeId || undefined,
            enterpriseId: doc.enterpriseId || undefined,
            sessionId: doc.sessionId || undefined,
          }).catch(err => console.error("[automation] quote_signed trigger error:", err));
        } else if (doc.type === "convention") {
          triggerAutomation("convention_signed", {
            documentId: doc.id,
            sessionId: doc.sessionId || undefined,
            traineeId: doc.traineeId || undefined,
            enterpriseId: doc.enterpriseId || undefined,
          }).catch(err => console.error("[automation] convention_signed trigger error:", err));
        }
      } catch (err) {
        console.error("[automation] signature trigger error:", err);
      }
    }

    res.status(201).json(sig);
  });

  app.post("/api/pending-signatures/batch-sign", async (req, res) => {
    const { documentIds, signerId, signerType, signatureData } = req.body;
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: "Au moins un document requis" });
    }
    if (!signerId || !signerType || !signatureData) {
      return res.status(400).json({ message: "signerId, signerType et signatureData requis" });
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
    const results = [];

    for (const docId of documentIds) {
      const doc = await storage.getGeneratedDocument(docId);
      if (!doc) continue;

      const requestedFor = ((doc as any).signatureRequestedFor as any[]) || [];
      const signerEntry = requestedFor.find(
        (r: any) => r.signerId === signerId && r.signerType === signerType && r.status === "pending"
      );
      if (!signerEntry) continue;

      const sig = await storage.createSignature({
        signerId,
        signerType,
        documentType: doc.type,
        relatedId: doc.id,
        signatureData,
        ipAddress: ip,
      });

      const updatedRequestedFor = requestedFor.map((r: any) => {
        if (r.signerId === signerId && r.signerType === signerType) {
          return { ...r, status: "signed", signedAt: new Date().toISOString() };
        }
        return r;
      });
      const allSigned = updatedRequestedFor.every((r: any) => r.status === "signed");

      await storage.updateGeneratedDocument(doc.id, {
        signatureRequestedFor: updatedRequestedFor,
        signatureStatus: allSigned ? "signed" : "pending",
        status: allSigned ? "signed" : doc.status,
      } as any);

      results.push(sig);
    }

    res.json(results);
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

        // Auto-generate contract/convention after quote signing
        // Picks: contrat_particulier if trainee is "particulier", contrat_vae if program is VAE-related, else convention
        try {
          const templates = await storage.getDocumentTemplates();
          const traineeData = traineeId ? await storage.getTrainee(traineeId) : undefined;

          // Determine which document type to generate
          let targetType = "convention";
          if (traineeData?.profileType === "particulier") {
            targetType = "contrat_particulier";
          }
          // Check for VAE programs (title contains "VAE")
          if (programId) {
            const prog = await storage.getProgram(programId);
            if (prog?.title?.toUpperCase().includes("VAE")) {
              targetType = "contrat_vae";
            }
          }

          // Find matching template, fallback to convention
          let docTemplate = templates.find(t => t.type === targetType);
          if (!docTemplate) docTemplate = templates.find(t => t.type === "convention");

          if (docTemplate && (sessionId || enterpriseId)) {
            let content = docTemplate.content;
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
                  replacements["{certification_visee}"] = program.certifying ? program.title : "";
                  replacements["{diplome_vise}"] = program.title;
                  replacements["{duree_accompagnement}"] = `${program.duration} heures`;
                  replacements["{tarif_accompagnement}"] = `${program.price} EUR`;
                }
              }
            }

            if (traineeData) {
              replacements["{nom_apprenant}"] = `${traineeData.firstName} ${traineeData.lastName}`;
              replacements["{prenom_apprenant}"] = traineeData.firstName;
              replacements["{nom_famille_apprenant}"] = traineeData.lastName;
              replacements["{email_apprenant}"] = traineeData.email;
              replacements["{entreprise_apprenant}"] = traineeData.company || "";
              replacements["{civilite_apprenant}"] = traineeData.civility || "";
              replacements["{date_naissance_apprenant}"] = traineeData.dateOfBirth
                ? new Date(traineeData.dateOfBirth).toLocaleDateString("fr-FR") : "";
              replacements["{telephone_apprenant}"] = traineeData.phone || "";
              replacements["{est_particulier}"] = traineeData.profileType === "particulier" ? "true" : "";
              replacements["{adresse_apprenant}"] = traineeData.address || "";
              replacements["{ville_apprenant}"] = traineeData.city || "";
              replacements["{code_postal_apprenant}"] = traineeData.postalCode || "";
              replacements["{pays_apprenant}"] = traineeData.country || "France";
              const addrParts = [
                `${traineeData.civility ? traineeData.civility + " " : ""}${traineeData.firstName} ${traineeData.lastName}`,
                traineeData.address,
                `${traineeData.postalCode || ""} ${traineeData.city || ""}`.trim(),
                traineeData.country && traineeData.country !== "France" ? traineeData.country : "",
              ].filter(Boolean);
              replacements["{adresse_complete_apprenant}"] = addrParts.join("<br>");
            }

            if (enterpriseId) {
              const enterprise = await storage.getEnterprise(enterpriseId);
              if (enterprise) {
                replacements["{nom_entreprise}"] = enterprise.name;
                replacements["{contact_entreprise}"] = enterprise.contactName || "";
                replacements["{email_entreprise}"] = enterprise.contactEmail || "";
              }
            }

            if (quoteId) {
              const quote = await storage.getQuote(quoteId);
              if (quote) {
                replacements["{numero_devis}"] = quote.number;
                replacements["{montant_devis}"] = `${(quote.total / 100).toFixed(2)} EUR`;
                replacements["{montant_ht}"] = `${(quote.subtotal / 100).toFixed(2)} EUR`;
                replacements["{montant_tva}"] = `${(quote.taxAmount / 100).toFixed(2)} EUR`;
                replacements["{montant_ttc}"] = `${(quote.total / 100).toFixed(2)} EUR`;
              }
            }

            replacements["{date_du_jour}"] = new Date().toLocaleDateString("fr-FR");
            replacements["{date_signature}"] = new Date().toLocaleDateString("fr-FR");
            replacements["{delai_retractation}"] = "10 jours";
            replacements["{est_vae}"] = targetType === "contrat_vae" ? "true" : "";

            const settings = await storage.getOrganizationSettings();
            const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
            replacements["{nom_organisme}"] = settingsMap["org_name"] || "";
            replacements["{adresse_organisme}"] = settingsMap["org_address"] || "";
            replacements["{siret_organisme}"] = settingsMap["org_siret"] || "";
            replacements["{email_organisme}"] = settingsMap["org_email"] || "";
            replacements["{telephone_organisme}"] = settingsMap["org_phone"] || "";

            for (const [key, value] of Object.entries(replacements)) {
              content = content.replaceAll(key, value);
            }

            // Habillage branded
            content = wrapWithBranding(content, {
              brandColor:  docTemplate.brandColor,
              fontFamily:  docTemplate.fontFamily,
              logoUrl:     docTemplate.logoUrl,
              headerHtml:  docTemplate.headerHtml,
              footerHtml:  docTemplate.footerHtml,
              orgName:     settingsMap["org_name"]    || "SO'SAFE",
              orgAddress:  settingsMap["org_address"] || "",
              orgPhone:    settingsMap["org_phone"]   || "",
              orgEmail:    settingsMap["org_email"]   || "",
              orgSiret:    settingsMap["org_siret"]   || "",
            });

            const typeLabels: Record<string, string> = {
              convention: "Convention",
              contrat_particulier: "Contrat particulier",
              contrat_vae: "Contrat VAE",
            };
            const visibility = traineeData?.profileType === "particulier" ? "trainee" : "enterprise";

            await storage.createGeneratedDocument({
              templateId: docTemplate.id,
              sessionId: sessionId || null,
              traineeId: traineeId || null,
              enterpriseId: enterpriseId || null,
              quoteId: quoteId || null,
              title: `${typeLabels[targetType] || "Convention"} - ${replacements["{titre_formation}"] || docTemplate.name}`,
              type: targetType,
              content,
              status: "generated",
              visibility,
              sharedAt: new Date(),
            });
            console.log(`[GED] ${typeLabels[targetType]} auto-généré(e) pour devis ${quoteId}`);
          }
        } catch (err) {
          console.error("[GED] Erreur auto-génération convention:", err);
        }
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

  // Certifications for all trainees of this enterprise (with program info for recycling)
  app.get("/api/enterprises/:id/certifications", async (req, res) => {
    try {
      const enterpriseTrainees = await storage.getEnterpriseTrainees(req.params.id);
      const allCerts: Array<Record<string, unknown>> = [];
      for (const trainee of enterpriseTrainees) {
        const certs = await storage.getTraineeCertifications(trainee.id);
        for (const cert of certs) {
          let recyclingMonths: number | null = null;
          let programTitle: string | null = null;
          let certifying = false;
          if (cert.programId) {
            const program = await storage.getProgram(cert.programId);
            if (program) {
              recyclingMonths = program.recyclingMonths;
              programTitle = program.title;
              certifying = !!program.certifying;
            }
          }
          // Compute expiry: use cert.expiresAt if set, otherwise derive from obtainedAt + recyclingMonths
          let computedExpiresAt = cert.expiresAt || null;
          if (!computedExpiresAt && recyclingMonths && cert.obtainedAt) {
            const d = new Date(cert.obtainedAt);
            d.setMonth(d.getMonth() + recyclingMonths);
            computedExpiresAt = d.toISOString().split("T")[0];
          }
          allCerts.push({
            ...cert,
            traineeFirstName: trainee.firstName,
            traineeLastName: trainee.lastName,
            traineeEmail: trainee.email,
            programTitle,
            recyclingMonths,
            certifying,
            computedExpiresAt,
          });
        }
      }
      res.json(allCerts);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des certifications" });
    }
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

  // ============================================================
  // REPORTING & STATISTICS
  // ============================================================

  // Connection logs
  app.get("/api/connection-logs", async (req, res) => {
    const filters = {
      userId: req.query.userId as string | undefined,
      sessionId: req.query.sessionId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };
    const logs = await storage.getConnectionLogs(filters);
    res.json(logs);
  });

  app.post("/api/connection-logs", async (req, res) => {
    const user = (req as any).user;
    const log = await storage.createConnectionLog({
      userId: user?.id || req.body.userId,
      userName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : req.body.userName || "Anonyme",
      userRole: user?.role || req.body.userRole || "trainee",
      ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
      userAgent: req.headers["user-agent"] || null,
      sessionId: req.body.sessionId || null,
      moduleId: req.body.moduleId || null,
      action: req.body.action || "login",
      duration: req.body.duration || 0,
      disconnectedAt: req.body.disconnectedAt || null,
    });
    res.status(201).json(log);
  });

  // Global reporting stats (aggregated data for dashboards)
  app.get("/api/reporting/global-stats", async (_req, res) => {
    try {
      const [allSessions, allEnrollments, allTrainees, allTrainers, allPrograms, allEnterprises] = await Promise.all([
        storage.getSessions(),
        storage.getEnrollments(),
        storage.getTrainees(),
        storage.getTrainers(),
        storage.getPrograms(),
        storage.getEnterprises(),
      ]);

      const [allSurveyResponses, allInvoices, allQuotes] = await Promise.all([
        storage.getSurveyResponses(),
        storage.getInvoices(),
        storage.getQuotes(),
      ]);

      // Session stats
      const activeSessions = allSessions.filter(s => s.status === "ongoing").length;
      const completedSessions = allSessions.filter(s => s.status === "completed").length;
      const plannedSessions = allSessions.filter(s => s.status === "planned").length;

      // Enrollment stats
      const completedEnrollments = allEnrollments.filter(e => e.status === "completed").length;
      const enrollmentCompletionRate = allEnrollments.length > 0
        ? Math.round((completedEnrollments / allEnrollments.length) * 100)
        : 0;

      // Quality stats
      const satisfactionResponses = allSurveyResponses.filter(r => r.rating !== null && r.rating !== undefined);
      const avgSatisfaction = satisfactionResponses.length > 0
        ? (satisfactionResponses.reduce((sum, r) => sum + (r.rating || 0), 0) / satisfactionResponses.length).toFixed(1)
        : "0";
      const recommendationResponses = satisfactionResponses.filter(r => (r.rating || 0) >= 4);
      const recommendationRate = satisfactionResponses.length > 0
        ? Math.round((recommendationResponses.length / satisfactionResponses.length) * 100)
        : 0;

      // Financial stats
      const totalRevenue = allInvoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
      const pendingRevenue = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + i.total - i.paidAmount, 0);
      const quotesAccepted = allQuotes.filter(q => q.status === "accepted").length;
      const conversionRate = allQuotes.length > 0 ? Math.round((quotesAccepted / allQuotes.length) * 100) : 0;

      // Monthly revenue (last 12 months)
      const now = new Date();
      const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const monthInvoices = allInvoices.filter(inv => {
          const d = inv.createdAt ? new Date(inv.createdAt) : null;
          return d && d >= month && d <= monthEnd && inv.status === "paid";
        });
        return {
          month: month.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
          revenue: monthInvoices.reduce((s, i) => s + i.total, 0),
          count: monthInvoices.length,
        };
      });

      // Monthly enrollments (last 12 months)
      const monthlyEnrollments = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const monthEnr = allEnrollments.filter(e => {
          const d = e.enrolledAt ? new Date(e.enrolledAt) : null;
          return d && d >= month && d <= monthEnd;
        });
        return {
          month: month.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
          count: monthEnr.length,
        };
      });

      // Session modality breakdown
      const modalityStats = {
        presentiel: allSessions.filter(s => s.modality === "presentiel").length,
        distance: allSessions.filter(s => s.modality === "distance").length,
        hybrid: allSessions.filter(s => s.modality === "hybrid").length,
      };

      // Program category breakdown
      const categoryMap: Record<string, number> = {};
      allPrograms.forEach(p => {
        const cats = (p.categories && Array.isArray(p.categories) && p.categories.length > 0) ? p.categories : ["Non classé"];
        cats.forEach(cat => {
          categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });
      });

      res.json({
        overview: {
          totalPrograms: allPrograms.length,
          totalSessions: allSessions.length,
          activeSessions,
          completedSessions,
          plannedSessions,
          totalTrainees: allTrainees.length,
          totalTrainers: allTrainers.length,
          totalEnterprises: allEnterprises.length,
          totalEnrollments: allEnrollments.length,
          completedEnrollments,
          enrollmentCompletionRate,
        },
        quality: {
          totalResponses: allSurveyResponses.length,
          avgSatisfaction: parseFloat(avgSatisfaction),
          recommendationRate,
          successRate: enrollmentCompletionRate,
        },
        financial: {
          totalRevenue,
          pendingRevenue,
          totalInvoices: allInvoices.length,
          paidInvoices: allInvoices.filter(i => i.status === "paid").length,
          conversionRate,
          totalQuotes: allQuotes.length,
        },
        charts: {
          monthlyRevenue,
          monthlyEnrollments,
          modalityStats,
          categoryBreakdown: Object.entries(categoryMap).map(([name, count]) => ({ name, count })),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors du calcul des statistiques" });
    }
  });

  // Quality report (for Qualiopi exports)
  app.get("/api/reporting/quality", async (_req, res) => {
    try {
      const [responses, templates, allSessions, allEnrollments, qualActions] = await Promise.all([
        storage.getSurveyResponses(),
        storage.getSurveyTemplates(),
        storage.getSessions(),
        storage.getEnrollments(),
        storage.getQualityActions(),
      ]);

      // Satisfaction by evaluation type
      const typeStats: Record<string, { count: number; totalRating: number; totalWeighted: number }> = {};
      responses.forEach(r => {
        const type = r.evaluationType || "general";
        if (!typeStats[type]) typeStats[type] = { count: 0, totalRating: 0, totalWeighted: 0 };
        typeStats[type].count++;
        if (r.rating) typeStats[type].totalRating += r.rating;
        if (r.weightedScore) typeStats[type].totalWeighted += Number(r.weightedScore);
      });

      const satisfactionByType = Object.entries(typeStats).map(([type, stats]) => ({
        type,
        count: stats.count,
        avgRating: stats.count > 0 ? (stats.totalRating / stats.count).toFixed(2) : "0",
        avgWeighted: stats.count > 0 ? (stats.totalWeighted / stats.count).toFixed(2) : "0",
      }));

      // Session completion stats
      const sessionStats = allSessions.map(session => {
        const sessionEnrollments = allEnrollments.filter(e => e.sessionId === session.id);
        const completed = sessionEnrollments.filter(e => e.status === "completed").length;
        const sessionResponses = responses.filter(r => r.sessionId === session.id);
        const avgRating = sessionResponses.length > 0
          ? (sessionResponses.reduce((sum, r) => sum + (r.rating || 0), 0) / sessionResponses.length).toFixed(1)
          : null;

        return {
          id: session.id,
          title: session.title,
          startDate: session.startDate,
          endDate: session.endDate,
          totalEnrollments: sessionEnrollments.length,
          completedEnrollments: completed,
          completionRate: sessionEnrollments.length > 0 ? Math.round((completed / sessionEnrollments.length) * 100) : 0,
          avgSatisfaction: avgRating,
          responsesCount: sessionResponses.length,
        };
      });

      // Quality actions summary
      const actionsOpen = qualActions.filter(a => a.status === "open").length;
      const actionsInProgress = qualActions.filter(a => a.status === "in_progress").length;
      const actionsCompleted = qualActions.filter(a => a.status === "completed").length;

      res.json({
        satisfactionByType,
        sessionStats,
        qualityActions: {
          total: qualActions.length,
          open: actionsOpen,
          inProgress: actionsInProgress,
          completed: actionsCompleted,
        },
        templates: templates.map(t => ({ id: t.id, title: t.title, category: t.category })),
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors du calcul des indicateurs qualité" });
    }
  });

  // Export data endpoint (CSV-friendly JSON)
  app.get("/api/reporting/export/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const sessionId = req.query.sessionId as string | undefined;
      const traineeId = req.query.traineeId as string | undefined;
      const enterpriseId = req.query.enterpriseId as string | undefined;

      switch (type) {
        case "enrollments": {
          let data = await storage.getEnrollments();
          if (sessionId) data = data.filter(e => e.sessionId === sessionId);
          if (traineeId) data = data.filter(e => e.traineeId === traineeId);
          if (enterpriseId) data = data.filter(e => e.enterpriseId === enterpriseId);
          const trainees = await storage.getTrainees();
          const sessions = await storage.getSessions();
          const enriched = data.map(e => {
            const trainee = trainees.find(t => t.id === e.traineeId);
            const session = sessions.find(s => s.id === e.sessionId);
            return {
              ...e,
              traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : "",
              traineeEmail: trainee?.email || "",
              sessionTitle: session?.title || "",
              sessionStart: session?.startDate || "",
              sessionEnd: session?.endDate || "",
            };
          });
          return res.json(enriched);
        }
        case "sessions": {
          let data = await storage.getSessions();
          if (sessionId) data = data.filter(s => s.id === sessionId);
          const programs = await storage.getPrograms();
          const trainers = await storage.getTrainers();
          const enriched = data.map(s => {
            const program = programs.find(p => p.id === s.programId);
            const trainer = trainers.find(t => t.id === s.trainerId);
            return {
              ...s,
              programTitle: program?.title || "",
              trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : "",
            };
          });
          return res.json(enriched);
        }
        case "trainees": {
          let data = await storage.getTrainees();
          if (enterpriseId) data = data.filter(t => t.enterpriseId === enterpriseId);
          return res.json(data);
        }
        case "invoices": {
          let data = await storage.getInvoices();
          if (enterpriseId) data = data.filter(i => i.enterpriseId === enterpriseId);
          if (sessionId) data = data.filter(i => i.sessionId === sessionId);
          return res.json(data);
        }
        case "survey-responses": {
          let data = await storage.getSurveyResponses();
          if (sessionId) data = data.filter(r => r.sessionId === sessionId);
          if (traineeId) data = data.filter(r => r.traineeId === traineeId);
          return res.json(data);
        }
        case "attendance": {
          const sheets = await storage.getAttendanceSheets();
          const filteredSheets = sessionId ? sheets.filter(s => s.sessionId === sessionId) : sheets;
          const allRecords = [];
          for (const sheet of filteredSheets) {
            const records = await storage.getAttendanceRecords(sheet.id);
            allRecords.push(...records.map(r => ({
              ...r,
              sheetDate: sheet.date,
              sheetPeriod: sheet.period,
              sheetSessionId: sheet.sessionId,
            })));
          }
          return res.json(allRecords);
        }
        case "connection-logs": {
          const logs = await storage.getConnectionLogs({
            userId: traineeId,
            sessionId,
          });
          return res.json(logs);
        }
        default:
          return res.status(400).json({ message: "Type d'export non reconnu" });
      }
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'export" });
    }
  });

  // =============================================
  // QUALITY & IMPROVEMENT - ABSENCE RECORDS
  // =============================================

  app.get("/api/absence-records", requireAuth, async (req, res) => {
    try {
      const { sessionId, traineeId, status } = req.query;
      const records = await storage.getAbsenceRecords({
        sessionId: sessionId as string,
        traineeId: traineeId as string,
        status: status as string,
      });
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des absences" });
    }
  });

  app.get("/api/absence-records/:id", requireAuth, async (req, res) => {
    try {
      const record = await storage.getAbsenceRecord(String(req.params.id));
      if (!record) return res.status(404).json({ message: "Absence non trouvée" });
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  app.post("/api/absence-records", requireAuth, async (req, res) => {
    try {
      const data = insertAbsenceRecordSchema.parse(req.body);
      const record = await storage.createAbsenceRecord({
        ...data,
        createdBy: (req as any).user?.id,
      });
      res.json(record);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/absence-records/:id", requireAuth, async (req, res) => {
    try {
      const record = await storage.updateAbsenceRecord(String(req.params.id), req.body);
      if (!record) return res.status(404).json({ message: "Absence non trouvée" });
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/absence-records/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAbsenceRecord(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // Notify Qualiopi for absence
  app.post("/api/absence-records/:id/notify-qualiopi", requireAuth, async (req, res) => {
    try {
      const record = await storage.updateAbsenceRecord(String(req.params.id), {
        notifiedQualiopi: true,
        qualiopiNotificationDate: new Date(),
      } as any);
      if (!record) return res.status(404).json({ message: "Absence non trouvée" });
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la notification" });
    }
  });

  // =============================================
  // QUALITY & IMPROVEMENT - QUALITY INCIDENTS
  // =============================================

  app.get("/api/quality-incidents", requireAuth, async (req, res) => {
    try {
      const { sessionId, status, type } = req.query;
      const incidents = await storage.getQualityIncidents({
        sessionId: sessionId as string,
        status: status as string,
        type: type as string,
      });
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des incidents" });
    }
  });

  app.get("/api/quality-incidents/:id", requireAuth, async (req, res) => {
    try {
      const incident = await storage.getQualityIncident(String(req.params.id));
      if (!incident) return res.status(404).json({ message: "Incident non trouvé" });
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  app.post("/api/quality-incidents", requireAuth, async (req, res) => {
    try {
      // Generate reference INC-YYYY-NNN
      const year = new Date().getFullYear();
      const existing = await storage.getQualityIncidents({});
      const yearIncidents = existing.filter(i => i.reference.startsWith(`INC-${year}`));
      const nextNum = yearIncidents.length + 1;
      const reference = `INC-${year}-${String(nextNum).padStart(3, "0")}`;

      const user = (req as any).user;
      const data = insertQualityIncidentSchema.parse({
        ...req.body,
        reference,
        reportedBy: user?.id || "",
        reportedByName: user ? `${user.firstName} ${user.lastName}` : "Inconnu",
      });
      const incident = await storage.createQualityIncident(data);
      res.json(incident);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/quality-incidents/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.status === "resolved" && !updates.resolvedAt) {
        updates.resolvedAt = new Date();
      }
      if (updates.status === "closed" && !updates.closedAt) {
        updates.closedAt = new Date();
        updates.closedBy = (req as any).user?.id;
      }
      const incident = await storage.updateQualityIncident(String(req.params.id), updates);
      if (!incident) return res.status(404).json({ message: "Incident non trouvé" });
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/quality-incidents/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteQualityIncident(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // Export quality incidents as CSV
  app.get("/api/quality-incidents-export", requireAuth, async (req, res) => {
    try {
      const incidents = await storage.getQualityIncidents({});
      const rows = incidents.map(i => ({
        reference: i.reference,
        titre: i.title,
        type: i.type,
        severite: i.severity,
        statut: i.status,
        session: i.sessionTitle || "",
        categorie: i.category || "",
        cause_racine: i.rootCause || "",
        declare_par: i.reportedByName,
        date_declaration: i.reportedAt ? new Date(i.reportedAt).toLocaleDateString("fr-FR") : "",
        nb_actions_correctives: Array.isArray(i.correctiveActions) ? i.correctiveActions.length : 0,
        nb_axes_amelioration: Array.isArray(i.improvementAxes) ? i.improvementAxes.length : 0,
        date_resolution: i.resolvedAt ? new Date(i.resolvedAt).toLocaleDateString("fr-FR") : "",
        date_cloture: i.closedAt ? new Date(i.closedAt).toLocaleDateString("fr-FR") : "",
      }));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'export" });
    }
  });

  // =============================================
  // QUALITY & IMPROVEMENT - VEILLE ENTRIES
  // =============================================

  app.get("/api/veille-entries", requireAuth, async (req, res) => {
    try {
      const { type, status } = req.query;
      const entries = await storage.getVeilleEntries({
        type: type as string,
        status: status as string,
      });
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des veilles" });
    }
  });

  app.get("/api/veille-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getVeilleEntry(String(req.params.id));
      if (!entry) return res.status(404).json({ message: "Entrée non trouvée" });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  app.post("/api/veille-entries", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const data = insertVeilleEntrySchema.parse({
        ...req.body,
        createdBy: user?.id,
        createdByName: user ? `${user.firstName} ${user.lastName}` : "Inconnu",
      });
      const entry = await storage.createVeilleEntry(data);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/veille-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateVeilleEntry(String(req.params.id), req.body);
      if (!entry) return res.status(404).json({ message: "Entrée non trouvée" });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/veille-entries/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVeilleEntry(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // =============================================
  // CERTIFICATIONS & BADGES - DIGITAL BADGES
  // =============================================

  app.get("/api/digital-badges", requireAuth, async (req, res) => {
    try {
      const badges = await storage.getDigitalBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des badges" });
    }
  });

  app.get("/api/digital-badges/:id", requireAuth, async (req, res) => {
    try {
      const badge = await storage.getDigitalBadge(String(req.params.id));
      if (!badge) return res.status(404).json({ message: "Badge non trouvé" });
      res.json(badge);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  app.post("/api/digital-badges", requireAuth, async (req, res) => {
    try {
      const data = insertDigitalBadgeSchema.parse({
        ...req.body,
        createdBy: (req as any).user?.id,
      });
      const badge = await storage.createDigitalBadge(data);
      res.json(badge);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/digital-badges/:id", requireAuth, async (req, res) => {
    try {
      const badge = await storage.updateDigitalBadge(String(req.params.id), req.body);
      if (!badge) return res.status(404).json({ message: "Badge non trouvé" });
      res.json(badge);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/digital-badges/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDigitalBadge(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // =============================================
  // CERTIFICATIONS & BADGES - BADGE AWARDS
  // =============================================

  app.get("/api/badge-awards", requireAuth, async (req, res) => {
    try {
      const { badgeId, traineeId } = req.query;
      const awards = await storage.getBadgeAwards({
        badgeId: badgeId as string,
        traineeId: traineeId as string,
      });
      res.json(awards);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des attributions" });
    }
  });

  app.post("/api/badge-awards", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const badge = await storage.getDigitalBadge(req.body.badgeId);
      if (!badge) return res.status(404).json({ message: "Badge non trouvé" });

      const verificationCode = crypto.randomBytes(8).toString("hex").toUpperCase();
      const expiresAt = badge.validityMonths
        ? new Date(Date.now() + badge.validityMonths * 30 * 24 * 60 * 60 * 1000)
        : null;

      const data = insertBadgeAwardSchema.parse({
        ...req.body,
        awardedBy: user?.id,
        awardedByName: user ? `${user.firstName} ${user.lastName}` : "Système",
        awardMethod: req.body.awardMethod || "manual",
        verificationCode,
        expiresAt,
      });
      const award = await storage.createBadgeAward(data);
      res.json(award);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/badge-awards/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.status === "revoked" && !updates.revokedAt) {
        updates.revokedAt = new Date();
      }
      const award = await storage.updateBadgeAward(String(req.params.id), updates);
      if (!award) return res.status(404).json({ message: "Attribution non trouvée" });
      res.json(award);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/badge-awards/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteBadgeAward(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // Generate LinkedIn share URL for a badge award
  app.post("/api/badge-awards/:id/linkedin-share", requireAuth, async (req, res) => {
    try {
      const award = await storage.getBadgeAward(String(req.params.id));
      if (!award) return res.status(404).json({ message: "Attribution non trouvée" });

      const badge = await storage.getDigitalBadge(award.badgeId);
      if (!badge) return res.status(404).json({ message: "Badge non trouvé" });

      const linkedinShareUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(badge.title)}&organizationName=${encodeURIComponent("SO'SAFE Formation")}&certUrl=${encodeURIComponent(`${req.protocol}://${req.get("host")}/verify-badge/${award.verificationCode}`)}&certId=${award.verificationCode}`;

      await storage.updateBadgeAward(award.id, {
        linkedinShared: true,
        linkedinShareUrl,
      } as any);

      res.json({ linkedinShareUrl });
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  // =============================================
  // CERTIFICATIONS & BADGES - TASK LISTS
  // =============================================

  app.get("/api/task-lists", requireAuth, async (req, res) => {
    try {
      const { traineeId, sessionId, status } = req.query;
      const lists = await storage.getTaskLists({
        traineeId: traineeId as string,
        sessionId: sessionId as string,
        status: status as string,
      });
      res.json(lists);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des listes" });
    }
  });

  app.get("/api/task-lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getTaskList(String(req.params.id));
      if (!list) return res.status(404).json({ message: "Liste non trouvée" });
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  app.post("/api/task-lists", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const data = insertTaskListSchema.parse({
        ...req.body,
        assignedBy: user?.id,
        assignedByName: user ? `${user.firstName} ${user.lastName}` : "Système",
      });
      const list = await storage.createTaskList(data);
      res.json(list);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/task-lists/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.status === "completed" && !updates.completedAt) {
        updates.completedAt = new Date();
      }
      if (updates.status === "validated" && !updates.validatedAt) {
        updates.validatedAt = new Date();
        updates.validatedBy = (req as any).user?.id;
        updates.validatedByName = (req as any).user ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : "";
      }
      const list = await storage.updateTaskList(String(req.params.id), updates);
      if (!list) return res.status(404).json({ message: "Liste non trouvée" });
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/task-lists/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTaskList(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // =============================================
  // CERTIFICATIONS & BADGES - TASK ITEMS
  // =============================================

  app.get("/api/task-items", requireAuth, async (req, res) => {
    try {
      const { taskListId } = req.query;
      if (!taskListId) return res.status(400).json({ message: "taskListId requis" });
      const items = await storage.getTaskItems(taskListId as string);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des tâches" });
    }
  });

  app.post("/api/task-items", requireAuth, async (req, res) => {
    try {
      const data = insertTaskItemSchema.parse(req.body);
      const item = await storage.createTaskItem(data);

      // Recalculate task list progress
      const items = await storage.getTaskItems(data.taskListId);
      const total = items.length;
      const checked = items.filter(i => i.checked).length;
      const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
      await storage.updateTaskList(data.taskListId, { progress });

      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/task-items/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.checked === true && !updates.checkedAt) {
        updates.checkedAt = new Date();
        const user = (req as any).user;
        updates.checkedBy = user?.id;
        updates.checkedByName = user ? `${user.firstName} ${user.lastName}` : "";
      }
      if (updates.checked === false) {
        updates.checkedAt = null;
        updates.checkedBy = null;
        updates.checkedByName = null;
      }

      const item = await storage.updateTaskItem(String(req.params.id), updates);
      if (!item) return res.status(404).json({ message: "Tâche non trouvée" });

      // Recalculate task list progress
      const items = await storage.getTaskItems(item.taskListId);
      const total = items.length;
      const checked = items.filter(i => i.checked).length;
      const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
      const listUpdates: any = { progress };
      if (progress === 100) {
        listUpdates.status = "completed";
        listUpdates.completedAt = new Date();
      }
      await storage.updateTaskList(item.taskListId, listUpdates);

      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/task-items/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getTaskItem(String(req.params.id));
      if (item) {
        await storage.deleteTaskItem(item.id);
        // Recalculate progress
        const items = await storage.getTaskItems(item.taskListId);
        const total = items.length;
        const checked = items.filter(i => i.checked).length;
        const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
        await storage.updateTaskList(item.taskListId, { progress });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // =============================================
  // ADVANCED FEATURES - AI DOCUMENT ANALYSIS
  // =============================================

  app.get("/api/ai-document-analyses", requireAuth, async (req, res) => {
    try {
      const { traineeId, trainerId, status } = req.query;
      const analyses = await storage.getAiDocumentAnalyses({
        traineeId: traineeId as string,
        trainerId: trainerId as string,
        status: status as string,
      });
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des analyses" });
    }
  });

  app.get("/api/ai-document-analyses/:id", requireAuth, async (req, res) => {
    try {
      const analysis = await storage.getAiDocumentAnalysis(String(req.params.id));
      if (!analysis) return res.status(404).json({ message: "Analyse non trouvée" });
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  // Submit a document for AI analysis (simulated)
  app.post("/api/ai-document-analyses", requireAuth, async (req, res) => {
    try {
      const data = insertAiDocumentAnalysisSchema.parse(req.body);
      const analysis = await storage.createAiDocumentAnalysis(data);

      // Simulate AI processing asynchronously
      setTimeout(async () => {
        try {
          const docType = analysis.documentType;
          const isAfgsu = docType === "afgsu1" || docType === "afgsu2";

          // Simulated AI extraction
          const now = new Date();
          const validityYears = isAfgsu ? 4 : docType === "certibiocide" ? 5 : 0;
          const issueDate = new Date(now.getFullYear() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
          const validityDate = validityYears > 0 ? new Date(issueDate.getFullYear() + validityYears, issueDate.getMonth(), issueDate.getDate()) : null;

          const isValid = validityDate ? validityDate > now : true;
          const confidence = 70 + Math.floor(Math.random() * 30); // 70-99

          await storage.updateAiDocumentAnalysis(analysis.id, {
            status: confidence >= 80 ? "completed" : "manual_review",
            extractedData: {
              validityDate: validityDate ? validityDate.toISOString().slice(0, 10) : undefined,
              issueDate: issueDate.toISOString().slice(0, 10),
              holderName: analysis.traineeName || analysis.trainerName || "Non détecté",
              certificationLevel: docType,
              issuingOrganization: isAfgsu ? "CESU" : "Organisme certifiant",
            },
            confidence,
            validationResult: isValid ? "valid" : "expired",
            prerequisiteValidated: isValid && confidence >= 80,
            processedAt: new Date(),
          } as any);
        } catch (e) {
          await storage.updateAiDocumentAnalysis(analysis.id, {
            status: "failed",
            errorMessage: "Erreur lors du traitement IA",
          } as any);
        }
      }, 2000);

      res.json(analysis);
    } catch (error) {
      res.status(400).json({ message: "Données invalides" });
    }
  });

  app.patch("/api/ai-document-analyses/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.manualOverride) {
        updates.manualOverrideBy = (req as any).user?.id;
      }
      const analysis = await storage.updateAiDocumentAnalysis(String(req.params.id), updates);
      if (!analysis) return res.status(404).json({ message: "Analyse non trouvée" });
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/ai-document-analyses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAiDocumentAnalysis(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // =============================================
  // ADVANCED FEATURES - CESU SUBMISSIONS
  // =============================================

  app.get("/api/cesu-submissions", requireAuth, async (req, res) => {
    try {
      const { sessionId, status } = req.query;
      const submissions = await storage.getCesuSubmissions({
        sessionId: sessionId as string,
        status: status as string,
      });
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des envois CESU" });
    }
  });

  app.get("/api/cesu-submissions/:id", requireAuth, async (req, res) => {
    try {
      const submission = await storage.getCesuSubmission(String(req.params.id));
      if (!submission) return res.status(404).json({ message: "Envoi CESU non trouvé" });
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  // Compile CESU data from a session
  app.post("/api/cesu-submissions/compile", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "sessionId requis" });

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session non trouvée" });

      // Get enrollments for this session
      const allEnrollments = await storage.getEnrollments();
      const sessionEnrollments = allEnrollments.filter(e => e.sessionId === sessionId);

      // Get trainees data
      const allTrainees = await storage.getTrainees();
      const traineesData: Array<{
        traineeId: string;
        name: string;
        email?: string;
        phone?: string;
        diplomaType?: string;
        diplomaValid?: boolean;
        attendanceStatus?: string;
        attendancePercent?: number;
      }> = [];

      // Get attendance data
      const attendanceSheets = await storage.getAttendanceSheets(sessionId);
      let totalSlots = 0;
      let totalPresent = 0;
      let totalAbsent = 0;

      for (const enrollment of sessionEnrollments) {
        const trainee = allTrainees.find(t => t.id === enrollment.traineeId);
        if (!trainee) continue;

        // Check attendance
        let presentCount = 0;
        let totalCount = 0;
        for (const sheet of attendanceSheets) {
          const records = await storage.getAttendanceRecords(sheet.id);
          const traineeRecord = records.find(r => r.traineeId === trainee.id);
          if (traineeRecord) {
            totalCount++;
            totalSlots++;
            if (traineeRecord.status === "present") {
              presentCount++;
              totalPresent++;
            } else {
              totalAbsent++;
            }
          }
        }

        const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        // Check AI analyses for diploma
        const analyses = await storage.getAiDocumentAnalyses({ traineeId: trainee.id });
        const validAnalysis = analyses.find(a => a.validationResult === "valid" && a.prerequisiteValidated);

        traineesData.push({
          traineeId: trainee.id,
          name: `${trainee.firstName} ${trainee.lastName}`,
          email: trainee.email || undefined,
          phone: trainee.phone || undefined,
          diplomaType: validAnalysis?.documentType,
          diplomaValid: !!validAnalysis,
          attendanceStatus: attendancePercent >= 80 ? "present" : "absent",
          attendancePercent,
        });
      }

      // Build diploma documents list
      const diplomaDocs: Array<{
        traineeId: string;
        traineeName: string;
        documentType: string;
        documentName: string;
        validityDate?: string;
        isValid: boolean;
      }> = [];

      for (const t of traineesData) {
        const analyses = await storage.getAiDocumentAnalyses({ traineeId: t.traineeId });
        for (const a of analyses) {
          if (a.validationResult === "valid") {
            diplomaDocs.push({
              traineeId: t.traineeId,
              traineeName: t.name,
              documentType: a.documentType,
              documentName: a.documentName,
              validityDate: (a.extractedData as any)?.validityDate,
              isValid: true,
            });
          }
        }
      }

      const user = (req as any).user;
      const submission = await storage.createCesuSubmission({
        sessionId,
        sessionTitle: session.title,
        traineeCount: traineesData.length,
        trainees: traineesData,
        attendanceSummary: {
          totalSlots,
          averageAttendance: totalSlots > 0 ? Math.round((totalPresent / totalSlots) * 100) : 0,
          absentCount: totalAbsent,
          presentCount: totalPresent,
        },
        diplomaDocuments: diplomaDocs,
        submittedBy: user?.id,
        submittedByName: user ? `${user.firstName} ${user.lastName}` : "Système",
      });

      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la compilation CESU" });
    }
  });

  app.patch("/api/cesu-submissions/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.status === "submitted" && !updates.submissionDate) {
        updates.submissionDate = new Date();
      }
      if (updates.status === "confirmed" && !updates.confirmedAt) {
        updates.confirmedAt = new Date();
      }
      if (updates.status === "rejected" && !updates.rejectedAt) {
        updates.rejectedAt = new Date();
      }
      const submission = await storage.updateCesuSubmission(String(req.params.id), updates);
      if (!submission) return res.status(404).json({ message: "Envoi CESU non trouvé" });
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/cesu-submissions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCesuSubmission(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // Export CESU data as CSV
  app.get("/api/cesu-submissions/:id/export", requireAuth, async (req, res) => {
    try {
      const submission = await storage.getCesuSubmission(String(req.params.id));
      if (!submission) return res.status(404).json({ message: "Non trouvé" });

      const trainees = Array.isArray(submission.trainees) ? submission.trainees : [];
      const rows = trainees.map((t: any) => ({
        nom: t.name,
        email: t.email || "",
        telephone: t.phone || "",
        type_diplome: t.diplomaType || "",
        diplome_valide: t.diplomaValid ? "Oui" : "Non",
        presence: t.attendanceStatus || "",
        taux_presence: t.attendancePercent != null ? `${t.attendancePercent}%` : "",
      }));

      res.json({
        session: submission.sessionTitle,
        date_compilation: submission.createdAt,
        nb_apprenants: submission.traineeCount,
        attendance: submission.attendanceSummary,
        data: rows,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'export" });
    }
  });

  // ============================================================
  // INTEGRATION SITE INTERNET - API Keys, Widget, SSO
  // ============================================================

  // Middleware: requireApiKey
  async function requireApiKey(req: any, res: any, next: any) {
    const key = req.headers["x-api-key"] as string;
    if (!key) {
      return res.status(401).json({ message: "Clé API requise (header X-API-Key)" });
    }
    const apiKey = await storage.getApiKeyByKey(key);
    if (!apiKey || !apiKey.active) {
      return res.status(403).json({ message: "Clé API invalide ou désactivée" });
    }
    // Update last used
    await storage.updateApiKey(apiKey.id, { lastUsedAt: new Date() } as any);
    req.apiKey = apiKey;
    next();
  }

  // CORS middleware for /api/v1/ routes
  app.use("/api/v1", async (req: any, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      // Check if the API key's associated widget config allows this origin
      const key = req.headers["x-api-key"] as string;
      if (key) {
        const apiKey = await storage.getApiKeyByKey(key);
        if (apiKey) {
          const configs = await storage.getWidgetConfigurations();
          const matchingConfig = configs.find(
            (c) => c.apiKeyId === apiKey.id && c.active && c.allowedOrigins?.includes(origin)
          );
          if (matchingConfig) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Headers", "X-API-Key, Content-Type");
            res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
          }
        }
      }
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

  // ---- Public Catalog API (requires API key) ----

  app.get("/api/v1/catalog/programs", requireApiKey, async (_req, res) => {
    try {
      const programs = await storage.getPrograms();
      const activePrograms = programs.filter((p: any) => p.status === "active");
      res.json(activePrograms.map((p: any) => ({
        id: p.id,
        title: p.title,
        categories: p.categories,
        duration: p.duration,
        objectives: p.objectives,
        prerequisites: p.prerequisites,
        modality: p.modality,
        price: p.price,
      })));
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/v1/catalog/sessions", requireApiKey, async (_req, res) => {
    try {
      const sessions = await storage.getSessions();
      const programs = await storage.getPrograms();
      const programMap = new Map(programs.map((p: any) => [p.id, p]));

      const availableSessions = [];
      for (const session of sessions) {
        if (session.status !== "planned" && session.status !== "ongoing") continue;
        const enrollmentCount = await storage.getEnrollmentCount(session.id);
        const maxCapacity = session.maxParticipants || 12;
        const remainingSpots = maxCapacity - enrollmentCount;
        const program = programMap.get(session.programId);
        availableSessions.push({
          id: session.id,
          programTitle: program?.title || "",
          programCategory: (program?.categories as string[] || [])[0] || "",
          startDate: session.startDate,
          endDate: session.endDate,
          location: session.location,
          locationAddress: session.locationAddress,
          status: session.status,
          maxParticipants: maxCapacity,
          remainingSpots,
          isFull: remainingSpots <= 0,
          duration: program?.duration || "",
          modality: program?.modality || "",
          price: program?.price || null,
        });
      }
      res.json(availableSessions);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/v1/catalog/sessions/:id", requireApiKey, async (req, res) => {
    try {
      const session = await storage.getSession(String(req.params.id));
      if (!session) return res.status(404).json({ message: "Session non trouvée" });
      const program = await storage.getProgram(session.programId);
      const enrollmentCount = await storage.getEnrollmentCount(session.id);
      const maxCapacity = session.maxParticipants || 12;
      res.json({
        ...session,
        program: program ? {
          title: program.title,
          categories: program.categories,
          duration: program.duration,
          objectives: program.objectives,
          prerequisites: program.prerequisites,
          modality: program.modality,
          programContent: program.programContent,
          price: program.price,
        } : null,
        remainingSpots: maxCapacity - enrollmentCount,
        isFull: (maxCapacity - enrollmentCount) <= 0,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/v1/widget/config", requireApiKey, async (req: any, res) => {
    try {
      const widgetId = req.query.widgetId as string;
      if (!widgetId) {
        return res.status(400).json({ message: "widgetId requis" });
      }
      const config = await storage.getWidgetConfiguration(widgetId);
      if (!config || !config.active) {
        return res.status(404).json({ message: "Configuration widget non trouvée" });
      }
      if (config.apiKeyId !== req.apiKey.id) {
        return res.status(403).json({ message: "Configuration non autorisée pour cette clé API" });
      }
      res.json({
        theme: config.theme,
        displayMode: config.displayMode,
        showFilters: config.showFilters,
        maxItems: config.maxItems,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ---- SSO Routes ----

  app.post("/api/sso/generate-token", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId requis" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const ssoToken = await storage.createSsoToken({
        userId,
        token,
        expiresAt,
      });

      res.json({
        token: ssoToken.token,
        expiresAt: ssoToken.expiresAt,
        url: `/api/auth/sso?token=${ssoToken.token}`,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la génération du token SSO" });
    }
  });

  app.get("/api/auth/sso", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ message: "Token requis" });

      const ssoToken = await storage.getSsoTokenByToken(token);
      if (!ssoToken) return res.status(404).json({ message: "Token invalide" });
      if (ssoToken.used) return res.status(400).json({ message: "Token déjà utilisé" });
      if (new Date() > new Date(ssoToken.expiresAt)) {
        return res.status(400).json({ message: "Token expiré" });
      }

      // Mark token as used
      await storage.markSsoTokenUsed(ssoToken.id);

      // Create session for the user
      const user = await storage.getUser(ssoToken.userId);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

      req.session.userId = user.id;
      req.session.save((err: any) => {
        if (err) return res.status(500).json({ message: "Erreur de session" });
        res.redirect("/");
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur SSO" });
    }
  });

  // ---- Admin: API Keys management ----

  app.get("/api/api-keys", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const keys = await storage.getApiKeys();
      res.json(keys);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/api-keys", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, permissions } = req.body;
      if (!name) return res.status(400).json({ message: "Nom requis" });

      const key = `sk_${crypto.randomBytes(24).toString("hex")}`;
      const apiKey = await storage.createApiKey({
        name,
        key,
        permissions: permissions || [],
        active: true,
      });
      res.json(apiKey);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la création de la clé API" });
    }
  });

  app.patch("/api/api-keys/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const result = await storage.updateApiKey(String(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Clé API non trouvée" });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteApiKey(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // ---- Admin: Widget Configurations management ----

  app.get("/api/widget-configurations", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const configs = await storage.getWidgetConfigurations();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/widget-configurations", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const config = await storage.createWidgetConfiguration(req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la création" });
    }
  });

  app.patch("/api/widget-configurations/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const result = await storage.updateWidgetConfiguration(String(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Configuration non trouvée" });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  app.delete("/api/widget-configurations/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteWidgetConfiguration(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression" });
    }
  });

  // ============================================================
  // CONTRAINTES TECHNIQUES - Audit Logs & RGPD
  // ============================================================

  // Helper: create audit log entry
  async function logAudit(req: any, action: string, entityType: string, entityId?: string, entityLabel?: string, details?: Record<string, any>) {
    try {
      const user = (req as any).user;
      await storage.createAuditLog({
        userId: user?.id || null,
        userName: user ? `${user.firstName} ${user.lastName}` : null,
        userRole: user?.role || null,
        action,
        entityType,
        entityId: entityId || null,
        entityLabel: entityLabel || null,
        details: details || {},
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (e) {
      // Don't fail the request if audit log fails
      console.error("Audit log error:", e);
    }
  }

  // ---- Audit Logs ----

  app.get("/api/audit-logs", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId as string | undefined,
        entityType: req.query.entityType as string | undefined,
        action: req.query.action as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };
      const [logs, count] = await Promise.all([
        storage.getAuditLogs(filters),
        storage.getAuditLogCount(filters),
      ]);
      res.json({ logs, total: count });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ---- RGPD ----

  app.get("/api/rgpd-requests", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const requests = await storage.getRgpdRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/rgpd-requests", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { requestType, targetType, targetId, targetName, notes } = req.body;
      if (!requestType || !targetType || !targetId || !targetName) {
        return res.status(400).json({ message: "Champs requis manquants" });
      }
      const user = (req as any).user;
      const request = await storage.createRgpdRequest({
        requestType,
        targetType,
        targetId,
        targetName,
        requestedBy: user.id,
        requestedByName: `${user.firstName} ${user.lastName}`,
        status: "pending",
        notes: notes || null,
      });
      await logAudit(req, "create", "rgpd_request", request.id, `RGPD ${requestType} - ${targetName}`);
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la création de la demande RGPD" });
    }
  });

  app.patch("/api/rgpd-requests/:id", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { status, notes } = req.body;
      const data: any = {};
      if (status) data.status = status;
      if (notes !== undefined) data.notes = notes;
      if (status === "completed") data.completedAt = new Date();

      const result = await storage.updateRgpdRequest(String(req.params.id), data);
      if (!result) return res.status(404).json({ message: "Demande non trouvée" });

      await logAudit(req, "update", "rgpd_request", result.id, `RGPD ${result.requestType} → ${status}`);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  // RGPD: Export personal data for a trainee
  app.get("/api/rgpd/export-data/:traineeId", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const traineeId = String(req.params.traineeId);
      const trainee = await storage.getTrainee(traineeId);
      if (!trainee) return res.status(404).json({ message: "Apprenant non trouvé" });

      // Gather all personal data
      const enrollments = await storage.getEnrollments();
      const traineeEnrollments = enrollments.filter((e: any) => e.traineeId === traineeId);
      const documents = await storage.getUserDocuments(traineeId);
      const certifications = await storage.getTraineeCertifications(traineeId);

      const exportData = {
        exportDate: new Date().toISOString(),
        personalData: {
          firstName: trainee.firstName,
          lastName: trainee.lastName,
          email: trainee.email,
          phone: trainee.phone,
          address: trainee.address,
          city: trainee.city,
          postalCode: trainee.postalCode,
          country: trainee.country,
          dateOfBirth: trainee.dateOfBirth,
          civility: trainee.civility,
          rppsNumber: trainee.rppsNumber,
          profession: trainee.profession,
          poleEmploiId: trainee.poleEmploiId,
          dietaryRegime: trainee.dietaryRegime,
          imageRightsConsent: trainee.imageRightsConsent,
          company: trainee.company,
        },
        enrollments: traineeEnrollments.map((e: any) => ({
          id: e.id,
          sessionId: e.sessionId,
          status: e.status,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
        })),
        documents: documents.map((d: any) => ({
          id: d.id,
          type: d.documentType,
          name: d.documentName,
          uploadedAt: d.uploadedAt,
        })),
        certifications: certifications.map((c: any) => ({
          id: c.id,
          type: c.certificationType,
          number: c.certificateNumber,
          issueDate: c.issueDate,
          expiryDate: c.expiryDate,
        })),
      };

      await logAudit(req, "export", "trainee", traineeId, `Export RGPD - ${trainee.firstName} ${trainee.lastName}`);
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'export des données" });
    }
  });

  // RGPD: Anonymize a trainee's personal data
  app.post("/api/rgpd/anonymize/:traineeId", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const traineeId = String(req.params.traineeId);
      const trainee = await storage.getTrainee(traineeId);
      if (!trainee) return res.status(404).json({ message: "Apprenant non trouvé" });

      const anonymized = {
        firstName: "Anonyme",
        lastName: "Anonyme",
        email: `anonyme_${traineeId.substring(0, 8)}@supprime.fr`,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        dateOfBirth: null,
        cityOfBirth: null,
        civility: null,
        rppsNumber: null,
        profession: null,
        poleEmploiId: null,
        dietaryRegime: null,
        imageRightsConsent: null,
        managerEmail: null,
        managerName: null,
        diplomaNumber: null,
        socialSecurityNumber: null,
        company: null,
        status: "inactive",
      };

      await storage.updateTrainee(traineeId, anonymized);
      await logAudit(req, "delete", "trainee", traineeId, `Anonymisation RGPD - ${trainee.firstName} ${trainee.lastName}`);
      res.json({ success: true, message: "Données personnelles anonymisées" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'anonymisation" });
    }
  });

  // ============================================================
  // MIGRATION & ARCHIVAGE
  // ============================================================

  // ---- Data Imports ----

  app.get("/api/data-imports", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const imports = await storage.getDataImports();
      res.json(imports);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/data-imports/process", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { entityType, data, source } = req.body;
      if (!entityType || !data || !Array.isArray(data)) {
        return res.status(400).json({ message: "entityType et data (tableau) requis" });
      }

      const user = (req as any).user;
      const importRecord = await storage.createDataImport({
        source: source || "digiforma",
        entityType,
        fileName: `import_${entityType}_${new Date().toISOString().split("T")[0]}.json`,
        totalRows: data.length,
        importedRows: 0,
        skippedRows: 0,
        errorRows: 0,
        status: "processing",
        errors: [],
        importedBy: user.id,
        importedByName: `${user.firstName} ${user.lastName}`,
      });

      let imported = 0;
      let skipped = 0;
      let errorCount = 0;
      const errors: Array<{ row: number; field: string; message: string }> = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          if (entityType === "trainee") {
            if (!row.firstName || !row.lastName || !row.email) {
              errors.push({ row: i + 1, field: "firstName/lastName/email", message: "Champs obligatoires manquants" });
              errorCount++;
              continue;
            }
            // Check duplicate by email
            const existing = await storage.getTrainees();
            if (existing.find((t: any) => t.email === row.email)) {
              skipped++;
              continue;
            }
            await storage.createTrainee({
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phone: row.phone || null,
              company: row.company || null,
              civility: row.civility || null,
              rppsNumber: row.rppsNumber || null,
              profession: row.profession || null,
              address: row.address || null,
              city: row.city || null,
              postalCode: row.postalCode || null,
              status: "active",
            });
            imported++;
          } else if (entityType === "trainer") {
            if (!row.firstName || !row.lastName || !row.email) {
              errors.push({ row: i + 1, field: "firstName/lastName/email", message: "Champs obligatoires manquants" });
              errorCount++;
              continue;
            }
            const existing = await storage.getTrainers();
            if (existing.find((t: any) => t.email === row.email)) {
              skipped++;
              continue;
            }
            await storage.createTrainer({
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phone: row.phone || null,
              specialty: row.specialty || null,
              bio: row.bio || null,
              status: "active",
            });
            imported++;
          } else if (entityType === "program") {
            if (!row.title) {
              errors.push({ row: i + 1, field: "title", message: "Titre requis" });
              errorCount++;
              continue;
            }
            await storage.createProgram({
              title: row.title,
              description: row.description || null,
              duration: parseInt(row.duration) || 7,
              price: parseInt(row.price) || 0,
              level: row.level || "beginner",
              objectives: row.objectives || null,
              prerequisites: row.prerequisites || null,
              modality: row.modality || "presentiel",
              status: "active",
            });
            imported++;
          } else if (entityType === "enterprise") {
            if (!row.name) {
              errors.push({ row: i + 1, field: "name", message: "Nom requis" });
              errorCount++;
              continue;
            }
            await storage.createEnterprise({
              name: row.name,
              siret: row.siret || null,
              address: row.address || null,
              city: row.city || null,
              postalCode: row.postalCode || null,
              contactName: row.contactName || null,
              contactEmail: row.contactEmail || null,
              contactPhone: row.contactPhone || null,
            });
            imported++;
          } else {
            errors.push({ row: i + 1, field: "entityType", message: `Type '${entityType}' non supporté` });
            errorCount++;
          }
        } catch (err: any) {
          errors.push({ row: i + 1, field: "system", message: err.message || "Erreur inconnue" });
          errorCount++;
        }
      }

      await storage.updateDataImport(importRecord.id, {
        importedRows: imported,
        skippedRows: skipped,
        errorRows: errorCount,
        errors: errors as any,
        status: errorCount > 0 && imported === 0 ? "failed" : "completed",
        completedAt: new Date(),
      });

      await logAudit(req, "create", "data_import", importRecord.id, `Import ${entityType}: ${imported} importés, ${skipped} ignorés, ${errorCount} erreurs`);

      res.json({
        id: importRecord.id,
        imported,
        skipped,
        errors: errorCount,
        errorDetails: errors,
      });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'import" });
    }
  });

  // ---- Data Archives ----

  app.get("/api/data-archives", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const filters = {
        entityType: req.query.entityType as string | undefined,
        status: req.query.status as string | undefined,
      };
      const archives = await storage.getDataArchives(filters);
      res.json(archives);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/data-archives", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { entityType, entityId, entityLabel, retentionYears, metadata } = req.body;
      if (!entityType || !entityId || !entityLabel) {
        return res.status(400).json({ message: "Champs requis manquants" });
      }
      const user = (req as any).user;
      const years = retentionYears || 10;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + years);

      const archive = await storage.createDataArchive({
        entityType,
        entityId,
        entityLabel,
        retentionYears: years,
        expiresAt,
        archivedBy: user.id,
        archivedByName: `${user.firstName} ${user.lastName}`,
        metadata: metadata || {},
        status: "active",
      });

      await logAudit(req, "create", "data_archive", archive.id, `Archivage ${entityType}: ${entityLabel} (${years} ans)`);
      res.json(archive);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'archivage" });
    }
  });

  // Auto-archive: archive all completed sessions older than 6 months
  app.post("/api/data-archives/auto-archive", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const sessions = await storage.getSessions();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const existingArchives = await storage.getDataArchives({ entityType: "session" });
      const archivedIds = new Set(existingArchives.map((a: any) => a.entityId));

      const user = (req as any).user;
      let archived = 0;

      for (const session of sessions) {
        if (session.status !== "completed") continue;
        if (archivedIds.has(session.id)) continue;
        const endDate = session.endDate ? new Date(session.endDate) : null;
        if (!endDate || endDate > sixMonthsAgo) continue;

        const program = await storage.getProgram(session.programId);
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 10);

        await storage.createDataArchive({
          entityType: "session",
          entityId: session.id,
          entityLabel: `${program?.title || "Session"} - ${session.startDate}`,
          retentionYears: 10,
          expiresAt,
          archivedBy: user.id,
          archivedByName: `${user.firstName} ${user.lastName}`,
          metadata: { programId: session.programId, startDate: session.startDate, endDate: session.endDate } as any,
          status: "active",
        });
        archived++;
      }

      await logAudit(req, "create", "data_archive", undefined, `Auto-archivage: ${archived} sessions archivées`);
      res.json({ archived });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'auto-archivage" });
    }
  });

  app.get("/api/data-archives/stats", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const archives = await storage.getDataArchives();
      const total = archives.length;
      const byType: Record<string, number> = {};
      const active = archives.filter((a: any) => a.status === "active").length;
      const expired = archives.filter((a: any) => new Date(a.expiresAt) < new Date()).length;
      archives.forEach((a: any) => {
        byType[a.entityType] = (byType[a.entityType] || 0) + 1;
      });
      res.json({ total, active, expired, byType });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  return httpServer;
}
