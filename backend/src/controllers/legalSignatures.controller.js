import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { sendLegalSignatureCodeEmail, sendLegalSignatureInvitationEmail } from "../services/transactionalEmail.service.js";
import { reconcileClaimLegalEnvelope } from "../services/claimLegalWorkflow.service.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const INVITATION_TTL_DAYS = 30;

const createEnvelopeSchema = z.object({
  documentVersionId: z.string().uuid(),
  participantEmail: z.string().trim().email().max(320),
  participantName: z.string().trim().min(2).max(180).optional(),
  participantRole: z.string().trim().min(2).max(120).optional(),
  title: z.string().trim().min(4).max(220).optional(),
  expiresAt: z.string().datetime().optional()
});

const confirmSchema = z.object({
  password: z.string().min(1).max(200),
  code: z.string().regex(/^\d{6}$/)
});

const requestCodeSchema = z.object({
  password: z.string().min(1).max(200),
  acknowledged: z.literal(true)
});

const declineSchema = z.object({ reason: z.string().trim().min(10).max(600) });

function hash(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function requestIpHash(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const source = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.ip || req.socket?.remoteAddress || "").split(",")[0].trim();
  return source ? hash(source) : null;
}
function protocol() { return `AS-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`; }
function sixDigitCode() { return String(randomInt(0, 1_000_000)).padStart(6, "0"); }
function actorName(user) { return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Pessoa responsável"; }

function serializeParticipant(item, includeContent = false) {
  const envelope = item.envelope;
  return {
    id: item.id,
    status: item.status,
    roleLabel: item.roleLabel,
    invitationExpiresAt: item.invitationExpiresAt,
    invitationSentAt: item.invitationSentAt,
    viewedAt: item.viewedAt,
    signedAt: item.signedAt,
    declineReason: item.declineReason,
    protocol: envelope.protocol,
    title: envelope.title,
    documentTitle: envelope.documentTitleSnapshot,
    versionLabel: envelope.versionLabelSnapshot,
    contentSha256: envelope.contentSha256,
    envelopeStatus: envelope.status,
    expiresAt: envelope.expiresAt,
    contentSnapshot: includeContent ? envelope.contentSnapshot : undefined
  };
}

async function event({ req, envelopeId, participantId = null, action, metadata = null }) {
  await prisma.legalSignatureEvent.create({ data: { envelopeId, participantId, actorUserId: req.user?.id || null, action, metadata, ipHash: requestIpHash(req) } });
  await recordAuditEvent({ req, action: `legal_signature.${action}`, subjectType: "legal_signature_envelope", subjectId: envelopeId, metadata: { participantId, ...(metadata || {}) } });
}

async function resolveMine(req, participantId) {
  const item = await prisma.legalSignatureParticipant.findUnique({
    where: { id: participantId },
    include: { envelope: true }
  });
  if (!item || (item.userId && item.userId !== req.user.id) || (!item.userId && item.emailSnapshot.toLowerCase() !== req.user.email.toLowerCase())) return null;
  return item;
}

async function expireEnvelopeIfNeeded(req, item) {
  if (!item?.envelope?.expiresAt || item.envelope.expiresAt > new Date()) return false;
  if (item.status === "signed" || ["completed", "declined", "cancelled", "expired"].includes(item.envelope.status)) return false;

  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const envelope = await tx.legalSignatureEnvelope.updateMany({
      where: { id: item.envelopeId, status: "pending_signature" },
      data: { status: "expired" }
    });
    if (!envelope.count) return false;
    await tx.legalSignatureParticipant.updateMany({
      where: { envelopeId: item.envelopeId, status: { in: ["pending", "viewed"] } },
      data: { status: "expired" }
    });
    return true;
  });

  if (changed) {
    await event({ req, envelopeId: item.envelopeId, participantId: item.id, action: "expired", metadata: { expiredAt: now } });
    await reconcileClaimLegalEnvelope({ envelopeId: item.envelopeId, actorUserId: req.user?.id || null });
  }
  return changed;
}

