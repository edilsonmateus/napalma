import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { activateClaimAccess } from "./claimAccess.service.js";
import { sendLegalSignatureInvitationEmail } from "./transactionalEmail.service.js";

const FORMAL_ACCESS_REQUESTS = new Set(["ownership", "team_access", "artist_inclusion"]);
const SIGNATURE_TTL_DAYS = 30;

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function protocol() {
  return `RV-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function personName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Pessoa solicitante";
}

function audienceForClaim(claim) {
  if (claim.targetType === "artist") return "artist_manager";
  const requested = claim.requestedChanges && typeof claim.requestedChanges === "object" ? claim.requestedChanges : {};
  return requested.requestedAccessProfile === "producer" ? "producer" : "venue_manager";
}

export function claimRequiresFormalSignature(claim) {
  return env.professionalClaimLegalGateEnabled && FORMAL_ACCESS_REQUESTS.has(claim.requestType);
}

export async function prepareClaimLegalEnvelope({ tx, claim, actorUserId }) {
  if (claim.legalEnvelopeId) {
    return tx.legalSignatureEnvelope.findUnique({ where: { id: claim.legalEnvelopeId }, include: { participants: true } });
  }

  const audience = audienceForClaim(claim);
  const version = await tx.legalDocumentVersion.findFirst({
    where: {
      status: { in: ["approved", "scheduled", "active"] },
      document: { category: "claim_management" },
      audiences: { some: { audience } }
    },
    include: { document: true },
    orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }]
  });
  if (!version) {
    throw Object.assign(new Error("claim_legal_document_unavailable"), {
      status: 409,
      code: "claim_legal_document_unavailable",
      message: "Ainda não existe uma versão aprovada do termo aplicável a este vínculo. Prepare o documento antes de liberar o acesso."
    });
  }

  const requester = await tx.user.findUnique({ where: { id: claim.requestedById } });
  if (!requester) throw Object.assign(new Error("claim_requester_not_found"), { status: 404 });

  const expiresAt = new Date(Date.now() + SIGNATURE_TTL_DAYS * 86400000);
  const envelope = await tx.legalSignatureEnvelope.create({
    data: {
      protocol: protocol(),
      title: `${version.document.title} — ${claim.targetType === "artist" ? "perfil artístico" : "gestão de casa"}`,
      documentVersionId: version.id,
      documentTitleSnapshot: version.document.title,
      versionLabelSnapshot: version.versionLabel,
      contentSnapshot: version.contentText,
      contentSha256: version.contentSha256,
      status: "pending_signature",
      expiresAt,
      sentAt: new Date(),
      createdByUserId: actorUserId,
      participants: {
        create: {
          userId: requester.id,
          nameSnapshot: personName(requester),
          emailSnapshot: requester.email.toLowerCase(),
          roleLabel: audience,
          invitationTokenHash: hash(randomBytes(32).toString("hex")),
          invitationExpiresAt: expiresAt
        }
      },
      events: { create: { actorUserId, action: "created_from_claim", metadata: { claimId: claim.id, audience } } }
    },
    include: { participants: true }
  });

  await tx.claimRequest.update({
    where: { id: claim.id },
    data: {
      status: "pending_legal_acceptance",
      legalEnvelopeId: envelope.id,
      reviewedById: actorUserId,
      reviewedAt: new Date()
    }
  });
  return envelope;
}

export async function deliverClaimLegalInvitation(envelope) {
  const participant = envelope?.participants?.[0];
  const context = {
    envelopeId: envelope?.id || null,
    claimRequestId: envelope?.claimRequestId || null,
    participantId: participant?.id || null,
    protocol: envelope?.protocol || null
  };
  if (!participant) {
    console.info("[claim-legal] invitation_not_applicable", context);
    return "not_applicable";
  }
  try {
    console.info("[claim-legal] invitation_delivery_requested", context);
    await sendLegalSignatureInvitationEmail({
      email: participant.emailSnapshot,
      firstName: participant.nameSnapshot,
      envelopeTitle: envelope.title,
      protocol: envelope.protocol,
      expiresAt: envelope.expiresAt
    });
    console.info("[claim-legal] invitation_delivery_accepted", context);
    await prisma.$transaction([
      prisma.legalSignatureParticipant.update({ where: { id: participant.id }, data: { invitationSentAt: new Date() } }),
      prisma.legalSignatureEvent.create({ data: { envelopeId: envelope.id, participantId: participant.id, action: "invitation_sent_from_claim", metadata: { claimWorkflow: true } } })
    ]);
    console.info("[claim-legal] invitation_delivery_recorded", context);
    return "sent";
  } catch (error) {
    const reason = String(error?.message || "unknown").slice(0, 180);
    console.error("[claim-legal] invitation_delivery_failed", { ...context, reason });
    await prisma.legalSignatureEvent.create({
      data: {
        envelopeId: envelope.id,
        participantId: participant.id,
        action: "invitation_delivery_failed",
        metadata: { claimWorkflow: true, reason }
      }
    });
    return "failed";
  }
}

export async function reconcileClaimLegalEnvelope({ envelopeId, actorUserId }) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.claimRequest.findFirst({
      where: { legalEnvelopeId: envelopeId },
      include: { legalEnvelope: true }
    });
    if (!claim || claim.status !== "pending_legal_acceptance") return null;

    if (claim.legalEnvelope.status === "completed") {
      const activation = await activateClaimAccess({ tx, claim, actorUserId });
      const updated = await tx.claimRequest.update({
        where: { id: claim.id },
        data: {
          status: "approved",
          accessActivatedAt: new Date(),
          ...(activation.artistId ? { artistId: activation.artistId } : {})
        }
      });
      await tx.legalSignatureEvent.create({
        data: {
          envelopeId,
          actorUserId: actorUserId || null,
          action: "claim_access_activated",
          metadata: { claimId: claim.id, targetType: claim.targetType, requestType: claim.requestType }
        }
      });
      return updated;
    }

    if (["declined", "expired", "cancelled"].includes(claim.legalEnvelope.status)) {
      return tx.claimRequest.update({
        where: { id: claim.id },
        data: {
          status: "cancelled",
          decisionNote: claim.legalEnvelope.status === "declined"
            ? "Assinatura formal recusada pela pessoa solicitante."
            : "Assinatura formal encerrada sem conclusão."
        }
      });
    }
    return claim;
  });
}
