import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  publicAppUrl: process.env.PUBLIC_APP_URL || "http://localhost:5173",
  firstWebhookUrl: process.env.FIRST77_WEBHOOK_URL || "",
  firstWebhookTimeoutMs: Number(process.env.FIRST77_WEBHOOK_TIMEOUT_MS || 12000)
};
