import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("secure password recovery", () => {
  it("stores only hashed, expiring and single-use reset tokens", () => {
    const schema = read("backend/prisma/schema.prisma");
    const controller = read("backend/src/controllers/auth.controller.js");
    expect(schema).toContain("model PasswordResetToken");
    expect(schema).toContain("tokenHash String    @unique");
    expect(schema).toContain("expiresAt DateTime");
    expect(schema).toContain("usedAt    DateTime?");
    expect(controller).toContain('crypto.randomBytes(32).toString("base64url")');
    expect(controller).toContain("const tokenHash = hashToken(rawToken)");
    expect(controller).not.toContain("data: { userId: user.id, token: rawToken");
  });

  it("does not reveal whether an email has an account", () => {
    const controller = read("backend/src/controllers/auth.controller.js");
    expect(controller).toContain("FORGOT_PASSWORD_MESSAGE");
    expect(controller).toContain("if (!user)");
    expect(controller.match(/res\.status\(202\)\.json\(\{ message: FORGOT_PASSWORD_MESSAGE \}\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("revokes existing sessions after a successful password reset", () => {
    const controller = read("backend/src/controllers/auth.controller.js");
    expect(controller).toContain("tx.refreshToken.updateMany");
    expect(controller).toContain("revokedAt: now");
    expect(controller).toContain("claimed.count !== 1");
  });

  it("exposes rate-limited public endpoints and dedicated screens", () => {
    const routes = read("backend/src/routes/index.js");
    const app = read("frontend/src/App.jsx");
    const login = read("frontend/src/pages/LoginPage.jsx");
    expect(routes).toContain('router.post("/auth/password/forgot", passwordRecoveryLimiter, forgotPassword)');
    expect(routes).toContain('router.post("/auth/password/reset", passwordRecoveryLimiter, resetPassword)');
    expect(app).toContain('path="/forgot-password"');
    expect(app).toContain('path="/reset-password"');
    expect(login).toContain('to="/forgot-password"');
  });

  it("keeps the Brevo credential on the backend only", () => {
    const backendEnv = read("backend/src/config/env.js");
    const frontendService = read("frontend/src/services/auth.service.js");
    const mailer = read("backend/src/services/transactionalEmail.service.js");
    expect(backendEnv).toContain("process.env.BREVO_API_KEY");
    expect(mailer).toContain('"api-key": env.brevoApiKey');
    expect(frontendService).not.toContain("BREVO_API_KEY");
  });
});
