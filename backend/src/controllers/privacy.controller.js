import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { getPrivacyRetentionPreview } from "../services/privacyRetention.service.js";
import { buildPrivacyExport } from "../services/privacyExport.service.js";
import { getSecurityReadiness } from "../config/env.js";
import { env } from "../config/env.js";

const POLICY_VERSION = "1.2";
const PRIVACY_REQUEST_SLA_DAYS = Number.parseInt(process.env.PRIVACY_REQUEST_SLA_DAYS || "15", 10) || 15;
const consentPurposeSchema = z.enum(["cultural_personalization", "ads_personalization"]);
const consentSchema = z.object({
  isGranted: z.boolean(),
  policyVersion: z.string().trim().min(1).max(32).default(POLICY_VERSION)
});
const requestTypeSchema = z.enum(["access", "data_export", "deletion", "anonymization", "correction", "opposition"]);
const privacyRequestSchema = z.object({
  type: requestTypeSchema,
  details: z.string().trim().max(1000).optional().nullable()
});
const requestListSchema = z.object({
  status: z.enum(["received", "in_review", "completed", "rejected", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30)
});
const requestDecisionSchema = z.object({
  status: z.enum(["received", "in_review", "completed", "rejected", "cancelled"]),
  resolutionNote: z.string().trim().max(1000).optional().nullable()
});
const operationsRequestListSchema = z.object({
  status: z.enum(["all", "received", "in_review", "completed", "rejected", "cancelled"]).default("all"),
  query: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});
const operationsRequestActionSchema = z.object({
  action: z.enum(["take_ownership", "request_information", "conclude_with_retention"]),
  note: z.string().trim().min(5).max(1000).optional(),
  confirmationProtocol: z.string().trim().max(32).optional(),
  webauthnProof: z.string().trim().max(1200).optional()
});
const auditListSchema = z.object({
  action: z.string().trim().min(1).max(120).optional(),
  subjectType: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});
const reauthenticationSchema = z.object({ currentPassword: z.string().min(1).max(128) });
const deletionRequestSchema = reauthenticationSchema.extend({ confirmation: z.literal("EXCLUIR MINHA CONTA") });

const requestSelect = {
  id: true,
  type: true,
  status: true,
  details: true,
  requestedAt: true,
  dueAt: true,
  resolvedAt: true,
  resolutionNote: true
};

function privacyRequestDueAt(requestedAt = new Date()) {
  const dueAt = new Date(requestedAt);
  dueAt.setDate(dueAt.getDate() + PRIVACY_REQUEST_SLA_DAYS);
  return dueAt;
}

function getOperationalRisk(item) {
  const now = Date.now();
  const dueAt = item.dueAt ? new Date(item.dueAt).getTime() : null;
  const dueSoon = dueAt && dueAt - now <= 3 * 24 * 60 * 60 * 1000;
  if (item.type === "deletion" || item.type === "anonymization") return dueSoon ? "high" : "medium";
  if (dueSoon) return "medium";
  return "low";
}

function safeRequesterName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Pessoa solicitante";
}

function mapOperationsQueueItem(item) {
  return {
    id: item.id,
    protocol: `PR-${item.id.slice(0, 8).toUpperCase()}`,
    requesterName: safeRequesterName(item.user),
    type: item.type,
    status: item.status,
    requestedAt: item.requestedAt,
    dueAt: item.dueAt,
    risk: getOperationalRisk(item),
    responsible: item.handledBy ? safeRequesterName(item.handledBy) : null
  };
}

function latestConsents(records) {
  const entries = {};
  for (const record of records) {
    if (!entries[record.purpose]) entries[record.purpose] = record;
  }
  return entries;
}

export async function getMyPrivacyOverview(req, res, next) {
  try {
    const [user, consentRecords, requests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { email: true, username: true, firstName: true, lastName: true, phone: true, instagramHandle: true, city: true, neighborhood: true, postalCode: true, avatarUrl: true, createdAt: true }
      }),
      prisma.privacyConsentRecord.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        select: { purpose: true, isGranted: true, policyVersion: true, createdAt: true }
      }),
      prisma.privacyRequest.findMany({ where: { userId: req.user.id }, orderBy: { requestedAt: "desc" }, take: 30, select: requestSelect })
    ]);
    return res.json({
      policyVersion: POLICY_VERSION,
      account: user,
      consents: latestConsents(consentRecords),
      requests,
      categories: [
        { key: "account", title: "Conta e identidade", detail: "Nome, e-mail, nome de usuário e dados de contato." },
        { key: "location", title: "Localização", detail: "Cidade, bairro e CEP; localização atual somente em recursos de proximidade ativados." },
        { key: "activity", title: "Uso do app", detail: "Radar, histórico, artistas seguidos e interações necessárias à experiência." },
        { key: "professional", title: "Perfis profissionais", detail: "Vínculos, solicitações, agendas, mídias e dados enviados em reivindicações." },
        { key: "ads", title: "Publicidade e métricas", detail: "Entrega e métricas agregadas; anunciantes não recebem dados individuais." }
      ]
    });
  } catch (error) { next(error); }
}

