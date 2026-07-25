import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("admin bootstrap safety", () => {
  it("does not overwrite an existing admin account during normal deploys", () => {
    const bootstrap = read("backend/src/lib/adminBootstrap.js");
    expect(bootstrap).toContain('const resetExistingPassword = process.env.ADMIN_BOOTSTRAP_RESET_PASSWORD === "true"');
    expect(bootstrap).toContain("if (!resetExistingPassword)");
    expect(bootstrap).toContain('return { skipped: true, reason: "already_exists", email }');
  });

  it("requires an explicit flag for an emergency bootstrap password reset", () => {
    const bootstrap = read("backend/src/lib/adminBootstrap.js");
    const example = read("backend/.env.example");
    expect(bootstrap).toContain("return { passwordReset: true, email }");
    expect(example).toContain('ADMIN_BOOTSTRAP_RESET_PASSWORD="false"');
  });
});
