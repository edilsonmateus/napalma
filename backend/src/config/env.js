import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3333),
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || (process.env.NODE_ENV === "production" ? 1 : 0)),
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
  toNaPistaBatchSize: Number(process.env.TO_NA_PISTA_BATCH_SIZE || 100),
  adsHealthAlertsEnabled: process.env.ADS_HEALTH_ALERTS_ENABLED === "true",
  adsHealthAlertWebhookUrl: process.env.ADS_HEALTH_ALERT_WEBHOOK_URL || "",
  adsHealthAlertIntervalMs: Number(process.env.ADS_HEALTH_ALERT_INTERVAL_MS || 900000),
  adsHealthAlertCooldownMs: Number(process.env.ADS_HEALTH_ALERT_COOLDOWN_MS || 21600000)
};

const INSECURE_JWT_VALUES = new Set(["", "dev-secret-change-me", "change-me", "secret", "jwt-secret"]);

export function getSecurityReadiness() {
  const production = process.env.NODE_ENV === "production";
  const corsOrigins = (process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const jwtConfigured = !INSECURE_JWT_VALUES.has(env.jwtSecret) && env.jwtSecret.length >= 32;
  const checks = [
    { key: "jwt_secret", label: "Segredo de autenticação", ok: jwtConfigured, required: true },
    { key: "cors_origins", label: "Origens CORS autorizadas", ok: corsOrigins.length > 0, required: true },
    { key: "database_url", label: "Banco configurado", ok: Boolean(env.databaseUrl), required: true },
    { key: "public_app_https", label: "URL pública HTTPS", ok: !production || env.publicAppUrl.startsWith("https://"), required: true },
    { key: "mock_payment_disabled", label: "Gateway mock desativado", ok: process.env.ADS_MOCK_PAYMENT_ENABLED !== "true", required: false }
  ];
  return { environment: production ? "production" : "development", checks, ready: checks.filter((item) => item.required).every((item) => item.ok) };
}

export function assertProductionSecurityConfig() {
  const status = getSecurityReadiness();
  if (status.environment !== "production" || status.ready) return;
  const failed = status.checks.filter((item) => item.required && !item.ok).map((item) => item.key).join(", ");
  throw new Error(`Configuracao de producao insegura: ${failed}`);
}
