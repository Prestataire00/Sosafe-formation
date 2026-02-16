import {
  type User, type InsertUser,
  type Enterprise, type InsertEnterprise,
  type Trainer, type InsertTrainer,
  type Trainee, type InsertTrainee,
  type Program, type InsertProgram,
  type Session, type InsertSession,
  type Enrollment, type InsertEnrollment,
  users, enterprises, trainers, trainees, programs, sessions, enrollments,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getEnterprises(): Promise<Enterprise[]>;
  getEnterprise(id: string): Promise<Enterprise | undefined>;
  createEnterprise(enterprise: InsertEnterprise): Promise<Enterprise>;
  updateEnterprise(id: string, enterprise: Partial<InsertEnterprise>): Promise<Enterprise | undefined>;
  deleteEnterprise(id: string): Promise<void>;

  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainer(id: string, trainer: Partial<InsertTrainer>): Promise<Trainer | undefined>;
  deleteTrainer(id: string): Promise<void>;

  getTrainees(): Promise<Trainee[]>;
  getTrainee(id: string): Promise<Trainee | undefined>;
  createTrainee(trainee: InsertTrainee): Promise<Trainee>;
  updateTrainee(id: string, trainee: Partial<InsertTrainee>): Promise<Trainee | undefined>;
  deleteTrainee(id: string): Promise<void>;

  getPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, program: Partial<InsertProgram>): Promise<Program | undefined>;
  deleteProgram(id: string): Promise<void>;

  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;

  getEnrollments(sessionId?: string): Promise<Enrollment[]>;
  getEnrollmentsByTrainee(traineeId: string): Promise<Enrollment[]>;
  getEnrollmentCount(sessionId: string): Promise<number>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment | undefined>;
  deleteEnrollment(id: string): Promise<void>;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

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

  async getTrainees(): Promise<Trainee[]> {
    return db.select().from(trainees);
  }

  async getTrainee(id: string): Promise<Trainee | undefined> {
    const [trainee] = await db.select().from(trainees).where(eq(trainees.id, id));
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

  async getPrograms(): Promise<Program[]> {
    return db.select().from(programs);
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [result] = await db.insert(programs).values(program).returning();
    return result;
  }

  async updateProgram(id: string, data: Partial<InsertProgram>): Promise<Program | undefined> {
    const [result] = await db.update(programs).set(data).where(eq(programs.id, id)).returning();
    return result;
  }

  async deleteProgram(id: string): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
  }

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
}

export const storage = new DatabaseStorage();