export async function setMyPrivacyConsent(req, res, next) {
  try {
    const purpose = consentPurposeSchema.parse(req.params.purpose);
    const data = consentSchema.parse(req.body || {});
    const record = await prisma.privacyConsentRecord.create({ data: { userId: req.user.id, purpose, ...data, source: "privacy_center" } });
    await recordAuditEvent({ req, action: data.isGranted ? "privacy.consent_granted" : "privacy.consent_revoked", subjectType: "privacy_consent", subjectId: record.id, metadata: { purpose, policyVersion: data.policyVersion } });
    return res.status(201).json({ item: record });
  } catch (error) { next(error); }
}

export async function createMyPrivacyRequest(req, res, next) {
  try {
    const data = privacyRequestSchema.parse(req.body || {});
    const existing = await prisma.privacyRequest.findFirst({ where: { userId: req.user.id, type: data.type, status: { in: ["received", "in_review"] } }, select: { id: true } });
    if (existing) return res.status(409).json({ error: "privacy_request_already_open", message: "Já existe uma solicitação em análise para este direito." });
    const item = await prisma.privacyRequest.create({ data: { userId: req.user.id, type: data.type, details: data.details || null, dueAt: privacyRequestDueAt() }, select: requestSelect });
    await recordAuditEvent({ req, action: "privacy.request_created", subjectType: "privacy_request", subjectId: item.id, metadata: { type: item.type } });
    return res.status(201).json({ item });
  } catch (error) { next(error); }
}

