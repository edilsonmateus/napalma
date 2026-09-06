import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { sendCommercialAgreementDetailsInvitationEmail, sendLegalSignatureInvitationEmail } from "../services/transactionalEmail.service.js";
import {
  ContractualEnvelopeValidationError,
  assertContractualContextReference,
  normalizeCounterpartDetails,
  renderContractualSnapshot,
  resolveContractualIssuePolicy
} from "../services/contractualEnvelope.service.js";
import { reconcileCommercialAgreementEnvelope } from "../services/commercialAgreementWorkflow.service.js";

const uuid = z.string().uuid();
const EXCLUSIVE_TYPES = new Set(["exclusive_placement"]);
const ACTIVE_RESERVATION_STATUSES = ["pending_counterpart_details", "pending_signature", "pending_ratification", "completed"];
const SIGNATORY_ROLES = ["owner", "admin"];
const CAROUSEL_SLOT = "explore_between_days_carousel";
const ALL_SLOTS = ["explore_feed_large", "explore_between_days", "explore_between_days_carousel", "venue_detail_inline", "radar_header", "venue_menu_sponsor"];
const REQUIRED_COUNTERPART_TOKENS = ["RAZAO_SOCIAL_CONTRAPARTE", "CNPJ_CONTRAPARTE", "SEDE_CONTRAPARTE", "REPRESENTANTE_CONTRAPARTE", "QUALIDADE_REPRESENTANTE", "EMAIL_SIGNATARIO"];

const agreementInput = z.object({
  title: z.string().trim().min(4).max(220),
  type: z.enum(["sponsorship", "exclusive_placement", "reserved_placement", "negotiated_campaign"]),
  commercialReference: z.string().trim().max(120).optional().nullable(),
  conditionsSummary: z.string().trim().max(5000).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  counterpartUserId: uuid,
  campaignIds: z.array(uuid).max(40).default([]),
  placements: z.array(z.object({ slot: z.enum(ALL_SLOTS), mode: z.enum(["standard", "exclusive"]).default("standard") })).max(12).default([])
});
const counterpartDetailsInput = z.object({
  legalName: z.string(), taxId: z.string(), registeredAddress: z.string(), representativeName: z.string(), representativeCapacity: z.string(), signatoryEmail: z.string(),
  declarationAccepted: z.literal(true)
});
const cancelInput = z.object({ reason: z.string().trim().min(10).max(600) });

