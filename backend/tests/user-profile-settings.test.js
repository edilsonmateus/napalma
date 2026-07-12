import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("user account settings", () => {
  it("protects personal data and password update routes", () => {
    const routes = read("backend/src/routes/index.js");
    expect(routes).toContain('router.patch("/me/profile", requireAuth, updateMyProfile)');
    expect(routes).toContain('router.patch("/me/profile/password", requireAuth, authLimiter, updateMyPassword)');
  });

  it("requires the current password and revokes active sessions", () => {
    const controller = read("backend/src/controllers/profile.controller.js");
    expect(controller).toContain("bcrypt.compare(data.currentPassword");
    expect(controller).toContain("prisma.refreshToken.updateMany");
    expect(controller).toContain("revokedAt: new Date()");
  });

  it("keeps email read-only and exposes the profile editor through the pencil action", () => {
    const page = read("frontend/src/pages/AccountSettingsPage.jsx");
    expect(page).toContain("<Pencil");
    expect(page).toContain('aria-label={editingProfile ? "Fechar edição" : "Editar dados pessoais"}');
    expect(page).toContain('value={user.email} readOnly');
    expect(page).toContain("updateProfilePassword");
  });

  it("moves institutional links into a semantic account footer", () => {
    const page = read("frontend/src/pages/AccountSettingsPage.jsx");
    const login = read("frontend/src/pages/LoginPage.jsx");
    const settings = read("frontend/src/pages/SettingsPage.jsx");
    const footer = read("frontend/src/components/layout/InstitutionalFooter.jsx");
    const css = read("frontend/src/styles/globals.css");
    expect(page).toContain("<InstitutionalFooter />");
    expect(login).toContain('<InstitutionalFooter className="auth-institutional-footer" />');
    expect(settings).toContain('<InstitutionalFooter className="settings-institutional-footer" />');
    expect(footer).toContain('aria-label="Suporte, informações institucionais e documentos legais"');
    expect(footer).toContain('user ? "/settings/privacy" : "/privacy"');
    expect(footer).toContain('to="/privacy"');
    expect(css).toContain(".account-footer__links { display: grid");
  });

  it("keeps base location inside personal-data editing and routes To na Pista there", () => {
    const account = read("frontend/src/pages/AccountSettingsPage.jsx");
    const explore = read("frontend/src/pages/ExplorePage.jsx");
    const locationEditor = read("frontend/src/components/settings/LocationBaseCard.jsx");
    expect(account).toContain('get("edit") !== "location"');
    expect(account).toContain('<LocationBaseCard user={user}');
    expect(explore).toContain('/settings/account?edit=location#location-base-editor');
    expect(locationEditor).toContain('id="location-base-editor"');
  });

  it("accepts empty optional profile fields", () => {
    const controller = read("backend/src/controllers/profile.controller.js");
    expect(controller).toContain('value.trim() === "" ? null : value');
    expect(controller).toContain("phone: optionalProfileText");
    expect(controller).toContain("instagramHandle: optionalProfileText");
  });
});
