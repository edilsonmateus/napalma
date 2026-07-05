import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("user profile avatar", () => {
  it("persists an avatar URL and returns it in authenticated sessions", () => {
    expect(read("backend/prisma/schema.prisma")).toContain("avatarUrl");
    expect(read("backend/src/controllers/auth.controller.js")).toContain("avatarUrl: user.avatarUrl");
    expect(read("backend/src/middlewares/auth.js")).toContain("avatarUrl: true");
  });

  it("protects and processes the upload through the shared storage strategy", () => {
    const routes = read("backend/src/routes/index.js");
    const controller = read("backend/src/controllers/profile.controller.js");
    expect(routes).toContain('router.post("/me/profile/avatar", requireAuth, uploadLimiter, imageUpload.single("file"), uploadMyAvatar)');
    expect(controller).toContain('isFeatureEnabled("R2_SHARED_UPLOADS_ENABLED")');
    expect(controller).toContain("resize(512, 512");
  });

  it("opens a real image input and refreshes the stored frontend user", () => {
    const settings = read("frontend/src/pages/SettingsPage.jsx");
    expect(settings).toContain('type="file" accept="image/jpeg,image/png,image/webp"');
    expect(settings).toContain("avatarInputRef.current?.click()");
    expect(settings).toContain("setAuth({ token, refreshToken, user: nextUser })");
  });
});