export async function exportMyPrivacyData(req, res, next) {
  try {
    const { currentPassword } = reauthenticationSchema.parse(req.body || {});
    const account = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true, username: true } });
    if (!account || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
      return res.status(401).json({ error: "privacy_reauthentication_failed", message: "Confirme sua senha atual para baixar seus dados." });
    }
    const item = await buildPrivacyExport(req.user.id);
    await recordAuditEvent({ req, action: "privacy.data_exported", subjectType: "user", subjectId: req.user.id, metadata: { format: item.format, version: item.version } });
    const safeUsername = String(account.username || "conta").replace(/[^a-z0-9_-]/gi, "-");
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="77gira-dados-${safeUsername}.json"`);
    return res.status(200).send(JSON.stringify(item, null, 2));
  } catch (error) { next(error); }
}

export async function createMyDeletionRequest(req, res, next) {
  try {
    const { currentPassword } = deletionRequestSchema.parse(req.body || {});
    const account = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
    if (!account || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
      return res.status(401).json({ error: "privacy_reauthentication_failed", message: "Confirme sua senha atual para solicitar a exclusão." });
    }
    const existing = await prisma.privacyRequest.findFirst({ where: { userId: req.user.id, type: "deletion", status: { in: ["received", "in_review"] } }, select: { id: true } });
    if (existing) return res.status(409).json({ error: "deletion_request_already_open", message: "Já existe uma solicitação de exclusão em análise." });
    const item = await prisma.privacyRequest.create({ data: { userId: req.user.id, type: "deletion", details: "Solicitação confirmada pelo titular com reautenticação.", dueAt: privacyRequestDueAt() }, select: requestSelect });
    await recordAuditEvent({ req, action: "privacy.deletion_requested", subjectType: "privacy_request", subjectId: item.id, metadata: { type: "deletion", reauthenticated: true } });
    return res.status(201).json({ item, message: "Solicitação registrada. A conta permanece ativa enquanto avaliamos retenções necessárias e confirmamos o procedimento." });
  } catch (error) { next(error); }
}

export async function listPrivacyRequests(req, res, next) {
  try {
    const { status, limit } = requestListSchema.parse(req.query || {});
    const items = await prisma.privacyRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { requestedAt: "asc" },
      take: limit,
      select: { ...requestSelect, user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } } }
    });
    return res.json({ items });
  } catch (error) { next(error); }
}

export async function updatePrivacyRequest(req, res, next) {
  try {
    const data = requestDecisionSchema.parse(req.body || {});
    const current = await prisma.privacyRequest.findUnique({ where: { id: req.params.id }, select: { id: true, type: true, status: true } });
    if (!current) return res.status(404).json({ error: "privacy_request_not_found", message: "Solicitação não encontrada." });
    const isResolved = ["completed", "rejected", "cancelled"].includes(data.status);
    if (["completed", "rejected"].includes(data.status) && !data.resolutionNote) {
      return res.status(400).json({ error: "privacy_resolution_note_required", message: "Registre a justificativa ou a ação realizada antes de concluir a solicitação." });
    }
    const item = await prisma.privacyRequest.update({
      where: { id: current.id },
      data: { status: data.status, resolutionNote: data.resolutionNote || null, handledByUserId: req.user.id, resolvedAt: isResolved ? new Date() : null },
      select: requestSelect
    });
    await recordAuditEvent({ req, action: "privacy.request_updated", subjectType: "privacy_request", subjectId: item.id, metadata: { from: current.status, to: item.status, type: item.type } });
    return res.json({ item });
  } catch (error) { next(error); }
}

/**
 * Operations Center endpoints deliberately return a redacted queue. Contact
 * details and request narrative are visible only through the audited detail
 * endpoint below, preventing accidental exposure through filters or lists.
 */
export async function listOperationsPrivacyRequests(req, res, next) {
  try {
    const { status, query, limit } = operationsRequestListSchema.parse(req.query || {});
    const queryFilter = query
      ? {
          OR: [
            { id: { contains: query, mode: "insensitive" } },
            { user: { is: { firstName: { contains: query, mode: "insensitive" } } } },
            { user: { is: { lastName: { contains: query, mode: "insensitive" } } } }
          ]
        }
      : {};
    const items = await prisma.privacyRequest.findMany({
      where: { ...(status !== "all" ? { status } : {}), ...queryFilter },
      orderBy: [{ dueAt: "asc" }, { requestedAt: "asc" }],
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        requestedAt: true,
        dueAt: true,
        user: { select: { firstName: true, lastName: true } },
        handledBy: { select: { firstName: true, lastName: true } }
      }
    });
    return res.json({ items: items.map(mapOperationsQueueItem) });
  } catch (error) { next(error); }
}

export async function getOperationsPrivacyRequestDetail(req, res, next) {
  try {
    const item = await prisma.privacyRequest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        type: true,
        status: true,
        details: true,
        requestedAt: true,
        dueAt: true,
        resolvedAt: true,
        resolutionNote: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
            _count: { select: { managedVenues: true, artistAccesses: true, advertiserMemberships: true, adCampaigns: true, claims: true } }
          }
        },
        handledBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    if (!item) return res.status(404).json({ error: "privacy_request_not_found", message: "Solicitação não encontrada." });

    const counts = item.user._count;
    const linkedProfiles = [
      { label: "Conta comum", count: 1 },
      ...(counts.managedVenues ? [{ label: "Casa vinculada", count: counts.managedVenues }] : []),
      ...(counts.artistAccesses ? [{ label: "Perfil de artista", count: counts.artistAccesses }] : []),
      ...(counts.advertiserMemberships ? [{ label: "Conta anunciante", count: counts.advertiserMemberships }] : [])
    ];
    const retentionItems = [
      ...(counts.adCampaigns ? [{ key: "ad_campaigns", label: "Campanhas 77Gira Ads", count: counts.adCampaigns, reason: "Registros comerciais e de auditoria podem exigir retenção." }] : []),
      ...(counts.claims ? [{ key: "claims", label: "Reivindicações e evidências", count: counts.claims, reason: "Evidências podem ser preservadas para prevenção de fraude e defesa de direitos." }] : []),
      { key: "audit", label: "Trilha de auditoria", count: 1, reason: "Eventos sensíveis permanecem pelo período necessário à segurança e conformidade." }
    ];
    const history = await prisma.auditLog.findMany({
      where: { subjectType: "privacy_request", subjectId: item.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, createdAt: true, metadata: true, actor: { select: { firstName: true, lastName: true } } }
    });
    await recordAuditEvent({
      req,
      action: "privacy.operations_detail_opened",
      subjectType: "privacy_request",
      subjectId: item.id,
      metadata: { purpose: "operations_center", sensitiveFields: ["contact", "request_details"] }
    });
    return res.json({
      item: {
        ...mapOperationsQueueItem(item),
        details: item.details,
        resolutionNote: item.resolutionNote,
        resolvedAt: item.resolvedAt,
        requester: { id: item.user.id, email: item.user.email, username: item.user.username, role: item.user.role, createdAt: item.user.createdAt },
        linkedProfiles,
        retentionItems,
        history: history.map((entry) => ({
          id: entry.id,
          action: entry.action,
          createdAt: entry.createdAt,
          actorName: entry.actor ? safeRequesterName(entry.actor) : "Sistema"
        }))
      }
    });
  } catch (error) { next(error); }
}

export async function actOnOperationsPrivacyRequest(req, res, next) {
  try {
    const { action, note, confirmationProtocol, webauthnProof } = operationsRequestActionSchema.parse(req.body || {});
    if (action === "request_information" && !note) {
      return res.status(400).json({ error: "privacy_action_note_required", message: "Explique quais informações ou confirmações adicionais são necessárias." });
    }
    if (action === "conclude_with_retention" && (!note || note.length < 20)) {
      return res.status(400).json({ error: "privacy_retention_justification_required", message: "Registre uma justificativa de pelo menos 20 caracteres para concluir com retenção." });
    }
    const current = await prisma.privacyRequest.findUnique({ where: { id: req.params.id }, select: { id: true, type: true, status: true } });
    if (!current) return res.status(404).json({ error: "privacy_request_not_found", message: "Solicitação não encontrada." });
    if (["completed", "rejected", "cancelled"].includes(current.status)) {
      return res.status(409).json({ error: "privacy_request_closed", message: "Esta solicitação já foi encerrada e não aceita novas ações operacionais." });
    }
    if (action === "conclude_with_retention") {
      if (!["deletion", "anonymization"].includes(current.type)) {
        return res.status(409).json({ error: "privacy_retention_action_not_applicable", message: "Esta conclusão reforçada só se aplica a solicitações de exclusão ou anonimização." });
      }
      const expectedProtocol = `PR-${current.id.slice(0, 8).toUpperCase()}`;
      if (String(confirmationProtocol || "").toUpperCase() !== expectedProtocol) {
        return res.status(400).json({ error: "privacy_protocol_confirmation_invalid", message: "Digite o protocolo exato da solicitação antes de concluir." });
      }
      const biometricCredentials = await prisma.operationWebAuthnCredential.count({ where: { userId: req.user.id } });
      if (biometricCredentials) {
        try {
          const proof = jwt.verify(webauthnProof || "", env.jwtSecret);
          if (proof.sub !== req.user.id || proof.purpose !== "operations_sensitive_confirmation") throw new Error("invalid purpose");
        } catch {
          return res.status(403).json({ error: "privacy_webauthn_confirmation_required", message: "Confirme esta decisão com a biometria cadastrada neste dispositivo." });
        }
      }
      const item = await prisma.privacyRequest.update({
        where: { id: current.id },
        data: { status: "completed", handledByUserId: req.user.id, resolvedAt: new Date(), resolutionNote: note },
        select: requestSelect
      });
      await recordAuditEvent({
        req,
        action: "privacy.operations_retention_concluded",
        subjectType: "privacy_request",
        subjectId: item.id,
        metadata: { from: current.status, to: "completed", decision: "retention_documented", confirmation: "typed_protocol" }
      });
      return res.json({ item, message: "Solicitação concluída com retenções documentadas. Nenhum dado foi excluído automaticamente." });
    }
    const item = await prisma.privacyRequest.update({
      where: { id: current.id },
      data: { status: "in_review", handledByUserId: req.user.id },
      select: requestSelect
    });
    await recordAuditEvent({
      req,
      action: action === "take_ownership" ? "privacy.operations_taken" : "privacy.operations_information_requested",
      subjectType: "privacy_request",
      subjectId: item.id,
      // The request text can contain personal data. The audit trail proves the
      // action happened without duplicating free-form content in a second record.
      metadata: { from: current.status, to: "in_review", informationRequested: action === "request_information", noteProvided: Boolean(note) }
    });
    return res.json({ item });
  } catch (error) { next(error); }
}

/**
 * Administrative operational trail. Metadata is minimised at write time;
 * raw IPs, credentials and authentication material are never returned.
 */
export async function listAuditLogs(req, res, next) {
  try {
    const { action, subjectType, limit } = auditListSchema.parse(req.query || {});
    const items = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(subjectType ? { subjectType } : {})
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        subjectType: true,
        subjectId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, email: true, username: true, firstName: true, lastName: true } }
      }
    });
    return res.json({ items });
  } catch (error) { next(error); }
}

export async function getPrivacyRetentionPreviewForAdmin(_req, res, next) {
  try {
    return res.json({ item: await getPrivacyRetentionPreview() });
  } catch (error) { next(error); }
}

export async function getSecurityReadinessForAdmin(_req, res) {
  return res.json({ item: getSecurityReadiness() });
}
