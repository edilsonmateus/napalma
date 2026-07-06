import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const controller = fs.readFileSync(path.join(root, "backend/src/controllers/claims.controller.js"), "utf8");
const schema = fs.readFileSync(path.join(root, "backend/prisma/schema.prisma"), "utf8");
const modal = fs.readFileSync(path.join(root, "frontend/src/components/legal/ClaimLegalAcknowledgementModal.jsx"), "utf8");

describe("claim legal acknowledgement", () => {
  it("requires the current declaration version at the API boundary", () => {
    expect(controller).toContain('const CLAIM_LEGAL_VERSION = "CLAIM_RESPONSIBILITY_V1"');
    expect(controller).toContain("accepted: z.literal(true)");
    expect(controller).toContain("version: z.literal(CLAIM_LEGAL_VERSION)");
  });

  it("persists acceptance date and version on every claim", () => {
    expect(schema).toContain("legalAcknowledgedAt DateTime?");
    expect(schema).toContain("legalAcknowledgementVersion String?");
    expect(controller).toContain("legalAcknowledgedAt: new Date()");
  });

  it("requires reading and an explicit checkbox in the UI", () => {
    expect(modal).toContain("Role o texto até o final");
    expect(modal).toContain("disabled={!readToEnd}");
    expect(modal).toContain("disabled={!checked}");
    expect(modal).toContain("Estou ciente e desejo continuar");
  });
});
