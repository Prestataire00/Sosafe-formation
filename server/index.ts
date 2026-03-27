import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase, seedAutomationDefaults, seedOrganizationDefaults } from "./seed";
import { startEmailWorker } from "./email-service";
import { startSmsWorker } from "./sms-service";
import { startScheduledTasks } from "./scheduled-tasks";
import pg from "pg";

async function runMigrations() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE programs ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE programs ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 0`);
    await pool.query(`CREATE TABLE IF NOT EXISTS document_header_footers (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'header',
      content TEXT NOT NULL,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
    // Add digiforma_id column to all tables that need it
    const digiformaTables = ["enterprises", "trainers", "trainees", "programs", "sessions", "training_locations", "quotes", "invoices"];
    for (const table of digiformaTables) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS digiforma_id TEXT`);
    }
    // Add Digiforma invoice fields
    const invoiceCols = [
      "client_address TEXT",
      "client_city TEXT",
      "client_postal_code TEXT",
      "client_country_code TEXT",
      "file_url TEXT",
      "order_form TEXT",
      "payment_limit_days INTEGER",
      "is_payment_limit_end_month BOOLEAN DEFAULT false",
      "reference TEXT",
    ];
    for (const col of invoiceCols) {
      const colName = col.split(" ")[0];
      await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col}`);
    }
    console.log("Migrations: all columns/tables ensured");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

// Kill any existing process on the target port before starting
function freePort(port: number) {
  try {
    const result = execSync(
      `lsof -ti:${port} 2>/dev/null`,
      { encoding: "utf-8" },
    ).trim();
    if (result) {
      for (const pid of result.split("\n").filter(Boolean)) {
        if (pid !== String(process.pid)) {
          try { process.kill(Number(pid), "SIGTERM"); } catch {}
        }
      }
      // Give processes time to exit
      execSync("sleep 1");
    }
  } catch {}
}

freePort(parseInt(process.env.PORT || "5000", 10));

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    type: (req) => {
      const ct = req.headers["content-type"] || "";
      if (ct.includes("multipart/form-data")) return false;
      return ct.includes("json") || !ct;
    },
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.get("/uploads/:filename", (req, res) => {
  const localPath = path.resolve(process.cwd(), "uploads", req.params.filename);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  return res.status(404).json({ message: "File not found" });
});

// SCORM extracted packages served statically
app.use("/uploads/scorm", express.static(path.resolve(process.cwd(), "uploads/scorm")));

// Widget JS — dynamic route serves pre-embedded data for instant render
// Falls back to static file for other widget assets
let widgetJsCache: { js: string; data: string; timestamp: number } | null = null;
const WIDGET_JS_PATH = path.resolve(process.cwd(), "public/widget/sosafe-catalog.js");
const WIDGET_SSR_TTL = 5 * 60 * 1000; // 5 min

