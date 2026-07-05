import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isReservedUsername, normalizeUsername } from "../src/utils/usernamePolicy.js";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("reserved brand usernames", () => {
  it("normalizes accents, separators and similar characters", () => {
    expect(normalizeUsername("77-gíra_oficial")).toBe("77giraoficial");
    expect(normalizeUsername("77gir4")).toBe("77gira");
  });

  it.each(["77gira", "agenda77gira", "77girra", "77giraa", "77gira.oficial", "admin", "suporte", "staff"])("blocks %s", (username) => {
    expect(isReservedUsername(username)).toBe(true);
  });

  it.each(["lia.santos", "sambista77", "gira_sol", "joao-sp"])("allows %s", (username) => {
    expect(isReservedUsername(username)).toBe(false);
  });

  it("forces public registration to attendee and protects admin tooling", () => {
    const auth = read("backend/src/controllers/auth.controller.js");
    const routes = read("backend/src/routes/index.js");
    expect(auth).not.toContain("role: roleSchema.optional()");
    expect(auth).toContain('role: "attendee"');
    expect(routes).toContain('router.post("/admin/users", requireAuth, requireRole(["admin"]), authLimiter, createCommonUser)');
  });
});
