const ACTIVE_LEGAL_ENVELOPE_STATUSES = new Set(["draft", "pending_signature"]);

export function claimIsActive(claim) {
  if (claim?.status === "pending") return true;
  if (claim?.status !== "pending_legal_acceptance") return false;

  const envelopeStatus =
    claim.legalWorkflow?.status ??
    claim.legalEnvelope?.status ??
    null;

  return !envelopeStatus || ACTIVE_LEGAL_ENVELOPE_STATUSES.has(envelopeStatus);
}