app.get("/widget/sosafe-catalog.js", async (_req, res) => {
  try {
    res.set("Content-Type", "application/javascript; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");

    // Read widget JS (cache the file content)
    if (!widgetJsCache || Date.now() - widgetJsCache.timestamp > WIDGET_SSR_TTL) {
      const widgetJs = fs.readFileSync(WIDGET_JS_PATH, "utf-8");

      // Build bundle data server-side
      const { storage } = await import("./storage");
      const today = new Date().toISOString().split("T")[0];
      const [programs, sessions, sessionTrainers, trainers, enrollments, surveyResponses, allTrainees] = await Promise.all([
        storage.getPrograms(),
        storage.getSessions(),
        storage.getAllSessionTrainers(),
        storage.getTrainers(),
        storage.getEnrollments(),
        storage.getSurveyResponses(),
        storage.getTrainees(),
      ]);

      const activePrograms = programs.filter((p: any) => p.status === "published");
      const catalogPrograms = await Promise.all(activePrograms.map(async (p: any) => {
        const programSessions = sessions
          .filter((s: any) => s.programId === p.id && (s.status === "planned" || s.status === "ongoing") && s.endDate >= today)
          .sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
        const upcomingSessions = [];
        for (const s of programSessions) {
          const enrollmentCount = await storage.getEnrollmentCount(s.id);
          upcomingSessions.push({
            id: s.id, startDate: s.startDate, endDate: s.endDate,
            location: s.location, locationAddress: s.locationAddress, locationRoom: s.locationRoom,
            maxParticipants: s.maxParticipants || 12,
            remainingSpots: (s.maxParticipants || 12) - enrollmentCount,
            isFull: ((s.maxParticipants || 12) - enrollmentCount) <= 0,
          });
        }
        const sessionIds = programSessions.map((s: any) => s.id);
        const trainerIds = [...new Set(sessionTrainers.filter((st: any) => sessionIds.includes(st.sessionId)).map((st: any) => st.trainerId))];
        const uniqueTrainers = trainers.filter((t: any) => trainerIds.includes(t.id));
        return {
          id: p.id, title: p.title, description: p.description, categories: p.categories,
          duration: p.duration, objectives: p.objectives, prerequisites: p.prerequisites,
          modality: p.modality, price: p.price, certifying: p.certifying || false,
          targetAudience: p.targetAudience, teachingMethods: p.teachingMethods,
          evaluationMethods: p.evaluationMethods, accessibilityInfo: p.accessibilityInfo,
          accessDelay: p.accessDelay, programContent: p.programContent,
          imageUrl: p.imageUrl || null, subtitle: (p as any).subtitle || null,
          sessions: upcomingSessions,
          trainers: uniqueTrainers.map((t: any) => ({ firstName: t.firstName, lastName: t.lastName, specialty: t.specialty, avatarUrl: t.avatarUrl || null })),
        };
      }));

      const completedEnrollments = enrollments.filter((e: any) => e.status === "completed");
      const satisfactionScores = surveyResponses.filter((r: any) => r.satisfactionScore != null).map((r: any) => r.satisfactionScore);
      const satisfactionRate = satisfactionScores.length > 0 ? Math.round(satisfactionScores.reduce((a: number, b: number) => a + b, 0) / satisfactionScores.length) : 99;
      const recommendScores = surveyResponses.filter((r: any) => r.recommendScore != null).map((r: any) => r.recommendScore);
      const recommendationRate = recommendScores.length > 0 ? Math.round((recommendScores.filter((s: number) => s >= 4).length / recommendScores.length) * 100) : 99;
      const successCount = completedEnrollments.filter((e: any) => e.result === "success" || e.result === "validated").length;
      const successRate = completedEnrollments.length > 0 ? Math.round((successCount / completedEnrollments.length) * 100) : 100;

      const bundleData = {
        programs: catalogPrograms,
        stats: { totalTrainees: allTrainees.length, totalPrograms: catalogPrograms.length, successRate, satisfactionRate, recommendationRate },
        config: {},
      };

      widgetJsCache = {
        js: widgetJs,
        data: JSON.stringify(bundleData),
        timestamp: Date.now(),
      };
    }

    // Serve JS with data pre-embedded
    const output = "window.__SOSAFE_WIDGET_DATA__=" + widgetJsCache.data + ";\n" + widgetJsCache.js;
    res.send(output);
  } catch (error) {
    // Fallback to static file
    res.sendFile(WIDGET_JS_PATH);
  }
});
app.use("/widget", express.static(path.resolve(process.cwd(), "public/widget")));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const jsonStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${jsonStr.length > 200 ? jsonStr.slice(0, 200) + '...' : jsonStr}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  try {
    await runMigrations();
    await seedDatabase();
    await seedAutomationDefaults();
    await seedOrganizationDefaults();
  } catch (err) {
    console.error("Seed error:", err);
  }

  // Start background workers
  startEmailWorker();
  startSmsWorker();
  startScheduledTasks();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
