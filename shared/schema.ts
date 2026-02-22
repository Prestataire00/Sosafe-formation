import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// EXISTING TABLES
// ============================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email"),
  trainerId: varchar("trainer_id"),
  traineeId: varchar("trainee_id"),
  enterpriseId: varchar("enterprise_id"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
});

export const enterprises = pgTable("enterprises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  siret: text("siret"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  sector: text("sector"),
  status: text("status").notNull().default("active"),
  formatJuridique: text("format_juridique"),
  tvaNumber: text("tva_number"),
  email: text("email"),
  phone: text("phone"),
  legalRepName: text("legal_rep_name"),
  legalRepEmail: text("legal_rep_email"),
  legalRepPhone: text("legal_rep_phone"),
});

export const enterpriseContacts = pgTable("enterprise_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enterpriseId: varchar("enterprise_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("general"),
  department: text("department"),
  notes: text("notes"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainers = pgTable("trainers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  specialty: text("specialty"),
  bio: text("bio"),
  status: text("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
});

export const trainees = pgTable("trainees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  enterpriseId: varchar("enterprise_id"),
  status: text("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
  civility: text("civility"),
  dateOfBirth: date("date_of_birth"),
  cityOfBirth: text("city_of_birth"),
  department: text("department"),
  poleEmploiId: text("pole_emploi_id"),
  dietaryRegime: text("dietary_regime"),
  imageRightsConsent: boolean("image_rights_consent"),
  profileType: text("profile_type").default("salarie"),
  proStatut: text("pro_statut"),
  proDenomination: text("pro_denomination"),
  proSiret: text("pro_siret"),
  proTva: text("pro_tva"),
  rppsNumber: text("rpps_number"),
  profession: text("profession"),
});

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  categories: jsonb("categories").$type<string[]>().default([]),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  level: text("level").notNull().default("beginner"),
  objectives: text("objectives"),
  prerequisites: text("prerequisites"),
  modality: text("modality").notNull().default("presentiel"),
  status: text("status").notNull().default("draft"),
  certifying: boolean("certifying").default(false),
  recyclingMonths: integer("recycling_months"),
  programContent: text("program_content"),
  targetAudience: text("target_audience"),
  teachingMethods: text("teaching_methods"),
  evaluationMethods: text("evaluation_methods"),
  technicalMeans: text("technical_means"),
  accessibilityInfo: text("accessibility_info"),
  accessDelay: text("access_delay"),
  resultIndicators: text("result_indicators"),
  referentContact: text("referent_contact"),
  referentHandicap: text("referent_handicap"),
  fundingTypes: jsonb("funding_types").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  trainerId: varchar("trainer_id"),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: text("location"),
  locationAddress: text("location_address"),
  locationRoom: text("location_room"),
  modality: text("modality").notNull().default("presentiel"),
  maxParticipants: integer("max_participants").notNull().default(12),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  virtualClassUrl: text("virtual_class_url"),
});

export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  traineeId: varchar("trainee_id").notNull(),
  enterpriseId: varchar("enterprise_id"),
  status: text("status").notNull().default("registered"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  certificateUrl: text("certificate_url"),
  notes: text("notes"),
  vaeStatus: text("vae_status"),
});

// ============================================================
// NEW TABLES - PROGRAM PREREQUISITES & TRAINEE CERTIFICATIONS
// ============================================================

export const programPrerequisites = pgTable("program_prerequisites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  requiredProgramId: varchar("required_program_id"),
  requiredCategory: text("required_category"),
  maxMonthsSinceCompletion: integer("max_months_since_completion"),
  requiredProfessions: jsonb("required_professions").$type<string[]>().default([]),
  requiresRpps: boolean("requires_rpps").default(false),
  description: text("description"),
});

