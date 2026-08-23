import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("legal signature claim context", () => {
  it("returns only the claimed profile context needed for the signer notice", () => {
    const controller = read("backend/src/controllers/legalSignatures.controller.js");
    expect(controller).toContain("claimContext: claim ? {");
    expect(controller).toContain("targetName: claim.artist?.name || claim.venue?.name || null");
    expect(controller).toContain("claimRequest: {");
    expect(controller).toContain("artist: { select: { name: true } }");
    expect(controller).toContain("venue: { select: { name: true } }");
  });
});
