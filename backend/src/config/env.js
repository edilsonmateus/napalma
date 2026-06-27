import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  publicAppUrl: process.env.PUBLIC_APP_URL || "http://localhost:5173",
  firstWebhookUrl: process.env.FIRST77_WEBHOOK_URL || "",
  firstWebhookTimeoutMs: Number(process.env.FIRST77_WEBHOOK_TIMEOUT_MS || 12000),
  vapidSubject: process.env.VAPID_SUBJECT || "mailto:contato@77gira.com.br",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  toNaPistaSchedulerEnabled: process.env.TO_NA_PISTA_SCHEDULER_ENABLED !== "false",
  toNaPistaSchedulerIntervalMs: Number(process.env.TO_NA_PISTA_SCHEDULER_INTERVAL_MS || 60000),
  toNaPistaRadiusKm: Number(process.env.TO_NA_PISTA_RADIUS_KM || 8),
  toNaPistaHorizonMinutes: Number(process.env.TO_NA_PISTA_HORIZON_MINUTES || 120),
  toNaPistaBatchSize: Number(process.env.TO_NA_PISTA_BATCH_SIZE || 100)
};