export async function listMyLegalSignatures(req, res, next) {
  try {
    const items = await prisma.legalSignatureParticipant.findMany({
      where: { OR: [{ userId: req.user.id }, { userId: null, emailSnapshot: { equals: req.user.email, mode: "insensitive" } }] },
      include: { envelope: true },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    return res.json({ items: items.map((item) => serializeParticipant(item)) });
  } catch (error) { next(error); }
}

export async function getMyLegalSignature(req, res, next) {
  try {
    const item = await resolveMine(req, req.params.participantId);
    if (!item) return res.status(404).json({ message: "Documento de assinatura não encontrado para esta conta." });
    if (await expireEnvelopeIfNeeded(req, item)) return res.status(410).json({ message: "O prazo desta assinatura expirou." });
    if (!item.viewedAt && item.status === "pending") {
      await prisma.legalSignatureParticipant.update({ where: { id: item.id }, data: { viewedAt: new Date(), status: "viewed" } });
      await event({ req, envelopeId: item.envelopeId, participantId: item.id, action: "viewed" });
      item.viewedAt = new Date(); item.status = "viewed";
    }
    if (item.status === "signed" && item.envelope.status === "completed") {
      await reconcileClaimLegalEnvelope({ envelopeId: item.envelopeId, actorUserId: req.user.id });
    }
    return res.json({ item: serializeParticipant(item, true) });
  } catch (error) { next(error); }
}

export async function requestMyLegalSignatureCode(req, res, next) {
  const context = { participantId: req.params.participantId, actorUserId: req.user?.id || null };
  try {
    console.info("[legal-signature] confirmation_code_request_received", context);
    const data = requestCodeSchema.parse(req.body || {});
    const item = await resolveMine(req, req.params.participantId);
    if (!item) {
      console.info("[legal-signature] confirmation_code_participant_not_found", context);
      return res.status(404).json({ message: "Documento de assinatura não encontrado para esta conta." });
    }
    const resolvedContext = { ...context, envelopeId: item.envelopeId, protocol: item.envelope.protocol };
    if (await expireEnvelopeIfNeeded(req, item)) {
      console.info("[legal-signature] confirmation_code_envelope_expired", resolvedContext);
      return res.status(410).json({ message: "O prazo desta assinatura expirou." });
    }
    if (!["pending", "viewed"].includes(item.status) || item.envelope.status !== "pending_signature") {
      console.info("[legal-signature] confirmation_code_unavailable", { ...resolvedContext, participantStatus: item.status, envelopeStatus: item.envelope.status });
      return res.status(409).json({ message: "Esta assinatura não está disponível para confirmação." });
    }
    console.info("[legal-signature] confirmation_code_password_verification_started", resolvedContext);
    const passwordValid = await bcrypt.compare(data.password, req.user.passwordHash);
    if (!passwordValid) {
      console.info("[legal-signature] confirmation_code_password_verification_failed", resolvedContext);
      return res.status(400).json({ message: "A senha atual não confere. O código não foi enviado." });
    }
    console.info("[legal-signature] confirmation_code_password_verification_passed", resolvedContext);
    const code = sixDigitCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    console.info("[legal-signature] confirmation_code_generated", { ...resolvedContext, expiresAt });
    await prisma.legalSignatureParticipant.update({ where: { id: item.id }, data: { emailCodeHash: hash(code), emailCodeExpiresAt: expiresAt, emailCodeUsedAt: null } });
    console.info("[legal-signature] confirmation_code_persisted", resolvedContext);
    console.info("[legal-signature] confirmation_code_delivery_started", resolvedContext);
    await sendLegalSignatureCodeEmail({ email: item.emailSnapshot, firstName: item.nameSnapshot, code, envelopeTitle: item.envelope.title, expiresInMinutes: CODE_TTL_MS / 60 });
    console.info("[legal-signature] confirmation_code_delivery_accepted", resolvedContext);
    await event({ req, envelopeId: item.envelopeId, participantId: item.id, action: "confirmation_code_sent", metadata: { expiresAt } });
    console.info("[legal-signature] confirmation_code_audit_recorded", resolvedContext);
    return res.json({ sent: true, expiresAt });
  } catch (error) {
    const reason = String(error?.message || "unknown").slice(0, 180);
    console.error("[legal-signature] confirmation_code_request_failed", { ...context, reason });
    if (String(error?.message || "").startsWith("transactional_email_")) {
      return res.status(503).json({ message: "Não foi possível enviar o código de confirmação agora. Tente novamente em alguns minutos." });
    }
    next(error);
  }
}

export async function confirmMyLegalSignature(req, res, next) {
  try {
    const data = confirmSchema.parse(req.body);
    const item = await resolveMine(req, req.params.participantId);
    if (!item) return res.status(404).json({ message: "Documento de assinatura não encontrado para esta conta." });
    if (await expireEnvelopeIfNeeded(req, item)) return res.status(410).json({ message: "O prazo desta assinatura expirou." });
    if (item.status === "signed" && item.envelope.status === "completed") {
      await reconcileClaimLegalEnvelope({ envelopeId: item.envelopeId, actorUserId: req.user.id });
      return res.json({ signed: true, signedAt: item.signedAt, protocol: item.envelope.protocol });
    }
    if (!["pending", "viewed"].includes(item.status) || item.envelope.status !== "pending_signature") return res.status(409).json({ message: "Esta assinatura não está disponível para confirmação." });
    const passwordValid = await bcrypt.compare(data.password, req.user.passwordHash);
    if (!passwordValid) return res.status(400).json({ message: "A senha atual não confere. A assinatura não foi registrada." });
    if (!item.emailCodeHash || !item.emailCodeExpiresAt || item.emailCodeExpiresAt <= new Date() || item.emailCodeUsedAt || hash(data.code) !== item.emailCodeHash) return res.status(400).json({ message: "O código de confirmação é inválido ou expirou. Solicite um novo código." });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.legalSignatureParticipant.update({ where: { id: item.id }, data: { status: "signed", signedAt: now, emailCodeUsedAt: now } });
      await tx.legalSignatureEvidence.createMany({ data: [
        { participantId: item.id, method: "password", contentSha256: item.envelope.contentSha256, userAgent: String(req.headers["user-agent"] || "").slice(0, 512), ipHash: requestIpHash(req), metadata: { verified: true } },
        { participantId: item.id, method: "email_code", contentSha256: item.envelope.contentSha256, userAgent: String(req.headers["user-agent"] || "").slice(0, 512), ipHash: requestIpHash(req), metadata: { verified: true, codeTtlMinutes: CODE_TTL_MS / 60 } }
      ] });
      const remaining = await tx.legalSignatureParticipant.count({ where: { envelopeId: item.envelopeId, status: { not: "signed" } } });
      if (remaining === 0) await tx.legalSignatureEnvelope.update({ where: { id: item.envelopeId }, data: { status: "completed", completedAt: now } });
    });
    await event({ req, envelopeId: item.envelopeId, participantId: item.id, action: "signed", metadata: { methods: ["password", "email_code"], contentSha256: item.envelope.contentSha256 } });
    await reconcileClaimLegalEnvelope({ envelopeId: item.envelopeId, actorUserId: req.user.id });
    return res.json({ signed: true, signedAt: now, protocol: item.envelope.protocol });
  } catch (error) { next(error); }
}

