import express from "express";
import cors from "cors";
import fs from "fs/promises";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import jobRoutes from "./routes/jobs.js";
import applicationRoutes from "./routes/applications.js";
import agentRoutes from "./routes/agent.js";
import notificationRoutes from "./routes/notifications.js";
import dashboardRoutes from "./routes/dashboard.js";
import optimizeRoutes from "./routes/optimize.js";
import cvRoutes from "./routes/cvs.js";
import { startAgentScheduler } from "./services/scheduler.js";

async function main() {
  await fs.mkdir(config.storageDir, { recursive: true });
  await connectDb();
  startAgentScheduler();

  const app = express();
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    const aiProvider = config.geminiApiKey
      ? "gemini"
      : config.anthropicApiKey
        ? "anthropic"
        : "none";
    res.json({
      ok: true,
      aiProvider,
      geminiModel: config.geminiModel,
      hasGeminiKey: Boolean(config.geminiApiKey),
      hasAnthropicKey: Boolean(config.anthropicApiKey),
      hasSmtp: Boolean(config.smtpHost && config.smtpUser && config.smtpPass),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/agent", agentRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/optimize", optimizeRoutes);
  app.use("/api/cvs", cvRoutes);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
