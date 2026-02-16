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
});

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  level: text("level").notNull().default("beginner"),
  objectives: text("objectives"),
  prerequisites: text("prerequisites"),
  modality: text("modality").notNull().default("presentiel"),
  status: text("status").notNull().default("draft"),
  certifying: boolean("certifying").default(false),
  recyclingMonths: integer("recycling_months"),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  trainerId: varchar("trainer_id"),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: text("location"),
  modality: text("modality").notNull().default("presentiel"),
  maxParticipants: integer("max_participants").notNull().default(12),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
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
// INSERT SCHEMAS
// ============================================================

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEnterpriseSchema = createInsertSchema(enterprises).omit({ id: true });
export const insertTrainerSchema = createInsertSchema(trainers).omit({ id: true });
export const insertTraineeSchema = createInsertSchema(trainees).omit({ id: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true, completedAt: true });

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

// ============================================================
// CONSTANTS
// ============================================================

export const PROGRAM_CATEGORIES = [
  "AFGSU",
  "Certibiocide",
  "Certificat de d\u00e9c\u00e8s",
  "VAE",
  "S\u00e9curit\u00e9 au travail",
  "Soins infirmiers",
  "Hygi\u00e8ne hospitali\u00e8re",
  "Gestes et postures",
  "Pr\u00e9vention des risques",
  "Formation continue sant\u00e9",
  "Management sant\u00e9",
  "Autre",
] as const;

export const MODALITIES = [
  { value: "presentiel", label: "Pr\u00e9sentiel" },
  { value: "distanciel", label: "Distanciel" },
  { value: "blended", label: "Blended Learning" },
] as const;

export const SESSION_STATUSES = [
  { value: "planned", label: "Planifi\u00e9e" },
  { value: "ongoing", label: "En cours" },
  { value: "completed", label: "Termin\u00e9e" },
  { value: "cancelled", label: "Annul\u00e9e" },
] as const;

export const ENROLLMENT_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "registered", label: "Inscrit" },
  { value: "confirmed", label: "Confirm\u00e9" },
  { value: "attended", label: "Pr\u00e9sent" },
  { value: "completed", label: "Termin\u00e9" },
  { value: "cancelled", label: "Annul\u00e9" },
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
  { value: "general", label: "G\u00e9n\u00e9ral" },
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
  { value: "bpf", label: "Bilan P\u00e9dagogique et Financier" },
  { value: "programme", label: "Programme de formation" },
  { value: "reglement", label: "R\u00e8glement int\u00e9rieur" },
  { value: "autre", label: "Autre" },
] as const;

export const PROSPECT_STATUSES = [
  { value: "prospect", label: "Prospect", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "contact", label: "Contact\u00e9", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "qualified", label: "Qualifi\u00e9", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "negotiation", label: "N\u00e9gociation", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "won", label: "Gagn\u00e9", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "lost", label: "Perdu", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

export const QUOTE_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoy\u00e9" },
  { value: "accepted", label: "Accept\u00e9" },
  { value: "rejected", label: "Refus\u00e9" },
  { value: "expired", label: "Expir\u00e9" },
] as const;

export const INVOICE_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoy\u00e9e" },
  { value: "paid", label: "Pay\u00e9e" },
  { value: "partial", label: "Partiellement pay\u00e9e" },
  { value: "overdue", label: "En retard" },
  { value: "cancelled", label: "Annul\u00e9e" },
] as const;

export const PAYMENT_METHODS = [
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Ch\u00e8que" },
  { value: "cb", label: "Carte bancaire" },
  { value: "especes", label: "Esp\u00e8ces" },
  { value: "prelevement", label: "Pr\u00e9l\u00e8vement" },
  { value: "autre", label: "Autre" },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Pr\u00e9sent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "late", label: "Retard", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "excused", label: "Excus\u00e9", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
] as const;

export const ATTENDANCE_PERIODS = [
  { value: "matin", label: "Matin" },
  { value: "apres-midi", label: "Apr\u00e8s-midi" },
  { value: "journee", label: "Journ\u00e9e enti\u00e8re" },
] as const;

export const QUALITY_ACTION_TYPES = [
  { value: "improvement", label: "Am\u00e9lioration" },
  { value: "corrective", label: "Corrective" },
  { value: "preventive", label: "Pr\u00e9ventive" },
] as const;

export const QUALITY_ACTION_STATUSES = [
  { value: "open", label: "Ouverte" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Termin\u00e9e" },
  { value: "cancelled", label: "Annul\u00e9e" },
] as const;

export const QUALITY_PRIORITIES = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
] as const;

export const ELEARNING_BLOCK_TYPES = [
  { value: "text", label: "Texte" },
  { value: "video", label: "Vid\u00e9o" },
  { value: "quiz", label: "Quiz" },
] as const;

export const AUTOMATION_EVENTS = [
  { value: "enrollment_created", label: "Nouvelle inscription" },
  { value: "session_starting", label: "D\u00e9but de session" },
  { value: "session_completed", label: "Fin de session" },
  { value: "invoice_created", label: "Facture cr\u00e9\u00e9e" },
  { value: "payment_received", label: "Paiement re\u00e7u" },
  { value: "survey_completed", label: "Enqu\u00eate compl\u00e9t\u00e9e" },
] as const;

export const AUTOMATION_ACTIONS = [
  { value: "send_email", label: "Envoyer un email" },
  { value: "generate_document", label: "G\u00e9n\u00e9rer un document" },
  { value: "create_attendance", label: "Cr\u00e9er une feuille d'\u00e9margement" },
] as const;

// ============================================================
// TEMPLATE VARIABLES
// ============================================================

export const TEMPLATE_VARIABLES = {
  learner: [
    { key: "{learner_name}", label: "Nom de l'apprenant" },
    { key: "{learner_first_name}", label: "Pr\u00e9nom de l'apprenant" },
    { key: "{learner_last_name}", label: "Nom de famille" },
    { key: "{learner_email}", label: "Email de l'apprenant" },
    { key: "{learner_company}", label: "Entreprise de l'apprenant" },
  ],
  session: [
    { key: "{session_title}", label: "Titre de la session" },
    { key: "{start_date}", label: "Date de d\u00e9but" },
    { key: "{end_date}", label: "Date de fin" },
    { key: "{location}", label: "Lieu" },
    { key: "{modality}", label: "Modalit\u00e9" },
  ],
  program: [
    { key: "{program_title}", label: "Titre de la formation" },
    { key: "{program_duration}", label: "Dur\u00e9e" },
    { key: "{program_price}", label: "Prix" },
    { key: "{program_objectives}", label: "Objectifs" },
  ],
  organization: [
    { key: "{org_name}", label: "Nom de l'organisme" },
    { key: "{org_address}", label: "Adresse" },
    { key: "{org_siret}", label: "SIRET" },
    { key: "{org_email}", label: "Email" },
    { key: "{org_phone}", label: "T\u00e9l\u00e9phone" },
  ],
} as const;
