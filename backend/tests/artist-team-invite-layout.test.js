import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");

describe("artist team invite layout", () => {
  it("keeps the invitation action aligned with its fields", () => {
    const css = fs.readFileSync(path.join(root, "frontend/src/styles/globals.css"), "utf8");
    expect(css).toContain("body .artist-team-invite > div :where(input, select, button) { height: 42px; min-height: 42px; }");
    expect(css).toContain("body .artist-team-invite > div > .btn-primary { margin: 0; align-self: stretch; }");
  });
});
