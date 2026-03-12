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
  type EmailTrackingEvent, type InsertEmailTrackingEvent,
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
  type EvaluationAssignment, type InsertEvaluationAssignment,
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
  type SmsTemplate, type InsertSmsTemplate,
  type SmsLog, type InsertSmsLog,
  type SessionResource, type InsertSessionResource,
  type ScormPackage, type InsertScormPackage,
  type FormativeSubmission, type InsertFormativeSubmission,
  type ForumPost, type InsertForumPost,
  type ForumReply, type InsertForumReply,
  type ForumMute, type InsertForumMute,
  type AnalysisComment, type InsertAnalysisComment,
  type Conversation, type InsertConversation,
  type ConversationParticipant, type InsertConversationParticipant,
  type DirectMessage, type InsertDirectMessage,
  type ContactTag, type InsertContactTag,
  type ContactTagAssignment, type InsertContactTagAssignment,
  type MarketingCampaign, type InsertMarketingCampaign,
  type CampaignRecipient, type InsertCampaignRecipient,
  type ProspectActivity, type InsertProspectActivity,
  type PaymentSchedule, type InsertPaymentSchedule,
  type BankTransaction, type InsertBankTransaction,
  type ConnectionLog, type InsertConnectionLog,
  type AbsenceRecord, type InsertAbsenceRecord,
  type QualityIncident, type InsertQualityIncident,
  type VeilleEntry, type InsertVeilleEntry,
  type DigitalBadge, type InsertDigitalBadge,
  type BadgeAward, type InsertBadgeAward,
  type GamificationPoints, type InsertGamificationPoints,
  type TaskList, type InsertTaskList,
  type TaskItem, type InsertTaskItem,
  type AiDocumentAnalysis, type InsertAiDocumentAnalysis,
  type CesuSubmission, type InsertCesuSubmission,
  type SsoToken, type InsertSsoToken,
  type ApiKey, type InsertApiKey,
  type WidgetConfiguration, type InsertWidgetConfiguration,
  type AuditLog, type InsertAuditLog,
  type RgpdRequest, type InsertRgpdRequest,
  type DataImport, type InsertDataImport,
  type DataArchive, type InsertDataArchive,
  type SessionDate, type InsertSessionDate,
  type Notification, type InsertNotification,
  users, enterprises, trainers, trainees, programs, sessions, enrollments,
  emailTemplates, emailLogs, emailTrackingEvents, documentTemplates, generatedDocuments,
  prospects, quotes, invoices, payments, paymentSchedules, bankTransactions, connectionLogs,
  elearningModules, elearningBlocks, quizQuestions, learnerProgress,
  sessionResources, scormPackages, formativeSubmissions,
  surveyTemplates, surveyResponses, evaluationAssignments, qualityActions,
  attendanceSheets, attendanceRecords,
  automationRules, automationLogs, organizationSettings,
  enterpriseContacts, trainerDocuments, trainerEvaluations,
  userDocuments, signatures, expenseNotes, trainerInvoices,
  trainerCompetencies, programPrerequisites, traineeCertifications,
  smsTemplates, smsLogs,
  forumPosts, forumReplies, forumMutes,
  analysisComments,
  conversations, conversationParticipants, directMessages,
  contactTags, contactTagAssignments, marketingCampaigns, campaignRecipients, prospectActivities,
  absenceRecords, qualityIncidents, veilleEntries,
  digitalBadges, badgeAwards, gamificationPoints, taskLists, taskItems,
  aiDocumentAnalyses, cesuSubmissions,
  ssoTokens, apiKeys, widgetConfigurations,
  auditLogs, rgpdRequests,
  dataImports, dataArchives,
  sessionDates,
  notifications,
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, inArray, lte } from "drizzle-orm";
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
  getWaitlistEntries(sessionId: string): Promise<Enrollment[]>;
  getWaitlistCount(sessionId: string): Promise<number>;
  getNextWaitlistEntry(sessionId: string): Promise<Enrollment | undefined>;
  promoteFromWaitlist(sessionId: string): Promise<Enrollment | undefined>;
  reorderWaitlistAfterRemoval(sessionId: string, removedPosition: number): Promise<void>;

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

  // Email Tracking
  getEmailLogByTrackingId(trackingId: string): Promise<EmailLog | undefined>;
  recordEmailOpen(trackingId: string, ip: string | null, userAgent: string | null): Promise<void>;
  getEmailTrackingEvents(emailLogId: string): Promise<EmailTrackingEvent[]>;

  // SMS Templates
  getSmsTemplates(): Promise<SmsTemplate[]>;
  getSmsTemplate(id: string): Promise<SmsTemplate | undefined>;
  createSmsTemplate(template: InsertSmsTemplate): Promise<SmsTemplate>;
  updateSmsTemplate(id: string, template: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined>;
  deleteSmsTemplate(id: string): Promise<void>;

  // SMS Logs
  getSmsLogs(): Promise<SmsLog[]>;
  getSmsLog(id: string): Promise<SmsLog | undefined>;
  getPendingSmsLogs(): Promise<SmsLog[]>;
  createSmsLog(log: InsertSmsLog): Promise<SmsLog>;
  updateSmsLog(id: string, data: Partial<InsertSmsLog>): Promise<SmsLog | undefined>;

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
  updateGeneratedDocument(id: string, data: Partial<InsertGeneratedDocument>): Promise<GeneratedDocument | undefined>;
  deleteGeneratedDocument(id: string): Promise<void>;
  getGeneratedDocumentsByQuote(quoteId: string): Promise<GeneratedDocument[]>;
  getGeneratedDocumentsPendingSignature(signerId: string, signerType: string): Promise<GeneratedDocument[]>;

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

  // Payment Schedules
  getPaymentSchedules(invoiceId: string): Promise<PaymentSchedule[]>;
  createPaymentSchedule(schedule: InsertPaymentSchedule): Promise<PaymentSchedule>;
  updatePaymentSchedule(id: string, data: Partial<InsertPaymentSchedule>): Promise<PaymentSchedule | undefined>;
  deletePaymentSchedulesByInvoice(invoiceId: string): Promise<void>;

  // Bank Transactions
  getBankTransactions(): Promise<BankTransaction[]>;
  createBankTransaction(tx: InsertBankTransaction): Promise<BankTransaction>;
  updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined>;
  matchBankTransaction(id: string, invoiceId: string, paymentId: string): Promise<BankTransaction | undefined>;

  // Connection Logs
  getConnectionLogs(filters?: { userId?: string; sessionId?: string; from?: string; to?: string }): Promise<ConnectionLog[]>;
  createConnectionLog(log: InsertConnectionLog): Promise<ConnectionLog>;

  // Absence Records
  getAbsenceRecords(filters?: { sessionId?: string; traineeId?: string; status?: string }): Promise<AbsenceRecord[]>;
  getAbsenceRecord(id: string): Promise<AbsenceRecord | undefined>;
  createAbsenceRecord(record: InsertAbsenceRecord): Promise<AbsenceRecord>;
  updateAbsenceRecord(id: string, data: Partial<InsertAbsenceRecord>): Promise<AbsenceRecord | undefined>;
  deleteAbsenceRecord(id: string): Promise<void>;

  // Quality Incidents
  getQualityIncidents(filters?: { sessionId?: string; status?: string; type?: string }): Promise<QualityIncident[]>;
  getQualityIncident(id: string): Promise<QualityIncident | undefined>;
  createQualityIncident(incident: InsertQualityIncident): Promise<QualityIncident>;
  updateQualityIncident(id: string, data: Partial<InsertQualityIncident>): Promise<QualityIncident | undefined>;
  deleteQualityIncident(id: string): Promise<void>;

  // Veille Entries
  getVeilleEntries(filters?: { type?: string; status?: string }): Promise<VeilleEntry[]>;
  getVeilleEntry(id: string): Promise<VeilleEntry | undefined>;
  createVeilleEntry(entry: InsertVeilleEntry): Promise<VeilleEntry>;
  updateVeilleEntry(id: string, data: Partial<InsertVeilleEntry>): Promise<VeilleEntry | undefined>;
  deleteVeilleEntry(id: string): Promise<void>;

  // Digital Badges
  getDigitalBadges(): Promise<DigitalBadge[]>;
  getDigitalBadge(id: string): Promise<DigitalBadge | undefined>;
  createDigitalBadge(badge: InsertDigitalBadge): Promise<DigitalBadge>;
  updateDigitalBadge(id: string, data: Partial<InsertDigitalBadge>): Promise<DigitalBadge | undefined>;
  deleteDigitalBadge(id: string): Promise<void>;

  // Badge Awards
  getBadgeAwards(filters?: { badgeId?: string; traineeId?: string }): Promise<BadgeAward[]>;
  getBadgeAward(id: string): Promise<BadgeAward | undefined>;
  createBadgeAward(award: InsertBadgeAward): Promise<BadgeAward>;
  updateBadgeAward(id: string, data: Partial<InsertBadgeAward>): Promise<BadgeAward | undefined>;
  deleteBadgeAward(id: string): Promise<void>;

  // Gamification Points
  getGamificationPoints(filters?: { traineeId?: string; moduleId?: string; sessionId?: string }): Promise<GamificationPoints[]>;
  createGamificationPoint(point: InsertGamificationPoints): Promise<GamificationPoints>;
  getLeaderboard(filters: { sessionId?: string; moduleId?: string; limit?: number }): Promise<Array<{ traineeId: string; traineeName: string; totalXP: number; badgeCount: number }>>;

  // Task Lists
  getTaskLists(filters?: { traineeId?: string; sessionId?: string; status?: string }): Promise<TaskList[]>;
  getTaskList(id: string): Promise<TaskList | undefined>;
  createTaskList(list: InsertTaskList): Promise<TaskList>;
  updateTaskList(id: string, data: Partial<InsertTaskList>): Promise<TaskList | undefined>;
  deleteTaskList(id: string): Promise<void>;

  // Task Items
  getTaskItems(taskListId: string): Promise<TaskItem[]>;
  getTaskItem(id: string): Promise<TaskItem | undefined>;
  createTaskItem(item: InsertTaskItem): Promise<TaskItem>;
  updateTaskItem(id: string, data: Partial<InsertTaskItem>): Promise<TaskItem | undefined>;
  deleteTaskItem(id: string): Promise<void>;

  // AI Document Analyses
  getAiDocumentAnalyses(filters?: { traineeId?: string; trainerId?: string; status?: string }): Promise<AiDocumentAnalysis[]>;
  getAiDocumentAnalysis(id: string): Promise<AiDocumentAnalysis | undefined>;
  createAiDocumentAnalysis(analysis: InsertAiDocumentAnalysis): Promise<AiDocumentAnalysis>;
  updateAiDocumentAnalysis(id: string, data: Partial<InsertAiDocumentAnalysis>): Promise<AiDocumentAnalysis | undefined>;
  deleteAiDocumentAnalysis(id: string): Promise<void>;

  // CESU Submissions
  getCesuSubmissions(filters?: { sessionId?: string; status?: string }): Promise<CesuSubmission[]>;
  getCesuSubmission(id: string): Promise<CesuSubmission | undefined>;
  createCesuSubmission(submission: InsertCesuSubmission): Promise<CesuSubmission>;
  updateCesuSubmission(id: string, data: Partial<InsertCesuSubmission>): Promise<CesuSubmission | undefined>;
  deleteCesuSubmission(id: string): Promise<void>;

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

  // Session Resources
  getSessionResources(sessionId: string): Promise<SessionResource[]>;
  getSessionResource(id: string): Promise<SessionResource | undefined>;
  createSessionResource(resource: InsertSessionResource): Promise<SessionResource>;
  updateSessionResource(id: string, data: Partial<InsertSessionResource>): Promise<SessionResource | undefined>;
  deleteSessionResource(id: string): Promise<void>;

  // SCORM Packages
  getScormPackages(): Promise<ScormPackage[]>;
  getScormPackage(id: string): Promise<ScormPackage | undefined>;
  createScormPackage(pkg: InsertScormPackage): Promise<ScormPackage>;
  deleteScormPackage(id: string): Promise<void>;

  // Formative Submissions
  getFormativeSubmissions(blockId?: string, traineeId?: string): Promise<FormativeSubmission[]>;
  getFormativeSubmission(id: string): Promise<FormativeSubmission | undefined>;
  createFormativeSubmission(submission: InsertFormativeSubmission): Promise<FormativeSubmission>;
  updateFormativeSubmission(id: string, data: Partial<InsertFormativeSubmission>): Promise<FormativeSubmission | undefined>;

  // Survey Templates
  getSurveyTemplates(): Promise<SurveyTemplate[]>;
  getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined>;
  createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate>;
  updateSurveyTemplate(id: string, template: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate | undefined>;
  deleteSurveyTemplate(id: string): Promise<void>;

  // Survey Responses
  getSurveyResponses(surveyId?: string, sessionId?: string): Promise<SurveyResponse[]>;
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;

  // Evaluation Assignments
  getEvaluationAssignments(sessionId?: string, traineeId?: string): Promise<EvaluationAssignment[]>;
  getEvaluationAssignment(id: string): Promise<EvaluationAssignment | undefined>;
  getEvaluationAssignmentByToken(token: string): Promise<EvaluationAssignment | undefined>;
  createEvaluationAssignment(assignment: InsertEvaluationAssignment): Promise<EvaluationAssignment>;
  updateEvaluationAssignment(id: string, data: Partial<InsertEvaluationAssignment>): Promise<EvaluationAssignment | undefined>;
  getScheduledEvaluationAssignments(before: Date): Promise<EvaluationAssignment[]>;

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
  getAttendanceRecordByToken(token: string): Promise<AttendanceRecord | undefined>;
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: string, record: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord | undefined>;

  // Session Dates (jours d'intervention)
  getSessionDates(sessionId: string): Promise<SessionDate[]>;
  getAllSessionDates(): Promise<SessionDate[]>;
  createSessionDate(data: InsertSessionDate): Promise<SessionDate>;
  deleteSessionDatesBySessionId(sessionId: string): Promise<void>;

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

  // Forum
  getForumPosts(sessionId: string): Promise<ForumPost[]>;
  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  deleteForumPost(id: string): Promise<void>;
  getForumReplies(postId: string): Promise<ForumReply[]>;
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  deleteForumReply(id: string): Promise<void>;
  getForumMute(userId: string, sessionId: string): Promise<ForumMute | undefined>;
  createForumMute(mute: InsertForumMute): Promise<ForumMute>;
  deleteForumMute(userId: string, sessionId: string): Promise<void>;

  // Analysis Comments
  getAnalysisComments(sessionId: string, visibility?: string): Promise<AnalysisComment[]>;
  getAnalysisComment(id: string): Promise<AnalysisComment | undefined>;
  createAnalysisComment(comment: InsertAnalysisComment): Promise<AnalysisComment>;
  updateAnalysisComment(id: string, data: Partial<InsertAnalysisComment>): Promise<AnalysisComment | undefined>;
  deleteAnalysisComment(id: string): Promise<void>;

  // Messaging
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]>;
  addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  removeConversationParticipant(conversationId: string, userId: string): Promise<void>;
  updateLastRead(conversationId: string, userId: string): Promise<void>;
  getMessages(conversationId: string): Promise<DirectMessage[]>;
  createMessage(message: InsertDirectMessage): Promise<DirectMessage>;
  deleteMessage(id: string): Promise<void>;
  findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined>;

  // CRM & Marketing
  getContactTags(): Promise<ContactTag[]>;
  createContactTag(tag: InsertContactTag): Promise<ContactTag>;
  updateContactTag(id: string, data: Partial<InsertContactTag>): Promise<ContactTag | undefined>;
  deleteContactTag(id: string): Promise<void>;
  getContactTagAssignments(contactType?: string, contactId?: string): Promise<ContactTagAssignment[]>;
  assignTag(assignment: InsertContactTagAssignment): Promise<ContactTagAssignment>;
  removeTagAssignment(tagId: string, contactType: string, contactId: string): Promise<void>;
  getMarketingCampaigns(): Promise<MarketingCampaign[]>;
  getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  updateMarketingCampaign(id: string, data: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined>;
  deleteMarketingCampaign(id: string): Promise<void>;
  getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]>;
  addCampaignRecipients(recipients: InsertCampaignRecipient[]): Promise<CampaignRecipient[]>;
  updateCampaignRecipient(id: string, data: Partial<InsertCampaignRecipient>): Promise<void>;
  getProspectActivities(prospectId: string): Promise<ProspectActivity[]>;
  createProspectActivity(activity: InsertProspectActivity): Promise<ProspectActivity>;

  // SSO Tokens
  createSsoToken(data: InsertSsoToken): Promise<SsoToken>;
  getSsoTokenByToken(token: string): Promise<SsoToken | undefined>;
  markSsoTokenUsed(id: string): Promise<void>;

  // API Keys
  getApiKeys(): Promise<ApiKey[]>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<void>;

  // Widget Configurations
  getWidgetConfigurations(): Promise<WidgetConfiguration[]>;
  getWidgetConfiguration(id: string): Promise<WidgetConfiguration | undefined>;
  createWidgetConfiguration(data: InsertWidgetConfiguration): Promise<WidgetConfiguration>;
  updateWidgetConfiguration(id: string, data: Partial<InsertWidgetConfiguration>): Promise<WidgetConfiguration | undefined>;
  deleteWidgetConfiguration(id: string): Promise<void>;

  // Audit Logs
  getAuditLogs(filters?: { userId?: string; entityType?: string; action?: string; limit?: number; offset?: number }): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogCount(filters?: { userId?: string; entityType?: string; action?: string }): Promise<number>;

  // RGPD Requests
  getRgpdRequests(): Promise<RgpdRequest[]>;
  createRgpdRequest(request: InsertRgpdRequest): Promise<RgpdRequest>;
  updateRgpdRequest(id: string, data: Partial<InsertRgpdRequest>): Promise<RgpdRequest | undefined>;

  // Data Imports
  getDataImports(): Promise<DataImport[]>;
  createDataImport(data: InsertDataImport): Promise<DataImport>;
  updateDataImport(id: string, data: Partial<InsertDataImport>): Promise<DataImport | undefined>;

  // Data Archives
  getDataArchives(filters?: { entityType?: string; status?: string }): Promise<DataArchive[]>;
  createDataArchive(data: InsertDataArchive): Promise<DataArchive>;
  updateDataArchive(id: string, data: Partial<InsertDataArchive>): Promise<DataArchive | undefined>;
  getDataArchiveCount(): Promise<number>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
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

  async getValidatedEnrollmentsByTrainee(traineeId: string): Promise<Enrollment[]> {
    const validStatuses = ["pending", "registered", "confirmed", "attended", "completed"];
    return db.select().from(enrollments).where(
      and(
        eq(enrollments.traineeId, traineeId),
        inArray(enrollments.status, validStatuses)
      )
    );
  }

  async getEnrollmentCount(sessionId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(enrollments)
      .where(and(
        eq(enrollments.sessionId, sessionId),
        sql`${enrollments.status} NOT IN ('cancelled', 'no_show', 'waitlisted')`
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

  async getWaitlistEntries(sessionId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments)
      .where(and(
        eq(enrollments.sessionId, sessionId),
        eq(enrollments.status, "waitlisted")
      ))
      .orderBy(asc(enrollments.waitlistPosition));
  }

  async getWaitlistCount(sessionId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(enrollments)
      .where(and(
        eq(enrollments.sessionId, sessionId),
        eq(enrollments.status, "waitlisted")
      ));
    return result[0]?.count ?? 0;
  }

  async getNextWaitlistEntry(sessionId: string): Promise<Enrollment | undefined> {
    const [result] = await db.select().from(enrollments)
      .where(and(
        eq(enrollments.sessionId, sessionId),
        eq(enrollments.status, "waitlisted")
      ))
      .orderBy(asc(enrollments.waitlistPosition))
      .limit(1);
    return result;
  }

  async promoteFromWaitlist(sessionId: string): Promise<Enrollment | undefined> {
    const next = await this.getNextWaitlistEntry(sessionId);
    if (!next) return undefined;

    const [promoted] = await db.update(enrollments)
      .set({ status: "confirmed", waitlistPosition: null, waitlistedAt: null })
      .where(eq(enrollments.id, next.id))
      .returning();

    // Reorder remaining waitlist positions
    await db.execute(sql`
      UPDATE enrollments
      SET waitlist_position = waitlist_position - 1
      WHERE session_id = ${sessionId}
        AND status = 'waitlisted'
        AND waitlist_position > ${next.waitlistPosition}
    `);

    return promoted;
  }

  async reorderWaitlistAfterRemoval(sessionId: string, removedPosition: number): Promise<void> {
    await db.execute(sql`
      UPDATE enrollments
      SET waitlist_position = waitlist_position - 1
      WHERE session_id = ${sessionId}
        AND status = 'waitlisted'
        AND waitlist_position > ${removedPosition}
    `);
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

  // ---- Email Tracking ----
  async getEmailLogByTrackingId(trackingId: string): Promise<EmailLog | undefined> {
    const [result] = await db.select().from(emailLogs).where(eq(emailLogs.trackingId, trackingId));
    return result;
  }

  async recordEmailOpen(trackingId: string, ip: string | null, userAgent: string | null): Promise<void> {
    const emailLog = await this.getEmailLogByTrackingId(trackingId);
    if (!emailLog) return;

    await db.insert(emailTrackingEvents).values({
      emailLogId: emailLog.id,
      trackingId,
      ipAddress: ip,
      userAgent,
    });

    const updates: any = { openCount: (emailLog.openCount || 0) + 1 };
    if (!emailLog.openedAt) {
      updates.openedAt = new Date();
    }
    await db.update(emailLogs).set(updates).where(eq(emailLogs.id, emailLog.id));
  }

  async getEmailTrackingEvents(emailLogId: string): Promise<EmailTrackingEvent[]> {
    return db.select().from(emailTrackingEvents)
      .where(eq(emailTrackingEvents.emailLogId, emailLogId))
      .orderBy(desc(emailTrackingEvents.openedAt));
  }

  // ---- SMS Templates ----
  async getSmsTemplates(): Promise<SmsTemplate[]> {
    return db.select().from(smsTemplates).orderBy(desc(smsTemplates.createdAt));
  }

  async getSmsTemplate(id: string): Promise<SmsTemplate | undefined> {
    const [result] = await db.select().from(smsTemplates).where(eq(smsTemplates.id, id));
    return result;
  }

  async createSmsTemplate(template: InsertSmsTemplate): Promise<SmsTemplate> {
    const [result] = await db.insert(smsTemplates).values(template as any).returning();
    return result;
  }

  async updateSmsTemplate(id: string, data: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined> {
    const [result] = await db.update(smsTemplates).set({ ...data, updatedAt: new Date() } as any).where(eq(smsTemplates.id, id)).returning();
    return result;
  }

  async deleteSmsTemplate(id: string): Promise<void> {
    await db.delete(smsTemplates).where(eq(smsTemplates.id, id));
  }

  // ---- SMS Logs ----
  async getSmsLogs(): Promise<SmsLog[]> {
    return db.select().from(smsLogs).orderBy(desc(smsLogs.createdAt));
  }

  async getSmsLog(id: string): Promise<SmsLog | undefined> {
    const [result] = await db.select().from(smsLogs).where(eq(smsLogs.id, id));
    return result;
  }

  async getPendingSmsLogs(): Promise<SmsLog[]> {
    return db.select().from(smsLogs).where(
      and(
        eq(smsLogs.status, "pending"),
        sql`(${smsLogs.scheduledAt} IS NULL OR ${smsLogs.scheduledAt} <= NOW())`
      )
    ).orderBy(smsLogs.createdAt);
  }

  async createSmsLog(log: InsertSmsLog): Promise<SmsLog> {
    const [result] = await db.insert(smsLogs).values(log).returning();
    return result;
  }

  async updateSmsLog(id: string, data: Partial<InsertSmsLog>): Promise<SmsLog | undefined> {
    const [result] = await db.update(smsLogs).set(data as any).where(eq(smsLogs.id, id)).returning();
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
    const [result] = await db.insert(generatedDocuments).values(doc as any).returning();
    return result;
  }

  async updateGeneratedDocument(id: string, data: Partial<InsertGeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const [result] = await db.update(generatedDocuments).set(data as any).where(eq(generatedDocuments.id, id)).returning();
    return result;
  }

  async deleteGeneratedDocument(id: string): Promise<void> {
    await db.delete(generatedDocuments).where(eq(generatedDocuments.id, id));
  }

  async getGeneratedDocumentsByQuote(quoteId: string): Promise<GeneratedDocument[]> {
    return db.select().from(generatedDocuments).where(eq(generatedDocuments.quoteId, quoteId)).orderBy(desc(generatedDocuments.createdAt));
  }

  async getGeneratedDocumentsPendingSignature(signerId: string, signerType: string): Promise<GeneratedDocument[]> {
    const allPending = await db.select().from(generatedDocuments)
      .where(eq(generatedDocuments.signatureStatus, "pending"))
      .orderBy(desc(generatedDocuments.createdAt));
    return allPending.filter(doc => {
      const requestedFor = (doc.signatureRequestedFor as any[]) || [];
      return requestedFor.some(
        (r: any) => r.signerId === signerId && r.signerType === signerType && r.status === "pending"
      );
    });
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

  // ---- Payment Schedules ----
  async getPaymentSchedules(invoiceId: string): Promise<PaymentSchedule[]> {
    return db.select().from(paymentSchedules).where(eq(paymentSchedules.invoiceId, invoiceId)).orderBy(paymentSchedules.installmentNumber);
  }

  async createPaymentSchedule(schedule: InsertPaymentSchedule): Promise<PaymentSchedule> {
    const [result] = await db.insert(paymentSchedules).values(schedule).returning();
    return result;
  }

  async updatePaymentSchedule(id: string, data: Partial<InsertPaymentSchedule>): Promise<PaymentSchedule | undefined> {
    const [result] = await db.update(paymentSchedules).set(data).where(eq(paymentSchedules.id, id)).returning();
    return result;
  }

  async deletePaymentSchedulesByInvoice(invoiceId: string): Promise<void> {
    await db.delete(paymentSchedules).where(eq(paymentSchedules.invoiceId, invoiceId));
  }

  // ---- Bank Transactions ----
  async getBankTransactions(): Promise<BankTransaction[]> {
    return db.select().from(bankTransactions).orderBy(desc(bankTransactions.executionDate));
  }

  async createBankTransaction(tx: InsertBankTransaction): Promise<BankTransaction> {
    const [result] = await db.insert(bankTransactions).values(tx).returning();
    return result;
  }

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined> {
    const [result] = await db.update(bankTransactions).set(data).where(eq(bankTransactions.id, id)).returning();
    return result;
  }

  async matchBankTransaction(id: string, invoiceId: string, paymentId: string): Promise<BankTransaction | undefined> {
    const [result] = await db.update(bankTransactions).set({
      matchedInvoiceId: invoiceId,
      matchedPaymentId: paymentId,
      reconciliationStatus: "matched",
    }).where(eq(bankTransactions.id, id)).returning();
    return result;
  }

  async deleteBankTransaction(id: string): Promise<void> {
    await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
  }

  // ---- Connection Logs ----
  async getConnectionLogs(filters?: { userId?: string; sessionId?: string; from?: string; to?: string }): Promise<ConnectionLog[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(connectionLogs.userId, filters.userId));
    if (filters?.sessionId) conditions.push(eq(connectionLogs.sessionId, filters.sessionId));
    if (conditions.length > 0) {
      return db.select().from(connectionLogs).where(and(...conditions)).orderBy(desc(connectionLogs.connectedAt));
    }
    return db.select().from(connectionLogs).orderBy(desc(connectionLogs.connectedAt));
  }

  async createConnectionLog(log: InsertConnectionLog): Promise<ConnectionLog> {
    const [result] = await db.insert(connectionLogs).values(log).returning();
    return result;
  }

  // ---- Absence Records ----
  async getAbsenceRecords(filters?: { sessionId?: string; traineeId?: string; status?: string }): Promise<AbsenceRecord[]> {
    const conditions = [];
    if (filters?.sessionId) conditions.push(eq(absenceRecords.sessionId, filters.sessionId));
    if (filters?.traineeId) conditions.push(eq(absenceRecords.traineeId, filters.traineeId));
    if (filters?.status) conditions.push(eq(absenceRecords.status, filters.status));
    if (conditions.length > 0) {
      return db.select().from(absenceRecords).where(and(...conditions)).orderBy(desc(absenceRecords.createdAt));
    }
    return db.select().from(absenceRecords).orderBy(desc(absenceRecords.createdAt));
  }

  async getAbsenceRecord(id: string): Promise<AbsenceRecord | undefined> {
    const [result] = await db.select().from(absenceRecords).where(eq(absenceRecords.id, id));
    return result;
  }

  async createAbsenceRecord(record: InsertAbsenceRecord): Promise<AbsenceRecord> {
    const [result] = await db.insert(absenceRecords).values(record).returning();
    return result;
  }

  async updateAbsenceRecord(id: string, data: Partial<InsertAbsenceRecord>): Promise<AbsenceRecord | undefined> {
    const [result] = await db.update(absenceRecords).set({ ...data, updatedAt: new Date() }).where(eq(absenceRecords.id, id)).returning();
    return result;
  }

  async deleteAbsenceRecord(id: string): Promise<void> {
    await db.delete(absenceRecords).where(eq(absenceRecords.id, id));
  }

  // ---- Quality Incidents ----
  async getQualityIncidents(filters?: { sessionId?: string; status?: string; type?: string }): Promise<QualityIncident[]> {
    const conditions = [];
    if (filters?.sessionId) conditions.push(eq(qualityIncidents.sessionId, filters.sessionId));
    if (filters?.status) conditions.push(eq(qualityIncidents.status, filters.status));
    if (filters?.type) conditions.push(eq(qualityIncidents.type, filters.type));
    if (conditions.length > 0) {
      return db.select().from(qualityIncidents).where(and(...conditions)).orderBy(desc(qualityIncidents.createdAt));
    }
    return db.select().from(qualityIncidents).orderBy(desc(qualityIncidents.createdAt));
  }

  async getQualityIncident(id: string): Promise<QualityIncident | undefined> {
    const [result] = await db.select().from(qualityIncidents).where(eq(qualityIncidents.id, id));
    return result;
  }

  async createQualityIncident(incident: InsertQualityIncident): Promise<QualityIncident> {
    const [result] = await db.insert(qualityIncidents).values(incident as any).returning();
    return result;
  }

  async updateQualityIncident(id: string, data: Partial<InsertQualityIncident>): Promise<QualityIncident | undefined> {
    const [result] = await db.update(qualityIncidents).set({ ...data, updatedAt: new Date() } as any).where(eq(qualityIncidents.id, id)).returning();
    return result;
  }

  async deleteQualityIncident(id: string): Promise<void> {
    await db.delete(qualityIncidents).where(eq(qualityIncidents.id, id));
  }

  // ---- Veille Entries ----
  async getVeilleEntries(filters?: { type?: string; status?: string }): Promise<VeilleEntry[]> {
    const conditions = [];
    if (filters?.type) conditions.push(eq(veilleEntries.type, filters.type));
    if (filters?.status) conditions.push(eq(veilleEntries.status, filters.status));
    if (conditions.length > 0) {
      return db.select().from(veilleEntries).where(and(...conditions)).orderBy(desc(veilleEntries.createdAt));
    }
    return db.select().from(veilleEntries).orderBy(desc(veilleEntries.createdAt));
  }

  async getVeilleEntry(id: string): Promise<VeilleEntry | undefined> {
    const [result] = await db.select().from(veilleEntries).where(eq(veilleEntries.id, id));
    return result;
  }

  async createVeilleEntry(entry: InsertVeilleEntry): Promise<VeilleEntry> {
    const [result] = await db.insert(veilleEntries).values(entry as any).returning();
    return result;
  }

  async updateVeilleEntry(id: string, data: Partial<InsertVeilleEntry>): Promise<VeilleEntry | undefined> {
    const [result] = await db.update(veilleEntries).set({ ...data, updatedAt: new Date() } as any).where(eq(veilleEntries.id, id)).returning();
    return result;
  }

  async deleteVeilleEntry(id: string): Promise<void> {
    await db.delete(veilleEntries).where(eq(veilleEntries.id, id));
  }

  // ---- Digital Badges ----
  async getDigitalBadges(): Promise<DigitalBadge[]> {
    return db.select().from(digitalBadges).orderBy(desc(digitalBadges.createdAt));
  }

  async getDigitalBadge(id: string): Promise<DigitalBadge | undefined> {
    const [result] = await db.select().from(digitalBadges).where(eq(digitalBadges.id, id));
    return result;
  }

  async createDigitalBadge(badge: InsertDigitalBadge): Promise<DigitalBadge> {
    const [result] = await db.insert(digitalBadges).values(badge).returning();
    return result;
  }

  async updateDigitalBadge(id: string, data: Partial<InsertDigitalBadge>): Promise<DigitalBadge | undefined> {
    const [result] = await db.update(digitalBadges).set({ ...data, updatedAt: new Date() }).where(eq(digitalBadges.id, id)).returning();
    return result;
  }

  async deleteDigitalBadge(id: string): Promise<void> {
    await db.delete(digitalBadges).where(eq(digitalBadges.id, id));
  }

  // ---- Badge Awards ----
  async getBadgeAwards(filters?: { badgeId?: string; traineeId?: string }): Promise<BadgeAward[]> {
    const conditions = [];
    if (filters?.badgeId) conditions.push(eq(badgeAwards.badgeId, filters.badgeId));
    if (filters?.traineeId) conditions.push(eq(badgeAwards.traineeId, filters.traineeId));
    if (conditions.length > 0) {
      return db.select().from(badgeAwards).where(and(...conditions)).orderBy(desc(badgeAwards.awardedAt));
    }
    return db.select().from(badgeAwards).orderBy(desc(badgeAwards.awardedAt));
  }

  async getBadgeAward(id: string): Promise<BadgeAward | undefined> {
    const [result] = await db.select().from(badgeAwards).where(eq(badgeAwards.id, id));
    return result;
  }

  async createBadgeAward(award: InsertBadgeAward): Promise<BadgeAward> {
    const [result] = await db.insert(badgeAwards).values(award).returning();
    return result;
  }

  async updateBadgeAward(id: string, data: Partial<InsertBadgeAward>): Promise<BadgeAward | undefined> {
    const [result] = await db.update(badgeAwards).set(data).where(eq(badgeAwards.id, id)).returning();
    return result;
  }

  async deleteBadgeAward(id: string): Promise<void> {
    await db.delete(badgeAwards).where(eq(badgeAwards.id, id));
  }

  // ---- Gamification Points ----
  async getGamificationPoints(filters?: { traineeId?: string; moduleId?: string; sessionId?: string }): Promise<GamificationPoints[]> {
    const conditions = [];
    if (filters?.traineeId) conditions.push(eq(gamificationPoints.traineeId, filters.traineeId));
    if (filters?.moduleId) conditions.push(eq(gamificationPoints.moduleId, filters.moduleId));
    if (filters?.sessionId) conditions.push(eq(gamificationPoints.sessionId, filters.sessionId));
    if (conditions.length > 0) {
      return db.select().from(gamificationPoints).where(and(...conditions)).orderBy(desc(gamificationPoints.createdAt));
    }
    return db.select().from(gamificationPoints).orderBy(desc(gamificationPoints.createdAt));
  }

  async createGamificationPoint(point: InsertGamificationPoints): Promise<GamificationPoints> {
    const [result] = await db.insert(gamificationPoints).values(point).returning();
    return result;
  }

  async getLeaderboard(filters: { sessionId?: string; moduleId?: string; limit?: number }): Promise<Array<{ traineeId: string; traineeName: string; totalXP: number; badgeCount: number }>> {
    const conditions = [];
    if (filters.sessionId) conditions.push(eq(gamificationPoints.sessionId, filters.sessionId));
    if (filters.moduleId) conditions.push(eq(gamificationPoints.moduleId, filters.moduleId));

    const rows = await db.select({
      traineeId: gamificationPoints.traineeId,
      totalXP: sql<number>`COALESCE(SUM(${gamificationPoints.points}), 0)`.as('total_xp'),
    })
    .from(gamificationPoints)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(gamificationPoints.traineeId)
    .orderBy(sql`total_xp DESC`)
    .limit(filters.limit || 50);

    const results = [];
    for (const row of rows) {
      const trainee = await this.getTrainee(row.traineeId);
      const awards = await this.getBadgeAwards({ traineeId: row.traineeId });
      results.push({
        traineeId: row.traineeId,
        traineeName: trainee ? `${trainee.firstName} ${trainee.lastName}` : "Apprenant",
        totalXP: Number(row.totalXP),
        badgeCount: awards.filter(a => a.status === "active").length,
      });
    }
    return results;
  }

  // ---- Task Lists ----
  async getTaskLists(filters?: { traineeId?: string; sessionId?: string; status?: string }): Promise<TaskList[]> {
    const conditions = [];
    if (filters?.traineeId) conditions.push(eq(taskLists.traineeId, filters.traineeId));
    if (filters?.sessionId) conditions.push(eq(taskLists.sessionId, filters.sessionId));
    if (filters?.status) conditions.push(eq(taskLists.status, filters.status));
    if (conditions.length > 0) {
      return db.select().from(taskLists).where(and(...conditions)).orderBy(desc(taskLists.createdAt));
    }
    return db.select().from(taskLists).orderBy(desc(taskLists.createdAt));
  }

  async getTaskList(id: string): Promise<TaskList | undefined> {
    const [result] = await db.select().from(taskLists).where(eq(taskLists.id, id));
    return result;
  }

  async createTaskList(list: InsertTaskList): Promise<TaskList> {
    const [result] = await db.insert(taskLists).values(list).returning();
    return result;
  }

  async updateTaskList(id: string, data: Partial<InsertTaskList>): Promise<TaskList | undefined> {
    const [result] = await db.update(taskLists).set({ ...data, updatedAt: new Date() }).where(eq(taskLists.id, id)).returning();
    return result;
  }

  async deleteTaskList(id: string): Promise<void> {
    await db.delete(taskLists).where(eq(taskLists.id, id));
  }

  // ---- Task Items ----
  async getTaskItems(taskListId: string): Promise<TaskItem[]> {
    return db.select().from(taskItems).where(eq(taskItems.taskListId, taskListId)).orderBy(taskItems.orderIndex);
  }

  async getTaskItem(id: string): Promise<TaskItem | undefined> {
    const [result] = await db.select().from(taskItems).where(eq(taskItems.id, id));
    return result;
  }

  async createTaskItem(item: InsertTaskItem): Promise<TaskItem> {
    const [result] = await db.insert(taskItems).values(item).returning();
    return result;
  }

  async updateTaskItem(id: string, data: Partial<InsertTaskItem>): Promise<TaskItem | undefined> {
    const [result] = await db.update(taskItems).set(data).where(eq(taskItems.id, id)).returning();
    return result;
  }

  async deleteTaskItem(id: string): Promise<void> {
    await db.delete(taskItems).where(eq(taskItems.id, id));
  }

  // ---- AI Document Analyses ----
  async getAiDocumentAnalyses(filters?: { traineeId?: string; trainerId?: string; status?: string }): Promise<AiDocumentAnalysis[]> {
    const conditions = [];
    if (filters?.traineeId) conditions.push(eq(aiDocumentAnalyses.traineeId, filters.traineeId));
    if (filters?.trainerId) conditions.push(eq(aiDocumentAnalyses.trainerId, filters.trainerId));
    if (filters?.status) conditions.push(eq(aiDocumentAnalyses.status, filters.status));
    if (conditions.length > 0) {
      return db.select().from(aiDocumentAnalyses).where(and(...conditions)).orderBy(desc(aiDocumentAnalyses.createdAt));
    }
    return db.select().from(aiDocumentAnalyses).orderBy(desc(aiDocumentAnalyses.createdAt));
  }

  async getAiDocumentAnalysis(id: string): Promise<AiDocumentAnalysis | undefined> {
    const [result] = await db.select().from(aiDocumentAnalyses).where(eq(aiDocumentAnalyses.id, id));
    return result;
  }

  async createAiDocumentAnalysis(analysis: InsertAiDocumentAnalysis): Promise<AiDocumentAnalysis> {
    const [result] = await db.insert(aiDocumentAnalyses).values(analysis as any).returning();
    return result;
  }

  async updateAiDocumentAnalysis(id: string, data: Partial<InsertAiDocumentAnalysis>): Promise<AiDocumentAnalysis | undefined> {
    const [result] = await db.update(aiDocumentAnalyses).set(data as any).where(eq(aiDocumentAnalyses.id, id)).returning();
    return result;
  }

  async deleteAiDocumentAnalysis(id: string): Promise<void> {
    await db.delete(aiDocumentAnalyses).where(eq(aiDocumentAnalyses.id, id));
  }

  // ---- CESU Submissions ----
  async getCesuSubmissions(filters?: { sessionId?: string; status?: string }): Promise<CesuSubmission[]> {
    const conditions = [];
    if (filters?.sessionId) conditions.push(eq(cesuSubmissions.sessionId, filters.sessionId));
    if (filters?.status) conditions.push(eq(cesuSubmissions.status, filters.status));
    if (conditions.length > 0) {
      return db.select().from(cesuSubmissions).where(and(...conditions)).orderBy(desc(cesuSubmissions.createdAt));
    }
    return db.select().from(cesuSubmissions).orderBy(desc(cesuSubmissions.createdAt));
  }

  async getCesuSubmission(id: string): Promise<CesuSubmission | undefined> {
    const [result] = await db.select().from(cesuSubmissions).where(eq(cesuSubmissions.id, id));
    return result;
  }

  async createCesuSubmission(submission: InsertCesuSubmission): Promise<CesuSubmission> {
    const [result] = await db.insert(cesuSubmissions).values(submission as any).returning();
    return result;
  }

  async updateCesuSubmission(id: string, data: Partial<InsertCesuSubmission>): Promise<CesuSubmission | undefined> {
    const [result] = await db.update(cesuSubmissions).set({ ...data, updatedAt: new Date() } as any).where(eq(cesuSubmissions.id, id)).returning();
    return result;
  }

  async deleteCesuSubmission(id: string): Promise<void> {
    await db.delete(cesuSubmissions).where(eq(cesuSubmissions.id, id));
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
    // Delete in cascade: connection logs, gamification, progress, submissions, quiz questions (via blocks), blocks, then module
    const blocks = await db.select().from(elearningBlocks).where(eq(elearningBlocks.moduleId, id));
    const blockIds = blocks.map(b => b.id);
    // Delete connection logs referencing this module
    await db.delete(connectionLogs).where(eq(connectionLogs.moduleId, id));
    // Delete gamification points for this module
    await db.delete(gamificationPoints).where(eq(gamificationPoints.moduleId, id));
    // Delete learner progress for this module
    await db.delete(learnerProgress).where(eq(learnerProgress.moduleId, id));
    // Delete formative submissions and quiz questions for all blocks of this module
    if (blockIds.length > 0) {
      for (const blockId of blockIds) {
        await db.delete(quizQuestions).where(eq(quizQuestions.blockId, blockId));
        await db.delete(formativeSubmissions).where(eq(formativeSubmissions.blockId, blockId));
      }
    }
    // Delete all blocks of this module
    await db.delete(elearningBlocks).where(eq(elearningBlocks.moduleId, id));
    // Delete the module itself
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
    const [result] = await db.insert(elearningBlocks).values(block as any).returning();
    return result;
  }

  async updateElearningBlock(id: string, data: Partial<InsertElearningBlock>): Promise<ElearningBlock | undefined> {
    const [result] = await db.update(elearningBlocks).set(data as any).where(eq(elearningBlocks.id, id)).returning();
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
    const [result] = await db.insert(learnerProgress).values(progress as any).returning();
    return result;
  }

  async updateLearnerProgress(id: string, data: Partial<InsertLearnerProgress>): Promise<LearnerProgress | undefined> {
    const [result] = await db.update(learnerProgress).set(data as any).where(eq(learnerProgress.id, id)).returning();
    return result;
  }

  // ---- Session Resources ----
  async getSessionResources(sessionId: string): Promise<SessionResource[]> {
    return db.select().from(sessionResources).where(eq(sessionResources.sessionId, sessionId)).orderBy(sessionResources.orderIndex);
  }

  async getSessionResource(id: string): Promise<SessionResource | undefined> {
    const [result] = await db.select().from(sessionResources).where(eq(sessionResources.id, id));
    return result;
  }

  async createSessionResource(resource: InsertSessionResource): Promise<SessionResource> {
    const [result] = await db.insert(sessionResources).values(resource).returning();
    return result;
  }

  async updateSessionResource(id: string, data: Partial<InsertSessionResource>): Promise<SessionResource | undefined> {
    const [result] = await db.update(sessionResources).set(data).where(eq(sessionResources.id, id)).returning();
    return result;
  }

  async deleteSessionResource(id: string): Promise<void> {
    await db.delete(sessionResources).where(eq(sessionResources.id, id));
  }

  // ---- SCORM Packages ----
  async getScormPackages(): Promise<ScormPackage[]> {
    return db.select().from(scormPackages).orderBy(desc(scormPackages.createdAt));
  }

  async getScormPackage(id: string): Promise<ScormPackage | undefined> {
    const [result] = await db.select().from(scormPackages).where(eq(scormPackages.id, id));
    return result;
  }

  async createScormPackage(pkg: InsertScormPackage): Promise<ScormPackage> {
    const [result] = await db.insert(scormPackages).values(pkg).returning();
    return result;
  }

  async deleteScormPackage(id: string): Promise<void> {
    await db.delete(scormPackages).where(eq(scormPackages.id, id));
  }

  // ---- Formative Submissions ----
  async getFormativeSubmissions(blockId?: string, traineeId?: string): Promise<FormativeSubmission[]> {
    const conditions = [];
    if (blockId) conditions.push(eq(formativeSubmissions.blockId, blockId));
    if (traineeId) conditions.push(eq(formativeSubmissions.traineeId, traineeId));
    if (conditions.length > 0) {
      return db.select().from(formativeSubmissions).where(and(...conditions)).orderBy(desc(formativeSubmissions.submittedAt));
    }
    return db.select().from(formativeSubmissions).orderBy(desc(formativeSubmissions.submittedAt));
  }

  async getFormativeSubmission(id: string): Promise<FormativeSubmission | undefined> {
    const [result] = await db.select().from(formativeSubmissions).where(eq(formativeSubmissions.id, id));
    return result;
  }

  async createFormativeSubmission(submission: InsertFormativeSubmission): Promise<FormativeSubmission> {
    const [result] = await db.insert(formativeSubmissions).values(submission).returning();
    return result;
  }

  async updateFormativeSubmission(id: string, data: Partial<InsertFormativeSubmission>): Promise<FormativeSubmission | undefined> {
    const [result] = await db.update(formativeSubmissions).set(data).where(eq(formativeSubmissions.id, id)).returning();
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

  // ---- Evaluation Assignments ----
  async getEvaluationAssignments(sessionId?: string, traineeId?: string): Promise<EvaluationAssignment[]> {
    const conditions = [];
    if (sessionId) conditions.push(eq(evaluationAssignments.sessionId, sessionId));
    if (traineeId) conditions.push(eq(evaluationAssignments.traineeId, traineeId));
    if (conditions.length > 0) {
      return db.select().from(evaluationAssignments).where(and(...conditions)).orderBy(desc(evaluationAssignments.createdAt));
    }
    return db.select().from(evaluationAssignments).orderBy(desc(evaluationAssignments.createdAt));
  }

  async getEvaluationAssignment(id: string): Promise<EvaluationAssignment | undefined> {
    const [result] = await db.select().from(evaluationAssignments).where(eq(evaluationAssignments.id, id));
    return result;
  }

  async getEvaluationAssignmentByToken(token: string): Promise<EvaluationAssignment | undefined> {
    const [result] = await db.select().from(evaluationAssignments).where(eq(evaluationAssignments.token, token));
    return result;
  }

  async createEvaluationAssignment(assignment: InsertEvaluationAssignment): Promise<EvaluationAssignment> {
    const [result] = await db.insert(evaluationAssignments).values(assignment as any).returning();
    return result;
  }

  async updateEvaluationAssignment(id: string, data: Partial<InsertEvaluationAssignment>): Promise<EvaluationAssignment | undefined> {
    const [result] = await db.update(evaluationAssignments).set(data as any).where(eq(evaluationAssignments.id, id)).returning();
    return result;
  }

  async getScheduledEvaluationAssignments(before: Date): Promise<EvaluationAssignment[]> {
    return db.select().from(evaluationAssignments).where(
      and(
        eq(evaluationAssignments.status, "pending"),
        lte(evaluationAssignments.scheduledFor, before)
      )
    );
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

  async getAttendanceRecordByToken(token: string): Promise<AttendanceRecord | undefined> {
    const [result] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.emargementToken, token));
    return result;
  }

  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [result] = await db.insert(attendanceRecords).values(record).returning();
    return result;
  }

  async updateAttendanceRecord(id: string, data: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord | undefined> {
    const [result] = await db.update(attendanceRecords).set(data).where(eq(attendanceRecords.id, id)).returning();
    return result;
  }

  // ---- Session Dates (jours d'intervention) ----
  async getSessionDates(sessionId: string): Promise<SessionDate[]> {
    return db.select().from(sessionDates).where(eq(sessionDates.sessionId, sessionId)).orderBy(asc(sessionDates.date));
  }

  async getAllSessionDates(): Promise<SessionDate[]> {
    return db.select().from(sessionDates).orderBy(asc(sessionDates.date));
  }

  async createSessionDate(data: InsertSessionDate): Promise<SessionDate> {
    const [result] = await db.insert(sessionDates).values(data).returning();
    return result;
  }

  async deleteSessionDatesBySessionId(sessionId: string): Promise<void> {
    await db.delete(sessionDates).where(eq(sessionDates.sessionId, sessionId));
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
    const sessionIds = enterpriseSessions.map(s => s.id);

    // Include docs directly linked to enterprise OR linked via sessions with appropriate visibility
    const conditions = [
      eq(generatedDocuments.enterpriseId, enterpriseId),
    ];
    if (sessionIds.length > 0) {
      conditions.push(
        and(
          inArray(generatedDocuments.sessionId, sessionIds),
          inArray(generatedDocuments.visibility, ["enterprise", "all"]),
        )!,
      );
    }

    return db.select().from(generatedDocuments)
      .where(or(...conditions))
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
  // ---- Forum ----
  async getForumPosts(sessionId: string): Promise<ForumPost[]> {
    return db.select().from(forumPosts)
      .where(eq(forumPosts.sessionId, sessionId))
      .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt));
  }

  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    const [result] = await db.insert(forumPosts).values(post).returning();
    return result;
  }

  async updateForumPost(id: string, data: Partial<InsertForumPost>): Promise<ForumPost> {
    const [result] = await db.update(forumPosts).set({ ...data, updatedAt: new Date() }).where(eq(forumPosts.id, id)).returning();
    return result;
  }

  async deleteForumPost(id: string): Promise<void> {
    await db.delete(forumReplies).where(eq(forumReplies.postId, id));
    await db.delete(forumPosts).where(eq(forumPosts.id, id));
  }

  async getForumReplies(postId: string): Promise<ForumReply[]> {
    return db.select().from(forumReplies)
      .where(eq(forumReplies.postId, postId))
      .orderBy(forumReplies.createdAt);
  }

  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    const [result] = await db.insert(forumReplies).values(reply).returning();
    return result;
  }

  async deleteForumReply(id: string): Promise<void> {
    await db.delete(forumReplies).where(eq(forumReplies.id, id));
  }

  async getForumMute(userId: string, sessionId: string): Promise<ForumMute | undefined> {
    const [result] = await db.select().from(forumMutes)
      .where(and(eq(forumMutes.userId, userId), eq(forumMutes.sessionId, sessionId)));
    return result;
  }

  async createForumMute(mute: InsertForumMute): Promise<ForumMute> {
    const [result] = await db.insert(forumMutes).values(mute).returning();
    return result;
  }

  async deleteForumMute(userId: string, sessionId: string): Promise<void> {
    await db.delete(forumMutes).where(
      and(eq(forumMutes.userId, userId), eq(forumMutes.sessionId, sessionId))
    );
  }

  // ---- Analysis Comments ----
  async getAnalysisComments(sessionId: string, visibility?: string): Promise<AnalysisComment[]> {
    const conditions = [eq(analysisComments.sessionId, sessionId)];
    if (visibility) conditions.push(eq(analysisComments.visibility, visibility));
    return db.select().from(analysisComments)
      .where(and(...conditions))
      .orderBy(desc(analysisComments.createdAt));
  }

  async getAnalysisComment(id: string): Promise<AnalysisComment | undefined> {
    const [result] = await db.select().from(analysisComments).where(eq(analysisComments.id, id));
    return result;
  }

  async createAnalysisComment(comment: InsertAnalysisComment): Promise<AnalysisComment> {
    const [result] = await db.insert(analysisComments).values(comment).returning();
    return result;
  }

  async updateAnalysisComment(id: string, data: Partial<InsertAnalysisComment>): Promise<AnalysisComment | undefined> {
    const [result] = await db.update(analysisComments).set({ ...data, updatedAt: new Date() }).where(eq(analysisComments.id, id)).returning();
    return result;
  }

  async deleteAnalysisComment(id: string): Promise<void> {
    await db.delete(analysisComments).where(eq(analysisComments.id, id));
  }

  // ---- Messaging ----
  async getConversations(userId: string): Promise<Conversation[]> {
    const participations = await db.select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    const ids = participations.map(p => p.conversationId);
    if (ids.length === 0) return [];
    return db.select().from(conversations)
      .where(inArray(conversations.id, ids))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [result] = await db.select().from(conversations).where(eq(conversations.id, id));
    return result;
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const [result] = await db.insert(conversations).values(conv).returning();
    return result;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(directMessages).where(eq(directMessages.conversationId, id));
    await db.delete(conversationParticipants).where(eq(conversationParticipants.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return db.select().from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }

  async addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [result] = await db.insert(conversationParticipants).values(participant).returning();
    return result;
  }

  async removeConversationParticipant(conversationId: string, userId: string): Promise<void> {
    await db.delete(conversationParticipants).where(
      and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId))
    );
  }

  async updateLastRead(conversationId: string, userId: string): Promise<void> {
    await db.update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
  }

  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    return db.select().from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(directMessages.createdAt);
  }

  async createMessage(message: InsertDirectMessage): Promise<DirectMessage> {
    const [result] = await db.insert(directMessages).values(message).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, message.conversationId));
    return result;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(directMessages).where(eq(directMessages.id, id));
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    const p1 = await db.select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId1));
    const p2 = await db.select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId2));
    const ids1 = new Set(p1.map(p => p.conversationId));
    const common = p2.filter(p => ids1.has(p.conversationId)).map(p => p.conversationId);
    if (common.length === 0) return undefined;
    const convs = await db.select().from(conversations)
      .where(and(inArray(conversations.id, common), eq(conversations.type, "direct")));
    return convs[0];
  }

  // ---- CRM & Marketing ----
  async getContactTags(): Promise<ContactTag[]> {
    return db.select().from(contactTags).orderBy(contactTags.name);
  }

  async createContactTag(tag: InsertContactTag): Promise<ContactTag> {
    const [result] = await db.insert(contactTags).values(tag).returning();
    return result;
  }

  async updateContactTag(id: string, data: Partial<InsertContactTag>): Promise<ContactTag | undefined> {
    const [result] = await db.update(contactTags).set(data).where(eq(contactTags.id, id)).returning();
    return result;
  }

  async deleteContactTag(id: string): Promise<void> {
    await db.delete(contactTagAssignments).where(eq(contactTagAssignments.tagId, id));
    await db.delete(contactTags).where(eq(contactTags.id, id));
  }

  async getContactTagAssignments(contactType?: string, contactId?: string): Promise<ContactTagAssignment[]> {
    const conditions = [];
    if (contactType) conditions.push(eq(contactTagAssignments.contactType, contactType));
    if (contactId) conditions.push(eq(contactTagAssignments.contactId, contactId));
    if (conditions.length > 0) {
      return db.select().from(contactTagAssignments).where(and(...conditions));
    }
    return db.select().from(contactTagAssignments);
  }

  async assignTag(assignment: InsertContactTagAssignment): Promise<ContactTagAssignment> {
    const [result] = await db.insert(contactTagAssignments).values(assignment).returning();
    return result;
  }

  async removeTagAssignment(tagId: string, contactType: string, contactId: string): Promise<void> {
    await db.delete(contactTagAssignments).where(
      and(eq(contactTagAssignments.tagId, tagId), eq(contactTagAssignments.contactType, contactType), eq(contactTagAssignments.contactId, contactId))
    );
  }

  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
  }

  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    const [result] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return result;
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [result] = await db.insert(marketingCampaigns).values(campaign as any).returning();
    return result;
  }

  async updateMarketingCampaign(id: string, data: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined> {
    const [result] = await db.update(marketingCampaigns).set({ ...data, updatedAt: new Date() } as any).where(eq(marketingCampaigns.id, id)).returning();
    return result;
  }

  async deleteMarketingCampaign(id: string): Promise<void> {
    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, id));
    await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
  }

  async getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]> {
    return db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));
  }

  async addCampaignRecipients(recipients: InsertCampaignRecipient[]): Promise<CampaignRecipient[]> {
    if (recipients.length === 0) return [];
    return db.insert(campaignRecipients).values(recipients).returning();
  }

  async updateCampaignRecipient(id: string, data: Partial<InsertCampaignRecipient>): Promise<void> {
    await db.update(campaignRecipients).set(data).where(eq(campaignRecipients.id, id));
  }

  async getProspectActivities(prospectId: string): Promise<ProspectActivity[]> {
    return db.select().from(prospectActivities).where(eq(prospectActivities.prospectId, prospectId)).orderBy(desc(prospectActivities.createdAt));
  }

  async createProspectActivity(activity: InsertProspectActivity): Promise<ProspectActivity> {
    const [result] = await db.insert(prospectActivities).values(activity).returning();
    return result;
  }

  // ---- SSO Tokens ----
  async createSsoToken(data: InsertSsoToken): Promise<SsoToken> {
    const [result] = await db.insert(ssoTokens).values(data as any).returning();
    return result;
  }

  async getSsoTokenByToken(token: string): Promise<SsoToken | undefined> {
    const [result] = await db.select().from(ssoTokens).where(eq(ssoTokens.token, token));
    return result;
  }

  async markSsoTokenUsed(id: string): Promise<void> {
    await db.update(ssoTokens).set({ used: true }).where(eq(ssoTokens.id, id));
  }

  // ---- API Keys ----
  async getApiKeys(): Promise<ApiKey[]> {
    return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [result] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return result;
  }

  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values(data as any).returning();
    return result;
  }

  async updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [result] = await db.update(apiKeys).set(data as any).where(eq(apiKeys.id, id)).returning();
    return result;
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // ---- Widget Configurations ----
  async getWidgetConfigurations(): Promise<WidgetConfiguration[]> {
    return db.select().from(widgetConfigurations).orderBy(desc(widgetConfigurations.createdAt));
  }

  async getWidgetConfiguration(id: string): Promise<WidgetConfiguration | undefined> {
    const [result] = await db.select().from(widgetConfigurations).where(eq(widgetConfigurations.id, id));
    return result;
  }

  async createWidgetConfiguration(data: InsertWidgetConfiguration): Promise<WidgetConfiguration> {
    const [result] = await db.insert(widgetConfigurations).values(data as any).returning();
    return result;
  }

  async updateWidgetConfiguration(id: string, data: Partial<InsertWidgetConfiguration>): Promise<WidgetConfiguration | undefined> {
    const [result] = await db.update(widgetConfigurations).set(data as any).where(eq(widgetConfigurations.id, id)).returning();
    return result;
  }

  async deleteWidgetConfiguration(id: string): Promise<void> {
    await db.delete(widgetConfigurations).where(eq(widgetConfigurations.id, id));
  }

  // ---- Audit Logs ----
  async getAuditLogs(filters?: { userId?: string; entityType?: string; action?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));

    const query = db.select().from(auditLogs);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = whereClause
      ? await query.where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 100).offset(filters?.offset || 0)
      : await query.orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 100).offset(filters?.offset || 0);
    return results;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log as any).returning();
    return result;
  }

  async getAuditLogCount(filters?: { userId?: string; entityType?: string; action?: string }): Promise<number> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const query = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    const [result] = whereClause ? await query.where(whereClause) : await query;
    return Number(result.count);
  }

  // ---- RGPD Requests ----
  async getRgpdRequests(): Promise<RgpdRequest[]> {
    return db.select().from(rgpdRequests).orderBy(desc(rgpdRequests.createdAt));
  }

  async createRgpdRequest(request: InsertRgpdRequest): Promise<RgpdRequest> {
    const [result] = await db.insert(rgpdRequests).values(request as any).returning();
    return result;
  }

  async updateRgpdRequest(id: string, data: Partial<InsertRgpdRequest>): Promise<RgpdRequest | undefined> {
    const [result] = await db.update(rgpdRequests).set(data as any).where(eq(rgpdRequests.id, id)).returning();
    return result;
  }

  // ---- Data Imports ----
  async getDataImports(): Promise<DataImport[]> {
    return db.select().from(dataImports).orderBy(desc(dataImports.createdAt));
  }

  async createDataImport(data: InsertDataImport): Promise<DataImport> {
    const [result] = await db.insert(dataImports).values(data as any).returning();
    return result;
  }

  async updateDataImport(id: string, data: Partial<InsertDataImport>): Promise<DataImport | undefined> {
    const [result] = await db.update(dataImports).set(data as any).where(eq(dataImports.id, id)).returning();
    return result;
  }

  // ---- Data Archives ----
  async getDataArchives(filters?: { entityType?: string; status?: string }): Promise<DataArchive[]> {
    const conditions = [];
    if (filters?.entityType) conditions.push(eq(dataArchives.entityType, filters.entityType));
    if (filters?.status) conditions.push(eq(dataArchives.status, filters.status));
    const query = db.select().from(dataArchives);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(dataArchives.createdAt));
    }
    return query.orderBy(desc(dataArchives.createdAt));
  }

  async createDataArchive(data: InsertDataArchive): Promise<DataArchive> {
    const [result] = await db.insert(dataArchives).values(data as any).returning();
    return result;
  }

  async updateDataArchive(id: string, data: Partial<InsertDataArchive>): Promise<DataArchive | undefined> {
    const [result] = await db.update(dataArchives).set(data as any).where(eq(dataArchives.id, id)).returning();
    return result;
  }

  async getDataArchiveCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(dataArchives);
    return Number(result.count);
  }

  // ---- Notifications ----
  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result.count);
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(data as any).returning();
    return result;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