export async function declineMyLegalSignature(req, res, next) {
  try {
    const data = declineSchema.parse(req.body);
    const item = await resolveMine(req, req.params.participantId);
    if (!item) return res.status(404).json({ message: "Documento de assinatura não encontrado para esta conta." });
    if (!["pending", "viewed"].includes(item.status)) return res.status(409).json({ message: "Esta assinatura não pode mais ser recusada." });
    const now = new Date();
    await prisma.$transaction([
      prisma.legalSignatureParticipant.update({ where: { id: item.id }, data: { status: "declined", declineReason: data.reason, declinedAt: now } }),
      prisma.legalSignatureEnvelope.update({ where: { id: item.envelopeId }, data: { status: "declined" } })
    ]);
    await event({ req, envelopeId: item.envelopeId, participantId: item.id, action: "declined", metadata: { reason: data.reason } });
    await reconcileClaimLegalEnvelope({ envelopeId: item.envelopeId, actorUserId: req.user.id });
    return res.json({ declined: true });
  } catch (error) { next(error); }
}

export async function listOperationsLegalSignatures(_req, res, next) {
  try {
    const items = await prisma.legalSignatureEnvelope.findMany({
      include: { participants: { orderBy: { createdAt: "asc" }, select: { id: true, nameSnapshot: true, emailSnapshot: true, roleLabel: true, status: true, signedAt: true, viewedAt: true, invitationSentAt: true, invitationExpiresAt: true } } },
      orderBy: { updatedAt: "desc" }, take: 100
    });
    return res.json({ items });
  } catch (error) { next(error); }
}

