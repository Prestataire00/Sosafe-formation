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
    console.log("Migrations: featured columns ensured");
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

// Widget JS served statically
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
