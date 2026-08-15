import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const schema = read("backend/prisma/schema.prisma");
const claimsController = read("backend/src/controllers/claims.controller.js");
const workflow = read("backend/src/services/claimLegalWorkflow.service.js");
const accessService = read("backend/src/services/claimAccess.service.js");
const env = read("backend/src/config/env.js");
const operationsPage = read("frontend/src/pages/OperationsCenterPage.jsx");

describe("formal legal gate for professional claims", () => {
  it("stores the legal waiting state and links the claim to one signature envelope", () => {
    expect(schema).toContain("pending_legal_acceptance");
    expect(schema).toContain("cancelled");
    expect(schema).toMatch(/legalEnvelopeId\s+String\?\s+@unique/);
    expect(schema).toMatch(/accessActivatedAt\s+DateTime\?/);
  });

  it("keeps the rollout behind an explicit, disabled-by-default backend flag", () => {
    expect(env).toContain('professionalClaimLegalGateEnabled: process.env.PROFESSIONAL_CLAIM_LEGAL_GATE_ENABLED === "true"');
  });

  it("turns approval into eligibility approval when a formal signature is required", () => {
    expect(claimsController).toContain("claimRequiresFormalSignature(existing)");
    expect(claimsController).toContain("prepareClaimLegalEnvelope");
    expect(workflow).toContain('status: "pending_legal_acceptance"');
    expect(workflow).toContain("deliverClaimLegalInvitation");
  });

  it("only activates professional access after the envelope is completed", () => {
    expect(workflow).toContain('claim.legalEnvelope.status === "completed"');
    expect(workflow).toContain("activateClaimAccess");
    expect(workflow).toContain('status: "approved"');
    expect(workflow).toContain("accessActivatedAt: new Date()");
    expect(accessService).toContain("export async function activateClaimAccess");
  });

  it("fails closed when the formal signature is declined, expired or cancelled", () => {
    expect(workflow).toContain('["declined", "expired", "cancelled"].includes(claim.legalEnvelope.status)');
    expect(workflow).toContain('status: "cancelled"');
  });

  it("explains the two-stage decision to the operations team", () => {
    expect(operationsPage).toContain("Aprovar elegibilidade");
    expect(operationsPage).toContain("O acesso formal só é liberado após a assinatura exigida.");
  });
});
