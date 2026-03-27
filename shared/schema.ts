import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// CUSTOM FIELD TYPES (for program-specific enrollment fields)
// ============================================================

export type ProgramCustomField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "email" | "phone" | "number" | "file";
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select type
  helpText?: string;
};

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
  digiformaId: text("digiforma_id"),
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
  digiformaId: text("digiforma_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  specialty: text("specialty"), // legacy single
  specialties: jsonb("specialties").$type<string[]>().default([]),
  bio: text("bio"),
  status: text("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
  socialSecurityNumber: text("social_security_number"),
});

export const trainees = pgTable("trainees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  digiformaId: text("digiforma_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
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
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("France"),
  managerEmail: text("manager_email"),
  managerName: text("manager_name"),
  diplomaNumber: text("diploma_number"),
  socialSecurityNumber: text("social_security_number"),
  fundingMode: text("funding_mode"), // entreprise, particulier, opco, fifpl, pole_emploi, autre
});

export const FUNDING_MODES = [
  { value: "entreprise", label: "Entreprise / Employeur" },
  { value: "opco", label: "OPCO" },
  { value: "fifpl", label: "FIF-PL" },
  { value: "pole_emploi", label: "France Travail (Pôle Emploi)" },
  { value: "particulier", label: "Financement personnel" },
  { value: "cpf", label: "CPF" },
  { value: "autre", label: "Autre" },
] as const;

export const PROFILE_TYPES = [
  { value: "salarie", label: "Salarié(e)" },
  { value: "profession_liberale", label: "Profession libérale" },
  { value: "independant", label: "Indépendant(e) / Auto-entrepreneur" },
  { value: "particulier", label: "Particulier" },
  { value: "demandeur_emploi", label: "Demandeur d'emploi" },
  { value: "autre", label: "Autre" },
] as const;

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  digiformaId: text("digiforma_id"),
  title: text("title").notNull(),
  description: text("description"),
  categories: jsonb("categories").$type<string[]>().default([]),
  duration: real("duration").notNull(),
  price: real("price").notNull(),
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
  imageUrl: text("image_url"),
  customFields: jsonb("custom_fields").$type<ProgramCustomField[]>().default([]),
  featured: boolean("featured").default(false),
  featuredOrder: integer("featured_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  digiformaId: text("digiforma_id"),
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
  certificateBlocked: boolean("certificate_blocked").default(false),
  waitlistPosition: integer("waitlist_position"),
  waitlistedAt: timestamp("waitlisted_at"),
  customData: jsonb("custom_data").$type<Record<string, any>>().default({}),
});

// ============================================================
// SESSION TRAINERS (many-to-many: session ↔ trainer)
// ============================================================

