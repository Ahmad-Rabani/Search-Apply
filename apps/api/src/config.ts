import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/search-and-apply",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  storageDir: path.join(__dirname, "../storage"),
  adzunaAppId: process.env.ADZUNA_APP_ID || "",
  adzunaAppKey: process.env.ADZUNA_APP_KEY || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
};
