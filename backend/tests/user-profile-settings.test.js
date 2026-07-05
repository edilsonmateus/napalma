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

  it("keeps email read-only and exposes the profile editor", () => {
    const page = read("frontend/src/pages/AccountSettingsPage.jsx");
    expect(page).toContain("<Pencil");
    expect(page).toContain('value={user.email} readOnly');
    expect(page).toContain("updateProfilePassword");
  });
});