export const traineeCertifications = pgTable("trainee_certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  traineeId: varchar("trainee_id").notNull(),
  programId: varchar("program_id"),
  enrollmentId: varchar("enrollment_id"),
  type: text("type").notNull(),
  label: text("label").notNull(),
  obtainedAt: date("obtained_at").notNull(),
  expiresAt: date("expires_at"),
  status: text("status").notNull().default("valid"),
  documentUrl: text("document_url"),
});

// ============================================================
// NEW TABLES - EMAIL TEMPLATES & LOGS
// ============================================================

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  type: text("type").notNull().default("manual"),
  variables: jsonb("variables").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id"),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  scheduledAt: timestamp("scheduled_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// NEW TABLES - DOCUMENT TEMPLATES & GENERATED DOCUMENTS
// ============================================================

export const documentTemplates = pgTable("document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("convention"),
  content: text("content").notNull(),
  variables: jsonb("variables").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  sessionId: varchar("session_id"),
  traineeId: varchar("trainee_id"),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("generated"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// NEW TABLES - CRM / PROSPECTS
// ============================================================

export const prospects = pgTable("prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  status: text("status").notNull().default("prospect"),
  source: text("source"),
  notes: text("notes"),
  estimatedRevenue: integer("estimated_revenue"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// NEW TABLES - QUOTES & INVOICES & PAYMENTS
// ============================================================

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  prospectId: varchar("prospect_id"),
  enterpriseId: varchar("enterprise_id"),
  lineItems: jsonb("line_items").$type<Array<{ description: string; programId?: string; quantity: number; unitPrice: number; total: number }>>().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(2000),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  status: text("status").notNull().default("draft"),
  validUntil: date("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  quoteId: varchar("quote_id"),
  enterpriseId: varchar("enterprise_id"),
  sessionId: varchar("session_id"),
  lineItems: jsonb("line_items").$type<Array<{ description: string; programId?: string; quantity: number; unitPrice: number; total: number }>>().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(2000),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: text("status").notNull().default("draft"),
  dueDate: date("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("virement"),
  reference: text("reference"),
  paidAt: timestamp("paid_at").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// NEW TABLES - E-LEARNING / LMS
// ============================================================

export const elearningModules = pgTable("elearning_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id"),
  sessionId: varchar("session_id"),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const elearningBlocks = pgTable("elearning_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull(),
  type: text("type").notNull().default("text"),
  title: text("title").notNull(),
  content: text("content"),
  videoUrl: text("video_url"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: varchar("block_id").notNull(),
  question: text("question").notNull(),
  type: text("type").notNull().default("qcm"),
  options: jsonb("options").$type<string[]>().default([]),
  correctAnswer: integer("correct_answer").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
});

export const learnerProgress = pgTable("learner_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  traineeId: varchar("trainee_id").notNull(),
  moduleId: varchar("module_id").notNull(),
  blockId: varchar("block_id"),
  completed: boolean("completed").default(false),
  score: integer("score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// NEW TABLES - SURVEYS & QUALITY
// ============================================================

export const surveyTemplates = pgTable("survey_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").$type<Array<{ question: string; type: string; options?: string[] }>>().default([]),
  category: text("category").notNull().default("satisfaction"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull(),
  sessionId: varchar("session_id"),
  traineeId: varchar("trainee_id"),
  answers: jsonb("answers").$type<Array<{ questionIndex: number; answer: string | number }>>().default([]),
  rating: integer("rating"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const qualityActions = pgTable("quality_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("improvement"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: text("assigned_to"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// NEW TABLES - ATTENDANCE / EMARGEMENT
// ============================================================

export const attendanceSheets = pgTable("attendance_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  date: date("date").notNull(),
  period: text("period").notNull().default("journee"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sheetId: varchar("sheet_id").notNull(),
  traineeId: varchar("trainee_id").notNull(),
  status: text("status").notNull().default("absent"),
  signedAt: timestamp("signed_at"),
  notes: text("notes"),
});

// ============================================================
// NEW TABLES - AUTOMATION & SETTINGS
// ============================================================

export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  event: text("event").notNull(),
  action: text("action").notNull().default("send_email"),
  templateId: varchar("template_id"),
  delay: integer("delay").default(0),
  active: boolean("active").default(true),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizationSettings = pgTable("organization_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// NEW TABLES - TRAINER DOCUMENTS & EVALUATIONS
// ============================================================

export const trainerDocuments = pgTable("trainer_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  type: text("type").notNull().default("autre"),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  fileContent: text("file_content"),
  status: text("status").notNull().default("pending"),
  validatedBy: varchar("validated_by"),
  expiresAt: date("expires_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  notes: text("notes"),
});

export const trainerEvaluations = pgTable("trainer_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  sessionId: varchar("session_id"),
  evaluatorId: varchar("evaluator_id"),
  year: integer("year").notNull(),
  overallRating: integer("overall_rating"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  notes: text("notes"),
  satisfactionScore: integer("satisfaction_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// NEW TABLES - USER DOCUMENTS & SIGNATURES (Phase 5)
// ============================================================

export const userDocuments = pgTable("user_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  ownerType: text("owner_type").notNull(), // 'enterprise', 'trainee', 'trainer'
  title: text("title").notNull(),
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  category: text("category").default("autre"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: varchar("uploaded_by"),
});

export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signerId: varchar("signer_id").notNull(),
  signerType: text("signer_type").notNull(), // 'trainee', 'trainer', 'enterprise'
  documentType: text("document_type").notNull(),
  relatedId: varchar("related_id"),
  signatureData: text("signature_data"),
  signedAt: timestamp("signed_at").defaultNow(),
  ipAddress: text("ip_address"),
});

// ============================================================
// NEW TABLES - EXPENSE NOTES
// ============================================================

export const expenseNotes = pgTable("expense_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull().default("autre"),
  date: date("date").notNull(),
  status: text("status").notNull().default("submitted"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  reviewedBy: varchar("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// NEW TABLES - TRAINER INVOICES
// ============================================================

export const trainerInvoices = pgTable("trainer_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  taxRate: integer("tax_rate").notNull().default(2000),
  taxAmount: integer("tax_amount").notNull().default(0),
  totalTtc: integer("total_ttc").notNull().default(0),
  fileUrl: text("file_url"),
  status: text("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  reviewedBy: varchar("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// NEW TABLES - TRAINER COMPETENCIES (Qualiopi)
// ============================================================

export const trainerCompetencies = pgTable("trainer_competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  domain: text("domain").notNull(),
  competencyLabel: text("competency_label").notNull(),
  level: text("level").notNull().default("junior"),
  certificationRef: text("certification_ref"),
  obtainedAt: date("obtained_at"),
  expiresAt: date("expires_at"),
  status: text("status").notNull().default("active"),
  documentId: varchar("document_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// INSERT SCHEMAS
// ============================================================

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEnterpriseSchema = createInsertSchema(enterprises).omit({ id: true });
export const insertTrainerSchema = createInsertSchema(trainers).omit({ id: true });
export const insertTraineeSchema = createInsertSchema(trainees).omit({ id: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true, completedAt: true });
export const insertProgramPrerequisiteSchema = createInsertSchema(programPrerequisites).omit({ id: true });
export const insertTraineeCertificationSchema = createInsertSchema(traineeCertifications).omit({ id: true });

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({ id: true, createdAt: true });
export const insertProspectSchema = createInsertSchema(prospects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertElearningModuleSchema = createInsertSchema(elearningModules).omit({ id: true, createdAt: true });
export const insertElearningBlockSchema = createInsertSchema(elearningBlocks).omit({ id: true, createdAt: true });
export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({ id: true });
export const insertLearnerProgressSchema = createInsertSchema(learnerProgress).omit({ id: true, createdAt: true });
export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({ id: true, createdAt: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, createdAt: true });
export const insertQualityActionSchema = createInsertSchema(qualityActions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendanceSheetSchema = createInsertSchema(attendanceSheets).omit({ id: true, createdAt: true });
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({ id: true });
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, createdAt: true });
export const insertOrganizationSettingSchema = createInsertSchema(organizationSettings).omit({ id: true, updatedAt: true });
export const insertEnterpriseContactSchema = createInsertSchema(enterpriseContacts).omit({ id: true, createdAt: true });
export const insertTrainerDocumentSchema = createInsertSchema(trainerDocuments).omit({ id: true, uploadedAt: true });
export const insertTrainerEvaluationSchema = createInsertSchema(trainerEvaluations).omit({ id: true, createdAt: true });
export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({ id: true, uploadedAt: true });
export const insertSignatureSchema = createInsertSchema(signatures).omit({ id: true, signedAt: true });
export const insertExpenseNoteSchema = createInsertSchema(expenseNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainerInvoiceSchema = createInsertSchema(trainerInvoices).omit({ id: true, createdAt: true, updatedAt: true, submittedAt: true });
export const insertTrainerCompetencySchema = createInsertSchema(trainerCompetencies).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["admin", "trainer", "trainee", "enterprise"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
});

// ============================================================
// TYPES
// ============================================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEnterprise = z.infer<typeof insertEnterpriseSchema>;
export type Enterprise = typeof enterprises.$inferSelect;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type Trainer = typeof trainers.$inferSelect;
export type InsertTrainee = z.infer<typeof insertTraineeSchema>;
export type Trainee = typeof trainees.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertProgramPrerequisite = z.infer<typeof insertProgramPrerequisiteSchema>;
export type ProgramPrerequisite = typeof programPrerequisites.$inferSelect;
export type InsertTraineeCertification = z.infer<typeof insertTraineeCertificationSchema>;
export type TraineeCertification = typeof traineeCertifications.$inferSelect;

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertElearningModule = z.infer<typeof insertElearningModuleSchema>;
export type ElearningModule = typeof elearningModules.$inferSelect;
export type InsertElearningBlock = z.infer<typeof insertElearningBlockSchema>;
export type ElearningBlock = typeof elearningBlocks.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertLearnerProgress = z.infer<typeof insertLearnerProgressSchema>;
export type LearnerProgress = typeof learnerProgress.$inferSelect;
export type InsertSurveyTemplate = z.infer<typeof insertSurveyTemplateSchema>;
export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertQualityAction = z.infer<typeof insertQualityActionSchema>;
export type QualityAction = typeof qualityActions.$inferSelect;
export type InsertAttendanceSheet = z.infer<typeof insertAttendanceSheetSchema>;
export type AttendanceSheet = typeof attendanceSheets.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertOrganizationSetting = z.infer<typeof insertOrganizationSettingSchema>;
export type OrganizationSetting = typeof organizationSettings.$inferSelect;
export type InsertEnterpriseContact = z.infer<typeof insertEnterpriseContactSchema>;
export type EnterpriseContact = typeof enterpriseContacts.$inferSelect;
export type InsertTrainerDocument = z.infer<typeof insertTrainerDocumentSchema>;
export type TrainerDocument = typeof trainerDocuments.$inferSelect;
export type InsertTrainerEvaluation = z.infer<typeof insertTrainerEvaluationSchema>;
export type TrainerEvaluation = typeof trainerEvaluations.$inferSelect;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type UserDocument = typeof userDocuments.$inferSelect;
export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type Signature = typeof signatures.$inferSelect;
export type InsertExpenseNote = z.infer<typeof insertExpenseNoteSchema>;
export type ExpenseNote = typeof expenseNotes.$inferSelect;
export type InsertTrainerInvoice = z.infer<typeof insertTrainerInvoiceSchema>;
export type TrainerInvoice = typeof trainerInvoices.$inferSelect;
export type InsertTrainerCompetency = z.infer<typeof insertTrainerCompetencySchema>;
export type TrainerCompetency = typeof trainerCompetencies.$inferSelect;

// ============================================================
// CONSTANTS
// ============================================================

export const PROGRAM_CATEGORIES = [
  // Domaines
  "Urgences", "AFGSU", "Hygiène", "Certibiocide", "Certificat de décès",
  "Prévention des risques", "Gestes et postures", "Sécurité au travail",
  "Soins infirmiers", "Pharmacie", "Gériatrie", "Pédiatrie",
  "Santé mentale", "Douleur et soins palliatifs", "Management santé",
  "Qualité et gestion des risques", "DPC", "VAE",
  // Publics cibles
  "Infirmière", "Aide-soignant", "Médecin", "Sage-femme",
  "Kinésithérapeute", "Personnel administratif", "Cadre de santé",
  "Tout public santé",
  // Autre
  "Autre",
] as const;

export const PROGRAM_CATEGORY_GROUPS = [
  {
    label: "Domaines de formation",
    categories: ["Urgences", "AFGSU", "Hygiène", "Certibiocide", "Certificat de décès",
      "Prévention des risques", "Gestes et postures", "Sécurité au travail",
      "Soins infirmiers", "Pharmacie", "Gériatrie", "Pédiatrie",
      "Santé mentale", "Douleur et soins palliatifs", "Management santé",
      "Qualité et gestion des risques", "DPC", "VAE"],
  },
  {
    label: "Publics cibles",
    categories: ["Infirmière", "Aide-soignant", "Médecin", "Sage-femme",
      "Kinésithérapeute", "Personnel administratif", "Cadre de santé",
      "Tout public santé"],
  },
  { label: "Autre", categories: ["Autre"] },
] as const;

export const FUNDING_TYPES = [
  { value: "fifpl", label: "FIFPL", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "opco", label: "OPCO", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "dpc", label: "DPC", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "personnel", label: "Personnel", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "autre", label: "Autre", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
] as const;

export const MODALITIES = [
  { value: "presentiel", label: "Présentiel" },
  { value: "distanciel", label: "Distanciel" },
  { value: "blended", label: "Blended Learning" },
] as const;

export const SESSION_STATUSES = [
  { value: "planned", label: "Planifiée" },
  { value: "ongoing", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
] as const;

export const ENROLLMENT_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "registered", label: "Inscrit" },
  { value: "confirmed", label: "Confirmé" },
  { value: "attended", label: "Présent" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
  { value: "no_show", label: "Absent" },
] as const;

export const USER_ROLES = [
  { value: "admin", label: "Administrateur" },
  { value: "trainer", label: "Formateur" },
  { value: "trainee", label: "Apprenant" },
  { value: "enterprise", label: "Entreprise" },
] as const;

export const EMAIL_TEMPLATE_CATEGORIES = [
  { value: "convocation", label: "Convocation" },
  { value: "confirmation", label: "Confirmation" },
  { value: "rappel", label: "Rappel" },
  { value: "suivi", label: "Suivi" },
  { value: "facturation", label: "Facturation" },
  { value: "general", label: "Général" },
] as const;

export const EMAIL_TEMPLATE_TYPES = [
  { value: "manual", label: "Manuel" },
  { value: "automatic", label: "Automatique" },
] as const;

export const DOCUMENT_TYPES = [
  { value: "convention", label: "Convention de formation" },
  { value: "convocation", label: "Convocation" },
  { value: "attestation", label: "Attestation de formation" },
  { value: "certificat", label: "Certificat" },
  { value: "bpf", label: "Bilan Pédagogique et Financier" },
  { value: "programme", label: "Programme de formation" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "autre", label: "Autre" },
] as const;

export const PROSPECT_STATUSES = [
  { value: "prospect", label: "Prospect", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "contact", label: "Contacté", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "qualified", label: "Qualifié", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "negotiation", label: "Négociation", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "won", label: "Gagné", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "lost", label: "Perdu", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

export const QUOTE_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyé" },
  { value: "accepted", label: "Accepté" },
  { value: "rejected", label: "Refusé" },
  { value: "expired", label: "Expiré" },
] as const;

export const INVOICE_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyée" },
  { value: "paid", label: "Payée" },
  { value: "partial", label: "Partiellement payée" },
  { value: "overdue", label: "En retard" },
  { value: "cancelled", label: "Annulée" },
] as const;

export const PAYMENT_METHODS = [
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "cb", label: "Carte bancaire" },
  { value: "especes", label: "Espèces" },
  { value: "prelevement", label: "Prélèvement" },
  { value: "autre", label: "Autre" },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Présent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "late", label: "Retard", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "excused", label: "Excusé", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
] as const;

export const ATTENDANCE_PERIODS = [
  { value: "matin", label: "Matin" },
  { value: "apres-midi", label: "Après-midi" },
  { value: "journee", label: "Journée entière" },
] as const;

export const QUALITY_ACTION_TYPES = [
  { value: "improvement", label: "Amélioration" },
  { value: "corrective", label: "Corrective" },
  { value: "preventive", label: "Préventive" },
] as const;

export const QUALITY_ACTION_STATUSES = [
  { value: "open", label: "Ouverte" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
] as const;

export const QUALITY_PRIORITIES = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
] as const;

export const ELEARNING_BLOCK_TYPES = [
  { value: "text", label: "Texte" },
  { value: "video", label: "Vidéo" },
  { value: "quiz", label: "Quiz" },
] as const;

export const AUTOMATION_EVENTS = [
  { value: "enrollment_created", label: "Nouvelle inscription" },
  { value: "session_starting", label: "Début de session" },
  { value: "session_completed", label: "Fin de session" },
  { value: "invoice_created", label: "Facture créée" },
  { value: "payment_received", label: "Paiement reçu" },
  { value: "survey_completed", label: "Enquête complétée" },
] as const;

export const AUTOMATION_ACTIONS = [
  { value: "send_email", label: "Envoyer un email" },
  { value: "generate_document", label: "Générer un document" },
  { value: "create_attendance", label: "Créer une feuille d'émargement" },
] as const;

// Enterprise constants
export const ENTERPRISE_FORMATS_JURIDIQUES = [
  { value: "SAS", label: "SAS" },
  { value: "SARL", label: "SARL" },
  { value: "EURL", label: "EURL" },
  { value: "SA", label: "SA" },
  { value: "EI", label: "Entreprise Individuelle" },
  { value: "association", label: "Association" },
  { value: "public", label: "Établissement public" },
  { value: "autre", label: "Autre" },
] as const;

export const ENTERPRISE_CONTACT_ROLES = [
  { value: "general", label: "Contact général" },
  { value: "finance", label: "Finance / Comptabilité" },
  { value: "rh", label: "Ressources Humaines" },
  { value: "manager", label: "Responsable de service" },
  { value: "direction", label: "Direction" },
  { value: "formation", label: "Responsable formation" },
  { value: "autre", label: "Autre" },
] as const;

export const ENTERPRISE_DOCUMENT_CATEGORIES = [
  { value: "convention", label: "Convention" },
  { value: "attestation", label: "Attestation" },
  { value: "facture", label: "Facture" },
  { value: "devis", label: "Devis" },
  { value: "certificat", label: "Certificat" },
  { value: "programme", label: "Programme" },
  { value: "bpf", label: "Bilan Pédagogique et Financier" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "administratif", label: "Administratif" },
  { value: "autre", label: "Autre" },
] as const;

// Trainee constants
export const TRAINEE_CIVILITIES = [
  { value: "M.", label: "M." },
  { value: "Mme", label: "Mme" },
  { value: "Dr", label: "Dr" },
] as const;

export const TRAINEE_PROFILE_TYPES = [
  { value: "salarie", label: "Salarié(e)" },
  { value: "profession_liberale", label: "Profession libérale" },
  { value: "particulier", label: "Particulier" },
] as const;

export const PRO_STATUT_TYPES = [
  { value: "micro_entreprise", label: "Micro-entreprise" },
  { value: "ei", label: "Entreprise individuelle" },
  { value: "eurl", label: "EURL" },
  { value: "sasu", label: "SASU" },
  { value: "selarl", label: "SELARL" },
  { value: "scm", label: "SCM" },
  { value: "autre", label: "Autre" },
] as const;

export const DIETARY_REGIMES = [
  { value: "aucun", label: "Aucun régime particulier" },
  { value: "vegetarien", label: "Végétarien" },
  { value: "vegan", label: "Végétalien" },
  { value: "halal", label: "Halal" },
  { value: "casher", label: "Casher" },
  { value: "sans_gluten", label: "Sans gluten" },
  { value: "sans_lactose", label: "Sans lactose" },
  { value: "autre", label: "Autre" },
] as const;

// Trainer statuses
export const TRAINER_STATUSES = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "inactive", label: "Inactif", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "pending", label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "suspended", label: "Suspendu", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "archived", label: "Archivé", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
] as const;

// Trainer document constants
export const TRAINER_DOCUMENT_TYPES = [
  { value: "cv", label: "CV" },
  { value: "diplome", label: "Diplôme" },
  { value: "attestation", label: "Attestation" },
  { value: "contrat", label: "Contrat" },
  { value: "nda", label: "NDA" },
  { value: "assurance", label: "Assurance RC Pro" },
  { value: "rib", label: "RIB" },
  { value: "autre", label: "Autre" },
] as const;

export const TRAINER_DOCUMENT_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "validated", label: "Validé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "rejected", label: "Rejeté", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "expired", label: "Expiré", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
] as const;

// Admin permissions
export const ADMIN_PERMISSIONS = {
  administration: [
    { value: "manage_users", label: "Gérer les utilisateurs" },
    { value: "manage_settings", label: "Gérer les paramètres" },
    { value: "manage_templates", label: "Gérer les modèles" },
    { value: "manage_automation", label: "Gérer l'automatisation" },
  ],
  contacts: [
    { value: "manage_enterprises", label: "Gérer les entreprises" },
    { value: "manage_trainees", label: "Gérer les apprenants" },
    { value: "manage_trainers", label: "Gérer les formateurs" },
    { value: "view_contacts", label: "Voir les contacts" },
  ],
  formation: [
    { value: "manage_programs", label: "Gérer les formations" },
    { value: "manage_sessions", label: "Gérer les sessions" },
    { value: "manage_enrollments", label: "Gérer les inscriptions" },
    { value: "manage_attendance", label: "Gérer l'émargement" },
    { value: "manage_elearning", label: "Gérer le e-learning" },
  ],
  commercial: [
    { value: "manage_prospects", label: "Gérer les prospects" },
    { value: "manage_quotes", label: "Gérer les devis" },
    { value: "manage_invoices", label: "Gérer les factures" },
    { value: "view_financial_reports", label: "Voir les rapports financiers" },
  ],
  qualite: [
    { value: "manage_surveys", label: "Gérer les enquêtes" },
    { value: "manage_quality_actions", label: "Gérer les actions qualité" },
    { value: "override_survey_responses", label: "Modifier les réponses d'enquêtes" },
    { value: "manage_documents", label: "Gérer les documents" },
  ],
} as const;

// ============================================================
// TEMPLATE VARIABLES
// ============================================================

export const TEMPLATE_VARIABLES = {
  apprenant: [
    { key: "{nom_apprenant}", label: "Nom complet de l'apprenant" },
    { key: "{prenom_apprenant}", label: "Prénom de l'apprenant" },
    { key: "{nom_famille_apprenant}", label: "Nom de famille" },
    { key: "{email_apprenant}", label: "Email de l'apprenant" },
    { key: "{entreprise_apprenant}", label: "Entreprise de l'apprenant" },
  ],
  session: [
    { key: "{titre_session}", label: "Titre de la session" },
    { key: "{date_debut}", label: "Date de début" },
    { key: "{date_fin}", label: "Date de fin" },
    { key: "{lieu}", label: "Lieu" },
    { key: "{modalite}", label: "Modalité" },
  ],
  formation: [
    { key: "{titre_formation}", label: "Titre de la formation" },
    { key: "{duree_formation}", label: "Durée" },
    { key: "{prix_formation}", label: "Prix" },
    { key: "{objectifs_formation}", label: "Objectifs" },
  ],
  organisme: [
    { key: "{nom_organisme}", label: "Nom de l'organisme" },
    { key: "{adresse_organisme}", label: "Adresse" },
    { key: "{siret_organisme}", label: "SIRET" },
    { key: "{email_organisme}", label: "Email" },
    { key: "{telephone_organisme}", label: "Téléphone" },
  ],
} as const;

export const EXPENSE_CATEGORIES = [
  { value: "deplacement", label: "Déplacement" },
  { value: "hebergement", label: "Hébergement" },
  { value: "restauration", label: "Restauration" },
  { value: "materiel", label: "Matériel" },
  { value: "autre", label: "Autre" },
] as const;

export const EXPENSE_STATUSES = [
  { value: "submitted", label: "Soumise", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "approved", label: "Approuvée", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "rejected", label: "Rejetée", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "paid", label: "Payée", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
] as const;

export const TRAINER_INVOICE_STATUSES = [
  { value: "submitted", label: "Soumise", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "under_review", label: "En cours d'examen", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "approved", label: "Approuvée", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "paid", label: "Payée", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "rejected", label: "Rejetée", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

// Competency tracking (Qualiopi)
export const COMPETENCY_DOMAINS = [
  "AFGSU",
  "Certibiocide",
  "Certificat de décès",
  "Hygiène",
  "Prévention des risques",
  "Management santé",
  "Pédagogie",
  "Soins infirmiers",
  "Gestes et postures",
  "Sécurité au travail",
  "Formation continue santé",
  "Autre",
] as const;

export const COMPETENCY_LEVELS = [
  { value: "junior", label: "Junior", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "confirme", label: "Confirmé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "expert", label: "Expert", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "referent", label: "Référent", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
] as const;

export const COMPETENCY_STATUSES = [
  { value: "active", label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "expired", label: "Expirée", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "renewal", label: "Renouvellement en cours", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
] as const;

// Trainee professions (health sector)
export const TRAINEE_PROFESSIONS = [
  { value: "infirmiere", label: "Infirmier(ère)" },
  { value: "aide_soignant", label: "Aide-soignant(e)" },
  { value: "medecin", label: "Médecin" },
  { value: "sage_femme", label: "Sage-femme" },
  { value: "kinesitherapeute", label: "Kinésithérapeute" },
  { value: "pharmacien", label: "Pharmacien(ne)" },
  { value: "cadre_sante", label: "Cadre de santé" },
  { value: "personnel_administratif", label: "Personnel administratif" },
  { value: "autre", label: "Autre" },
] as const;

// Certification types
export const CERTIFICATION_TYPES = [
  { value: "AFGSU1", label: "AFGSU Niveau 1" },
  { value: "AFGSU2", label: "AFGSU Niveau 2" },
  { value: "Certibiocide", label: "Certibiocide" },
  { value: "CertificatDeces", label: "Certificat de décès" },
  { value: "DPC", label: "DPC" },
  { value: "autre", label: "Autre" },
] as const;

export const CERTIFICATION_STATUSES = [
  { value: "valid", label: "Valide", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "expired", label: "Expirée", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "revoked", label: "Révoquée", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
] as const;

// VAE statuses
export const VAE_STATUSES = [
  { value: "dossier_recevabilite", label: "Dossier de recevabilité" },
  { value: "accompagnement", label: "Accompagnement" },
  { value: "redaction", label: "Rédaction" },
  { value: "jury", label: "Jury" },
  { value: "decision", label: "Décision" },
  { value: "termine", label: "Terminé" },
] as const;
