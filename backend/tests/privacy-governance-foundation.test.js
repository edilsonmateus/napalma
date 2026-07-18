import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("privacy governance foundation", () => {
  it("keeps append-only consent, rights requests and audit records in the schema", () => {
    const schema = read("backend/prisma/schema.prisma");
    expect(schema).toContain("model PrivacyConsentRecord");
    expect(schema).toContain("model PrivacyRequest");
    expect(schema).toContain("model AuditLog");
    expect(schema).toContain("PrivacyConsentPurpose");
    expect(schema).toContain("PrivacyRequestStatus");
  });

  it("protects the privacy center and routes operational decisions through explicit internal access", () => {
    const routes = read("backend/src/routes/index.js");
    expect(routes).toContain('router.get("/me/privacy", requireAuth, getMyPrivacyOverview)');
    expect(routes).toContain('router.post("/me/privacy/requests", requireAuth, privacyRequestLimiter, createMyPrivacyRequest)');
    expect(routes).toContain('router.get("/admin/privacy-requests", requireAuth, requireRole(["admin"]), listPrivacyRequests)');
    expect(routes).toContain('router.get("/admin/audit-logs", requireAuth, requireOperationScope("audit"), listAuditLogs)');
  });

  it("does not place raw IP addresses in the audit record helper", () => {
    const audit = read("backend/src/services/audit.service.js");
    expect(audit).toContain('createHash("sha256")');
    expect(audit).toContain("ipHash:");
    expect(audit).not.toContain("ipAddress:");
  });

  it("keeps audit consultation administrative and does not select IP hashes", () => {
    const privacy = read("backend/src/controllers/privacy.controller.js");
    expect(privacy).toContain("export async function listAuditLogs");
    expect(privacy).not.toContain("ipHash: true");
  });

  it("limits Ads targeting and analytics metadata to privacy-safe fields", () => {
    const targeting = read("backend/src/utils/adTargetingPolicy.js");
    const analytics = read("backend/src/controllers/analytics.controller.js");
    expect(targeting).toContain("adTargetingSchema");
    expect(targeting).toContain(".strict()");
    expect(analytics).toContain("SAFE_METADATA_KEYS");
    expect(analytics).toContain("const userId = req.user?.id || null");
  });

  it("offers controls and rights requests inside account settings", () => {
    const page = read("frontend/src/pages/PrivacyCenterPage.jsx");
    const app = read("frontend/src/App.jsx");
    expect(page).toContain("Preferências opcionais");
    expect(page).toContain("Solicitar um direito");
    expect(app).toContain('path="/settings/privacy"');
  });

  it("keeps retention inspection non-destructive and documents policy versioning", () => {
    const retention = read("backend/src/services/privacyRetention.service.js");
    const versioning = read("docs/governanca/08_GESTAO_DE_VERSOES_DE_POLITICA_E_CONSENTIMENTO.md");
    expect(retention).toContain('mode: "dry_run"');
    expect(retention).toContain("Nenhum dado foi removido");
    expect(versioning).toContain("PrivacyConsentRecord");
    expect(versioning).toContain("POLICY_VERSION");
  });

  it("assigns operational deadlines to new privacy requests and documents vendor review", () => {
    const controller = read("backend/src/controllers/privacy.controller.js");
    const schema = read("backend/prisma/schema.prisma");
    const vendors = read("docs/governanca/09_REGISTRO_DE_OPERADORES_E_FORNECEDORES.md");
    expect(controller).toContain("PRIVACY_REQUEST_SLA_DAYS");
    expect(controller).toContain("dueAt: privacyRequestDueAt()");
    expect(schema).toMatch(/dueAt\s+DateTime\?/);
    expect(vendors).toContain("Cadastro minimo por fornecedor");
  });

  it("sets a safe HTTP baseline and documents production recovery controls", () => {
    const app = read("backend/src/app.js");
    const headers = read("backend/src/middlewares/securityHeaders.js");
    const operations = read("docs/governanca/10_BACKUP_RESTAURACAO_E_ROTACAO_DE_SEGREDOS.md");
    expect(app).toContain('app.disable("x-powered-by")');
    expect(app).toContain("app.use(securityHeaders)");
    expect(headers).toContain("X-Content-Type-Options");
    expect(headers).toContain("Strict-Transport-Security");
    expect(operations).toContain("Backup que nunca foi restaurado");
  });

  it("fails closed on missing production essentials and keeps readiness admin-only", () => {
    const env = read("backend/src/config/env.js");
    const server = read("backend/src/server.js");
    const routes = read("backend/src/routes/index.js");
    expect(env).toContain("assertProductionSecurityConfig");
    expect(env).toContain("CORS_ORIGINS");
    expect(server).toContain("assertProductionSecurityConfig()");
    expect(routes).toContain('router.get("/admin/security-readiness", requireAuth, requireRole(["admin"]), getSecurityReadinessForAdmin)');
  });

  it("prevents API response caching and exposes a dependency-aware readiness probe", () => {
    const app = read("backend/src/app.js");
    const noStore = read("backend/src/middlewares/noStore.js");
    const health = read("backend/src/services/health.service.js");
    const sessions = read("docs/governanca/11_SESSOES_E_TRANSPORTE_DE_AUTENTICACAO.md");
    expect(app).toContain('app.get("/health/ready"');
    expect(health).toContain("prisma.$queryRaw`SELECT 1`");
    expect(app).toContain('app.use("/api", noStore)');
    expect(noStore).toContain("Cache-Control");
    expect(sessions).toContain("cookie HTTP-only");
  });

  it("correlates requests while keeping error logs free from request payloads", () => {
    const app = read("backend/src/app.js");
    const context = read("backend/src/middlewares/requestContext.js");
    const logger = read("backend/src/utils/errorLogging.js");
    expect(app).toContain("app.use(requestContext)");
    expect(app).toContain("logSafeError(err, req)");
    expect(context).toContain("X-Request-Id");
    expect(logger).toContain("Request bodies, headers, credentials");
    expect(logger).not.toContain("req.body");
  });

  it("keeps database readiness bounded so deployment probes cannot hang indefinitely", () => {
    const app = read("backend/src/app.js");
    const health = read("backend/src/services/health.service.js");
    expect(app).toContain("checkDatabaseReadiness()");
    expect(health).toContain("Promise.race");
    expect(health).toContain("database_readiness_timeout");
  });

  it("accepts only browser-safe ad destinations and bounds multipart request fields", () => {
    const safeUrl = read("backend/src/utils/safeUrl.js");
    const upload = read("backend/src/middlewares/upload.js");
    const ads = read("backend/src/controllers/ads.controller.js");
    const portal = read("backend/src/controllers/advertiserPortal.controller.js");
    expect(safeUrl).toContain('parsed.protocol === "https:" || parsed.protocol === "http:"');
    expect(upload).toContain("fieldSize: 64 * 1024");
    expect(upload).toContain("files: 1");
    expect(ads).toContain("destinationUrl: safeHttpUrl.optional().nullable()");
    expect(portal).toContain("destinationUrl: safeHttpUrl.optional().nullable()");
  });

  it("uses the same minimum password length on public signup and protects limiter memory", () => {
    const auth = read("backend/src/controllers/auth.controller.js");
    const signup = read("frontend/src/pages/SignupPage.jsx");
    const limiter = read("backend/src/middlewares/rateLimit.js");
    expect(auth).toContain("password: z.string().min(8).max(128)");
    expect(signup).toContain("minLength={8}");
    expect(limiter).toContain("const MAX_BUCKETS = 10_000");
    expect(limiter).toContain("function pruneBuckets");
    expect(limiter).toContain("expiresAt");
  });

  it("requires reauthentication before a user can revoke all refresh sessions", () => {
    const profile = read("backend/src/controllers/profile.controller.js");
    const routes = read("backend/src/routes/index.js");
    const account = read("frontend/src/pages/AccountSettingsPage.jsx");
    const login = read("frontend/src/pages/LoginPage.jsx");
    expect(profile).toContain("export async function revokeMySessions");
    expect(profile).toContain("profile.sessions_revoked");
    expect(routes).toContain('router.post("/me/security/revoke-sessions", requireAuth, privacySensitiveActionLimiter, revokeMySessions)');
    expect(account).toContain("Encerrar sessões em todos os dispositivos");
    expect(login).toContain("securitySessionsRevoked");
  });

  it("uses bounded password hashing and upgrades old hashes after successful login", () => {
    const passwordSecurity = read("backend/src/utils/passwordSecurity.js");
    const auth = read("backend/src/controllers/auth.controller.js");
    expect(passwordSecurity).toContain("const MIN_ROUNDS = 10");
    expect(passwordSecurity).toContain("const MAX_ROUNDS = 14");
    expect(passwordSecurity).toContain("production" ? "12" : "10");
    expect(auth).toContain("needsPasswordRehash(user.passwordHash)");
    expect(auth).toContain("hashPassword(data.password)");
  });

  it("assigns correlation before CORS and avoids query strings in HTTP access logs", () => {
    const app = read("backend/src/app.js");
    const contextIndex = app.indexOf("app.use(requestContext)");
    const corsIndex = app.indexOf("cors({");
    expect(contextIndex).toBeGreaterThan(-1);
    expect(corsIndex).toBeGreaterThan(-1);
    expect(contextIndex).toBeLessThan(corsIndex);
    expect(app).toContain("req.path");
    expect(app).toContain("cors_origin_denied");
  });

  it("keeps legal pages able to render their internal policy links", () => {
    const privacyPage = read("frontend/src/pages/PrivacyPage.jsx");
    const termsPage = read("frontend/src/pages/TermsPage.jsx");
    expect(privacyPage).toContain('import { Link } from "react-router-dom"');
    expect(termsPage).toContain('import { Link } from "react-router-dom"');
    expect(privacyPage).toContain('<Link to="/terms">');
    expect(termsPage).toContain('<Link to="/privacy">');
  });

  it("keeps policy version 1.2 aligned between legal copy and consent records", () => {
    const privacyPage = read("frontend/src/pages/PrivacyPage.jsx");
    const privacyService = read("frontend/src/services/privacy.service.js");
    const privacyController = read("backend/src/controllers/privacy.controller.js");
    expect(privacyPage).toContain("Versão 1.2");
    expect(privacyService).toContain('policyVersion: "1.2"');
    expect(privacyController).toContain('const POLICY_VERSION = "1.2"');
  });
});
