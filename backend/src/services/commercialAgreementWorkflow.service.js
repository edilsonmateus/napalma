import { prisma } from "../lib/prisma.js";

// Commercial agreements own the commercial lifecycle, while envelopes own
// immutable signature evidence. Keeping this reconciliation here prevents the
// generic signature flow from knowing commercial implementation details.
export async function reconcileCommercialAgreementEnvelope({ envelopeId, actorUserId = null }) {
  return prisma.$transaction(async (tx) => {
    const envelope = await tx.legalSignatureEnvelope.findUnique({
      where: { id: envelopeId },
      select: { id: true, status: true, commercialAgreementId: true }
    });
    if (!envelope?.commercialAgreementId) return null;

    const agreement = await tx.commercialAgreement.findUnique({
      where: { id: envelope.commercialAgreementId },
      select: { id: true, status: true }
    });
    if (!agreement) return null;

    const now = new Date();
    let status = null;
    let completedAt;
    let cancelledAt;
    if (envelope.status === "completed") {
      status = "completed";
      completedAt = now;
    } else if (envelope.status === "pending_ratification") {
      status = "pending_ratification";
    } else if (envelope.status === "pending_signature") {
      status = "pending_signature";
    } else if (envelope.status === "pending_counterpart_details") {
      status = "pending_counterpart_details";
    } else if (["declined", "expired", "cancelled"].includes(envelope.status)) {
      status = envelope.status;
      cancelledAt = now;
    }
    if (!status || agreement.status === status) return agreement;

    const updated = await tx.commercialAgreement.update({
      where: { id: agreement.id },
      data: {
        status,
        ...(completedAt ? { completedAt } : {}),
        ...(cancelledAt ? { cancelledAt } : {})
      }
    });
    await tx.legalSignatureEvent.create({
      data: {
        envelopeId,
        actorUserId,
        action: "commercial_agreement_reconciled",
        metadata: { agreementId: agreement.id, agreementStatus: status }
      }
    });
    return updated;
  });
}
