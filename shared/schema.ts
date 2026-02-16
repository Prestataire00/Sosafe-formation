import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEnterpriseSchema = createInsertSchema(enterprises).omit({ id: true });
export const insertTrainerSchema = createInsertSchema(trainers).omit({ id: true });
export const insertTraineeSchema = createInsertSchema(trainees).omit({ id: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true, completedAt: true });

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
