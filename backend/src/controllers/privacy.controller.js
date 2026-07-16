import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { getPrivacyRetentionPreview } from "../services/privacyRetention.service.js";
import { buildPrivacyExport } from "../services/privacyExport.service.js";
import { getSecurityReadiness } from "../config/env.js";

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
