import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Operations Center foundation", () => {
  it("keeps every Operations Center endpoint behind authenticated operational access", () => {
    const routes = read("backend/src/routes/index.js");
    expect(routes).toContain('router.get("/admin/operations/privacy-requests", requireAuth, requireOperationScope("privacy")');
    expect(routes).toContain('router.get("/admin/operations/notifications", requireAuth, requireOperationScope("notifications")');
    expect(routes).toContain('router.get("/admin/operations/moderation", requireAuth, requireOperationScope("catalog")');
    expect(routes).toContain('router.get("/admin/operations/settings", requireAuth, requireOperationScope("settings")');
    expect(routes).toContain('router.get("/admin/operations/access-grants", requireAuth, requireRole(["admin"]), listOperationsAccessGrants)');
    expect(routes).toContain('router.put("/admin/operations/access-grants", requireAuth, requireRole(["admin"]), setOperationsAccessGrant)');
  });

  it("keeps configuration posture useful without returning production secrets", () => {
    const controller = read("backend/src/controllers/operations.controller.js");
    expect(controller).toContain("getOperationsSettingsOverview");
    expect(controller).toContain("security.checks.map(({ key, label, ok, required })");
    expect(controller).not.toContain("jwtSecret:");
    expect(controller).not.toContain("databaseUrl:");
    expect(controller).not.toContain("CORS_ORIGINS:");
  });

  it("treats catalogue moderation as non-punitive triage", () => {
    const controller = read("backend/src/controllers/operations.controller.js");
    const page = read("frontend/src/pages/OperationsCenterPage.jsx");
    expect(controller).toContain("This is not");
    expect(page).toContain("Ela não bloqueia contas");
    expect(page).toContain("Nenhuma sanção é aplicada a partir desta tela");
  });

  it("audits sensitive privacy detail openings and requires a typed protocol for retention decisions", () => {
    const controller = read("backend/src/controllers/privacy.controller.js");
    expect(controller).toContain('action: "privacy.operations_detail_opened"');
    expect(controller).toContain("const expectedProtocol = `PR-${current.id.slice(0, 8).toUpperCase()}`");
    expect(controller).toContain("privacy.operations_retention_concluded");
    expect(controller).toContain("Nenhum dado foi excluído automaticamente");
    expect(controller).toContain("noteProvided: Boolean(note)");
    expect(controller).not.toContain('metadata: { from: current.status, to: "in_review", note: note || null }');
  });

  it("makes the overview resilient when a non-essential operational source is temporarily unavailable", () => {
    const page = read("frontend/src/pages/OperationsCenterPage.jsx");
    expect(page).toContain("Promise.allSettled");
    expect(page).toContain("const result = Object.fromEntries");
    expect(page).toContain("setItems(result.privacy || [])");
  });

  it("keeps delegated scopes separate from public roles and leaves the global admin intact", () => {
    const schema = read("backend/prisma/schema.prisma");
    const access = read("backend/src/middlewares/operationsAccess.js");
    const auth = read("backend/src/middlewares/auth.js");
    expect(schema).toContain("enum OperationScope");
    expect(schema).toContain("model OperationAccessGrant");
    expect(access).toContain('user?.role === "admin"');
    expect(access).toContain("requireOperationScope");
    expect(auth).toContain("operationAccessGrants");
    expect(schema).toContain("@@unique([userId, scope])");
  });

  it("uses genuine WebAuthn challenges for irreversible operational decisions", () => {
    const schema = read("backend/prisma/schema.prisma");
    const routes = read("backend/src/routes/index.js");
    const controller = read("backend/src/controllers/operationsWebauthn.controller.js");
    const privacy = read("backend/src/controllers/privacy.controller.js");
    expect(schema).toContain("model OperationWebAuthnCredential");
    expect(schema).toContain("model OperationWebAuthnChallenge");
    expect(routes).toContain('"/admin/operations/webauthn/confirmation-options"');
    expect(controller).toContain("verifyAuthenticationResponse");
    expect(controller).toContain("requireUserVerification: true");
    expect(controller).toContain('purpose: "operations_sensitive_confirmation"');
    expect(privacy).toContain("privacy_webauthn_confirmation_required");
  });
});