export const sessionTrainers = pgTable("session_trainers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  trainerId: varchar("trainer_id").notNull(),
  role: text("role").default("trainer"), // "trainer" | "co-trainer" | "observer"
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const insertSessionTrainerSchema = createInsertSchema(sessionTrainers);
export type SessionTrainer = typeof sessionTrainers.$inferSelect;
export type InsertSessionTrainer = typeof sessionTrainers.$inferInsert;

// ============================================================
// TRAINING LOCATIONS (bibliothèque de lieux de formation)
// ============================================================

export const trainingLocations = pgTable("training_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  digiformaId: text("digiforma_id"),
  name: text("name").notNull(),
  description: text("description"),
  // Address — Digiforma-style granular fields
  roadNumber: text("road_number"),
  roadRepetition: text("road_repetition"),
  roadType: text("road_type"),
  roadLabel: text("road_label"),
  address: text("address"), // legacy / full address fallback
  addressExtra: text("address_extra"), // lieu-dit, BP, etc.
  postalCode: text("postal_code"),
  city: text("city"),
  cityCode: text("city_code"),
  country: text("country").default("France"),
  countryCode: text("country_code").default("FR"),
  // Facilities
  rooms: jsonb("rooms").$type<string[]>().default([]),
  capacity: integer("capacity"),
  equipment: text("equipment"),
  pricePerDay: real("price_per_day"),
  pricePerHalfDay: real("price_per_half_day"),
  // Contact
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  // Accessibility & practical info
  accessibilityInfo: text("accessibility_info"),
  accessibilityCompliant: boolean("accessibility_compliant").default(false),
  accessInstructions: text("access_instructions"),
  parkingInfo: text("parking_info"),
  transportInfo: text("transport_info"),
  // Custom fields (Digiforma-style: wifi, projector, etc.)
  customFields: jsonb("custom_fields").$type<Record<string, string | boolean>>().default({}),
  // Documents
  documents: jsonb("documents").$type<Array<{ title: string; fileUrl: string; fileName: string; fileSize?: number }>>().default([]),
  // Admin
  siret: text("siret"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainingLocationSchema = createInsertSchema(trainingLocations);
export type TrainingLocation = typeof trainingLocations.$inferSelect;
export type InsertTrainingLocation = typeof trainingLocations.$inferInsert;

// ============================================================
// NEW TABLES - PROGRAM PREREQUISITES & TRAINEE CERTIFICATIONS
// ============================================================

export const programPrerequisites = pgTable("program_prerequisites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  requiredProgramId: varchar("required_program_id"),
  requiredCategory: text("required_category"),
  maxMonthsSinceCompletion: integer("max_months_since_completion"),
  minMonthsSinceCompletion: integer("min_months_since_completion"), // diploma must be at least X months old
  requiredProfessions: jsonb("required_professions").$type<string[]>().default([]),
  requiresRpps: boolean("requires_rpps").default(false),
  requiresDiploma: boolean("requires_diploma").default(false),
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
  retryCount: integer("retry_count").notNull().default(0),
  trackingId: varchar("tracking_id").default(sql`gen_random_uuid()`).notNull(),
  openedAt: timestamp("opened_at"),
  openCount: integer("open_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTrackingEvents = pgTable("email_tracking_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailLogId: varchar("email_log_id").notNull(),
  trackingId: varchar("tracking_id").notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// ============================================================
// NEW TABLES - SMS TEMPLATES & LOGS
// ============================================================

export const smsTemplates = pgTable("sms_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  type: text("type").notNull().default("manual"),
  variables: jsonb("variables").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smsLogs = pgTable("sms_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id"),
  recipient: text("recipient").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  scheduledAt: timestamp("scheduled_at"),
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
  messageId: text("message_id"),
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
  // Branding fields (6.5)
  brandColor: text("brand_color"),
  fontFamily: text("font_family").default("Arial"),
  logoUrl: text("logo_url"),
  headerHtml: text("header_html"),
  footerHtml: text("footer_html"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentHeaderFooters = pgTable("document_header_footers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("header"), // header | footer
  content: text("content").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  sessionId: varchar("session_id"),
  traineeId: varchar("trainee_id"),
  enterpriseId: varchar("enterprise_id"),
  quoteId: varchar("quote_id"),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("generated"),
  visibility: text("visibility").notNull().default("admin_only"),
  sharedAt: timestamp("shared_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Signature workflow
  signatureStatus: text("signature_status").notNull().default("none"),
  signatureRequestedFor: jsonb("signature_requested_for").$type<Record<string, unknown>[]>().default([]),
  signatureRequestedAt: timestamp("signature_requested_at"),
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
  digiformaId: text("digiforma_id"),
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  prospectId: varchar("prospect_id"),
  enterpriseId: varchar("enterprise_id"),
  lineItems: jsonb("line_items").$type<Array<{ description: string; programId?: string; quantity: number; unitPrice: number; discountPercent?: number; discountAmount?: number; total: number }>>().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  globalDiscountPercent: integer("global_discount_percent").default(0),
  globalDiscountAmount: integer("global_discount_amount").default(0),
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
  digiformaId: text("digiforma_id"),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  invoiceType: text("invoice_type").notNull().default("standard"),
  quoteId: varchar("quote_id"),
  enterpriseId: varchar("enterprise_id"),
  sessionId: varchar("session_id"),
  lineItems: jsonb("line_items").$type<Array<{ description: string; programId?: string; quantity: number; unitPrice: number; discountPercent?: number; discountAmount?: number; total: number }>>().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  globalDiscountPercent: integer("global_discount_percent").default(0),
  globalDiscountAmount: integer("global_discount_amount").default(0),
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

export const paymentSchedules = pgTable("payment_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  installmentNumber: integer("installment_number").notNull(),
  totalInstallments: integer("total_installments").notNull(),
  amount: integer("amount").notNull(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  paymentId: varchar("payment_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id").unique(),
  accountId: text("account_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("EUR"),
  description: text("description"),
  counterpartName: text("counterpart_name"),
  counterpartIban: text("counterpart_iban"),
  executionDate: date("execution_date"),
  valueDate: date("value_date"),
  reconciliationStatus: text("reconciliation_status").notNull().default("unmatched"),
  matchedInvoiceId: varchar("matched_invoice_id"),
  matchedPaymentId: varchar("matched_payment_id"),
  pontoSyncedAt: timestamp("ponto_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// CONNECTION LOGS (REPORTING)
// ============================================================

export const connectionLogs = pgTable("connection_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull().default("trainee"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  moduleId: varchar("module_id"),
  action: text("action").notNull().default("login"),
  duration: integer("duration").default(0),
  connectedAt: timestamp("connected_at").defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
});

// ============================================================
// QUALITY & IMPROVEMENT TABLES
// ============================================================

export const absenceRecords = pgTable("absence_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  traineeId: varchar("trainee_id").notNull(),
  traineeName: text("trainee_name").notNull(),
  sessionTitle: text("session_title"),
  date: date("date").notNull(),
  type: text("type").notNull().default("absence"), // absence | retard | depart_anticipe | anomalie
  reason: text("reason"),
  justified: boolean("justified").default(false),
  justificationDocument: text("justification_document"),
  duration: integer("duration"), // in minutes
  notifiedQualiopi: boolean("notified_qualiopi").default(false),
  qualiopiNotificationDate: timestamp("qualiopi_notification_date"),
  notes: text("notes"),
  status: text("status").notNull().default("open"), // open | resolved | closed
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const qualityIncidents = pgTable("quality_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: text("reference").notNull(), // INC-YYYY-NNN
  sessionId: varchar("session_id"),
  sessionTitle: text("session_title"),
  type: text("type").notNull().default("incident"), // incident | reclamation | non_conformite | amelioration
  severity: text("severity").notNull().default("minor"), // minor | major | critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  reportedBy: varchar("reported_by").notNull(),
  reportedByName: text("reported_by_name").notNull(),
  reportedAt: timestamp("reported_at").defaultNow(),
  category: text("category"), // pedagogique | administratif | technique | logistique | humain
  correctiveActions: jsonb("corrective_actions").$type<Array<{
    id: string;
    description: string;
    responsible: string;
    deadline: string;
    status: string; // pending | in_progress | done
    completedAt?: string;
  }>>().default([]),
  improvementAxes: jsonb("improvement_axes").$type<Array<{
    id: string;
    axis: string;
    description: string;
    priority: string; // low | medium | high
    status: string; // identified | in_progress | implemented
  }>>().default([]),
  rootCause: text("root_cause"),
  status: text("status").notNull().default("open"), // open | investigating | corrective_action | resolved | closed
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by"),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const veilleEntries = pgTable("veille_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("reglementaire"), // reglementaire | metier | pedagogique | technologique
  title: text("title").notNull(),
  description: text("description"),
  source: text("source"), // URL or reference
  publicationDate: date("publication_date"),
  impactLevel: text("impact_level").notNull().default("info"), // info | low | medium | high | critical
  status: text("status").notNull().default("new"), // new | analyzed | action_required | implemented | archived
  actionRequired: text("action_required"),
  actionDeadline: date("action_deadline"),
  assignedTo: varchar("assigned_to"),
  assignedToName: text("assigned_to_name"),
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// CERTIFICATIONS & BADGES
// ============================================================

export const digitalBadges = pgTable("digital_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  criteria: text("criteria"), // conditions to earn the badge
  programId: varchar("program_id"),
  sessionId: varchar("session_id"),
  type: text("type").notNull().default("completion"), // completion | skill | participation | excellence
  category: text("category"), // pedagogique | technique | transversal | securite
  level: text("level").default("bronze"), // bronze | silver | gold | platinum
  autoAward: boolean("auto_award").default(false),
  autoAwardCondition: text("auto_award_condition"), // e.g. "completion_100" | "score_above_80" | "attendance_100"
  linkedinShareable: boolean("linkedin_shareable").default(true),
  validityMonths: integer("validity_months"), // null = no expiry
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const badgeAwards = pgTable("badge_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  badgeId: varchar("badge_id").notNull(),
  traineeId: varchar("trainee_id").notNull(),
  traineeName: text("trainee_name").notNull(),
  sessionId: varchar("session_id"),
  sessionTitle: text("session_title"),
  awardedBy: varchar("awarded_by"), // null = auto
  awardedByName: text("awarded_by_name"),
  awardMethod: text("award_method").notNull().default("manual"), // manual | automatic
  status: text("status").notNull().default("active"), // active | revoked | expired
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  linkedinShared: boolean("linkedin_shared").default(false),
  linkedinShareUrl: text("linkedin_share_url"),
  verificationCode: text("verification_code"),
  notes: text("notes"),
  awardedAt: timestamp("awarded_at").defaultNow(),
});

// ============================================================
// GAMIFICATION POINTS
// ============================================================

export const gamificationPoints = pgTable("gamification_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  traineeId: varchar("trainee_id").notNull(),
  moduleId: varchar("module_id"),
  blockId: varchar("block_id"),
  sessionId: varchar("session_id"),
  eventType: text("event_type").notNull(),
  points: integer("points").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskLists = pgTable("task_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  sessionId: varchar("session_id"),
  programId: varchar("program_id"),
  traineeId: varchar("trainee_id"),
  traineeName: text("trainee_name"),
  assignedBy: varchar("assigned_by"),
  assignedByName: text("assigned_by_name"),
  type: text("type").notNull().default("manual"), // manual | auto | mixed
  status: text("status").notNull().default("in_progress"), // in_progress | completed | validated | cancelled
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  validatedBy: varchar("validated_by"),
  validatedByName: text("validated_by_name"),
  validatedAt: timestamp("validated_at"),
  progress: integer("progress").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskItems = pgTable("task_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskListId: varchar("task_list_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  checked: boolean("checked").default(false),
  checkMethod: text("check_method").notNull().default("manual"), // manual | automatic
  autoCondition: text("auto_condition"), // e.g. "module_completed:xxx" | "quiz_passed:xxx" | "attendance_present"
  checkedAt: timestamp("checked_at"),
  checkedBy: varchar("checked_by"),
  checkedByName: text("checked_by_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// ADVANCED FEATURES - AI & CESU
// ============================================================

export const aiDocumentAnalyses = pgTable("ai_document_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id"), // ref to userDocuments or trainerDocuments
  documentType: text("document_type").notNull(), // afgsu1 | afgsu2 | certibiocide | diplome | attestation | other
  documentName: text("document_name").notNull(),
  traineeId: varchar("trainee_id"),
  traineeName: text("trainee_name"),
  trainerId: varchar("trainer_id"),
  trainerName: text("trainer_name"),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed | manual_review
  extractedData: jsonb("extracted_data").$type<{
    validityDate?: string;
    issueDate?: string;
    holderName?: string;
    certificationNumber?: string;
    issuingOrganization?: string;
    certificationLevel?: string;
    additionalInfo?: Record<string, string>;
  }>(),
  confidence: integer("confidence").default(0), // 0-100
  validationResult: text("validation_result"), // valid | expired | invalid | inconclusive
  prerequisiteId: varchar("prerequisite_id"),
  prerequisiteValidated: boolean("prerequisite_validated").default(false),
  manualOverride: boolean("manual_override").default(false),
  manualOverrideBy: varchar("manual_override_by"),
  manualOverrideReason: text("manual_override_reason"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cesuSubmissions = pgTable("cesu_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  sessionTitle: text("session_title").notNull(),
  status: text("status").notNull().default("draft"), // draft | ready | submitted | confirmed | rejected
  submissionDate: timestamp("submission_date"),
  cesuReference: text("cesu_reference"),
  // Data compiled for CESU
  traineeCount: integer("trainee_count").default(0),
  trainees: jsonb("trainees").$type<Array<{
    traineeId: string;
    name: string;
    email?: string;
    phone?: string;
    diplomaType?: string;
    diplomaValid?: boolean;
    attendanceStatus?: string;
    attendancePercent?: number;
  }>>().default([]),
  attendanceSummary: jsonb("attendance_summary").$type<{
    totalSlots: number;
    averageAttendance: number;
    absentCount: number;
    presentCount: number;
  }>(),
  diplomaDocuments: jsonb("diploma_documents").$type<Array<{
    traineeId: string;
    traineeName: string;
    documentType: string;
    documentName: string;
    validityDate?: string;
    isValid: boolean;
  }>>().default([]),
  emargementReport: text("emargement_report"), // URL or reference to generated PDF
  excelDataUrl: text("excel_data_url"), // URL to generated Excel file
  notes: text("notes"),
  submittedBy: varchar("submitted_by"),
  submittedByName: text("submitted_by_name"),
  confirmedAt: timestamp("confirmed_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  requireSequential: boolean("require_sequential").default(true),
  pathType: text("path_type").notNull().default("combined"),
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
  quizConfig: jsonb("quiz_config").$type<{
    timerSeconds?: number;
    showOneAtATime?: boolean;
    passingScore?: number;
    allowRetry?: boolean;
  }>(),
  scormPackageId: varchar("scorm_package_id"),
  assignmentConfig: jsonb("assignment_config").$type<{
    instructions?: string;
    allowText?: boolean;
    allowFile?: boolean;
    maxFileSize?: number;
    dueDate?: string;
  }>(),
  // Flashcards data
  flashcards: jsonb("flashcards").$type<Array<{ front: string; back: string }>>(),
  // Resource web (iframe embed)
  embedUrl: text("embed_url"),
  embedCode: text("embed_code"),
  // Virtual class
  virtualClassUrl: text("virtual_class_url"),
  virtualClassDate: text("virtual_class_date"),
  // Document download
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  // Image / gallery
  imageUrls: jsonb("image_urls").$type<string[]>(),
  // Activity config (Digiforma-style)
  duration: integer("duration"),
  completionCondition: text("completion_condition").default("finished"),
  minScore: integer("min_score"),
  minViewPercent: integer("min_view_percent"),
  // Scenario (branching) config
  scenarioConfig: jsonb("scenario_config").$type<{
    startNodeId: string;
    nodes: Array<{
      id: string;
      situation: string;
      imageUrl?: string;
      choices: Array<{
        id: string;
        text: string;
        feedback: string;
        points: number;
        nextNodeId: string | null;
      }>;
    }>;
  }>(),
  // Linked Kahoot quiz (autopositionnement / evaluation)
  linkedQuizId: varchar("linked_quiz_id"),
  // Simulation (practical exercise) config
  isTemplate: boolean("is_template").default(false),
  simulationConfig: jsonb("simulation_config").$type<{
    subType: "ordering" | "matching" | "fill_blank" | "hotspot";
    instructions: string;
    orderingItems?: Array<{ id: string; text: string; correctPosition: number }>;
    matchingPairs?: Array<{ id: string; left: string; right: string }>;
    fillBlankText?: string;
    fillBlankAnswers?: Array<{ blankIndex: number; correctAnswer: string; alternatives?: string[] }>;
    wordBank?: string[];
    hotspotImageUrl?: string;
    hotspotZones?: Array<{ id: string; x: number; y: number; width: number; height: number; label: string; isCorrect: boolean }>;
    maxScore?: number;
    passingScore?: number;
    allowRetry?: boolean;
    showHintsAfterFail?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: varchar("block_id"),
  quizId: varchar("quiz_id"),
  question: text("question").notNull(),
  type: text("type").notNull().default("qcm"),
  options: jsonb("options").$type<string[]>().default([]),
  correctAnswer: integer("correct_answer").notNull().default(0),
  explanation: text("explanation"),
  orderIndex: integer("order_index").notNull().default(0),
  order: integer("order").notNull().default(0),
  timecode: integer("timecode"),
  timeLimit: integer("time_limit").notNull().default(20),
  points: integer("points").notNull().default(100),
  imageUrl: text("image_url"),
});

export const learnerProgress = pgTable("learner_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  traineeId: varchar("trainee_id").notNull(),
  moduleId: varchar("module_id").notNull(),
  blockId: varchar("block_id"),
  completed: boolean("completed").default(false),
  score: integer("score"),
  scenarioPath: jsonb("scenario_path").$type<Array<{
    nodeId: string;
    choiceId: string;
    points: number;
  }>>(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// SESSION RESOURCES & SCORM & FORMATIVE SUBMISSIONS
// ============================================================

export const sessionResources = pgTable("session_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("file"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  externalUrl: text("external_url"),
  orderIndex: integer("order_index").notNull().default(0),
  visible: boolean("visible").default(true),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scormPackages = pgTable("scorm_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  version: text("version").notNull().default("1.2"),
  fileName: text("file_name").notNull(),
  entryPoint: text("entry_point").notNull(),
  extractPath: text("extract_path").notNull(),
  fileSize: integer("file_size"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formativeSubmissions = pgTable("formative_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: varchar("block_id").notNull(),
  moduleId: varchar("module_id").notNull(),
  traineeId: varchar("trainee_id").notNull(),
  textContent: text("text_content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  status: text("status").notNull().default("submitted"),
  grade: integer("grade"),
  feedback: text("feedback"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  evaluationType: text("evaluation_type"),
  respondentType: text("respondent_type").default("trainee"),
  coldDelayDays: integer("cold_delay_days"),
  sections: jsonb("sections").$type<Array<{ title: string; type: "scored" | "open"; questionIndices: number[]; coefficient?: number }>>().default([]),
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
  respondentType: text("respondent_type").default("trainee"),
  respondentEmail: text("respondent_email"),
  respondentName: text("respondent_name"),
  evaluationType: text("evaluation_type"),
  weightedScore: integer("weighted_score"),
  assignmentId: varchar("assignment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evaluationAssignments = pgTable("evaluation_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  traineeId: varchar("trainee_id"),
  respondentType: text("respondent_type").notNull().default("trainee"),
  respondentEmail: text("respondent_email"),
  respondentName: text("respondent_name"),
  responseId: varchar("response_id"),
  status: text("status").notNull().default("pending"),
  token: varchar("token"),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  scheduledFor: timestamp("scheduled_for"),
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
  startTime: text("start_time"), // e.g. "09:00"
  endTime: text("end_time"), // e.g. "12:30"
  trainerId: varchar("trainer_id"),
  trainerSignatureData: text("trainer_signature_data"),
  trainerSignedAt: timestamp("trainer_signed_at"),
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
  signatureData: text("signature_data"),
  emargementToken: varchar("emargement_token"),
  lateArrivalTime: text("late_arrival_time"),
  earlyDepartureTime: text("early_departure_time"),
  // Double émargement (entrée + sortie) like Digiforma
  entrySignedAt: timestamp("entry_signed_at"),
  entrySignatureData: text("entry_signature_data"),
  exitSignedAt: timestamp("exit_signed_at"),
  exitSignatureData: text("exit_signature_data"),
  signatureType: text("signature_type").default("tablet"), // tablet, electronic, remote, manual
});

// ============================================================
// NEW TABLES - SESSION INTERVENTION DATES
// ============================================================

export const sessionDates = pgTable("session_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
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
  templateOverrides: jsonb("template_overrides").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automationLogs = pgTable("automation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull(),
  event: text("event").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("success"),
  targetType: text("target_type"),
  targetId: varchar("target_id"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  executedAt: timestamp("executed_at").defaultNow(),
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
  // AI validation fields
  status: text("status").default("pending"), // pending | analyzing | auto_valid | auto_invalid | manually_validated | rejected
  aiStatus: text("ai_status").default("pending"), // pending | processing | completed | failed
  aiExtractedDate: date("ai_extracted_date"),
  aiConfidence: text("ai_confidence"), // high | medium | low
  aiRawResponse: text("ai_raw_response"),
  aiAnalyzedAt: timestamp("ai_analyzed_at"),
  aiError: text("ai_error"),
  isManuallyValidated: boolean("is_manually_validated").default(false),
  validatedBy: varchar("validated_by"),
  validatedAt: timestamp("validated_at"),
  validationNotes: text("validation_notes"),
  linkedSessionId: varchar("linked_session_id"),
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

// ============================================================
// TRAINER AVAILABILITIES / DISPONIBILITES FORMATEURS
// ============================================================

export const trainerAvailabilities = pgTable("trainer_availabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  type: text("type").notNull().default("unavailable"), // "available" | "unavailable"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  startTime: text("start_time"), // "09:00" format, null = all day
  endTime: text("end_time"),     // "17:00" format, null = all day
  recurrence: text("recurrence"), // "none" | "weekly" | "monthly"
  reason: text("reason"),
  notes: text("notes"),
  createdBy: text("created_by"), // "trainer" | "admin"
  createdAt: timestamp("created_at").defaultNow(),
});

export const AVAILABILITY_TYPES = [
  { value: "available", label: "Disponible" },
  { value: "unavailable", label: "Indisponible" },
] as const;

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
// FORUM / ESPACE COLLABORATIF
// ============================================================

export const forumPosts = pgTable("forum_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").default("learner"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const forumReplies = pgTable("forum_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").default("learner"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forumMutes = pgTable("forum_mutes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// KAHOOT-STYLE QUIZ SYSTEM (Autopositionnement)
// ============================================================

export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  programId: varchar("program_id"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull(),
  sessionId: varchar("session_id"), // linked training session (optional)
  code: varchar("code", { length: 6 }).notNull(), // 6-digit join code
  status: text("status").notNull().default("waiting"), // waiting | active | showing_results | finished
  currentQuestionIndex: integer("current_question_index").notNull().default(-1),
  questionStartedAt: timestamp("question_started_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizParticipants = pgTable("quiz_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizSessionId: varchar("quiz_session_id").notNull(),
  pseudo: text("pseudo").notNull(),
  traineeId: varchar("trainee_id"), // optional link to real trainee
  score: integer("score").notNull().default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizSessionId: varchar("quiz_session_id").notNull(),
  questionId: varchar("question_id").notNull(),
  participantId: varchar("participant_id").notNull(),
  answer: integer("answer").notNull(), // index chosen
  answeredAt: timestamp("answered_at").defaultNow(),
  isCorrect: boolean("is_correct").notNull().default(false),
  points: integer("points").notNull().default(0),
  responseTimeMs: integer("response_time_ms"), // how fast they answered
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
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true, completedAt: true, waitlistedAt: true });
export const insertProgramPrerequisiteSchema = createInsertSchema(programPrerequisites).omit({ id: true });
export const insertTraineeCertificationSchema = createInsertSchema(traineeCertifications).omit({ id: true });

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true, trackingId: true, openedAt: true, openCount: true });
export const insertEmailTrackingEventSchema = createInsertSchema(emailTrackingEvents).omit({ id: true, openedAt: true });
export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({ id: true, createdAt: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentHeaderFooterSchema = createInsertSchema(documentHeaderFooters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({ id: true, createdAt: true });
export const insertProspectSchema = createInsertSchema(prospects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertPaymentScheduleSchema = createInsertSchema(paymentSchedules).omit({ id: true, createdAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true });
export const insertConnectionLogSchema = createInsertSchema(connectionLogs).omit({ id: true, connectedAt: true });
export const insertElearningModuleSchema = createInsertSchema(elearningModules).omit({ id: true, createdAt: true });
export const insertElearningBlockSchema = createInsertSchema(elearningBlocks).omit({ id: true, createdAt: true });
export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({ id: true });
export const insertLearnerProgressSchema = createInsertSchema(learnerProgress).omit({ id: true, createdAt: true });
export const insertSessionResourceSchema = createInsertSchema(sessionResources).omit({ id: true, createdAt: true });
export const insertScormPackageSchema = createInsertSchema(scormPackages).omit({ id: true, createdAt: true });
export const insertFormativeSubmissionSchema = createInsertSchema(formativeSubmissions).omit({ id: true, submittedAt: true, updatedAt: true });
export const insertGamificationPointsSchema = createInsertSchema(gamificationPoints).omit({ id: true, createdAt: true });
export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({ id: true, createdAt: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, createdAt: true });
export const insertEvaluationAssignmentSchema = createInsertSchema(evaluationAssignments).omit({ id: true, createdAt: true });
export const insertQualityActionSchema = createInsertSchema(qualityActions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendanceSheetSchema = createInsertSchema(attendanceSheets).omit({ id: true, createdAt: true });
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({ id: true });
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, createdAt: true });
export const insertAutomationLogSchema = createInsertSchema(automationLogs).omit({ id: true, executedAt: true });
export const insertOrganizationSettingSchema = createInsertSchema(organizationSettings).omit({ id: true, updatedAt: true });
export const insertEnterpriseContactSchema = createInsertSchema(enterpriseContacts).omit({ id: true, createdAt: true });
export const insertTrainerDocumentSchema = createInsertSchema(trainerDocuments).omit({ id: true, uploadedAt: true });
export const insertTrainerEvaluationSchema = createInsertSchema(trainerEvaluations).omit({ id: true, createdAt: true });
export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({ id: true, uploadedAt: true });
export const insertSignatureSchema = createInsertSchema(signatures).omit({ id: true, signedAt: true });
export const insertExpenseNoteSchema = createInsertSchema(expenseNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainerInvoiceSchema = createInsertSchema(trainerInvoices).omit({ id: true, createdAt: true, updatedAt: true, submittedAt: true });
export const insertTrainerAvailabilitySchema = createInsertSchema(trainerAvailabilities).omit({ id: true, createdAt: true });
export const insertTrainerCompetencySchema = createInsertSchema(trainerCompetencies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertForumPostSchema = createInsertSchema(forumPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertForumReplySchema = createInsertSchema(forumReplies).omit({ id: true, createdAt: true });
export const insertForumMuteSchema = createInsertSchema(forumMutes).omit({ id: true, createdAt: true });

export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuizSessionSchema = createInsertSchema(quizSessions).omit({ id: true, createdAt: true });
export const insertQuizParticipantSchema = createInsertSchema(quizParticipants).omit({ id: true, joinedAt: true });
export const insertQuizAnswerSchema = createInsertSchema(quizAnswers).omit({ id: true, answeredAt: true });

// ============================================================
// ANALYSIS COMMENTS (post-évaluation)
// ============================================================

export const analysisComments = pgTable("analysis_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  surveyId: varchar("survey_id"),
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  visibility: text("visibility").notNull().default("private"), // "private" | "public"
  category: text("category").notNull().default("analysis"), // "analysis" | "improvement" | "observation"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAnalysisCommentSchema = createInsertSchema(analysisComments).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================
// MESSAGING (messagerie intégrée)
// ============================================================

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().default("direct"), // "direct" | "group"
  title: text("title"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").default("trainee"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").default("trainee"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({ id: true, joinedAt: true });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true, createdAt: true });

// ============================================================
// NOTIFICATIONS
// ============================================================

export const NOTIFICATION_CATEGORIES = [
  { value: "message", label: "Messages", icon: "MessageSquare" },
  { value: "session", label: "Sessions", icon: "CalendarCheck" },
  { value: "enrollment", label: "Inscriptions", icon: "UserPlus" },
  { value: "document", label: "Documents", icon: "FileText" },
  { value: "signature", label: "Signatures", icon: "PenTool" },
  { value: "evaluation", label: "Évaluations", icon: "ClipboardList" },
  { value: "task", label: "Missions", icon: "CheckSquare" },
  { value: "badge", label: "Badges", icon: "Award" },
  { value: "reminder", label: "Rappels", icon: "Bell" },
  { value: "system", label: "Système", icon: "Info" },
] as const;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // destinataire
  category: text("category").notNull().default("system"), // message | session | enrollment | document | signature | evaluation | task | badge | reminder | system
  title: text("title").notNull(),
  description: text("description"),
  href: text("href"), // lien de redirection
  read: boolean("read").notNull().default(false),
  relatedId: varchar("related_id"), // ID de l'objet lié (message, session, etc.)
  relatedType: text("related_type"), // type de l'objet lié
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================
// CRM & MARKETING
// ============================================================

export const contactTags = pgTable("contact_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  category: text("category").notNull().default("general"), // "profession" | "sector" | "interest" | "source" | "general"
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactTagAssignments = pgTable("contact_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tagId: varchar("tag_id").notNull(),
  contactType: text("contact_type").notNull(), // "trainee" | "enterprise" | "prospect"
  contactId: varchar("contact_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // "draft" | "scheduled" | "sent" | "cancelled"
  targetType: text("target_type").notNull().default("all"), // "all" | "tag" | "manual"
  targetTagIds: jsonb("target_tag_ids").$type<string[]>().default([]),
  targetContactType: text("target_contact_type").default("trainee"), // "trainee" | "enterprise" | "prospect" | "all"
  manualEmails: jsonb("manual_emails").$type<string[]>().default([]),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  openedCount: integer("opened_count").default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaignRecipients = pgTable("campaign_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  contactType: text("contact_type"), // "trainee" | "enterprise" | "prospect"
  contactId: varchar("contact_id"),
  status: text("status").notNull().default("pending"), // "pending" | "sent" | "opened" | "failed"
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
});

export const prospectActivities = pgTable("prospect_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectId: varchar("prospect_id").notNull(),
  type: text("type").notNull(), // "call" | "email" | "meeting" | "note" | "status_change" | "quote"
  description: text("description").notNull(),
  authorId: varchar("author_id"),
  authorName: text("author_name"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactTagSchema = createInsertSchema(contactTags).omit({ id: true, createdAt: true });
export const insertContactTagAssignmentSchema = createInsertSchema(contactTagAssignments).omit({ id: true, createdAt: true });
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignRecipientSchema = createInsertSchema(campaignRecipients).omit({ id: true });
export const insertProspectActivitySchema = createInsertSchema(prospectActivities).omit({ id: true, createdAt: true });
export const insertAbsenceRecordSchema = createInsertSchema(absenceRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQualityIncidentSchema = createInsertSchema(qualityIncidents).omit({ id: true, createdAt: true, updatedAt: true, reportedAt: true });
export const insertVeilleEntrySchema = createInsertSchema(veilleEntries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDigitalBadgeSchema = createInsertSchema(digitalBadges).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBadgeAwardSchema = createInsertSchema(badgeAwards).omit({ id: true, awardedAt: true });
export const insertTaskListSchema = createInsertSchema(taskLists).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskItemSchema = createInsertSchema(taskItems).omit({ id: true, createdAt: true });
export const insertAiDocumentAnalysisSchema = createInsertSchema(aiDocumentAnalyses).omit({ id: true, createdAt: true });
export const insertCesuSubmissionSchema = createInsertSchema(cesuSubmissions).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================
// INTEGRATION SITE INTERNET (SSO, API Keys, Widget)
// ============================================================

export const ssoTokens = pgTable("sso_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  key: varchar("key").notNull().unique(),
  permissions: text("permissions").array().default([]),
  active: boolean("active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const widgetConfigurations = pgTable("widget_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  apiKeyId: varchar("api_key_id").notNull(),
  allowedOrigins: text("allowed_origins").array().default([]),
  theme: jsonb("theme").$type<{ primaryColor: string; fontFamily: string; borderRadius: string }>().default({ primaryColor: "#2563eb", fontFamily: "system-ui", borderRadius: "8px" }),
  displayMode: varchar("display_mode").default("list"),
  showFilters: boolean("show_filters").default(true),
  maxItems: integer("max_items").default(10),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSsoTokenSchema = createInsertSchema(ssoTokens).omit({ id: true, createdAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertWidgetConfigurationSchema = createInsertSchema(widgetConfigurations).omit({ id: true, createdAt: true });

// ============================================================
// CONTRAINTES TECHNIQUES (Audit, RGPD)
// ============================================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userName: text("user_name"),
  userRole: text("user_role"),
  action: text("action").notNull(), // "create" | "update" | "delete" | "login" | "logout" | "export" | "print" | "view"
  entityType: text("entity_type").notNull(), // "trainee" | "session" | "enrollment" | "document" | "invoice" ...
  entityId: varchar("entity_id"),
  entityLabel: text("entity_label"),
  details: jsonb("details").$type<Record<string, any>>().default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rgpdRequests = pgTable("rgpd_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestType: text("request_type").notNull(), // "export" | "anonymize" | "delete"
  targetType: text("target_type").notNull(), // "trainee" | "trainer" | "user"
  targetId: varchar("target_id").notNull(),
  targetName: text("target_name").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "processing" | "completed" | "rejected"
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertRgpdRequestSchema = createInsertSchema(rgpdRequests).omit({ id: true, createdAt: true });

// ============================================================
// MIGRATION & ARCHIVAGE
// ============================================================

export const dataImports = pgTable("data_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull().default("digiforma"), // "digiforma" | "csv" | "other"
  entityType: text("entity_type").notNull(), // "trainee" | "trainer" | "program" | "session" | "enrollment" | "enterprise"
  fileName: text("file_name").notNull(),
  totalRows: integer("total_rows").default(0),
  importedRows: integer("imported_rows").default(0),
  skippedRows: integer("skipped_rows").default(0),
  errorRows: integer("error_rows").default(0),
  status: text("status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed"
  errors: jsonb("errors").$type<Array<{ row: number; field: string; message: string }>>().default([]),
  importedBy: varchar("imported_by").notNull(),
  importedByName: text("imported_by_name").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dataArchives = pgTable("data_archives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // "session" | "enrollment" | "attendance" | "invoice" | "document"
  entityId: varchar("entity_id").notNull(),
  entityLabel: text("entity_label").notNull(),
  archiveDate: timestamp("archive_date").defaultNow(),
  retentionYears: integer("retention_years").notNull().default(10),
  expiresAt: timestamp("expires_at").notNull(),
  archivedBy: varchar("archived_by"),
  archivedByName: text("archived_by_name"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  status: text("status").notNull().default("active"), // "active" | "expired" | "deleted"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDataImportSchema = createInsertSchema(dataImports).omit({ id: true, createdAt: true });
export const insertDataArchiveSchema = createInsertSchema(dataArchives).omit({ id: true, createdAt: true });
export const insertSessionDateSchema = createInsertSchema(sessionDates).omit({ id: true, createdAt: true });

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
export type InsertEmailTrackingEvent = z.infer<typeof insertEmailTrackingEventSchema>;
export type EmailTrackingEvent = typeof emailTrackingEvents.$inferSelect;
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;
export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentHeaderFooter = z.infer<typeof insertDocumentHeaderFooterSchema>;
export type DocumentHeaderFooter = typeof documentHeaderFooters.$inferSelect;
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
export type InsertPaymentSchedule = z.infer<typeof insertPaymentScheduleSchema>;
export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertConnectionLog = z.infer<typeof insertConnectionLogSchema>;
export type ConnectionLog = typeof connectionLogs.$inferSelect;
export type InsertElearningModule = z.infer<typeof insertElearningModuleSchema>;
export type ElearningModule = typeof elearningModules.$inferSelect;
export type InsertElearningBlock = z.infer<typeof insertElearningBlockSchema>;
export type ElearningBlock = typeof elearningBlocks.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertLearnerProgress = z.infer<typeof insertLearnerProgressSchema>;
export type LearnerProgress = typeof learnerProgress.$inferSelect;
export type InsertSessionResource = z.infer<typeof insertSessionResourceSchema>;
export type SessionResource = typeof sessionResources.$inferSelect;
export type InsertScormPackage = z.infer<typeof insertScormPackageSchema>;
export type ScormPackage = typeof scormPackages.$inferSelect;
export type InsertFormativeSubmission = z.infer<typeof insertFormativeSubmissionSchema>;
export type FormativeSubmission = typeof formativeSubmissions.$inferSelect;
export type InsertGamificationPoints = z.infer<typeof insertGamificationPointsSchema>;
export type GamificationPoints = typeof gamificationPoints.$inferSelect;
export type InsertSurveyTemplate = z.infer<typeof insertSurveyTemplateSchema>;
export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertEvaluationAssignment = z.infer<typeof insertEvaluationAssignmentSchema>;
export type EvaluationAssignment = typeof evaluationAssignments.$inferSelect;
export type InsertQualityAction = z.infer<typeof insertQualityActionSchema>;
export type QualityAction = typeof qualityActions.$inferSelect;
export type InsertAttendanceSheet = z.infer<typeof insertAttendanceSheetSchema>;
export type AttendanceSheet = typeof attendanceSheets.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationLog = z.infer<typeof insertAutomationLogSchema>;
export type AutomationLog = typeof automationLogs.$inferSelect;
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
export type InsertTrainerAvailability = z.infer<typeof insertTrainerAvailabilitySchema>;
export type TrainerAvailability = typeof trainerAvailabilities.$inferSelect;
export type InsertTrainerCompetency = z.infer<typeof insertTrainerCompetencySchema>;
export type TrainerCompetency = typeof trainerCompetencies.$inferSelect;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumMute = z.infer<typeof insertForumMuteSchema>;
export type ForumMute = typeof forumMutes.$inferSelect;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizParticipant = typeof quizParticipants.$inferSelect;
export type InsertQuizParticipant = z.infer<typeof insertQuizParticipantSchema>;
export type QuizAnswer = typeof quizAnswers.$inferSelect;
export type InsertQuizAnswer = z.infer<typeof insertQuizAnswerSchema>;
export type InsertAnalysisComment = z.infer<typeof insertAnalysisCommentSchema>;
export type AnalysisComment = typeof analysisComments.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertContactTag = z.infer<typeof insertContactTagSchema>;
export type ContactTag = typeof contactTags.$inferSelect;
export type InsertContactTagAssignment = z.infer<typeof insertContactTagAssignmentSchema>;
export type ContactTagAssignment = typeof contactTagAssignments.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertProspectActivity = z.infer<typeof insertProspectActivitySchema>;
export type ProspectActivity = typeof prospectActivities.$inferSelect;
export type InsertAbsenceRecord = z.infer<typeof insertAbsenceRecordSchema>;
export type AbsenceRecord = typeof absenceRecords.$inferSelect;
export type InsertQualityIncident = z.infer<typeof insertQualityIncidentSchema>;
export type QualityIncident = typeof qualityIncidents.$inferSelect;
export type InsertVeilleEntry = z.infer<typeof insertVeilleEntrySchema>;
export type VeilleEntry = typeof veilleEntries.$inferSelect;
export type InsertDigitalBadge = z.infer<typeof insertDigitalBadgeSchema>;
export type DigitalBadge = typeof digitalBadges.$inferSelect;
export type InsertBadgeAward = z.infer<typeof insertBadgeAwardSchema>;
export type BadgeAward = typeof badgeAwards.$inferSelect;
export type InsertTaskList = z.infer<typeof insertTaskListSchema>;
export type TaskList = typeof taskLists.$inferSelect;
export type InsertTaskItem = z.infer<typeof insertTaskItemSchema>;
export type TaskItem = typeof taskItems.$inferSelect;
export type InsertAiDocumentAnalysis = z.infer<typeof insertAiDocumentAnalysisSchema>;
export type AiDocumentAnalysis = typeof aiDocumentAnalyses.$inferSelect;
export type InsertCesuSubmission = z.infer<typeof insertCesuSubmissionSchema>;
export type CesuSubmission = typeof cesuSubmissions.$inferSelect;
export type InsertSsoToken = z.infer<typeof insertSsoTokenSchema>;
export type SsoToken = typeof ssoTokens.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertWidgetConfiguration = z.infer<typeof insertWidgetConfigurationSchema>;
export type WidgetConfiguration = typeof widgetConfigurations.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertRgpdRequest = z.infer<typeof insertRgpdRequestSchema>;
export type RgpdRequest = typeof rgpdRequests.$inferSelect;
export type InsertDataImport = z.infer<typeof insertDataImportSchema>;
export type DataImport = typeof dataImports.$inferSelect;
export type InsertDataArchive = z.infer<typeof insertDataArchiveSchema>;
export type DataArchive = typeof dataArchives.$inferSelect;
export type InsertSessionDate = z.infer<typeof insertSessionDateSchema>;
export type SessionDate = typeof sessionDates.$inferSelect;

// ============================================================
// CONSTANTS
// ============================================================

export const PROGRAM_CATEGORIES = [
  // Prévention des risques (hygiène, sécurité, soins, physiques, psychosociaux)
  "Urgences", "AFGSU", "SST - Sauveteur Secouriste du Travail",
  "Incendie et évacuation", "Hygiène", "Certibiocide",
  "Prévention des risques", "Gestes et postures", "Sécurité au travail",
  "Risques psychosociaux",
  // Sanitaire et médico-social
  "Soins infirmiers", "Pharmacie", "Certificat de décès",
  "Gériatrie", "Pédiatrie", "Santé mentale",
  "Douleur et soins palliatifs", "Fin de vie et accompagnement",
  "Bientraitance et droits des patients",
  "Nutrition et troubles alimentaires", "Plaies et cicatrisation",
  "Infectiologie et hygiène hospitalière",
  "Handicap et accompagnement",
  "Alzheimer et troubles neurodégénératifs",
  "Relation patient / famille",
  "Education thérapeutique du patient",
  "Transfusion sanguine",
  // Management et qualité
  "Management santé", "Qualité et gestion des risques",
  "Cadre réglementaire sanitaire",
  // Dispositifs et certifications
  "DPC", "VAE",
  // Publics cibles
  "Infirmière", "Aide-soignant", "Médecin", "Sage-femme",
  "Kinésithérapeute", "Personnel administratif", "Cadre de santé",
  "Tout public santé",
  // Autre
  "Autre",
] as const;

export const PROGRAM_CATEGORY_GROUPS = [
  {
    label: "Prévention des risques",
    categories: ["Urgences", "AFGSU", "SST - Sauveteur Secouriste du Travail",
      "Incendie et évacuation", "Hygiène", "Certibiocide",
      "Prévention des risques", "Gestes et postures", "Sécurité au travail",
      "Risques psychosociaux"],
  },
  {
    label: "Sanitaire et médico-social",
    categories: ["Soins infirmiers", "Pharmacie", "Certificat de décès",
      "Gériatrie", "Pédiatrie", "Santé mentale",
      "Douleur et soins palliatifs", "Fin de vie et accompagnement",
      "Bientraitance et droits des patients",
      "Nutrition et troubles alimentaires", "Plaies et cicatrisation",
      "Infectiologie et hygiène hospitalière",
      "Handicap et accompagnement",
      "Alzheimer et troubles neurodégénératifs",
      "Relation patient / famille",
      "Education thérapeutique du patient",
      "Transfusion sanguine"],
  },
  {
    label: "Management et qualité",
    categories: ["Management santé", "Qualité et gestion des risques",
      "Cadre réglementaire sanitaire"],
  },
  {
    label: "Dispositifs et certifications",
    categories: ["DPC", "VAE"],
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
  { value: "signature_electronique", label: "E-mails de signature électronique" },
  { value: "signature_contrat_cadre", label: "E-mails de signature électronique (Contrat cadre)" },
  { value: "clients", label: "E-mails pour les clients" },
  { value: "factures_devis", label: "E-mails de factures et devis" },
  { value: "intervenants", label: "E-mails pour intervenants" },
  { value: "apprenants", label: "E-mails pour apprenants" },
  { value: "financeurs_externes", label: "E-mails pour financeurs externes" },
  { value: "evaluations", label: "Évaluations" },
  { value: "catalogue_en_ligne", label: "Catalogue en ligne" },
] as const;

export const EMAIL_TEMPLATE_TYPES = [
  { value: "manual", label: "Manuel" },
  { value: "automatic", label: "Automatique" },
] as const;

export const SMS_TEMPLATE_CATEGORIES = [
  { value: "convocation", label: "Convocation" },
  { value: "confirmation", label: "Confirmation" },
  { value: "rappel", label: "Rappel" },
  { value: "urgent", label: "Urgent" },
  { value: "general", label: "Général" },
] as const;

export const DOCUMENT_VISIBILITY = [
  { value: "admin_only", label: "Admin uniquement" },
  { value: "enterprise", label: "Visible par l'entreprise" },
  { value: "trainee", label: "Visible par le stagiaire" },
  { value: "all", label: "Visible par tous" },
] as const;

export const DOCUMENT_STATUSES = [
  { value: "generated", label: "Généré" },
  { value: "shared", label: "Partagé" },
  { value: "sent", label: "Envoyé" },
  { value: "signed", label: "Signé" },
  { value: "archived", label: "Archivé" },
] as const;

export const DOCUMENT_TYPES = [
  { value: "convention", label: "Convention de formation" },
  { value: "contrat_particulier", label: "Contrat particulier" },
  { value: "contrat_vae", label: "Contrat VAE" },
  { value: "politique_confidentialite", label: "Politique de confidentialité" },
  { value: "devis", label: "Devis" },
  { value: "devis_sous_traitance", label: "Devis sous-traitance" },
  { value: "convention_intervention", label: "Convention d'intervention formateur" },
  { value: "contrat_cadre", label: "Contrat cadre de sous-traitance" },
  { value: "facture", label: "Facture" },
  { value: "facture_blended", label: "Facture formation blended" },
  { value: "facture_specifique", label: "Facture formation spécifique" },
  { value: "convocation", label: "Convocation" },
  { value: "attestation", label: "Attestation de formation" },
  { value: "certificat", label: "Certificat" },
  { value: "bpf", label: "Bilan Pédagogique et Financier" },
  { value: "programme", label: "Programme de formation" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "cgv", label: "Conditions Générales de Vente (CGV)" },
  { value: "etiquette_envoi", label: "Étiquette d'envoi postal" },
  { value: "certificat_realisation", label: "Certificat de réalisation" },
  { value: "attestation_assiduite", label: "Attestation d'assiduité" },
  { value: "attestation_dpc", label: "Attestation DPC" },
  { value: "attestation_fifpl", label: "Attestation FIFPL" },
  { value: "admissibilite_vae", label: "Admissibilité VAE" },
  { value: "autorisation_image", label: "Autorisation d'exploitation d'image" },
  { value: "autre", label: "Autre" },
  { value: "fiche_fipl", label: "Fiche FIPL" },
  { value: "rapport_emargement", label: "Rapport d'émargement" },
  { value: "livret_accueil", label: "Livret d'accueil" },
  { value: "badge", label: "Badge de réussite" },
  { value: "questionnaire_satisfaction", label: "Questionnaire de satisfaction" },
  { value: "evaluation_pre_formation", label: "Évaluation pré-formation" },
  { value: "evaluation_acquis", label: "Évaluation des acquis" },
  { value: "protocole_individuel", label: "Protocole individuel de formation" },
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
  { value: "early_departure", label: "Départ anticipé", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
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
  { value: "video_quiz", label: "Vidéo + Questions" },
  { value: "scorm", label: "Module SCORM" },
  { value: "assignment", label: "Réalisation (travail apprenant)" },
  { value: "flashcard", label: "Flashcards" },
  { value: "resource_web", label: "Ressource web (iframe)" },
  { value: "virtual_class", label: "Classe virtuelle" },
  { value: "document", label: "Document téléchargeable" },
  { value: "image", label: "Image / Galerie" },
  { value: "survey", label: "Sondage (non noté)" },
  { value: "scenario", label: "Scénario à embranchements" },
  { value: "simulation", label: "Mise en situation (exercice pratique)" },
  { value: "kahoot", label: "Quiz interactif (Autopositionnement)" },
] as const;

export const GAMIFICATION_LEVELS = [
  { name: "Débutant", minXP: 0, badge: "bronze" },
  { name: "Apprenti", minXP: 200, badge: "bronze" },
  { name: "Confirmé", minXP: 500, badge: "silver" },
  { name: "Expert", minXP: 1000, badge: "gold" },
  { name: "Maître", minXP: 2000, badge: "platinum" },
] as const;

export const XP_REWARDS = {
  block_complete: 10,
  quiz_pass: 20,
  quiz_perfect: 50,
  scenario_complete: 30,
  module_complete: 50,
  streak_bonus: 15,
  first_try_bonus: 25,
  simulation_complete: 25,
} as const;

export const AUTOMATION_EVENTS = [
  { value: "enrollment_created", label: "Nouvelle inscription" },
  { value: "enrollment_confirmed", label: "Inscription confirmée" },
  { value: "enrollment_completed", label: "Formation terminée" },
  { value: "enrollment_cancelled", label: "Inscription annulée" },
  { value: "session_starting", label: "Début de session" },
  { value: "session_completed", label: "Fin de session" },
  { value: "invoice_created", label: "Facture créée" },
  { value: "payment_received", label: "Paiement reçu" },
  { value: "survey_completed", label: "Enquête complétée" },
  { value: "quote_signed", label: "Devis signé" },
  { value: "convention_signed", label: "Convention signée" },
  { value: "absence_detected", label: "Absence détectée" },
  { value: "session_reminder_7d", label: "Rappel session J-7" },
  { value: "session_reminder_3d", label: "Rappel session J-3" },
  { value: "session_reminder_1d", label: "Rappel session J-1" },
  { value: "post_session_followup", label: "Suivi post-formation J+1" },
  { value: "certification_expiring_90d", label: "Certification expire dans 90j" },
  { value: "certification_expiring_30d", label: "Certification expire dans 30j" },
  { value: "recycling_reminder_10m", label: "Relance recyclage M-10" },
  { value: "recycling_reminder_6m", label: "Relance recyclage M-6" },
  { value: "recycling_reminder_2m", label: "Relance recyclage M-2" },
] as const;

export const AUTOMATION_ACTIONS = [
  { value: "send_email", label: "Envoyer un email" },
  { value: "generate_document", label: "Générer un document" },
  { value: "create_attendance", label: "Créer une feuille d'émargement" },
  { value: "send_survey", label: "Envoyer une enquête de satisfaction" },
  { value: "send_email_enterprise", label: "Envoyer un email à l'entreprise" },
  { value: "generate_document_and_send", label: "Générer et envoyer un document" },
  { value: "create_invoice", label: "Créer une facture" },
  { value: "block_certificate", label: "Bloquer le certificat" },
  { value: "generate_convention", label: "Générer une convention de formation" },
  { value: "generate_attestation_presence", label: "Générer attestation/certificat (si présent)" },
  { value: "send_sms", label: "Envoyer un SMS" },
  { value: "send_sms_enterprise", label: "Envoyer un SMS à l'entreprise" },
  { value: "send_evaluation", label: "Envoyer une évaluation" },
  { value: "generate_convocation", label: "Générer et envoyer une convocation" },
] as const;

export const EVALUATION_TYPES = [
  { value: "pre_formation", label: "Évaluation pré-formation (autopositionnement)" },
  { value: "satisfaction_hot", label: "Satisfaction à chaud" },
  { value: "evaluation_cold", label: "Évaluation à froid" },
  { value: "trainer_eval", label: "Évaluation de l'intervenant" },
  { value: "manager_eval", label: "Évaluation du manager" },
  { value: "commissioner_eval", label: "Évaluation du commanditaire" },
] as const;

export const DEFAULT_EVALUATION_QUESTIONS: Record<string, Array<{ question: string; type: string; options?: string[] }>> = {
  pre_formation: [
    { question: "Comment evaluez-vous votre niveau de connaissance actuel sur le sujet de la formation ?", type: "rating" },
    { question: "A quel point vous sentez-vous a l'aise avec les pratiques liees a cette thematique ?", type: "rating" },
    { question: "Quelles sont vos attentes principales pour cette formation ?", type: "text" },
    { question: "Avez-vous deja suivi une formation sur ce sujet ? Si oui, laquelle ?", type: "text" },
    { question: "Comment evaluez-vous votre capacite actuelle a appliquer ces competences dans votre pratique ?", type: "rating" },
  ],
  satisfaction_hot: [
    { question: "La formation a-t-elle repondu a vos attentes ?", type: "rating" },
    { question: "Comment evaluez-vous la qualite du contenu pedagogique ?", type: "rating" },
    { question: "Comment evaluez-vous la qualite de l'animation / du formateur ?", type: "rating" },
    { question: "Les supports pedagogiques etaient-ils adaptes ?", type: "rating" },
    { question: "L'organisation logistique etait-elle satisfaisante ?", type: "rating" },
    { question: "Recommanderiez-vous cette formation a un collegue ?", type: "rating" },
    { question: "Quels aspects de la formation avez-vous le plus apprecies ?", type: "text" },
    { question: "Quels points pourraient etre ameliores ?", type: "text" },
  ],
  evaluation_cold: [
    { question: "Avez-vous pu mettre en pratique les connaissances acquises lors de la formation ?", type: "rating" },
    { question: "La formation a-t-elle eu un impact positif sur votre pratique professionnelle ?", type: "rating" },
    { question: "Estimez-vous que vos competences se sont ameliorees suite a la formation ?", type: "rating" },
    { question: "Pouvez-vous donner un exemple concret d'application des acquis dans votre travail ?", type: "text" },
    { question: "Avez-vous rencontre des difficultes dans la mise en oeuvre des acquis ?", type: "rating" },
    { question: "Quels freins avez-vous rencontres pour appliquer les connaissances acquises ?", type: "text" },
    { question: "Quels besoins complementaires de formation identifiez-vous ?", type: "text" },
  ],
  trainer_eval: [
    { question: "Le formateur maitrisait-il le sujet ?", type: "rating" },
    { question: "Le formateur a-t-il su rendre le contenu accessible et clair ?", type: "rating" },
    { question: "Le formateur a-t-il favorise les echanges et la participation ?", type: "rating" },
    { question: "Le formateur a-t-il su adapter son approche au groupe ?", type: "rating" },
    { question: "La gestion du temps par le formateur etait-elle satisfaisante ?", type: "rating" },
    { question: "Avez-vous des commentaires sur la prestation du formateur ?", type: "text" },
  ],
  manager_eval: [
    { question: "Avez-vous observe des changements dans la pratique professionnelle du collaborateur suite a la formation ?", type: "rating" },
    { question: "La formation a-t-elle repondu aux besoins identifies pour ce collaborateur ?", type: "rating" },
    { question: "Le collaborateur applique-t-il les competences acquises dans son travail quotidien ?", type: "rating" },
    { question: "Quels changements concrets avez-vous observes ?", type: "text" },
    { question: "Des besoins complementaires de formation sont-ils identifies ?", type: "text" },
  ],
  commissioner_eval: [
    { question: "La formation a-t-elle repondu aux objectifs definis initialement ?", type: "rating" },
    { question: "Etes-vous satisfait de l'organisation globale de la formation ?", type: "rating" },
    { question: "La qualite de la prestation etait-elle conforme a vos attentes ?", type: "rating" },
    { question: "Le rapport qualite/prix de la formation est-il satisfaisant ?", type: "rating" },
    { question: "Quels aspects de la collaboration souhaiteriez-vous ameliorer ?", type: "text" },
    { question: "Envisagez-vous de reconduire cette formation ou d'autres formations avec notre organisme ?", type: "text" },
  ],
};

export const DEFAULT_QUIZ_QUESTIONS: Record<string, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
  "Urgences": [
    { question: "Quel est le numero d'appel du SAMU ?", options: ["15", "18", "17", "112"], correctAnswer: 0 },
    { question: "Quelle est la premiere action a realiser face a une victime inconsciente qui respire ?", options: ["La mettre en PLS", "Faire un massage cardiaque", "Lui donner a boire", "La secouer"], correctAnswer: 0 },
    { question: "Quel est le rythme recommande pour les compressions thoraciques chez l'adulte ?", options: ["80 par minute", "100 a 120 par minute", "60 par minute", "140 par minute"], correctAnswer: 1 },
    { question: "Que signifie le sigle DSA ?", options: ["Defibrillateur Semi-Automatique", "Dispositif de Secours Avance", "Defibrillateur Specialise Automatique", "Dispositif de Soin Ambulatoire"], correctAnswer: 0 },
    { question: "Quel geste permet de liberer les voies aeriennes ?", options: ["Bascule de la tete en arriere et elevation du menton", "Compression abdominale", "Ventilation bouche-a-bouche", "Position assise"], correctAnswer: 0 },
  ],
  "AFGSU": [
    { question: "Que signifie AFGSU ?", options: ["Attestation de Formation aux Gestes et Soins d'Urgence", "Association Francaise des Gestes de Secours Urgents", "Attestation Federale de Gestion des Soins Urgents", "Autorisation de Formation Generale en Soins d'Urgence"], correctAnswer: 0 },
    { question: "Quelle est la duree de validite de l'AFGSU ?", options: ["2 ans", "4 ans", "5 ans", "10 ans"], correctAnswer: 1 },
    { question: "L'AFGSU de niveau 2 est destinee a quel public ?", options: ["Les professionnels de sante", "Le grand public", "Les pompiers uniquement", "Les medecins uniquement"], correctAnswer: 0 },
    { question: "Quel est le rapport compressions/insufflations chez l'adulte en RCP de base ?", options: ["30/2", "15/2", "20/2", "30/1"], correctAnswer: 0 },
    { question: "Face a une hemorragie externe, quel est le premier geste a effectuer ?", options: ["Compression directe sur la plaie", "Poser un garrot", "Allonger la victime", "Appeler le 15"], correctAnswer: 0 },
  ],
  "Hygiène": [
    { question: "Quelle est la duree minimale recommandee pour un lavage des mains avec du savon ?", options: ["10 secondes", "30 secondes", "1 minute", "5 secondes"], correctAnswer: 1 },
    { question: "Quel type de precautions s'applique a tous les patients sans exception ?", options: ["Precautions standard", "Precautions complementaires contact", "Precautions gouttelettes", "Precautions air"], correctAnswer: 0 },
    { question: "Que signifie le sigle BMR ?", options: ["Bacterie Multi-Resistante", "Bacterie a Mutation Rapide", "Bilan Microbiologique Regulier", "Base Medicale de Reference"], correctAnswer: 0 },
    { question: "Quel produit est recommande pour la friction hydro-alcoolique des mains ?", options: ["Solution hydro-alcoolique (SHA)", "Eau de Javel", "Betadine", "Savon surgras"], correctAnswer: 0 },
    { question: "Les dechets d'activites de soins a risques infectieux (DASRI) doivent etre elimines dans quel type de conteneur ?", options: ["Conteneur jaune specifique", "Poubelle noire classique", "Sac bleu de recyclage", "Conteneur vert"], correctAnswer: 0 },
  ],
  "Certibiocide": [
    { question: "Qu'est-ce qu'un produit biocide ?", options: ["Un produit destine a detruire ou repousser des organismes nuisibles", "Un medicament veterinaire", "Un complement alimentaire biologique", "Un engrais naturel"], correctAnswer: 0 },
    { question: "Le Certibiocide est obligatoire pour quelles activites ?", options: ["L'utilisation professionnelle de certains produits biocides", "La vente de produits alimentaires", "L'exercice de la medecine", "La conduite de vehicules"], correctAnswer: 0 },
    { question: "Quelle est la duree de validite du Certibiocide ?", options: ["5 ans", "3 ans", "10 ans", "Illimitee"], correctAnswer: 0 },
    { question: "Quel EPI est indispensable lors de la manipulation de produits biocides ?", options: ["Gants de protection adaptes", "Casquette", "Chaussures de ville", "Lunettes de soleil"], correctAnswer: 0 },
    { question: "Que doit contenir la fiche de donnees de securite (FDS) d'un produit biocide ?", options: ["Les dangers, les precautions d'emploi et les premiers secours", "Uniquement le prix du produit", "La liste des fournisseurs", "Le mode d'emploi culinaire"], correctAnswer: 0 },
  ],
  "Prévention des risques": [
    { question: "Que signifie le sigle DUERP ?", options: ["Document Unique d'Evaluation des Risques Professionnels", "Dossier Unifie d'Expertise des Ressources du Personnel", "Directive Universelle d'Encadrement des Risques Professionnels", "Declaration Unifiee d'Evaluation Reglementaire Professionnelle"], correctAnswer: 0 },
    { question: "Quelle est l'obligation de l'employeur en matiere de risques professionnels ?", options: ["Evaluer les risques et mettre en place des actions de prevention", "Ignorer les risques mineurs", "Deleguer entierement aux salaries", "Ne traiter que les accidents survenus"], correctAnswer: 0 },
    { question: "Qu'est-ce qu'un risque psychosocial (RPS) ?", options: ["Un risque lie au stress, harcelement ou violences au travail", "Un risque electrique", "Un risque lie aux produits chimiques", "Un risque de chute de hauteur"], correctAnswer: 0 },
    { question: "Quel organisme est charge de la prevention des risques professionnels en France ?", options: ["L'INRS", "L'INSEE", "L'INSERM", "L'INED"], correctAnswer: 0 },
    { question: "Quelle est la hierarchie des mesures de prevention des risques ?", options: ["Supprimer, reduire, proteger collectivement, proteger individuellement", "Proteger individuellement d'abord", "Former uniquement les salaries", "Ignorer les risques faibles"], correctAnswer: 0 },
  ],
  "Gestes et postures": [
    { question: "Quelle est la posture recommandee pour soulever une charge lourde ?", options: ["Plier les genoux, dos droit, charge pres du corps", "Dos courbe, jambes tendues", "Un seul bras, en rotation", "Debout jambes ecartees, dos arrondi"], correctAnswer: 0 },
    { question: "Que signifie le sigle TMS ?", options: ["Troubles Musculo-Squelettiques", "Traitements Medicaux Specifiques", "Technique de Manutention Securisee", "Test de Mobilite et Souplesse"], correctAnswer: 0 },
    { question: "Quel facteur aggrave le risque de TMS ?", options: ["La repetitivite des gestes", "La variation des postures", "Les pauses regulieres", "L'echauffement musculaire"], correctAnswer: 0 },
    { question: "Pour le travail sur ecran, a quelle distance minimale l'ecran doit-il etre place ?", options: ["50 a 70 cm des yeux", "10 cm des yeux", "2 metres", "Collee aux yeux"], correctAnswer: 0 },
    { question: "Quelle est la duree maximale recommandee de maintien d'une posture statique ?", options: ["2 heures maximum avant de changer de position", "Toute la journee", "30 minutes par jour", "8 heures sans pause"], correctAnswer: 0 },
  ],
  "Sécurité au travail": [
    { question: "Que signifie le sigle EPI ?", options: ["Equipement de Protection Individuelle", "Etude de Prevention Industrielle", "Evaluation des Postes Individuels", "Espace de Protection Interieur"], correctAnswer: 0 },
    { question: "Quel document doit etre affiche de maniere visible dans l'entreprise ?", options: ["Les consignes de securite et le plan d'evacuation", "Le menu de la cantine", "Les horaires de train", "La liste des fournisseurs"], correctAnswer: 0 },
    { question: "A quelle frequence le DUERP doit-il etre mis a jour ?", options: ["Au moins une fois par an", "Tous les 10 ans", "Uniquement en cas d'accident", "Jamais"], correctAnswer: 0 },
    { question: "Quelle couleur de signalisation indique une interdiction ?", options: ["Rouge", "Bleu", "Vert", "Jaune"], correctAnswer: 0 },
    { question: "Qui est responsable de la securite au travail dans une entreprise ?", options: ["L'employeur", "Uniquement les salaries", "Les clients", "Les fournisseurs"], correctAnswer: 0 },
  ],
  "Soins infirmiers": [
    { question: "Quelle est la voie d'administration d'un medicament par voie sublinguale ?", options: ["Sous la langue", "Par injection", "Par voie rectale", "Par inhalation"], correctAnswer: 0 },
    { question: "Quel parametre vital est mesure par l'oxymetre de pouls ?", options: ["La saturation en oxygene (SpO2)", "La glycemie", "La temperature", "La pression intracranienne"], correctAnswer: 0 },
    { question: "Quelle est la valeur normale de la frequence cardiaque au repos chez l'adulte ?", options: ["60 a 100 bpm", "30 a 50 bpm", "120 a 160 bpm", "10 a 30 bpm"], correctAnswer: 0 },
    { question: "Que faut-il verifier avant d'administrer un medicament ? (Regle des 5B)", options: ["Bon patient, bon medicament, bonne dose, bonne voie, bon moment", "Bon prix, bon fournisseur, bonne marque, bon emballage, bon gout", "Bonne couleur, bonne forme, bonne taille, bon poids, bon prix", "Bon medecin, bon pharmacien, bon infirmier, bon aide-soignant, bon patient"], correctAnswer: 0 },
    { question: "Quelle est la temperature normale du corps humain ?", options: ["36.5 a 37.5°C", "35 a 36°C", "38 a 39°C", "34 a 35°C"], correctAnswer: 0 },
  ],
  "Gériatrie": [
    { question: "Quel est le principal facteur de risque de chute chez la personne agee ?", options: ["La polymedication et les troubles de l'equilibre", "Le beau temps", "La lecture", "L'alimentation equilibree"], correctAnswer: 0 },
    { question: "Qu'est-ce que le syndrome de glissement chez la personne agee ?", options: ["Une deterioration rapide de l'etat general avec repli sur soi", "Une chute accidentelle", "Un probleme dermatologique", "Une allergie alimentaire"], correctAnswer: 0 },
    { question: "Quel outil est couramment utilise pour evaluer l'autonomie d'une personne agee ?", options: ["La grille AGGIR", "Le score de Glasgow", "Le test de Rorschach", "L'echelle de Richter"], correctAnswer: 0 },
    { question: "Quelle est la principale cause de deshydratation chez la personne agee ?", options: ["La diminution de la sensation de soif", "L'exces de boissons", "Le froid", "L'activite sportive intense"], correctAnswer: 0 },
    { question: "La maladie d'Alzheimer est principalement :", options: ["Une maladie neurodegenerative entrainant des troubles de la memoire", "Une maladie infectieuse", "Une maladie cardiaque", "Une maladie pulmonaire"], correctAnswer: 0 },
  ],
  "Pédiatrie": [
    { question: "A partir de quel age un nourrisson peut-il commencer la diversification alimentaire ?", options: ["Entre 4 et 6 mois", "Des la naissance", "A 1 an", "A 2 ans"], correctAnswer: 0 },
    { question: "Quelle est la frequence respiratoire normale d'un nouveau-ne ?", options: ["40 a 60 cycles/minute", "12 a 20 cycles/minute", "8 a 12 cycles/minute", "80 a 100 cycles/minute"], correctAnswer: 0 },
    { question: "Quel score est utilise pour evaluer l'etat du nouveau-ne a la naissance ?", options: ["Le score d'Apgar", "Le score de Glasgow", "Le score de Norton", "Le score de Braden"], correctAnswer: 0 },
    { question: "Quel est le rapport compressions/insufflations en RCP du nourrisson ?", options: ["15/2 pour les professionnels de sante", "30/2 uniquement", "5/1", "10/3"], correctAnswer: 0 },
    { question: "Quelle est la temperature definie comme fievre chez l'enfant ?", options: ["Superieure ou egale a 38°C", "Superieure a 36°C", "Superieure a 40°C", "Superieure a 35°C"], correctAnswer: 0 },
  ],
  "Santé mentale": [
    { question: "Quels sont les signes d'alerte d'une crise suicidaire ?", options: ["Isolement, propos desesperes, don d'objets personnels", "Bonne humeur soudaine uniquement", "Augmentation de l'appetit", "Envie de faire du sport"], correctAnswer: 0 },
    { question: "Qu'est-ce que la contention en psychiatrie ?", options: ["Une mesure de restriction de liberte pour proteger le patient ou autrui", "Un traitement medicamenteux standard", "Une methode de relaxation", "Un exercice therapeutique"], correctAnswer: 0 },
    { question: "Quel est le cadre legal d'une hospitalisation sans consentement en France ?", options: ["Soins psychiatriques a la demande d'un tiers (SPDT) ou sur decision du representant de l'Etat (SDRE)", "Uniquement sur demande du patient", "Decision du pharmacien", "Accord des voisins"], correctAnswer: 0 },
    { question: "Qu'est-ce que l'alliance therapeutique ?", options: ["La relation de confiance entre le soignant et le patient", "Un accord entre medecins", "Un contrat financier", "Une association de patients"], correctAnswer: 0 },
    { question: "Quel outil permet d'evaluer la douleur chez un patient non communicant ?", options: ["L'echelle Algoplus ou ECPA", "Le thermometre", "Le tensiometre", "La balance"], correctAnswer: 0 },
  ],
  "Douleur et soins palliatifs": [
    { question: "Quel est le principe fondamental des soins palliatifs ?", options: ["Soulager la souffrance et ameliorer la qualite de vie sans hater ni retarder la mort", "Guerir la maladie a tout prix", "Arreter tous les traitements", "Prolonger la vie au maximum"], correctAnswer: 0 },
    { question: "Quelle echelle est la plus utilisee pour evaluer la douleur chez l'adulte communicant ?", options: ["L'EVA (Echelle Visuelle Analogique)", "L'echelle de Beaufort", "L'echelle de Richter", "L'echelle de Mohs"], correctAnswer: 0 },
    { question: "Quels sont les trois paliers de l'OMS pour le traitement de la douleur ?", options: ["Palier 1 : non opioides / Palier 2 : opioides faibles / Palier 3 : opioides forts", "Palier 1 : chirurgie / Palier 2 : radiotherapie / Palier 3 : chimiotherapie", "Palier 1 : repos / Palier 2 : kinesitherapie / Palier 3 : hopital", "Palier 1 : tisane / Palier 2 : homeopathie / Palier 3 : acupuncture"], correctAnswer: 0 },
    { question: "La loi Claeys-Leonetti (2016) introduit le droit a :", options: ["La sedation profonde et continue jusqu'au deces", "L'euthanasie active", "Le suicide assiste", "L'arret de tous les soins sans condition"], correctAnswer: 0 },
    { question: "Qu'est-ce que les directives anticipees ?", options: ["Un document ou la personne exprime ses volontes sur sa fin de vie", "Un testament notarie", "Une ordonnance medicale", "Un contrat d'assurance"], correctAnswer: 0 },
  ],
  "Management santé": [
    { question: "Quel outil est utilise pour structurer une demarche d'amelioration continue ?", options: ["La roue de Deming (PDCA)", "Le diagramme de Gantt uniquement", "La matrice BCG", "Le bilan comptable"], correctAnswer: 0 },
    { question: "Que signifie le sigle COPIL ?", options: ["Comite de Pilotage", "Commission des Operations et Procedures Internes Logistiques", "Coordination des Pratiques Internes Legales", "Centre Operationnel de Planification Integree Locale"], correctAnswer: 0 },
    { question: "Qu'est-ce que la certification HAS pour un etablissement de sante ?", options: ["Une evaluation externe de la qualite et de la securite des soins", "Un label de restauration collective", "Une certification ISO 9001", "Un diplome pour les medecins"], correctAnswer: 0 },
    { question: "Quel style de management favorise l'autonomie des equipes ?", options: ["Le management participatif / delegatif", "Le management autoritaire strict", "Le management par la peur", "L'absence de management"], correctAnswer: 0 },
    { question: "Qu'est-ce qu'un evenement indesirable grave (EIG) ?", options: ["Un evenement lie aux soins ayant entraine un dommage grave pour le patient", "Une panne informatique", "Un retard de livraison", "Une greve du personnel"], correctAnswer: 0 },
  ],
  "Qualité et gestion des risques": [
    { question: "Que signifie le sigle CREX ?", options: ["Comite de Retour d'Experience", "Centre de Regulation des Examens", "Commission de Revision des Expertises", "Comite de Recherche et d'Exploitation"], correctAnswer: 0 },
    { question: "Quelle methode est utilisee pour analyser les causes profondes d'un evenement indesirable ?", options: ["La methode des 5 Pourquoi ou le diagramme d'Ishikawa", "Le brainstorming uniquement", "La lecture du dossier patient", "Le sondage des patients"], correctAnswer: 0 },
    { question: "Qu'est-ce qu'une RMM (Revue de Morbi-Mortalite) ?", options: ["Une analyse collective des cas de complications ou de deces pour ameliorer les pratiques", "Une reunion administrative", "Un bilan financier", "Un cours de medecine"], correctAnswer: 0 },
    { question: "Quel referentiel est utilise pour la certification des etablissements de sante en France ?", options: ["Le referentiel de la HAS", "La norme ISO 14001", "Le code du commerce", "Le referentiel AFNOR restauration"], correctAnswer: 0 },
    { question: "Qu'est-ce que l'identitovigilance ?", options: ["La verification de l'identite du patient a chaque etape de sa prise en charge", "La surveillance des badges du personnel", "Le controle des acces au parking", "La verification des diplomes des medecins"], correctAnswer: 0 },
  ],
  "SST - Sauveteur Secouriste du Travail": [
    { question: "Quel est le premier maillon de la chaine de secours ?", options: ["Proteger et prevenir les suraccidents", "Transporter la victime", "Donner des medicaments", "Appeler les pompiers en dernier"], correctAnswer: 0 },
    { question: "Que doit faire le SST face a un saignement abondant ?", options: ["Comprimer la plaie directement avec un tissu propre", "Faire un garrot systematiquement", "Mettre la victime debout", "Attendre l'arrivee des secours sans intervenir"], correctAnswer: 0 },
    { question: "Quelle est la duree de validite du certificat SST ?", options: ["2 ans", "5 ans", "10 ans", "Illimitee"], correctAnswer: 0 },
    { question: "En cas d'etouffement total chez l'adulte conscient, quel geste pratiquer ?", options: ["Les claques dans le dos puis les compressions abdominales (manoeuvre de Heimlich)", "Le bouche-a-bouche", "Donner de l'eau", "Allonger la victime"], correctAnswer: 0 },
    { question: "Le SST doit-il intervenir en dehors de son lieu de travail ?", options: ["Oui, tout citoyen a l'obligation de porter assistance", "Non, uniquement sur son lieu de travail", "Seulement si un medecin est present", "Uniquement le week-end"], correctAnswer: 0 },
  ],
  "Incendie et évacuation": [
    { question: "Quel est le numero d'appel des sapeurs-pompiers ?", options: ["18", "15", "17", "114"], correctAnswer: 0 },
    { question: "Que signifie le sigle EPI en securite incendie ?", options: ["Equipier de Premiere Intervention", "Equipement de Protection Individuelle", "Extincteur a Pression Interne", "Evacuation Prioritaire Immediate"], correctAnswer: 0 },
    { question: "Quel type d'extincteur utiliser sur un feu d'origine electrique ?", options: ["Extincteur CO2", "Extincteur a eau pulverisee", "Extincteur a mousse", "Seau de sable"], correctAnswer: 0 },
    { question: "Que doit faire un guide-file lors d'une evacuation ?", options: ["Guider les personnes vers le point de rassemblement", "Rester a son poste de travail", "Eteindre le feu", "Fermer les portes a cle"], correctAnswer: 0 },
    { question: "Quel est le role du serre-file ?", options: ["Verifier qu'il ne reste personne dans les locaux evacues", "Ouvrir les portes coupe-feu", "Appeler les pompiers", "Distribuer les masques"], correctAnswer: 0 },
  ],
  "Risques psychosociaux": [
    { question: "Quels sont les principaux facteurs de risques psychosociaux (RPS) ?", options: ["Charge de travail, manque d'autonomie, conflits, insecurite de l'emploi", "Le bruit uniquement", "Les produits chimiques", "La temperature des locaux"], correctAnswer: 0 },
    { question: "Le burn-out est defini comme :", options: ["Un epuisement professionnel lie au stress chronique au travail", "Une maladie infectieuse", "Un accident du travail", "Une allergie professionnelle"], correctAnswer: 0 },
    { question: "Qu'est-ce que le harcelement moral au travail ?", options: ["Des agissements repetes entrainant une degradation des conditions de travail", "Un desaccord ponctuel entre collegues", "Une surcharge de travail temporaire", "Un changement de poste"], correctAnswer: 0 },
    { question: "Quel outil permet d'evaluer les RPS dans une entreprise ?", options: ["Le questionnaire de Karasek ou Siegrist", "Le bilan comptable", "Le planning de conges", "L'organigramme"], correctAnswer: 0 },
    { question: "Quelle obligation a l'employeur en matiere de RPS ?", options: ["Evaluer les risques et mettre en place des actions de prevention", "Uniquement indemniser les victimes", "Aucune obligation specifique", "Licencier les personnes en difficulte"], correctAnswer: 0 },
  ],
  "Fin de vie et accompagnement": [
    { question: "Quelle loi francaise encadre les droits des patients en fin de vie ?", options: ["La loi Claeys-Leonetti (2016)", "La loi Evin", "La loi Kouchner", "La loi Touraine"], correctAnswer: 0 },
    { question: "Qu'est-ce que la sedation profonde et continue ?", options: ["L'administration de medicaments pour une perte de conscience jusqu'au deces", "Un somnifere leger", "Une anesthesie pour intervention chirurgicale", "Un traitement antidouleur classique"], correctAnswer: 0 },
    { question: "Qui peut rediger des directives anticipees ?", options: ["Toute personne majeure", "Uniquement les medecins", "Uniquement les personnes malades", "Uniquement les personnes de plus de 70 ans"], correctAnswer: 0 },
    { question: "Qu'est-ce que la personne de confiance ?", options: ["Une personne designee pour etre consultee si le patient ne peut plus s'exprimer", "Le medecin traitant", "L'infirmiere de service", "Le directeur de l'etablissement"], correctAnswer: 0 },
    { question: "Les soins palliatifs concernent :", options: ["Les patients atteints de maladies graves, evolutives ou terminales", "Uniquement les patients en phase terminale", "Uniquement les personnes agees", "Uniquement les patients hospitalises"], correctAnswer: 0 },
  ],
  "Bientraitance et droits des patients": [
    { question: "La bientraitance en etablissement de sante vise a :", options: ["Promouvoir le bien-etre du patient en respectant ses droits et sa dignite", "Appliquer strictement les protocoles sans adaptation", "Reduire les couts de fonctionnement", "Augmenter la cadence des soins"], correctAnswer: 0 },
    { question: "Quelle loi a consacre les droits des patients en France ?", options: ["La loi du 4 mars 2002 (loi Kouchner)", "La loi Evin de 1991", "La loi Veil de 1975", "La loi Leonetti de 2005"], correctAnswer: 0 },
    { question: "Qu'est-ce que la maltraitance passive ?", options: ["La negligence, l'absence de soins ou l'oubli des besoins du patient", "Des coups portes volontairement", "Un vol d'objets personnels", "Des insultes repetees"], correctAnswer: 0 },
    { question: "Le consentement eclaire du patient signifie :", options: ["Le patient a recu une information claire et a accepte les soins en connaissance de cause", "Le patient a signe un formulaire sans explication", "Le medecin decide seul", "La famille decide pour le patient"], correctAnswer: 0 },
    { question: "Que faire en cas de suspicion de maltraitance sur un patient ?", options: ["Signaler la situation a la hierarchie et aux autorites competentes", "Ignorer la situation", "En parler uniquement avec ses collegues", "Attendre que la victime porte plainte"], correctAnswer: 0 },
  ],
  "Nutrition et troubles alimentaires": [
    { question: "Qu'est-ce que la denutrition ?", options: ["Un desequilibre entre les apports et les besoins nutritionnels de l'organisme", "Un exces de nourriture", "Une allergie alimentaire", "Un regime volontaire"], correctAnswer: 0 },
    { question: "Quel outil est utilise pour depister la denutrition chez la personne agee ?", options: ["Le MNA (Mini Nutritional Assessment)", "L'IMC uniquement", "Le score de Glasgow", "Le test de Tinetti"], correctAnswer: 0 },
    { question: "La dysphagie est :", options: ["Une difficulte a deglutir les aliments ou les liquides", "Une douleur abdominale", "Une allergie au gluten", "Un exces d'appetit"], correctAnswer: 0 },
    { question: "Quel est l'indice de masse corporelle (IMC) indiquant une denutrition severe chez l'adulte ?", options: ["Inferieur a 17 kg/m2", "Superieur a 30 kg/m2", "Entre 25 et 30 kg/m2", "Egal a 22 kg/m2"], correctAnswer: 0 },
    { question: "Quelle texture alimentaire est recommandee en cas de troubles de la deglutition ?", options: ["Texture mixee ou moulinee", "Aliments entiers et croquants", "Boissons gazeuses", "Aliments secs et friables"], correctAnswer: 0 },
  ],
  "Plaies et cicatrisation": [
    { question: "Quelles sont les phases de la cicatrisation ?", options: ["Inflammation, bourgeonnement (granulation), epithelialisation, remodelage", "Infection, nettoyage, suture, repos", "Saignement, coagulation, infection, guerison", "Nettoyage, desinfection, pansement, ablation"], correctAnswer: 0 },
    { question: "Qu'est-ce qu'un escarre ?", options: ["Une lesion cutanee causee par une pression prolongee sur les tissus", "Une brulure chimique", "Une morsure d'insecte", "Une allergie cutanee"], correctAnswer: 0 },
    { question: "Quel stade d'escarre correspond a une plaie avec perte de substance du derme ?", options: ["Stade 2", "Stade 1", "Stade 3", "Stade 4"], correctAnswer: 0 },
    { question: "Quel type de pansement favorise un milieu humide propice a la cicatrisation ?", options: ["Hydrocolloide", "Pansement sec", "Sparadrap simple", "Compresse sterile seche"], correctAnswer: 0 },
    { question: "Quel facteur retarde la cicatrisation ?", options: ["La denutrition, le diabete, le tabagisme", "L'hydratation abondante", "L'activite physique moderee", "Une alimentation riche en proteines"], correctAnswer: 0 },
  ],
  "Infectiologie et hygiène hospitalière": [
    { question: "Que signifie le sigle IAS ?", options: ["Infection Associee aux Soins", "Instrument d'Analyse Sanitaire", "Indice d'Activite de Soins", "Inspection Administrative de Sante"], correctAnswer: 0 },
    { question: "Quel est le principal mode de transmission des infections nosocomiales ?", options: ["La transmission manuportee (par les mains)", "La transmission aerienne uniquement", "La transmission alimentaire", "La transmission par les insectes"], correctAnswer: 0 },
    { question: "Que sont les precautions complementaires de type contact ?", options: ["Des mesures supplementaires aux precautions standard pour les patients porteurs de BMR", "Le port d'un masque FFP2 uniquement", "L'isolement en chambre pressurisee", "L'interdiction de visite"], correctAnswer: 0 },
    { question: "Quel est le temps minimum de contact pour l'efficacite d'une friction hydro-alcoolique ?", options: ["30 secondes", "5 secondes", "2 minutes", "10 secondes"], correctAnswer: 0 },
    { question: "Qu'est-ce que le biofilm dans le contexte des infections ?", options: ["Une communaute de bacteries adherentes a une surface, protegees par une matrice", "Un film plastique de protection", "Un antiseptique de surface", "Un type de gant sterile"], correctAnswer: 0 },
  ],
  "Handicap et accompagnement": [
    { question: "Quelle loi est la reference en matiere de droits des personnes handicapees en France ?", options: ["La loi du 11 fevrier 2005 pour l'egalite des droits et des chances", "La loi Evin de 1991", "La loi Kouchner de 2002", "La loi Veil de 1975"], correctAnswer: 0 },
    { question: "Que signifie le sigle MDPH ?", options: ["Maison Departementale des Personnes Handicapees", "Mutuelle de Prevoyance et d'Hospitalisation", "Medecin Delegue a la Protection des Handicapes", "Ministere du Droit des Personnes Hospitalisees"], correctAnswer: 0 },
    { question: "Qu'est-ce que le projet personnalise d'accompagnement ?", options: ["Un projet defini avec la personne handicapee pour repondre a ses besoins specifiques", "Un plan financier pour l'etablissement", "Un programme de formation professionnelle", "Un protocole medical standard"], correctAnswer: 0 },
    { question: "Quelle prestation compense le handicap pour les adultes ?", options: ["La PCH (Prestation de Compensation du Handicap)", "L'APA", "Le RSA", "L'ASS"], correctAnswer: 0 },
    { question: "Qu'est-ce que l'autodetermination dans l'accompagnement du handicap ?", options: ["La capacite de la personne a faire ses propres choix et a diriger sa vie", "Le fait de laisser la personne seule", "La prise de decision par l'equipe soignante", "Le placement en institution"], correctAnswer: 0 },
  ],
  "Alzheimer et troubles neurodégénératifs": [
    { question: "Quel est le symptome le plus precoce de la maladie d'Alzheimer ?", options: ["Les troubles de la memoire a court terme", "La paralysie des membres", "La fievre", "Les douleurs articulaires"], correctAnswer: 0 },
    { question: "Quel test est couramment utilise pour evaluer les troubles cognitifs ?", options: ["Le MMSE (Mini Mental State Examination)", "Le score de Glasgow", "L'echelle EVA", "Le test de Romberg"], correctAnswer: 0 },
    { question: "Qu'est-ce que la communication non verbale avec un patient Alzheimer ?", options: ["Le toucher, le regard, le ton de la voix, les gestes pour communiquer", "L'utilisation du telephone", "La redaction de courriers", "Les SMS et emails"], correctAnswer: 0 },
    { question: "Les troubles du comportement productifs (SCPD) incluent :", options: ["Agitation, agressivite, deambulation, cris", "Apathie uniquement", "Somnolence et fatigue", "Augmentation de l'appetit"], correctAnswer: 0 },
    { question: "Quelle approche non medicamenteuse est recommandee pour les patients Alzheimer ?", options: ["La stimulation cognitive, la musicotherapie, l'activite physique adaptee", "L'isolement en chambre", "L'augmentation des medicaments", "La contention systematique"], correctAnswer: 0 },
  ],
  "Relation patient / famille": [
    { question: "Qu'est-ce que l'ecoute active dans la relation soignant-patient ?", options: ["Une ecoute attentive avec reformulation, empathie et sans jugement", "Ecouter en faisant autre chose", "Donner des conseils immediatement", "Interrompre pour corriger le patient"], correctAnswer: 0 },
    { question: "Quel est le role de l'aidant familial ?", options: ["Accompagner un proche en perte d'autonomie au quotidien", "Remplacer les soignants professionnels", "Prendre les decisions medicales a la place du patient", "Financer les soins du patient"], correctAnswer: 0 },
    { question: "Qu'est-ce que l'epuisement de l'aidant (fardeau de l'aidant) ?", options: ["Un etat de fatigue physique et psychologique lie a l'accompagnement prolonge", "Une maladie contagieuse", "Un burn-out professionnel", "Un probleme financier"], correctAnswer: 0 },
    { question: "Comment annoncer une mauvaise nouvelle a un patient ou a sa famille ?", options: ["Dans un lieu calme, avec empathie, en verifiant la comprehension", "Par telephone rapidement", "Par courrier postal", "En presence de tout le service"], correctAnswer: 0 },
    { question: "Que signifie le concept de 'patient partenaire' ?", options: ["Le patient participe activement aux decisions concernant ses soins", "Le patient finance ses propres soins", "Le patient remplace l'aide-soignant", "Le patient surveille les autres patients"], correctAnswer: 0 },
  ],
  "Education thérapeutique du patient": [
    { question: "Que signifie le sigle ETP ?", options: ["Education Therapeutique du Patient", "Evaluation des Traitements Pharmaceutiques", "Examen Technique Preventif", "Expertise en Therapie Pratique"], correctAnswer: 0 },
    { question: "Quel est l'objectif principal de l'ETP ?", options: ["Aider le patient a acquerir des competences pour gerer sa maladie chronique au quotidien", "Remplacer le traitement medicamenteux", "Former le patient a devenir soignant", "Reduire les couts hospitaliers"], correctAnswer: 0 },
    { question: "L'ETP est encadree en France par :", options: ["La loi HPST de 2009 (article L.1161-1 du CSP)", "La loi Evin de 1991", "Le code du commerce", "La convention collective hospitaliere"], correctAnswer: 0 },
    { question: "Quelles sont les etapes du programme d'ETP ?", options: ["Diagnostic educatif, programme personnalise, seances, evaluation", "Prescription, administration, surveillance, sortie", "Consultation, hospitalisation, sortie", "Inscription, formation, examen, diplome"], correctAnswer: 0 },
    { question: "Pour quels patients l'ETP est-elle particulierement indiquee ?", options: ["Les patients atteints de maladies chroniques (diabete, asthme, insuffisance cardiaque...)", "Uniquement les patients hospitalises", "Les patients en bonne sante", "Les enfants de moins de 3 ans"], correctAnswer: 0 },
  ],
  "Transfusion sanguine": [
    { question: "Quel controle est obligatoire au lit du patient avant une transfusion ?", options: ["Le controle ultime pre-transfusionnel (concordance identite + test de compatibilite ABO)", "Uniquement la verification de la temperature", "La prise de la tension arterielle", "Un electrocardiogramme"], correctAnswer: 0 },
    { question: "Quels sont les groupes sanguins du systeme ABO ?", options: ["A, B, AB, O", "A, B, C, D", "1, 2, 3, 4", "Alpha, Beta, Gamma, Delta"], correctAnswer: 0 },
    { question: "Qu'est-ce que l'hemovigilance ?", options: ["La surveillance des incidents lies a la transfusion sanguine", "Le controle de la tension arterielle", "La prevention des infections", "Le suivi des vaccinations"], correctAnswer: 0 },
    { question: "Quel signe clinique doit alerter pendant une transfusion ?", options: ["Frissons, fievre, douleurs lombaires, dyspnee, eruption cutanee", "Envie de dormir", "Bonne tolerance et confort", "Appetit augmente"], correctAnswer: 0 },
    { question: "Quelle est la duree maximale de transfusion d'un concentre de globules rouges ?", options: ["4 heures apres la sortie de la banque de sang", "24 heures", "1 heure", "12 heures"], correctAnswer: 0 },
  ],
  "Cadre réglementaire sanitaire": [
    { question: "Qu'est-ce que la certification Qualiopi ?", options: ["Une certification qualite obligatoire pour les organismes de formation financant des fonds publics", "Un diplome universitaire", "Une norme ISO pour les hopitaux", "Un label de restauration collective"], correctAnswer: 0 },
    { question: "Que signifie le sigle ARS ?", options: ["Agence Regionale de Sante", "Association des Responsables de Soins", "Autorite de Regulation Sanitaire", "Aide aux Ressources de Sante"], correctAnswer: 0 },
    { question: "Quelle autorite est responsable de la certification des etablissements de sante ?", options: ["La HAS (Haute Autorite de Sante)", "L'ARS", "L'ANSM", "Le ministere de l'Education"], correctAnswer: 0 },
    { question: "Le secret medical s'applique a :", options: ["Tous les professionnels de sante et toute personne intervenant dans la prise en charge", "Uniquement aux medecins", "Uniquement aux infirmieres", "Uniquement au personnel administratif"], correctAnswer: 0 },
    { question: "Qu'est-ce que le DPC (Developpement Professionnel Continu) ?", options: ["Une obligation de formation continue pour les professionnels de sante", "Un diplome de fin d'etudes", "Un conges de formation", "Un protocole de soins"], correctAnswer: 0 },
  ],
};

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
    { key: "{profile_type_apprenant}", label: "Type de profil" },
    { key: "{profession_apprenant}", label: "Profession" },
    { key: "{adresse_apprenant}", label: "Adresse postale" },
    { key: "{ville_apprenant}", label: "Ville" },
    { key: "{code_postal_apprenant}", label: "Code postal" },
    { key: "{pays_apprenant}", label: "Pays" },
    { key: "{adresse_complete_apprenant}", label: "Adresse complète (bloc postal)" },
  ],
  entreprise: [
    { key: "{nom_entreprise}", label: "Nom de l'entreprise" },
    { key: "{siret_entreprise}", label: "SIRET de l'entreprise" },
    { key: "{tva_entreprise}", label: "N° TVA de l'entreprise" },
    { key: "{adresse_entreprise}", label: "Adresse de l'entreprise" },
    { key: "{ville_entreprise}", label: "Ville de l'entreprise" },
    { key: "{code_postal_entreprise}", label: "Code postal de l'entreprise" },
    { key: "{adresse_complete_entreprise}", label: "Adresse complète entreprise (bloc)" },
    { key: "{format_juridique_entreprise}", label: "Forme juridique" },
    { key: "{secteur_entreprise}", label: "Secteur d'activité" },
    { key: "{telephone_entreprise}", label: "Téléphone de l'entreprise" },
    { key: "{email_entreprise}", label: "Email de l'entreprise" },
    { key: "{contact_entreprise}", label: "Nom du contact" },
    { key: "{email_contact_entreprise}", label: "Email du contact" },
    { key: "{telephone_contact_entreprise}", label: "Téléphone du contact" },
    { key: "{representant_legal}", label: "Représentant légal" },
    { key: "{email_representant_legal}", label: "Email du représentant légal" },
    { key: "{telephone_representant_legal}", label: "Tél. du représentant légal" },
  ],
  session: [
    { key: "{titre_session}", label: "Titre de la session" },
    { key: "{date_debut}", label: "Date de début" },
    { key: "{date_fin}", label: "Date de fin" },
    { key: "{lieu}", label: "Lieu" },
    { key: "{modalite}", label: "Modalité" },
    { key: "{adresse_lieu}", label: "Adresse du lieu" },
    { key: "{salle}", label: "Salle" },
    { key: "{url_classe_virtuelle}", label: "URL classe virtuelle" },
    { key: "{max_participants}", label: "Nombre max de participants" },
  ],
  formation: [
    { key: "{titre_formation}", label: "Titre de la formation" },
    { key: "{nom_formation}", label: "Nom de la formation (alias)" },
    { key: "{duree_formation}", label: "Durée" },
    { key: "{prix_formation}", label: "Prix" },
    { key: "{montant_formation}", label: "Montant de la formation (alias prix)" },
    { key: "{nombre_stagiaires}", label: "Nombre de stagiaires inscrits" },
    { key: "{objectifs_formation}", label: "Objectifs" },
    { key: "{prerequis_formation}", label: "Prérequis" },
    { key: "{niveau_formation}", label: "Niveau" },
    { key: "{public_cible}", label: "Public cible" },
    { key: "{methodes_pedagogiques}", label: "Méthodes pédagogiques" },
    { key: "{contenu_formation}", label: "Contenu de la formation" },
  ],
  formateur: [
    { key: "{nom_formateur}", label: "Nom complet du formateur" },
    { key: "{prenom_formateur}", label: "Prénom du formateur" },
    { key: "{nom_famille_formateur}", label: "Nom de famille du formateur" },
    { key: "{email_formateur}", label: "Email du formateur" },
    { key: "{telephone_formateur}", label: "Téléphone du formateur" },
    { key: "{specialite_formateur}", label: "Spécialité du formateur" },
  ],
  inscription: [
    { key: "{date_inscription}", label: "Date d'inscription" },
    { key: "{statut_inscription}", label: "Statut de l'inscription" },
  ],
  contrat: [
    { key: "{numero_devis}", label: "Numéro du devis" },
    { key: "{montant_devis}", label: "Montant du devis" },
    { key: "{montant_ht}", label: "Montant HT" },
    { key: "{montant_tva}", label: "Montant TVA" },
    { key: "{montant_ttc}", label: "Montant TTC" },
    { key: "{date_signature}", label: "Date de signature" },
    { key: "{date_du_jour}", label: "Date du jour" },
    { key: "{date_document}", label: "Date du document" },
    { key: "{date_generation}", label: "Date de génération du document" },
    { key: "{date_validite_devis}", label: "Date de validité du devis" },
    { key: "{civilite_apprenant}", label: "Civilité de l'apprenant" },
    { key: "{date_naissance_apprenant}", label: "Date de naissance" },
    { key: "{adresse_apprenant}", label: "Adresse de l'apprenant" },
    { key: "{telephone_apprenant}", label: "Téléphone de l'apprenant" },
    { key: "{lignes_devis}", label: "Détail des lignes du devis (HTML)" },
    { key: "{notes_devis}", label: "Notes / conditions du devis" },
    { key: "{taux_tva}", label: "Taux de TVA" },
  ],
  facture: [
    { key: "{numero_facture}", label: "Numéro de facture" },
    { key: "{titre_facture}", label: "Titre de la facture" },
    { key: "{facture_montant_ht}", label: "Montant HT facture" },
    { key: "{facture_montant_tva}", label: "Montant TVA facture" },
    { key: "{facture_montant_ttc}", label: "Montant TTC facture" },
    { key: "{facture_taux_tva}", label: "Taux TVA facture" },
    { key: "{facture_montant_paye}", label: "Montant déjà payé" },
    { key: "{facture_reste_du}", label: "Reste dû" },
    { key: "{facture_date_echeance}", label: "Date d'échéance" },
    { key: "{facture_statut}", label: "Statut de la facture" },
    { key: "{facture_lignes}", label: "Détail des lignes facture (HTML)" },
    { key: "{facture_notes}", label: "Notes / conditions facture" },
    { key: "{facture_numero_devis}", label: "Numéro du devis associé" },
  ],
  sous_traitance: [
    { key: "{nom_sous_traitant}", label: "Nom du sous-traitant / formateur" },
    { key: "{email_sous_traitant}", label: "Email du sous-traitant" },
    { key: "{telephone_sous_traitant}", label: "Téléphone du sous-traitant" },
    { key: "{specialite_sous_traitant}", label: "Spécialité du sous-traitant" },
    { key: "{montant_prestation}", label: "Montant de la prestation" },
    { key: "{objet_prestation}", label: "Objet de la prestation" },
  ],
  contrat_formateur: [
    { key: "{honoraires_session}", label: "Honoraires de la session (€)" },
    { key: "{taux_journalier}", label: "Taux journalier (€/jour)" },
    { key: "{nombre_jours_mission}", label: "Nombre de jours de la mission" },
    { key: "{objet_mission}", label: "Objet de la mission (titre session)" },
    { key: "{date_debut_mission}", label: "Date de début de la mission" },
    { key: "{date_fin_mission}", label: "Date de fin de la mission" },
    { key: "{lieu_mission}", label: "Lieu de la mission" },
    { key: "{statut_formateur}", label: "Statut juridique du formateur" },
    { key: "{siret_formateur}", label: "SIRET du formateur" },
    { key: "{adresse_formateur}", label: "Adresse du formateur" },
    { key: "{rib_formateur}", label: "RIB / IBAN du formateur" },
  ],
  vae: [
    { key: "{certification_visee}", label: "Certification visée" },
    { key: "{diplome_vise}", label: "Diplôme / titre visé" },
    { key: "{duree_accompagnement}", label: "Durée de l'accompagnement VAE" },
    { key: "{tarif_accompagnement}", label: "Tarif de l'accompagnement" },
    { key: "{modalites_paiement}", label: "Modalités de paiement" },
    { key: "{delai_retractation}", label: "Délai de rétractation (10 jours)" },
    { key: "{organisme_certificateur}", label: "Organisme certificateur" },
  ],
  conditionnel: [
    { key: "{modalite_presentiel}", label: "Vrai si présentiel" },
    { key: "{modalite_distanciel}", label: "Vrai si distanciel" },
    { key: "{modalite_mixte}", label: "Vrai si blended/mixte" },
    { key: "{est_certifiante}", label: "Vrai si formation certifiante" },
    { key: "{est_particulier}", label: "Vrai si particulier (non salarié)" },
    { key: "{est_vae}", label: "Vrai si parcours VAE" },
    { key: "{est_blended}", label: "Vrai si formation blended/mixte" },
    { key: "{est_standard}", label: "Vrai si formation standard (présentiel)" },
    { key: "{est_specifique}", label: "Vrai si formation spécifique" },
  ],
  organisme: [
    { key: "{nom_organisme}", label: "Nom de l'organisme" },
    { key: "{adresse_organisme}", label: "Adresse" },
    { key: "{siret_organisme}", label: "SIRET" },
    { key: "{email_organisme}", label: "Email" },
    { key: "{telephone_organisme}", label: "Téléphone" },
    { key: "{signature_organisme}", label: "Signature de l'organisme" },
  ],
  financement: [
    { key: "{type_financement}", label: "Type de financement (DPC, FIFPL, OPCO...)" },
    { key: "{numero_dpc}", label: "Numéro de dossier DPC" },
    { key: "{numero_fifpl}", label: "Numéro de dossier FIFPL" },
    { key: "{heures_realisees}", label: "Heures réalisées" },
    { key: "{taux_presence}", label: "Taux de présence (%)" },
    { key: "{date_fin_formation}", label: "Date de fin de formation" },
    { key: "{jours_realises}", label: "Nombre de jours réalisés" },
  ],
  presence: [
    { key: "{statut_presence}", label: "Statut de présence (Présent / Absent)" },
    { key: "{nombre_seances}", label: "Nombre de séances" },
    { key: "{seances_presentes}", label: "Séances effectuées" },
    { key: "{est_present}", label: "Vrai si apprenant présent" },
    { key: "{date_delivrance}", label: "Date de délivrance du document" },
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

// User document validation statuses
export const USER_DOCUMENT_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "analyzing", label: "Analyse en cours", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "auto_valid", label: "Validé (IA)", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "auto_invalid", label: "Invalide (IA)", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "manually_validated", label: "Validé manuellement", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "rejected", label: "Rejeté", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

export const AI_ANALYSIS_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "processing", label: "En cours", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "completed", label: "Terminé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "failed", label: "Échoué", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

export const AI_CONFIDENCE_LEVELS = [
  { value: "high", label: "Haute", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "medium", label: "Moyenne", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "low", label: "Basse", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

// Invoice types
export const INVOICE_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "blended", label: "Blended" },
  { value: "militaire", label: "Militaire" },
] as const;

// Payment schedule statuses
export const PAYMENT_SCHEDULE_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "paid", label: "Payé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "overdue", label: "En retard", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

// Bank reconciliation statuses
export const RECONCILIATION_STATUSES = [
  { value: "unmatched", label: "Non rapproché", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "matched", label: "Rapproché", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "partial", label: "Partiel", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "ignored", label: "Ignoré", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
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

// Absence types
export const ABSENCE_TYPES = [
  { value: "absence", label: "Absence", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "retard", label: "Retard", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "depart_anticipe", label: "Départ anticipé", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "anomalie", label: "Anomalie", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
] as const;

// Quality incident types
export const INCIDENT_TYPES = [
  { value: "incident", label: "Incident", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "reclamation", label: "Réclamation", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "non_conformite", label: "Non-conformité", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "amelioration", label: "Amélioration", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
] as const;

// Incident severity levels
export const INCIDENT_SEVERITIES = [
  { value: "minor", label: "Mineur", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "major", label: "Majeur", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "critical", label: "Critique", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

// Incident statuses
export const INCIDENT_STATUSES = [
  { value: "open", label: "Ouvert", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "investigating", label: "En investigation", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "corrective_action", label: "Action corrective", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "resolved", label: "Résolu", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "closed", label: "Clôturé", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
] as const;

// Incident categories
export const INCIDENT_CATEGORIES = [
  { value: "pedagogique", label: "Pédagogique" },
  { value: "administratif", label: "Administratif" },
  { value: "technique", label: "Technique" },
  { value: "logistique", label: "Logistique" },
  { value: "humain", label: "Humain" },
] as const;

// Veille types
export const VEILLE_TYPES = [
  { value: "reglementaire", label: "Réglementaire", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "metier", label: "Métier", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "pedagogique", label: "Pédagogique", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "technologique", label: "Technologique", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
] as const;

// Veille impact levels
export const VEILLE_IMPACT_LEVELS = [
  { value: "info", label: "Information", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "low", label: "Faible", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "medium", label: "Moyen", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "high", label: "Élevé", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "critical", label: "Critique", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

// Veille statuses
export const VEILLE_STATUSES = [
  { value: "new", label: "Nouveau", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "analyzed", label: "Analysé", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "action_required", label: "Action requise", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "implemented", label: "Implémenté", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "archived", label: "Archivé", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
] as const;

// Badge types
export const BADGE_TYPES = [
  { value: "completion", label: "Complétion", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "skill", label: "Compétence", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "participation", label: "Participation", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "excellence", label: "Excellence", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
] as const;

// Badge levels
export const BADGE_LEVELS = [
  { value: "bronze", label: "Bronze", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "silver", label: "Argent", color: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  { value: "gold", label: "Or", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "platinum", label: "Platine", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
] as const;

// Badge award statuses
export const BADGE_AWARD_STATUSES = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "revoked", label: "Révoqué", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "expired", label: "Expiré", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
] as const;

// Task list statuses
export const TASK_LIST_STATUSES = [
  { value: "in_progress", label: "En cours", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "completed", label: "Terminé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "validated", label: "Validé", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "cancelled", label: "Annulé", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
] as const;

// AI document analysis statuses
export const AI_DOCUMENT_ANALYSIS_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "processing", label: "Analyse en cours", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "completed", label: "Terminé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "failed", label: "Échoué", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "manual_review", label: "Vérification manuelle", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
] as const;

// AI validation results
export const AI_VALIDATION_RESULTS = [
  { value: "valid", label: "Valide", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "expired", label: "Expiré", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "invalid", label: "Invalide", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "inconclusive", label: "Non concluant", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
] as const;

// CESU submission statuses
export const CESU_SUBMISSION_STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "ready", label: "Prêt", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "submitted", label: "Envoyé", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "confirmed", label: "Confirmé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "rejected", label: "Rejeté", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

// Analyzable document types
export const ANALYZABLE_DOCUMENT_TYPES = [
  { value: "afgsu1", label: "AFGSU Niveau 1" },
  { value: "afgsu2", label: "AFGSU Niveau 2" },
  { value: "certibiocide", label: "Certibiocide" },
  { value: "diplome", label: "Diplôme" },
  { value: "attestation", label: "Attestation" },
  { value: "other", label: "Autre" },
] as const;