export async function createOperationsLegalSignature(req, res, next) {
  try {
    const data = createEnvelopeSchema.parse(req.body);
    const version = await prisma.legalDocumentVersion.findUnique({ where: { id: data.documentVersionId }, include: { document: true } });
    if (!version || !["approved", "scheduled", "active"].includes(version.status)) return res.status(400).json({ message: "Selecione uma versão documental aprovada, agendada ou vigente para assinatura." });
    const existingUser = await prisma.user.findUnique({ where: { email: data.participantEmail.toLowerCase() } });
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + INVITATION_TTL_DAYS * 86400000);
    if (expiresAt <= new Date()) return res.status(400).json({ message: "Defina um prazo futuro para a assinatura." });
    const created = await prisma.legalSignatureEnvelope.create({
      data: {
        protocol: protocol(), title: data.title || version.document.title, documentVersionId: version.id,
        documentTitleSnapshot: version.document.title, versionLabelSnapshot: version.versionLabel,
        contentSnapshot: version.contentText, contentSha256: version.contentSha256,
        status: "pending_signature", expiresAt, sentAt: new Date(), createdByUserId: req.user.id,
        participants: { create: { userId: existingUser?.id || null, nameSnapshot: data.participantName || actorName(existingUser), emailSnapshot: data.participantEmail.toLowerCase(), roleLabel: data.participantRole || null, invitationTokenHash: hash(randomBytes(32).toString("hex")), invitationExpiresAt: expiresAt } }
      }, include: { participants: true }
    });
    const participant = created.participants[0];
    await event({ req, envelopeId: created.id, participantId: participant.id, action: "created", metadata: { documentVersionId: version.id, contentSha256: version.contentSha256 } });
    let delivery = "sent";
    try {
      await sendLegalSignatureInvitationEmail({ email: participant.emailSnapshot, firstName: participant.nameSnapshot, envelopeTitle: created.title, protocol: created.protocol, expiresAt });
      await prisma.legalSignatureParticipant.update({ where: { id: participant.id }, data: { invitationSentAt: new Date() } });
      await event({ req, envelopeId: created.id, participantId: participant.id, action: "invitation_sent" });
    } catch (mailError) {
      delivery = "failed";
      await event({ req, envelopeId: created.id, participantId: participant.id, action: "invitation_delivery_failed", metadata: { reason: String(mailError?.message || "unknown").slice(0, 180) } });
    }
    return res.status(201).json({ item: created, delivery });
  } catch (error) { next(error); }
}

export async function cancelOperationsLegalSignature(req, res, next) {
  try {
    const reason = z.object({ reason: z.string().trim().min(10).max(600) }).parse(req.body).reason;
    const item = await prisma.legalSignatureEnvelope.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Envelope de assinatura não encontrado." });
    if (!["draft", "pending_signature"].includes(item.status)) return res.status(409).json({ message: "Este envelope não pode mais ser cancelado." });
    await prisma.legalSignatureEnvelope.update({ where: { id: item.id }, data: { status: "cancelled", cancelledAt: new Date(), cancellationReason: reason } });
    await event({ req, envelopeId: item.id, action: "cancelled", metadata: { reason } });
    await reconcileClaimLegalEnvelope({ envelopeId: item.id, actorUserId: req.user.id });
    return res.json({ cancelled: true });
  } catch (error) { next(error); }
}

export async function resendOperationsLegalSignatureInvitation(req, res, next) {
  try {
    const envelope = await prisma.legalSignatureEnvelope.findUnique({ where: { id: req.params.id }, include: { participants: { orderBy: { createdAt: "asc" } } } });
    if (!envelope) return res.status(404).json({ message: "Envelope de assinatura n\u00e3o encontrado." });
    if (envelope.status !== "pending_signature" || (envelope.expiresAt && envelope.expiresAt <= new Date())) return res.status(409).json({ message: "Este envelope n\u00e3o est\u00e1 dispon\u00edvel para reenvio." });
    const participant = envelope.participants.find((entry) => ["pending", "viewed"].includes(entry.status));
    if (!participant) return res.status(409).json({ message: "N\u00e3o h\u00e1 participante pendente neste envelope." });
    await sendLegalSignatureInvitationEmail({ email: participant.emailSnapshot, firstName: participant.nameSnapshot, envelopeTitle: envelope.title, protocol: envelope.protocol, expiresAt: envelope.expiresAt });
    await prisma.legalSignatureParticipant.update({ where: { id: participant.id }, data: { invitationSentAt: new Date() } });
    await event({ req, envelopeId: envelope.id, participantId: participant.id, action: "invitation_resent" });
    return res.json({ resent: true });
  } catch (error) { next(error); }
}