function hash(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function protocol() { return `CC-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`; }
function personName(user) { return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Pessoa responsável"; }
function dates(data) { return { ...data, startsAt: data.startsAt ? new Date(data.startsAt) : null, endsAt: data.endsAt ? new Date(data.endsAt) : null }; }
function overlaps(aStart, aEnd, bStart, bEnd) {
  return (!aEnd || !bStart || aEnd >= bStart) && (!bEnd || !aStart || bEnd >= aStart);
}
function serialize(item, { includePrivateDetails = false } = {}) {
  const envelope = item.envelope;
  return {
    id: item.id, title: item.title, type: item.type, status: item.status,
    commercialReference: item.commercialReference, conditionsSummary: item.conditionsSummary,
    startsAt: item.startsAt, endsAt: item.endsAt, issuedAt: item.issuedAt, completedAt: item.completedAt,
    cancellationReason: item.cancellationReason, createdAt: item.createdAt, updatedAt: item.updatedAt,
    advertiserAccount: item.advertiserAccount ? { id: item.advertiserAccount.id, name: item.advertiserAccount.name, type: item.advertiserAccount.type } : undefined,
    counterpart: item.counterpartUser ? { id: item.counterpartUser.id, name: personName(item.counterpartUser), email: includePrivateDetails ? item.counterpartUser.email : undefined } : undefined,
    campaigns: (item.campaigns || []).map(({ campaign }) => ({ id: campaign.id, name: campaign.name, status: campaign.status })),
    placements: (item.placements || []).map((placement) => ({ id: placement.id, slot: placement.slot, mode: placement.mode })),
    envelope: envelope ? {
      id: envelope.id, protocol: envelope.protocol, status: envelope.status, title: envelope.title,
      expiresAt: envelope.expiresAt, completedAt: envelope.completedAt,
      ...(includePrivateDetails ? {
        counterpartLegalName: envelope.counterpartLegalName,
        counterpartTaxId: envelope.counterpartTaxId,
        counterpartRegisteredAddress: envelope.counterpartRegisteredAddress,
        counterpartRepresentativeName: envelope.counterpartRepresentativeName,
        counterpartRepresentativeCapacity: envelope.counterpartRepresentativeCapacity,
        counterpartSignatoryEmail: envelope.counterpartSignatoryEmail
      } : {})
    } : null
  };
}
const agreementInclude = {
  advertiserAccount: { select: { id: true, name: true, type: true } },
  counterpartUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  campaigns: { include: { campaign: { select: { id: true, name: true, status: true } } } },
  placements: true,
  envelope: true
};

async function accountAndCounterpart(accountId, counterpartUserId) {
  const [account, membership] = await Promise.all([
    prisma.advertiserAccount.findUnique({ where: { id: accountId } }),
    prisma.advertiserMembership.findFirst({
      where: { accountId, userId: counterpartUserId, status: "active", role: { in: SIGNATORY_ROLES } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    })
  ]);
  return { account, membership };
}

async function assertNoExclusiveConflict({ accountId, placements, startsAt, endsAt, excludeAgreementId = null }) {
  const exclusiveSlots = placements.filter((item) => item.mode === "exclusive").map((item) => item.slot);
  if (!exclusiveSlots.length) return;
  const candidates = await prisma.commercialAgreement.findMany({
    where: {
      advertiserAccountId: accountId,
      status: { in: ACTIVE_RESERVATION_STATUSES },
      ...(excludeAgreementId ? { id: { not: excludeAgreementId } } : {}),
      placements: { some: { slot: { in: exclusiveSlots }, mode: "exclusive" } }
    },
    include: { placements: true }
  });
  const conflict = candidates.find((item) => overlaps(item.startsAt, item.endsAt, startsAt, endsAt));
  if (conflict) {
    const slots = conflict.placements.filter((item) => item.mode === "exclusive" && exclusiveSlots.includes(item.slot)).map((item) => item.slot).join(", ");
    const error = new Error(`Já existe uma reserva exclusiva sobre ${slots} no período solicitado.`);
    error.code = "exclusive_placement_conflict";
    throw error;
  }
}

function validateBusinessRules(data) {
  const datesData = dates(data);
  if ((datesData.startsAt && !datesData.endsAt) || (!datesData.startsAt && datesData.endsAt)) {
    const error = new Error("Informe início e fim da vigência juntos."); error.code = "agreement_dates_incomplete"; throw error;
  }
  if (datesData.startsAt && datesData.endsAt && datesData.endsAt <= datesData.startsAt) {
    const error = new Error("O fim da vigência deve ocorrer depois do início."); error.code = "agreement_dates_invalid"; throw error;
  }
  const uniqueSlots = new Set();
  for (const placement of datesData.placements) {
    if (uniqueSlots.has(placement.slot)) { const error = new Error("Não repita um posicionamento no mesmo acordo."); error.code = "agreement_duplicate_placement"; throw error; }
    uniqueSlots.add(placement.slot);
  }
  if (EXCLUSIVE_TYPES.has(datesData.type)) {
    if (!datesData.startsAt || !datesData.endsAt || !datesData.campaignIds.length || !datesData.placements.length) {
      const error = new Error("Uma exclusividade exige vigência, campanha vinculada e ao menos um posicionamento."); error.code = "exclusive_placement_incomplete"; throw error;
    }
    if (datesData.placements.some((item) => item.mode !== "exclusive" || item.slot === CAROUSEL_SLOT)) {
      const error = new Error("Exclusividade não é permitida no carrossel compartilhado e deve ser marcada apenas nos slots exclusivos."); error.code = "exclusive_placement_invalid_slot"; throw error;
    }
  } else if (datesData.placements.some((item) => item.mode === "exclusive")) {
    const error = new Error("Somente acordos de exclusividade podem reservar um slot com exclusividade."); error.code = "exclusive_mode_not_allowed"; throw error;
  }
  return datesData;
}

function respondContractualError(res, error) {
  const code = error?.code || error?.message;
  const messages = {
    contractual_signatures_disabled: "As assinaturas contratuais ainda não foram habilitadas.",
    contractual_issue_context_disabled: "O fluxo contratual de publicidade ainda não foi habilitado.",
    tax_id_invalid: "Informe um CNPJ válido.",
    template_unknown_placeholder: "A minuta possui uma variável não reconhecida. Revise a versão ativa antes de emitir.",
    template_unresolved_placeholder: "Não foi possível preencher todas as variáveis da minuta.",
    signatory_email_invalid: "Informe um e-mail de signatário válido."
  };
  if (messages[code]) return res.status(422).json({ error: code, message: messages[code] });
  return null;
}

export async function listCommercialAgreements(req, res, next) {
  try {
    const accountId = uuid.parse(req.params.accountId);
    const items = await prisma.commercialAgreement.findMany({ where: { advertiserAccountId: accountId }, include: agreementInclude, orderBy: { updatedAt: "desc" } });
    return res.json({ items: items.map((item) => serialize(item, { includePrivateDetails: true })) });
  } catch (error) { return next(error); }
}

export async function createCommercialAgreement(req, res, next) {
  try {
    const accountId = uuid.parse(req.params.accountId);
    const data = validateBusinessRules(agreementInput.parse(req.body || {}));
    const { account, membership } = await accountAndCounterpart(accountId, data.counterpartUserId);
    if (!account || account.status !== "active") return res.status(409).json({ error: "advertiser_account_unavailable", message: "A conta anunciante precisa estar ativa." });
    if (!membership) return res.status(422).json({ error: "counterpart_not_authorized", message: "A contraparte deve ser um membro ativo com papel de titular ou administrador nesta conta." });
    const campaignIds = [...new Set(data.campaignIds)];
    if (campaignIds.length) {
      const count = await prisma.adCampaign.count({ where: { id: { in: campaignIds }, advertiserAccountId: accountId } });
      if (count !== campaignIds.length) return res.status(422).json({ error: "agreement_campaign_invalid", message: "Uma ou mais campanhas não pertencem à conta anunciante." });
    }
    await assertNoExclusiveConflict({ accountId, placements: data.placements, startsAt: data.startsAt, endsAt: data.endsAt });
    const item = await prisma.commercialAgreement.create({
      data: {
        advertiserAccountId: accountId, title: data.title, type: data.type,
        commercialReference: data.commercialReference || null, conditionsSummary: data.conditionsSummary || null,
        startsAt: data.startsAt, endsAt: data.endsAt, counterpartUserId: data.counterpartUserId, createdByUserId: req.user.id,
        campaigns: { create: campaignIds.map((campaignId) => ({ campaignId })) },
        placements: { create: data.placements.map((placement) => ({ slot: placement.slot, mode: placement.mode })) }
      }, include: agreementInclude
    });
    await recordAuditEvent({ req, action: "commercial_agreement.created", subjectType: "commercial_agreement", subjectId: item.id, metadata: { accountId, type: item.type, placementCount: data.placements.length, campaignCount: campaignIds.length } });
    return res.status(201).json({ item: serialize(item, { includePrivateDetails: true }) });
  } catch (error) {
    if (error?.code === "exclusive_placement_conflict") return res.status(409).json({ error: error.code, message: error.message });
    return next(error);
  }
}

export async function issueCommercialAgreement(req, res, next) {
  try {
    const agreementId = uuid.parse(req.params.id);
    const policy = resolveContractualIssuePolicy("advertising_contract", env);
    const item = await prisma.commercialAgreement.findUnique({ where: { id: agreementId }, include: agreementInclude });
    if (!item) return res.status(404).json({ message: "Acordo comercial não encontrado." });
    if (item.status !== "draft" || item.envelope) return res.status(409).json({ error: "agreement_not_issuable", message: "Este acordo não está disponível para emissão." });
    await assertNoExclusiveConflict({ accountId: item.advertiserAccountId, placements: item.placements, startsAt: item.startsAt, endsAt: item.endsAt, excludeAgreementId: item.id });
    const version = await prisma.legalDocumentVersion.findFirst({
      where: { status: "active", document: { key: policy.documentKey, category: policy.documentCategory }, audiences: { some: { audience: policy.audience } } },
      include: { document: true }, orderBy: { effectiveAt: "desc" }
    });
    if (!version) return res.status(422).json({ error: "commercial_contract_template_not_active", message: "A minuta de contrato-base de publicidade precisa ter uma versão ativa para anunciantes antes da emissão." });
    assertContractualContextReference("advertising_contract", item.id);
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    const envelope = await prisma.$transaction(async (tx) => {
      const created = await tx.legalSignatureEnvelope.create({
        data: {
          protocol: protocol(), title: `${version.document.title} — ${item.title}`,
          documentVersionId: version.id, documentTitleSnapshot: version.document.title,
          versionLabelSnapshot: version.versionLabel, contentSnapshot: version.contentText,
          contentSha256: version.contentSha256, status: "pending_counterpart_details",
          issueContext: "advertising_contract", issueContextReferenceId: item.id,
          completionMode: policy.completionMode, expiresAt, sentAt: new Date(), createdByUserId: req.user.id,
          commercialAgreementId: item.id,
          participants: { create: {
            userId: item.counterpartUser.id, nameSnapshot: personName(item.counterpartUser), emailSnapshot: item.counterpartUser.email.toLowerCase(),
            roleLabel: "Contraparte comercial", invitationTokenHash: hash(randomBytes(32).toString("hex")), invitationExpiresAt: expiresAt
          } }
        }, include: { participants: true }
      });
      await tx.commercialAgreement.update({ where: { id: item.id }, data: { status: "pending_counterpart_details", issuedAt: new Date() } });
      await tx.legalSignatureEvent.create({ data: { envelopeId: created.id, actorUserId: req.user.id, action: "commercial_agreement_issued", metadata: { agreementId: item.id, documentVersionId: version.id } } });
      return created;
    });
    await recordAuditEvent({ req, action: "commercial_agreement.issued", subjectType: "commercial_agreement", subjectId: item.id, metadata: { envelopeId: envelope.id, documentVersionId: version.id } });
    // The person completes corporate data only after authenticated access. No
    // CNPJ, address or signatory data travels in this message or its URL.
    let delivery = "sent";
    try {
      const participant = envelope.participants[0];
      await sendCommercialAgreementDetailsInvitationEmail({ email: participant.emailSnapshot, firstName: participant.nameSnapshot, agreementTitle: envelope.title, protocol: envelope.protocol, expiresAt });
      await prisma.legalSignatureParticipant.update({ where: { id: participant.id }, data: { invitationSentAt: new Date() } });
    } catch { delivery = "failed"; }
    return res.status(201).json({ item: { id: item.id, status: "pending_counterpart_details", envelope: { id: envelope.id, protocol: envelope.protocol, status: envelope.status } }, delivery });
  } catch (error) {
    if (error instanceof ContractualEnvelopeValidationError && respondContractualError(res, error)) return undefined;
    return next(error);
  }
}

export async function listMyCommercialAgreements(req, res, next) {
  try {
    const accountId = uuid.parse(req.params.accountId);
    const member = await prisma.advertiserMembership.findFirst({ where: { accountId, userId: req.user.id, status: "active" } });
    if (!member) return res.status(403).json({ error: "advertiser_access_denied", message: "Sem acesso a esta conta anunciante." });
    const items = await prisma.commercialAgreement.findMany({ where: { advertiserAccountId: accountId, counterpartUserId: req.user.id }, include: agreementInclude, orderBy: { updatedAt: "desc" } });
    return res.json({ items: items.map((item) => serialize(item, { includePrivateDetails: true })) });
  } catch (error) { return next(error); }
}

export async function submitMyCommercialAgreementDetails(req, res, next) {
  try {
    const agreementId = uuid.parse(req.params.id);
    const raw = counterpartDetailsInput.parse(req.body || {});
    const details = normalizeCounterpartDetails(raw);
    const item = await prisma.commercialAgreement.findUnique({ where: { id: agreementId }, include: agreementInclude });
    if (!item || item.counterpartUserId !== req.user.id) return res.status(404).json({ message: "Acordo comercial não encontrado para esta conta." });
    if (item.status !== "pending_counterpart_details" || item.envelope?.status !== "pending_counterpart_details") return res.status(409).json({ error: "agreement_details_unavailable", message: "Este acordo não está disponível para preenchimento." });
    if (details.signatoryEmail !== req.user.email.toLowerCase()) return res.status(422).json({ error: "signatory_email_account_mismatch", message: "Nesta primeira versão, o e-mail do signatário deve ser o mesmo da conta autenticada responsável pelo acordo." });
    const rendered = renderContractualSnapshot(item.envelope.contentSnapshot, details);
    if (REQUIRED_COUNTERPART_TOKENS.some((token) => !rendered.usedTokens.includes(token))) {
      return res.status(422).json({ error: "commercial_contract_template_incomplete", message: "A minuta ativa não contém todas as variáveis obrigatórias da contraparte e não pode ser usada." });
    }
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.legalSignatureEnvelope.update({
        where: { id: item.envelope.id },
        data: {
          contentSnapshot: rendered.contentSnapshot, contentSha256: hash(rendered.contentSnapshot), status: "pending_signature",
          counterpartLegalName: rendered.details.legalName, counterpartTaxId: rendered.details.taxId,
          counterpartRegisteredAddress: rendered.details.registeredAddress, counterpartRepresentativeName: rendered.details.representativeName,
          counterpartRepresentativeCapacity: rendered.details.representativeCapacity, counterpartSignatoryEmail: rendered.details.signatoryEmail,
          counterpartSubmittedAt: now, counterpartSubmittedByUserId: req.user.id
        }
      });
      const agreement = await tx.commercialAgreement.update({ where: { id: item.id }, data: { status: "pending_signature" }, include: agreementInclude });
      await tx.legalSignatureEvent.create({ data: { envelopeId: item.envelope.id, actorUserId: req.user.id, action: "counterpart_details_submitted", metadata: { agreementId: item.id, fields: rendered.requiredFields, declarationAccepted: true } } });
      return agreement;
    });
    await recordAuditEvent({ req, action: "commercial_agreement.counterpart_details_submitted", subjectType: "commercial_agreement", subjectId: item.id, metadata: { envelopeId: item.envelope.id, fields: rendered.requiredFields, declarationAccepted: true } });
    // Sending an e-mail must never undo the immutable snapshot. The signature
    // is already visible in the account, and a delivery failure is recorded.
    setImmediate(() => {
      void sendLegalSignatureInvitationEmail({
        email: req.user.email,
        firstName: personName(req.user),
        envelopeTitle: item.envelope.title,
        protocol: item.envelope.protocol,
        expiresAt: item.envelope.expiresAt
      }).then(async () => {
        await prisma.legalSignatureParticipant.updateMany({ where: { envelopeId: item.envelope.id, userId: req.user.id }, data: { invitationSentAt: new Date() } });
        await prisma.legalSignatureEvent.create({ data: { envelopeId: item.envelope.id, actorUserId: req.user.id, action: "signature_invitation_sent_after_counterpart_details" } });
      }).catch(async (mailError) => {
        await prisma.legalSignatureEvent.create({ data: { envelopeId: item.envelope.id, actorUserId: req.user.id, action: "signature_invitation_delivery_failed", metadata: { reason: String(mailError?.message || "unknown").slice(0, 180) } } });
      });
    });
    return res.json({ item: serialize(updated, { includePrivateDetails: true }), message: "Dados incorporados à minuta. Leia a versão final e assine em Documentos e aceites." });
  } catch (error) {
    if (error instanceof ContractualEnvelopeValidationError && respondContractualError(res, error)) return undefined;
    return next(error);
  }
}

export async function cancelCommercialAgreement(req, res, next) {
  try {
    const agreementId = uuid.parse(req.params.id);
    const { reason } = cancelInput.parse(req.body || {});
    const item = await prisma.commercialAgreement.findUnique({ where: { id: agreementId }, include: agreementInclude });
    if (!item) return res.status(404).json({ message: "Acordo comercial não encontrado." });
    if (["completed", "cancelled", "declined", "expired"].includes(item.status)) return res.status(409).json({ error: "agreement_not_cancellable", message: "Este acordo não pode mais ser cancelado por este fluxo." });
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.commercialAgreement.update({ where: { id: item.id }, data: { status: "cancelled", cancelledAt: now, cancellationReason: reason } });
      if (item.envelope && ["draft", "pending_counterpart_details", "pending_signature", "pending_ratification"].includes(item.envelope.status)) {
        await tx.legalSignatureEnvelope.update({ where: { id: item.envelope.id }, data: { status: "cancelled", cancelledAt: now, cancellationReason: reason } });
      }
    });
    await recordAuditEvent({ req, action: "commercial_agreement.cancelled", subjectType: "commercial_agreement", subjectId: item.id, metadata: { reason } });
    return res.json({ cancelled: true });
  } catch (error) { return next(error); }
}

export { reconcileCommercialAgreementEnvelope };
