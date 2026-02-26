import {
  type User, type InsertUser,
  type Enterprise, type InsertEnterprise,
  type Trainer, type InsertTrainer,
  type Trainee, type InsertTrainee,
  type Program, type InsertProgram,
  type Session, type InsertSession,
  type Enrollment, type InsertEnrollment,
  type EmailTemplate, type InsertEmailTemplate,
  type EmailLog, type InsertEmailLog,
  type DocumentTemplate, type InsertDocumentTemplate,
  type GeneratedDocument, type InsertGeneratedDocument,
  type Prospect, type InsertProspect,
  type Quote, type InsertQuote,
  type Invoice, type InsertInvoice,
  type Payment, type InsertPayment,
  type ElearningModule, type InsertElearningModule,
  type ElearningBlock, type InsertElearningBlock,
  type QuizQuestion, type InsertQuizQuestion,
  type LearnerProgress, type InsertLearnerProgress,
  type SurveyTemplate, type InsertSurveyTemplate,
  type SurveyResponse, type InsertSurveyResponse,
  type QualityAction, type InsertQualityAction,
  type AttendanceSheet, type InsertAttendanceSheet,
  type AttendanceRecord, type InsertAttendanceRecord,
  type AutomationRule, type InsertAutomationRule,
  type AutomationLog, type InsertAutomationLog,
  type OrganizationSetting, type InsertOrganizationSetting,
  type EnterpriseContact, type InsertEnterpriseContact,
  type TrainerDocument, type InsertTrainerDocument,
  type TrainerEvaluation, type InsertTrainerEvaluation,
  type UserDocument, type InsertUserDocument,
  type Signature, type InsertSignature,
  type ExpenseNote, type InsertExpenseNote,
  type TrainerInvoice, type InsertTrainerInvoice,
  type TrainerCompetency, type InsertTrainerCompetency,
  type ProgramPrerequisite, type InsertProgramPrerequisite,
  type TraineeCertification, type InsertTraineeCertification,
  users, enterprises, trainers, trainees, programs, sessions, enrollments,
  emailTemplates, emailLogs, documentTemplates, generatedDocuments,
  prospects, quotes, invoices, payments,
  elearningModules, elearningBlocks, quizQuestions, learnerProgress,
  surveyTemplates, surveyResponses, qualityActions,
  attendanceSheets, attendanceRecords,
  automationRules, automationLogs, organizationSettings,
  enterpriseContacts, trainerDocuments, trainerEvaluations,
  userDocuments, signatures, expenseNotes, trainerInvoices,
  trainerCompetencies, programPrerequisites, traineeCertifications,
} from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByTrainerId(trainerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Enterprises
  getEnterprises(): Promise<Enterprise[]>;
  getEnterprise(id: string): Promise<Enterprise | undefined>;
  createEnterprise(enterprise: InsertEnterprise): Promise<Enterprise>;
  updateEnterprise(id: string, enterprise: Partial<InsertEnterprise>): Promise<Enterprise | undefined>;
  deleteEnterprise(id: string): Promise<void>;

  // Trainers
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainer(id: string, trainer: Partial<InsertTrainer>): Promise<Trainer | undefined>;
  deleteTrainer(id: string): Promise<void>;

  // Trainees
  getTrainees(): Promise<Trainee[]>;
  getTrainee(id: string): Promise<Trainee | undefined>;
  getTraineeByEmail(email: string): Promise<Trainee | undefined>;
  createTrainee(trainee: InsertTrainee): Promise<Trainee>;
  updateTrainee(id: string, trainee: Partial<InsertTrainee>): Promise<Trainee | undefined>;
  deleteTrainee(id: string): Promise<void>;

  // Programs
  getPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, program: Partial<InsertProgram>): Promise<Program | undefined>;
  deleteProgram(id: string): Promise<void>;

  // Sessions
  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  getSessionsStartingBetween(from: Date, to: Date): Promise<Session[]>;

  // Enrollments
  getEnrollment(id: string): Promise<Enrollment | undefined>;
  getEnrollments(sessionId?: string): Promise<Enrollment[]>;
  getEnrollmentsByTrainee(traineeId: string): Promise<Enrollment[]>;
  getEnrollmentCount(sessionId: string): Promise<number>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment | undefined>;
  deleteEnrollment(id: string): Promise<void>;

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Email Logs
  getEmailLogs(): Promise<EmailLog[]>;
  getEmailLog(id: string): Promise<EmailLog | undefined>;
  getPendingEmailLogs(): Promise<EmailLog[]>;
  updateEmailLog(id: string, data: Partial<InsertEmailLog>): Promise<EmailLog | undefined>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;

  // Document Templates
  getDocumentTemplates(): Promise<DocumentTemplate[]>;
  getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined>;
  createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate>;
  updateDocumentTemplate(id: string, template: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate | undefined>;
  deleteDocumentTemplate(id: string): Promise<void>;

  // Generated Documents
  getGeneratedDocuments(): Promise<GeneratedDocument[]>;
  getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined>;
  createGeneratedDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument>;
  deleteGeneratedDocument(id: string): Promise<void>;

  // Prospects
  getProspects(): Promise<Prospect[]>;
  getProspect(id: string): Promise<Prospect | undefined>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  updateProspect(id: string, prospect: Partial<InsertProspect>): Promise<Prospect | undefined>;
  deleteProspect(id: string): Promise<void>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;
  getNextQuoteNumber(): Promise<string>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;
  getNextInvoiceNumber(): Promise<string>;

  // Payments
  getPayments(invoiceId?: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // E-Learning Modules
  getElearningModules(sessionId?: string): Promise<ElearningModule[]>;
  getElearningModule(id: string): Promise<ElearningModule | undefined>;
  createElearningModule(module: InsertElearningModule): Promise<ElearningModule>;
  updateElearningModule(id: string, module: Partial<InsertElearningModule>): Promise<ElearningModule | undefined>;
  deleteElearningModule(id: string): Promise<void>;

  // E-Learning Blocks
  getElearningBlocks(moduleId: string): Promise<ElearningBlock[]>;
  getElearningBlock(id: string): Promise<ElearningBlock | undefined>;
  createElearningBlock(block: InsertElearningBlock): Promise<ElearningBlock>;
  updateElearningBlock(id: string, block: Partial<InsertElearningBlock>): Promise<ElearningBlock | undefined>;
  deleteElearningBlock(id: string): Promise<void>;

  // Quiz Questions
  getQuizQuestions(blockId: string): Promise<QuizQuestion[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  updateQuizQuestion(id: string, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined>;
  deleteQuizQuestion(id: string): Promise<void>;

  // Learner Progress
  getLearnerProgress(traineeId: string, moduleId?: string): Promise<LearnerProgress[]>;
  createLearnerProgress(progress: InsertLearnerProgress): Promise<LearnerProgress>;
  updateLearnerProgress(id: string, progress: Partial<InsertLearnerProgress>): Promise<LearnerProgress | undefined>;

  // Survey Templates
  getSurveyTemplates(): Promise<SurveyTemplate[]>;
  getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined>;
  createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate>;
  updateSurveyTemplate(id: string, template: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate | undefined>;
  deleteSurveyTemplate(id: string): Promise<void>;

  // Survey Responses
  getSurveyResponses(surveyId?: string, sessionId?: string): Promise<SurveyResponse[]>;
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;

  // Quality Actions
  getQualityActions(): Promise<QualityAction[]>;
  getQualityAction(id: string): Promise<QualityAction | undefined>;
  createQualityAction(action: InsertQualityAction): Promise<QualityAction>;
  updateQualityAction(id: string, action: Partial<InsertQualityAction>): Promise<QualityAction | undefined>;
  deleteQualityAction(id: string): Promise<void>;

  // Attendance Sheets
  getAttendanceSheets(sessionId?: string): Promise<AttendanceSheet[]>;
  getAttendanceSheet(id: string): Promise<AttendanceSheet | undefined>;
  createAttendanceSheet(sheet: InsertAttendanceSheet): Promise<AttendanceSheet>;
  updateAttendanceSheet(id: string, sheet: Partial<InsertAttendanceSheet>): Promise<AttendanceSheet | undefined>;
  deleteAttendanceSheet(id: string): Promise<void>;

  // Attendance Records
  getAttendanceRecords(sheetId?: string): Promise<AttendanceRecord[]>;
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: string, record: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord | undefined>;

  // Automation Rules
  getAutomationRules(): Promise<AutomationRule[]>;
  getAutomationRule(id: string): Promise<AutomationRule | undefined>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: string, rule: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: string): Promise<void>;

  // Automation Logs
  getAutomationLogs(limit?: number): Promise<AutomationLog[]>;
  createAutomationLog(log: InsertAutomationLog): Promise<AutomationLog>;
  getAutomationRulesByEvent(event: string): Promise<AutomationRule[]>;

  // Organization Settings
  getOrganizationSettings(): Promise<OrganizationSetting[]>;
  getOrganizationSetting(key: string): Promise<OrganizationSetting | undefined>;
  upsertOrganizationSetting(setting: InsertOrganizationSetting): Promise<OrganizationSetting>;

  // Enterprise Contacts
  getEnterpriseContacts(enterpriseId: string): Promise<EnterpriseContact[]>;
  createEnterpriseContact(contact: InsertEnterpriseContact): Promise<EnterpriseContact>;
  updateEnterpriseContact(id: string, contact: Partial<InsertEnterpriseContact>): Promise<EnterpriseContact | undefined>;
  deleteEnterpriseContact(id: string): Promise<void>;

  // Enterprise enrollments
  getEnrollmentsByEnterprise(enterpriseId: string): Promise<Enrollment[]>;

  // Session trainees
  getTraineesBySession(sessionId: string): Promise<Trainee[]>;

  // Trainer Documents
  getTrainerDocuments(trainerId: string): Promise<TrainerDocument[]>;
  createTrainerDocument(doc: InsertTrainerDocument): Promise<TrainerDocument>;
  updateTrainerDocument(id: string, doc: Partial<InsertTrainerDocument>): Promise<TrainerDocument | undefined>;
  deleteTrainerDocument(id: string): Promise<void>;

  // Trainer Evaluations
  getTrainerEvaluations(trainerId: string): Promise<TrainerEvaluation[]>;
  createTrainerEvaluation(evaluation: InsertTrainerEvaluation): Promise<TrainerEvaluation>;

  // Trainer sessions
  getSessionsByTrainer(trainerId: string): Promise<Session[]>;

  // Survey Responses update
  updateSurveyResponse(id: string, response: Partial<InsertSurveyResponse>): Promise<SurveyResponse | undefined>;

  // User Documents
  getUserDocuments(ownerId: string, ownerType?: string): Promise<UserDocument[]>;
  getUserDocument(id: string): Promise<UserDocument | undefined>;
  createUserDocument(doc: InsertUserDocument): Promise<UserDocument>;
  updateUserDocument(id: string, data: Partial<UserDocument>): Promise<UserDocument | undefined>;
  deleteUserDocument(id: string): Promise<void>;

  // Signatures
  getSignatures(signerId: string): Promise<Signature[]>;
  createSignature(signature: InsertSignature): Promise<Signature>;

  // Expense Notes
  getExpenseNotes(trainerId: string): Promise<ExpenseNote[]>;
  createExpenseNote(note: InsertExpenseNote): Promise<ExpenseNote>;
  updateExpenseNote(id: string, note: Partial<InsertExpenseNote>): Promise<ExpenseNote | undefined>;

  // Trainer Invoices
  getTrainerInvoices(trainerId: string): Promise<TrainerInvoice[]>;
  createTrainerInvoice(invoice: InsertTrainerInvoice): Promise<TrainerInvoice>;
  updateTrainerInvoice(id: string, data: Partial<InsertTrainerInvoice>): Promise<TrainerInvoice | undefined>;

  // Trainer Competencies
  getTrainerCompetencies(trainerId: string): Promise<TrainerCompetency[]>;
  getAllTrainerCompetencies(): Promise<TrainerCompetency[]>;
  createTrainerCompetency(data: InsertTrainerCompetency): Promise<TrainerCompetency>;
  updateTrainerCompetency(id: string, data: Partial<InsertTrainerCompetency>): Promise<TrainerCompetency | undefined>;
  deleteTrainerCompetency(id: string): Promise<void>;

  // Enterprise-specific queries
  getQuotesByEnterprise(enterpriseId: string): Promise<import("@shared/schema").Quote[]>;
  getInvoicesByEnterprise(enterpriseId: string): Promise<import("@shared/schema").Invoice[]>;
  getEnterpriseTrainees(enterpriseId: string): Promise<Trainee[]>;
  getEnterpriseSessions(enterpriseId: string): Promise<Session[]>;
  getEnterprisePrograms(enterpriseId: string): Promise<Program[]>;
  getGeneratedDocumentsByEnterprise(enterpriseId: string): Promise<GeneratedDocument[]>;

  // Program Prerequisites
  getProgramPrerequisites(programId: string): Promise<ProgramPrerequisite[]>;
  createProgramPrerequisite(data: InsertProgramPrerequisite): Promise<ProgramPrerequisite>;
  deleteProgramPrerequisite(id: string): Promise<void>;

  // Trainee Certifications
  getTraineeCertifications(traineeId: string): Promise<TraineeCertification[]>;
  getAllTraineeCertifications(): Promise<TraineeCertification[]>;
  createTraineeCertification(data: InsertTraineeCertification): Promise<TraineeCertification>;
  updateTraineeCertification(id: string, data: Partial<InsertTraineeCertification>): Promise<TraineeCertification | undefined>;
  deleteTraineeCertification(id: string): Promise<void>;
  getExpiringCertifications(withinDays: number): Promise<TraineeCertification[]>;
  getCertificationsExpiringInRange(fromDays: number, toDays: number): Promise<TraineeCertification[]>;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  // ---- Users ----
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByTrainerId(trainerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.trainerId, trainerId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      permissions: insertUser.permissions as string[] | null | undefined,
    }).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    return result;
  }

  // ---- Enterprises ----
  async getEnterprises(): Promise<Enterprise[]> {
    return db.select().from(enterprises);
  }

  async getEnterprise(id: string): Promise<Enterprise | undefined> {
    const [enterprise] = await db.select().from(enterprises).where(eq(enterprises.id, id));
    return enterprise;
  }

  async createEnterprise(enterprise: InsertEnterprise): Promise<Enterprise> {
    const [result] = await db.insert(enterprises).values(enterprise).returning();
    return result;
  }

  async updateEnterprise(id: string, data: Partial<InsertEnterprise>): Promise<Enterprise | undefined> {
    const [result] = await db.update(enterprises).set(data).where(eq(enterprises.id, id)).returning();
    return result;
  }

  async deleteEnterprise(id: string): Promise<void> {
    await db.delete(enterprises).where(eq(enterprises.id, id));
  }

  // ---- Trainers ----
  async getTrainers(): Promise<Trainer[]> {
    return db.select().from(trainers);
  }

  async getTrainer(id: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer;
  }

  async createTrainer(trainer: InsertTrainer): Promise<Trainer> {
    const [result] = await db.insert(trainers).values(trainer).returning();
    return result;
  }

  async updateTrainer(id: string, data: Partial<InsertTrainer>): Promise<Trainer | undefined> {
    const [result] = await db.update(trainers).set(data).where(eq(trainers.id, id)).returning();
    return result;
  }

  async deleteTrainer(id: string): Promise<void> {
    await db.delete(trainers).where(eq(trainers.id, id));
  }

  // ---- Trainees ----
  async getTrainees(): Promise<Trainee[]> {
    return db.select().from(trainees);
  }

  async getTrainee(id: string): Promise<Trainee | undefined> {
    const [trainee] = await db.select().from(trainees).where(eq(trainees.id, id));
    return trainee;
  }

  async getTraineeByEmail(email: string): Promise<Trainee | undefined> {
    const [trainee] = await db.select().from(trainees).where(eq(trainees.email, email));
    return trainee;
  }

  async createTrainee(trainee: InsertTrainee): Promise<Trainee> {
    const [result] = await db.insert(trainees).values(trainee).returning();
    return result;
  }

  async updateTrainee(id: string, data: Partial<InsertTrainee>): Promise<Trainee | undefined> {
    const [result] = await db.update(trainees).set(data).where(eq(trainees.id, id)).returning();
    return result;
  }

  async deleteTrainee(id: string): Promise<void> {
    await db.delete(trainees).where(eq(trainees.id, id));
  }

  // ---- Programs ----
  async getPrograms(): Promise<Program[]> {
    return db.select().from(programs);
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [result] = await db.insert(programs).values(program as any).returning();
    return result;
  }

  async updateProgram(id: string, data: Partial<InsertProgram>): Promise<Program | undefined> {
    const [result] = await db.update(programs).set({ ...data, updatedAt: new Date() } as any).where(eq(programs.id, id)).returning();
    return result;
  }

  async deleteProgram(id: string): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
  }

  // ---- Sessions ----
  async getSessions(): Promise<Session[]> {
    return db.select().from(sessions);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [result] = await db.insert(sessions).values(session).returning();
    return result;
  }

  async updateSession(id: string, data: Partial<InsertSession>): Promise<Session | undefined> {
    const [result] = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning();
    return result;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getSessionsStartingBetween(from: Date, to: Date): Promise<Session[]> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    return db.select().from(sessions).where(
      and(
        sql`${sessions.startDate} >= ${fromStr}`,
        sql`${sessions.startDate} <= ${toStr}`
      )
    );
  }

  // ---- Enrollments ----
  async getEnrollment(id: string): Promise<Enrollment | undefined> {
    const [result] = await db.select().from(enrollments).where(eq(enrollments.id, id));
    return result;
  }

  async getEnrollments(sessionId?: string): Promise<Enrollment[]> {
    if (sessionId) {
      return db.select().from(enrollments).where(eq(enrollments.sessionId, sessionId));
    }
    return db.select().from(enrollments);
  }

  async getEnrollmentsByTrainee(traineeId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments).where(eq(enrollments.traineeId, traineeId));
  }

  async getEnrollmentCount(sessionId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(enrollments)
      .where(and(
        eq(enrollments.sessionId, sessionId),
        sql`${enrollments.status} NOT IN ('cancelled', 'no_show')`
      ));
    return result[0]?.count ?? 0;
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [result] = await db.insert(enrollments).values(enrollment).returning();
    return result;
  }

  async updateEnrollment(id: string, data: Partial<InsertEnrollment>): Promise<Enrollment | undefined> {
    const [result] = await db.update(enrollments).set(data).where(eq(enrollments.id, id)).returning();
    return result;
  }

  async deleteEnrollment(id: string): Promise<void> {
    await db.delete(enrollments).where(eq(enrollments.id, id));
  }

  // ---- Email Templates ----
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [result] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return result;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [result] = await db.insert(emailTemplates).values(template as any).returning();
    return result;
  }

  async updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [result] = await db.update(emailTemplates).set({ ...data, updatedAt: new Date() } as any).where(eq(emailTemplates.id, id)).returning();
    return result;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // ---- Email Logs ----
  async getEmailLogs(): Promise<EmailLog[]> {
    return db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt));
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [result] = await db.insert(emailLogs).values(log).returning();
    return result;
  }

  async getEmailLog(id: string): Promise<EmailLog | undefined> {
    const [result] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return result;
  }

  async getPendingEmailLogs(): Promise<EmailLog[]> {
    return db.select().from(emailLogs).where(
      and(
        eq(emailLogs.status, "pending"),
        sql`(${emailLogs.scheduledAt} IS NULL OR ${emailLogs.scheduledAt} <= NOW())`
      )
    ).orderBy(emailLogs.createdAt);
  }

  async updateEmailLog(id: string, data: Partial<InsertEmailLog>): Promise<EmailLog | undefined> {
    const [result] = await db.update(emailLogs).set(data as any).where(eq(emailLogs.id, id)).returning();
    return result;
  }

  // ---- Document Templates ----
  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    return db.select().from(documentTemplates).orderBy(desc(documentTemplates.createdAt));
  }

  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    const [result] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id));
    return result;
  }

  async createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const [result] = await db.insert(documentTemplates).values(template as any).returning();
    return result;
  }

  async updateDocumentTemplate(id: string, data: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate | undefined> {
    const [result] = await db.update(documentTemplates).set({ ...data, updatedAt: new Date() } as any).where(eq(documentTemplates.id, id)).returning();
    return result;
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    await db.delete(documentTemplates).where(eq(documentTemplates.id, id));
  }

  // ---- Generated Documents ----
  async getGeneratedDocuments(): Promise<GeneratedDocument[]> {
    return db.select().from(generatedDocuments).orderBy(desc(generatedDocuments.createdAt));
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined> {
    const [result] = await db.select().from(generatedDocuments).where(eq(generatedDocuments.id, id));
    return result;
  }

  async createGeneratedDocument(doc: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const [result] = await db.insert(generatedDocuments).values(doc).returning();
    return result;
  }

  async deleteGeneratedDocument(id: string): Promise<void> {
    await db.delete(generatedDocuments).where(eq(generatedDocuments.id, id));
  }

  // ---- Prospects ----
  async getProspects(): Promise<Prospect[]> {
    return db.select().from(prospects).orderBy(desc(prospects.createdAt));
  }

  async getProspect(id: string): Promise<Prospect | undefined> {
    const [result] = await db.select().from(prospects).where(eq(prospects.id, id));
    return result;
  }

  async createProspect(prospect: InsertProspect): Promise<Prospect> {
    const [result] = await db.insert(prospects).values(prospect).returning();
    return result;
  }

  async updateProspect(id: string, data: Partial<InsertProspect>): Promise<Prospect | undefined> {
    const [result] = await db.update(prospects).set({ ...data, updatedAt: new Date() }).where(eq(prospects.id, id)).returning();
    return result;
  }

  async deleteProspect(id: string): Promise<void> {
    await db.delete(prospects).where(eq(prospects.id, id));
  }

  // ---- Quotes ----
  async getQuotes(): Promise<Quote[]> {
    return db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [result] = await db.select().from(quotes).where(eq(quotes.id, id));
    return result;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [result] = await db.insert(quotes).values(quote as any).returning();
    return result;
  }

  async updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [result] = await db.update(quotes).set({ ...data, updatedAt: new Date() } as any).where(eq(quotes.id, id)).returning();
    return result;
  }

  async deleteQuote(id: string): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  async getNextQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(quotes)
      .where(sql`${quotes.number} LIKE ${'DV-' + year + '-%'}`);
    const next = (result[0]?.count ?? 0) + 1;
    return `DV-${year}-${next.toString().padStart(4, '0')}`;
  }

  // ---- Invoices ----
  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [result] = await db.select().from(invoices).where(eq(invoices.id, id));
    return result;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [result] = await db.insert(invoices).values(invoice as any).returning();
    return result;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [result] = await db.update(invoices).set({ ...data, updatedAt: new Date() } as any).where(eq(invoices.id, id)).returning();
    return result;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(invoices)
      .where(sql`${invoices.number} LIKE ${'FA-' + year + '-%'}`);
    const next = (result[0]?.count ?? 0) + 1;
    return `FA-${year}-${next.toString().padStart(4, '0')}`;
  }

  // ---- Payments ----
  async getPayments(invoiceId?: string): Promise<Payment[]> {
    if (invoiceId) {
      return db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.createdAt));
    }
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db.insert(payments).values(payment).returning();
    return result;
  }

  // ---- E-Learning Modules ----
  async getElearningModules(sessionId?: string): Promise<ElearningModule[]> {
    if (sessionId) {
      return db.select().from(elearningModules).where(eq(elearningModules.sessionId, sessionId));
    }
    return db.select().from(elearningModules);
  }

  async getElearningModule(id: string): Promise<ElearningModule | undefined> {
    const [result] = await db.select().from(elearningModules).where(eq(elearningModules.id, id));
    return result;
  }

  async createElearningModule(module: InsertElearningModule): Promise<ElearningModule> {
    const [result] = await db.insert(elearningModules).values(module).returning();
    return result;
  }

  async updateElearningModule(id: string, data: Partial<InsertElearningModule>): Promise<ElearningModule | undefined> {
    const [result] = await db.update(elearningModules).set(data).where(eq(elearningModules.id, id)).returning();
    return result;
  }

  async deleteElearningModule(id: string): Promise<void> {
    await db.delete(elearningModules).where(eq(elearningModules.id, id));
  }

  // ---- E-Learning Blocks ----
  async getElearningBlocks(moduleId: string): Promise<ElearningBlock[]> {
    return db.select().from(elearningBlocks).where(eq(elearningBlocks.moduleId, moduleId));
  }

  async getElearningBlock(id: string): Promise<ElearningBlock | undefined> {
    const [result] = await db.select().from(elearningBlocks).where(eq(elearningBlocks.id, id));
    return result;
  }

  async createElearningBlock(block: InsertElearningBlock): Promise<ElearningBlock> {
    const [result] = await db.insert(elearningBlocks).values(block).returning();
    return result;
  }

  async updateElearningBlock(id: string, data: Partial<InsertElearningBlock>): Promise<ElearningBlock | undefined> {
    const [result] = await db.update(elearningBlocks).set(data).where(eq(elearningBlocks.id, id)).returning();
    return result;
  }

  async deleteElearningBlock(id: string): Promise<void> {
    await db.delete(elearningBlocks).where(eq(elearningBlocks.id, id));
  }

  // ---- Quiz Questions ----
  async getQuizQuestions(blockId: string): Promise<QuizQuestion[]> {
    return db.select().from(quizQuestions).where(eq(quizQuestions.blockId, blockId));
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [result] = await db.insert(quizQuestions).values(question as any).returning();
    return result;
  }

  async updateQuizQuestion(id: string, data: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> {
    const [result] = await db.update(quizQuestions).set(data as any).where(eq(quizQuestions.id, id)).returning();
    return result;
  }

  async deleteQuizQuestion(id: string): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  }

  // ---- Learner Progress ----
  async getLearnerProgress(traineeId: string, moduleId?: string): Promise<LearnerProgress[]> {
    if (moduleId) {
      return db.select().from(learnerProgress).where(and(eq(learnerProgress.traineeId, traineeId), eq(learnerProgress.moduleId, moduleId)));
    }
    return db.select().from(learnerProgress).where(eq(learnerProgress.traineeId, traineeId));
  }

  async createLearnerProgress(progress: InsertLearnerProgress): Promise<LearnerProgress> {
    const [result] = await db.insert(learnerProgress).values(progress).returning();
    return result;
  }

  async updateLearnerProgress(id: string, data: Partial<InsertLearnerProgress>): Promise<LearnerProgress | undefined> {
    const [result] = await db.update(learnerProgress).set(data).where(eq(learnerProgress.id, id)).returning();
    return result;
  }

  // ---- Survey Templates ----
  async getSurveyTemplates(): Promise<SurveyTemplate[]> {
    return db.select().from(surveyTemplates).orderBy(desc(surveyTemplates.createdAt));
  }

  async getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined> {
    const [result] = await db.select().from(surveyTemplates).where(eq(surveyTemplates.id, id));
    return result;
  }

  async createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate> {
    const [result] = await db.insert(surveyTemplates).values(template as any).returning();
    return result;
  }

  async updateSurveyTemplate(id: string, data: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate | undefined> {
    const [result] = await db.update(surveyTemplates).set(data as any).where(eq(surveyTemplates.id, id)).returning();
    return result;
  }

  async deleteSurveyTemplate(id: string): Promise<void> {
    await db.delete(surveyTemplates).where(eq(surveyTemplates.id, id));
  }

  // ---- Survey Responses ----
  async getSurveyResponses(surveyId?: string, sessionId?: string): Promise<SurveyResponse[]> {
    if (surveyId && sessionId) {
      return db.select().from(surveyResponses).where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.sessionId, sessionId)));
    }
    if (surveyId) {
      return db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, surveyId));
    }
    if (sessionId) {
      return db.select().from(surveyResponses).where(eq(surveyResponses.sessionId, sessionId));
    }
    return db.select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt));
  }

  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const [result] = await db.insert(surveyResponses).values(response as any).returning();
    return result;
  }

  // ---- Quality Actions ----
  async getQualityActions(): Promise<QualityAction[]> {
    return db.select().from(qualityActions).orderBy(desc(qualityActions.createdAt));
  }

  async getQualityAction(id: string): Promise<QualityAction | undefined> {
    const [result] = await db.select().from(qualityActions).where(eq(qualityActions.id, id));
    return result;
  }

  async createQualityAction(action: InsertQualityAction): Promise<QualityAction> {
    const [result] = await db.insert(qualityActions).values(action).returning();
    return result;
  }

  async updateQualityAction(id: string, data: Partial<InsertQualityAction>): Promise<QualityAction | undefined> {
    const [result] = await db.update(qualityActions).set({ ...data, updatedAt: new Date() }).where(eq(qualityActions.id, id)).returning();
    return result;
  }

  async deleteQualityAction(id: string): Promise<void> {
    await db.delete(qualityActions).where(eq(qualityActions.id, id));
  }

  // ---- Attendance Sheets ----
  async getAttendanceSheets(sessionId?: string): Promise<AttendanceSheet[]> {
    if (sessionId) {
      return db.select().from(attendanceSheets).where(eq(attendanceSheets.sessionId, sessionId));
    }
    return db.select().from(attendanceSheets);
  }

  async getAttendanceSheet(id: string): Promise<AttendanceSheet | undefined> {
    const [result] = await db.select().from(attendanceSheets).where(eq(attendanceSheets.id, id));
    return result;
  }

  async createAttendanceSheet(sheet: InsertAttendanceSheet): Promise<AttendanceSheet> {
    const [result] = await db.insert(attendanceSheets).values(sheet).returning();
    return result;
  }

  async updateAttendanceSheet(id: string, data: Partial<InsertAttendanceSheet>): Promise<AttendanceSheet | undefined> {
    const [result] = await db.update(attendanceSheets).set(data).where(eq(attendanceSheets.id, id)).returning();
    return result;
  }

  async deleteAttendanceSheet(id: string): Promise<void> {
    await db.delete(attendanceSheets).where(eq(attendanceSheets.id, id));
  }

  // ---- Attendance Records ----
  async getAttendanceRecords(sheetId?: string): Promise<AttendanceRecord[]> {
    if (sheetId) {
      return db.select().from(attendanceRecords).where(eq(attendanceRecords.sheetId, sheetId));
    }
    return db.select().from(attendanceRecords);
  }

  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [result] = await db.insert(attendanceRecords).values(record).returning();
    return result;
  }

  async updateAttendanceRecord(id: string, data: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord | undefined> {
    const [result] = await db.update(attendanceRecords).set(data).where(eq(attendanceRecords.id, id)).returning();
    return result;
  }

  // ---- Automation Rules ----
  async getAutomationRules(): Promise<AutomationRule[]> {
    return db.select().from(automationRules).orderBy(desc(automationRules.createdAt));
  }

  async getAutomationRule(id: string): Promise<AutomationRule | undefined> {
    const [result] = await db.select().from(automationRules).where(eq(automationRules.id, id));
    return result;
  }

  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    const [result] = await db.insert(automationRules).values(rule as any).returning();
    return result;
  }

  async updateAutomationRule(id: string, data: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined> {
    const [result] = await db.update(automationRules).set(data as any).where(eq(automationRules.id, id)).returning();
    return result;
  }

  async deleteAutomationRule(id: string): Promise<void> {
    await db.delete(automationRules).where(eq(automationRules.id, id));
  }

  // ---- Automation Logs ----
  async getAutomationLogs(limit = 100): Promise<AutomationLog[]> {
    return db.select().from(automationLogs).orderBy(desc(automationLogs.executedAt)).limit(limit);
  }

  async createAutomationLog(log: InsertAutomationLog): Promise<AutomationLog> {
    const [result] = await db.insert(automationLogs).values(log as any).returning();
    return result;
  }

  async getAutomationRulesByEvent(event: string): Promise<AutomationRule[]> {
    return db.select().from(automationRules).where(
      and(eq(automationRules.event, event), eq(automationRules.active, true))
    );
  }

  // ---- Organization Settings ----
  async getOrganizationSettings(): Promise<OrganizationSetting[]> {
    return db.select().from(organizationSettings);
  }

  async getOrganizationSetting(key: string): Promise<OrganizationSetting | undefined> {
    const [result] = await db.select().from(organizationSettings).where(eq(organizationSettings.key, key));
    return result;
  }

  async upsertOrganizationSetting(setting: InsertOrganizationSetting): Promise<OrganizationSetting> {
    const existing = await this.getOrganizationSetting(setting.key);
    if (existing) {
      const [result] = await db.update(organizationSettings)
        .set({ value: setting.value, updatedAt: new Date() })
        .where(eq(organizationSettings.key, setting.key))
        .returning();
      return result;
    }
    const [result] = await db.insert(organizationSettings).values(setting).returning();
    return result;
  }

  // ---- Enterprise Contacts ----
  async getEnterpriseContacts(enterpriseId: string): Promise<EnterpriseContact[]> {
    return db.select().from(enterpriseContacts).where(eq(enterpriseContacts.enterpriseId, enterpriseId)).orderBy(desc(enterpriseContacts.createdAt));
  }

  async createEnterpriseContact(contact: InsertEnterpriseContact): Promise<EnterpriseContact> {
    const [result] = await db.insert(enterpriseContacts).values(contact).returning();
    return result;
  }

  async updateEnterpriseContact(id: string, data: Partial<InsertEnterpriseContact>): Promise<EnterpriseContact | undefined> {
    const [result] = await db.update(enterpriseContacts).set(data).where(eq(enterpriseContacts.id, id)).returning();
    return result;
  }

  async deleteEnterpriseContact(id: string): Promise<void> {
    await db.delete(enterpriseContacts).where(eq(enterpriseContacts.id, id));
  }

  // ---- Enterprise enrollments ----
  async getEnrollmentsByEnterprise(enterpriseId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments).where(eq(enrollments.enterpriseId, enterpriseId)).orderBy(desc(enrollments.enrolledAt));
  }

  // ---- Session trainees ----
  async getTraineesBySession(sessionId: string): Promise<Trainee[]> {
    const enrollmentList = await db.select().from(enrollments).where(
      and(eq(enrollments.sessionId, sessionId), sql`${enrollments.status} NOT IN ('cancelled')`)
    );
    if (enrollmentList.length === 0) return [];
    const traineeIds = enrollmentList.map(e => e.traineeId);
    const result = await db.select().from(trainees).where(sql`${trainees.id} IN (${sql.join(traineeIds.map(id => sql`${id}`), sql`, `)})`);
    return result;
  }

  // ---- Trainer Documents ----
  async getTrainerDocuments(trainerId: string): Promise<TrainerDocument[]> {
    return db.select().from(trainerDocuments).where(eq(trainerDocuments.trainerId, trainerId)).orderBy(desc(trainerDocuments.uploadedAt));
  }

  async createTrainerDocument(doc: InsertTrainerDocument): Promise<TrainerDocument> {
    const [result] = await db.insert(trainerDocuments).values(doc).returning();
    return result;
  }

  async updateTrainerDocument(id: string, data: Partial<InsertTrainerDocument>): Promise<TrainerDocument | undefined> {
    const [result] = await db.update(trainerDocuments).set(data).where(eq(trainerDocuments.id, id)).returning();
    return result;
  }

  async deleteTrainerDocument(id: string): Promise<void> {
    await db.delete(trainerDocuments).where(eq(trainerDocuments.id, id));
  }

  // ---- Trainer Evaluations ----
  async getTrainerEvaluations(trainerId: string): Promise<TrainerEvaluation[]> {
    return db.select().from(trainerEvaluations).where(eq(trainerEvaluations.trainerId, trainerId)).orderBy(desc(trainerEvaluations.createdAt));
  }

  async createTrainerEvaluation(evaluation: InsertTrainerEvaluation): Promise<TrainerEvaluation> {
    const [result] = await db.insert(trainerEvaluations).values(evaluation).returning();
    return result;
  }

  // ---- Trainer sessions ----
  async getSessionsByTrainer(trainerId: string): Promise<Session[]> {
    return db.select().from(sessions).where(eq(sessions.trainerId, trainerId)).orderBy(desc(sessions.startDate));
  }

  // ---- Survey Response Update ----
  async updateSurveyResponse(id: string, data: Partial<InsertSurveyResponse>): Promise<SurveyResponse | undefined> {
    const [result] = await db.update(surveyResponses).set(data as any).where(eq(surveyResponses.id, id)).returning();
    return result;
  }

  // ---- User Documents ----
  async getUserDocuments(ownerId: string, ownerType?: string): Promise<UserDocument[]> {
    if (ownerType) {
      return db.select().from(userDocuments).where(and(eq(userDocuments.ownerId, ownerId), eq(userDocuments.ownerType, ownerType))).orderBy(desc(userDocuments.uploadedAt));
    }
    return db.select().from(userDocuments).where(eq(userDocuments.ownerId, ownerId)).orderBy(desc(userDocuments.uploadedAt));
  }

  async getUserDocument(id: string): Promise<UserDocument | undefined> {
    const [result] = await db.select().from(userDocuments).where(eq(userDocuments.id, id));
    return result;
  }

  async createUserDocument(doc: InsertUserDocument): Promise<UserDocument> {
    const [result] = await db.insert(userDocuments).values(doc).returning();
    return result;
  }

  async updateUserDocument(id: string, data: Partial<UserDocument>): Promise<UserDocument | undefined> {
    const [result] = await db.update(userDocuments).set(data as any).where(eq(userDocuments.id, id)).returning();
    return result;
  }

  async deleteUserDocument(id: string): Promise<void> {
    await db.delete(userDocuments).where(eq(userDocuments.id, id));
  }

  // ---- Signatures ----
  async getSignatures(signerId: string): Promise<Signature[]> {
    return db.select().from(signatures).where(eq(signatures.signerId, signerId)).orderBy(desc(signatures.signedAt));
  }

  async createSignature(signature: InsertSignature): Promise<Signature> {
    const [result] = await db.insert(signatures).values(signature).returning();
    return result;
  }

  // ---- Expense Notes ----
  async getAllExpenseNotes(): Promise<ExpenseNote[]> {
    return db.select().from(expenseNotes).orderBy(desc(expenseNotes.createdAt));
  }

  async getExpenseNotes(trainerId: string): Promise<ExpenseNote[]> {
    return db.select().from(expenseNotes).where(eq(expenseNotes.trainerId, trainerId)).orderBy(desc(expenseNotes.createdAt));
  }

  async createExpenseNote(note: InsertExpenseNote): Promise<ExpenseNote> {
    const [result] = await db.insert(expenseNotes).values(note).returning();
    return result;
  }

  async updateExpenseNote(id: string, data: Partial<InsertExpenseNote>): Promise<ExpenseNote | undefined> {
    const [result] = await db.update(expenseNotes).set({ ...data, updatedAt: new Date() } as any).where(eq(expenseNotes.id, id)).returning();
    return result;
  }

  // ---- Trainer Invoices ----
  async getAllTrainerInvoices(): Promise<TrainerInvoice[]> {
    return db.select().from(trainerInvoices).orderBy(desc(trainerInvoices.createdAt));
  }

  async getTrainerInvoices(trainerId: string): Promise<TrainerInvoice[]> {
    return db.select().from(trainerInvoices).where(eq(trainerInvoices.trainerId, trainerId)).orderBy(desc(trainerInvoices.createdAt));
  }

  async createTrainerInvoice(invoice: InsertTrainerInvoice): Promise<TrainerInvoice> {
    const [result] = await db.insert(trainerInvoices).values(invoice).returning();
    return result;
  }

  async updateTrainerInvoice(id: string, data: Partial<InsertTrainerInvoice>): Promise<TrainerInvoice | undefined> {
    const [result] = await db.update(trainerInvoices).set({ ...data, updatedAt: new Date() } as any).where(eq(trainerInvoices.id, id)).returning();
    return result;
  }

  // ---- Trainer Competencies ----
  async getTrainerCompetencies(trainerId: string): Promise<TrainerCompetency[]> {
    return db.select().from(trainerCompetencies).where(eq(trainerCompetencies.trainerId, trainerId)).orderBy(desc(trainerCompetencies.createdAt));
  }

  async getAllTrainerCompetencies(): Promise<TrainerCompetency[]> {
    return db.select().from(trainerCompetencies).orderBy(desc(trainerCompetencies.createdAt));
  }

  async createTrainerCompetency(data: InsertTrainerCompetency): Promise<TrainerCompetency> {
    const [result] = await db.insert(trainerCompetencies).values(data).returning();
    return result;
  }

  async updateTrainerCompetency(id: string, data: Partial<InsertTrainerCompetency>): Promise<TrainerCompetency | undefined> {
    const [result] = await db.update(trainerCompetencies).set({ ...data, updatedAt: new Date() } as any).where(eq(trainerCompetencies.id, id)).returning();
    return result;
  }

  async deleteTrainerCompetency(id: string): Promise<void> {
    await db.delete(trainerCompetencies).where(eq(trainerCompetencies.id, id));
  }

  // ---- Enterprise-specific queries ----
  async getQuotesByEnterprise(enterpriseId: string): Promise<import("@shared/schema").Quote[]> {
    return db.select().from(quotes).where(eq(quotes.enterpriseId, enterpriseId)).orderBy(desc(quotes.createdAt));
  }

  async getInvoicesByEnterprise(enterpriseId: string): Promise<import("@shared/schema").Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.enterpriseId, enterpriseId)).orderBy(desc(invoices.createdAt));
  }

  async getEnterpriseTrainees(enterpriseId: string): Promise<Trainee[]> {
    return db.select().from(trainees).where(eq(trainees.enterpriseId, enterpriseId));
  }

  async getEnterpriseSessions(enterpriseId: string): Promise<Session[]> {
    const enterpriseEnrollments = await db.select().from(enrollments).where(eq(enrollments.enterpriseId, enterpriseId));
    if (enterpriseEnrollments.length === 0) return [];
    const sessionIds = Array.from(new Set(enterpriseEnrollments.map(e => e.sessionId)));
    return db.select().from(sessions).where(inArray(sessions.id, sessionIds)).orderBy(desc(sessions.startDate));
  }

  async getEnterprisePrograms(enterpriseId: string): Promise<Program[]> {
    const enterpriseSessions = await this.getEnterpriseSessions(enterpriseId);
    if (enterpriseSessions.length === 0) return [];
    const programIds = Array.from(new Set(enterpriseSessions.map(s => s.programId)));
    return db.select().from(programs).where(inArray(programs.id, programIds));
  }

  async getGeneratedDocumentsByEnterprise(enterpriseId: string): Promise<GeneratedDocument[]> {
    const enterpriseSessions = await this.getEnterpriseSessions(enterpriseId);
    if (enterpriseSessions.length === 0) return [];
    const sessionIds = enterpriseSessions.map(s => s.id);
    return db.select().from(generatedDocuments)
      .where(and(
        inArray(generatedDocuments.sessionId, sessionIds),
        inArray(generatedDocuments.type, ["convention", "attestation", "certificat", "bpf"])
      ))
      .orderBy(desc(generatedDocuments.createdAt));
  }

  // ---- Program Prerequisites ----
  async getProgramPrerequisites(programId: string): Promise<ProgramPrerequisite[]> {
    return db.select().from(programPrerequisites).where(eq(programPrerequisites.programId, programId));
  }

  async createProgramPrerequisite(data: InsertProgramPrerequisite): Promise<ProgramPrerequisite> {
    const [result] = await db.insert(programPrerequisites).values(data as any).returning();
    return result;
  }

  async deleteProgramPrerequisite(id: string): Promise<void> {
    await db.delete(programPrerequisites).where(eq(programPrerequisites.id, id));
  }

  // ---- Trainee Certifications ----
  async getTraineeCertifications(traineeId: string): Promise<TraineeCertification[]> {
    return db.select().from(traineeCertifications).where(eq(traineeCertifications.traineeId, traineeId));
  }

  async getAllTraineeCertifications(): Promise<TraineeCertification[]> {
    return db.select().from(traineeCertifications);
  }

  async createTraineeCertification(data: InsertTraineeCertification): Promise<TraineeCertification> {
    const [result] = await db.insert(traineeCertifications).values(data).returning();
    return result;
  }

  async updateTraineeCertification(id: string, data: Partial<InsertTraineeCertification>): Promise<TraineeCertification | undefined> {
    const [result] = await db.update(traineeCertifications).set(data).where(eq(traineeCertifications.id, id)).returning();
    return result;
  }

  async deleteTraineeCertification(id: string): Promise<void> {
    await db.delete(traineeCertifications).where(eq(traineeCertifications.id, id));
  }

  async getExpiringCertifications(withinDays: number): Promise<TraineeCertification[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);
    return db.select().from(traineeCertifications)
      .where(and(
        eq(traineeCertifications.status, "valid"),
        sql`${traineeCertifications.expiresAt} IS NOT NULL AND ${traineeCertifications.expiresAt} <= ${futureDate.toISOString().split('T')[0]}`
      ));
  }

  async getCertificationsExpiringInRange(fromDays: number, toDays: number): Promise<TraineeCertification[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + fromDays);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + toDays);
    return db.select().from(traineeCertifications)
      .where(and(
        eq(traineeCertifications.status, "valid"),
        sql`${traineeCertifications.expiresAt} IS NOT NULL AND ${traineeCertifications.expiresAt} >= ${fromDate.toISOString().split('T')[0]} AND ${traineeCertifications.expiresAt} <= ${toDate.toISOString().split('T')[0]}`
      ));
  }
}

export const storage = new DatabaseStorage();
