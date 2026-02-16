import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords, requireAuth, requireRole } from "./auth";
import {
  insertTrainerSchema, insertTraineeSchema, insertProgramSchema,
  insertSessionSchema, insertEnrollmentSchema, insertEnterpriseSchema,
  loginSchema, registerSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setupAuth(app);

  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) return res.status(409).json({ message: "Ce nom d'utilisateur existe d\u00e9j\u00e0" });

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
      if (err) return res.status(500).json({ message: "Erreur de d\u00e9connexion" });
      res.json({ message: "D\u00e9connect\u00e9" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Non authentifi\u00e9" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Utilisateur non trouv\u00e9" });
    res.json({ id: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email });
  });

  app.get("/api/enterprises", async (_req, res) => {
    const result = await storage.getEnterprises();
    res.json(result);
  });

  app.get("/api/enterprises/:id", async (req, res) => {
    const enterprise = await storage.getEnterprise(req.params.id);
    if (!enterprise) return res.status(404).json({ message: "Entreprise non trouv\u00e9e" });
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
    if (!enterprise) return res.status(404).json({ message: "Entreprise non trouv\u00e9e" });
    res.json(enterprise);
  });

  app.delete("/api/enterprises/:id", async (req, res) => {
    await storage.deleteEnterprise(req.params.id);
    res.status(204).send();
  });

  app.get("/api/trainers", async (_req, res) => {
    const result = await storage.getTrainers();
    res.json(result);
  });

  app.get("/api/trainers/:id", async (req, res) => {
    const trainer = await storage.getTrainer(req.params.id);
    if (!trainer) return res.status(404).json({ message: "Formateur non trouv\u00e9" });
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
    if (!trainer) return res.status(404).json({ message: "Formateur non trouv\u00e9" });
    res.json(trainer);
  });

  app.delete("/api/trainers/:id", async (req, res) => {
    await storage.deleteTrainer(req.params.id);
    res.status(204).send();
  });

  app.get("/api/trainees", async (_req, res) => {
    const result = await storage.getTrainees();
    res.json(result);
  });

  app.get("/api/trainees/:id", async (req, res) => {
    const trainee = await storage.getTrainee(req.params.id);
    if (!trainee) return res.status(404).json({ message: "Stagiaire non trouv\u00e9" });
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
    if (!trainee) return res.status(404).json({ message: "Stagiaire non trouv\u00e9" });
    res.json(trainee);
  });

  app.delete("/api/trainees/:id", async (req, res) => {
    await storage.deleteTrainee(req.params.id);
    res.status(204).send();
  });

  app.get("/api/programs", async (_req, res) => {
    const result = await storage.getPrograms();
    res.json(result);
  });

  app.get("/api/programs/:id", async (req, res) => {
    const program = await storage.getProgram(req.params.id);
    if (!program) return res.status(404).json({ message: "Formation non trouv\u00e9e" });
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
    if (!program) return res.status(404).json({ message: "Formation non trouv\u00e9e" });
    res.json(program);
  });

  app.delete("/api/programs/:id", async (req, res) => {
    await storage.deleteProgram(req.params.id);
    res.status(204).send();
  });

  app.get("/api/sessions", async (_req, res) => {
    const result = await storage.getSessions();
    res.json(result);
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session non trouv\u00e9e" });
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
    if (!session) return res.status(404).json({ message: "Session non trouv\u00e9e" });
    res.json(session);
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    await storage.deleteSession(req.params.id);
    res.status(204).send();
  });

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
    if (!enrollment) return res.status(404).json({ message: "Inscription non trouv\u00e9e" });
    res.json(enrollment);
  });

  app.delete("/api/enrollments/:id", async (req, res) => {
    await storage.deleteEnrollment(req.params.id);
    res.status(204).send();
  });

  return httpServer;
}
