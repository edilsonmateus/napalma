import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("claim decision resilience", () => {
  it("keeps readiness aware of the formal-signature schema used by approvals", () => {
    const health = read("backend/src/services/health.service.js");
    expect(health).toContain("prisma.legalSignatureEnvelope.findFirst");
    expect(health).toContain("select: { issueContext: true }");
  });

  it("clears a stale action when another claim detail is opened", () => {
    const page = read("frontend/src/pages/OperationsCenterPage.jsx");
    expect(page).toContain("async function openClaimDetail(id)");
    expect(page).toContain("setClaimActionLoading(\"\");");
    expect(page).toContain("} finally {\n      setClaimActionLoading(\"\");\n    }");
  });

  it("records the decision before queuing an invitation that may depend on e-mail delivery", () => {
    const controller = read("backend/src/controllers/claims.controller.js");
    const workflow = read("backend/src/services/claimLegalWorkflow.service.js");
    expect(controller).toContain('if (updated?.envelope) delivery = "queued";');
    expect(controller.indexOf("await recordAuditEvent")).toBeLessThan(controller.indexOf("scheduleClaimLegalInvitation(updated.envelope)"));
    expect(controller.indexOf("res.json({ item: mapClaim(finalClaim), legalDelivery: delivery });")).toBeLessThan(controller.indexOf("scheduleClaimLegalInvitation(updated.envelope)"));
    expect(workflow).toContain("export function scheduleClaimLegalInvitation(envelope)");
    expect(workflow).toContain("setImmediate(() => {");
  });

  it("gives the operator an explicit conclusion with close and document actions", () => {
    const page = read("frontend/src/pages/OperationsCenterPage.jsx");
    expect(page).toContain("ClaimDecisionCompletionDialog");
    expect(page).toContain("Elegibilidade aprovada");
    expect(page).toContain("Voltar à fila");
    expect(page).toContain("Ver assinaturas formais");
  });
});
