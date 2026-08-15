import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";

const categories = ["terms_of_use", "privacy_cookies", "content_moderation", "claim_management", "advertising_terms", "patacos_policy", "partnership_terms", "internal_operations"];
const audiences = ["visitor", "user", "artist_manager", "venue_manager", "producer", "advertiser", "strategic_partner", "internal_operator"];
const statuses = ["draft", "in_review", "approved", "scheduled", "active", "replaced", "archived"];

const emptyToNull = (value) => typeof value === "string" && !value.trim() ? null : value;
const optionalUrl = z.preprocess(emptyToNull, z.string().url().max(1000).nullable().optional());
const optionalHash = z.preprocess(emptyToNull, z.string().regex(/^[a-f0-9]{64}$/i, "Use um hash SHA-256 válido.").nullable().optional());
const optionalText = (max) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const versionFields = {
  versionLabel: z.string().trim().regex(/^\d+\.\d+(\.\d+)?$/, "Use uma versão como 1.0.0.").max(32),
  contentText: z.string().trim().min(1, "Informe o conteúdo do documento.").max(200000),
  sourceDocumentUrl: optionalUrl,
  sourceDocumentSha256: optionalHash,
  changeType: z.enum(["editorial", "material"]).default("material"),
  changeSummary: optionalText(1000),
  requiresReacceptance: z.boolean().optional().default(false),
  audiences: z.array(z.enum(audiences)).min(1, "Indique pelo menos um público."),
};

const createDocumentSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use identificador em minúsculas e hífens.").max(80),
  title: z.string().trim().min(3).max(180),
  category: z.enum(categories),
  summary: optionalText(500),
  isPublic: z.boolean().optional().default(false),
  ...versionFields
});
const createVersionSchema = z.object(versionFields);
const transitionSchema = z.object({
  status: z.enum(statuses),
  effectiveAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  note: z.string().trim().min(12, "Registre uma justificativa com pelo menos 12 caracteres.").max(1000)
});

function normalizedDocumentText(content) {
  return String(content || "").replace(/\r\n/g, "\n").trim();
}

function sha256(content) {
  return createHash("sha256").update(normalizedDocumentText(content), "utf8").digest("hex");
}

function versionSelect() {
  return {
    include: { audiences: { select: { audience: true } } },
    orderBy: { createdAt: "desc" }
  };
}

function serialize(document) {
  return {
    ...document,
    versions: (document.versions || []).map((version) => ({
      ...version,
      audiences: (version.audiences || []).map((item) => item.audience)
    }))
  };
}

async function writeAudit(req, action, subjectId, metadata = {}) {
  await recordAuditEvent({ req, action, subjectType: "legal_document", subjectId, metadata });
}

async function createDocumentWithVersion(data, userId) {
  return prisma.legalDocument.create({
    data: {
      key: data.key,
      title: data.title,
      category: data.category,
      summary: data.summary || null,
      isPublic: data.isPublic,
      versions: {
        create: {
          versionLabel: data.versionLabel,
          contentText: normalizedDocumentText(data.contentText),
          contentSha256: sha256(data.contentText),
          sourceDocumentUrl: data.sourceDocumentUrl || null,
          sourceDocumentSha256: data.sourceDocumentSha256 || null,
          changeType: data.changeType,
          changeSummary: data.changeSummary || null,
          requiresReacceptance: data.requiresReacceptance,
          createdByUserId: userId,
          audiences: { create: [...new Set(data.audiences)].map((audience) => ({ audience })) }
        }
      }
    },
    include: { versions: versionSelect() }
  });
}

export async function listLegalDocuments(req, res, next) {
  try {
    const items = await prisma.legalDocument.findMany({
      include: { versions: versionSelect() },
      orderBy: [{ category: "asc" }, { title: "asc" }]
    });
    res.json({ items: items.map(serialize) });
  } catch (error) {
    next(error);
  }
}

export async function createLegalDocument(req, res, next) {
  try {
    const data = createDocumentSchema.parse(req.body);
    const item = await createDocumentWithVersion(data, req.user.id);
    await writeAudit(req, "operations.legal_document_created", item.id, {
      key: item.key,
      version: data.versionLabel,
      contentSha256: item.versions[0]?.contentSha256
    });
    res.status(201).json({ item: serialize(item) });
  } catch (error) {
    next(error);
  }
}

export async function createLegalDocumentVersion(req, res, next) {
  try {
    const data = createVersionSchema.parse(req.body);
    const document = await prisma.legalDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ message: "Documento não encontrado." });
    const version = await prisma.legalDocumentVersion.create({
      data: {
        documentId: document.id,
        versionLabel: data.versionLabel,
        contentText: normalizedDocumentText(data.contentText),
        contentSha256: sha256(data.contentText),
        sourceDocumentUrl: data.sourceDocumentUrl || null,
        sourceDocumentSha256: data.sourceDocumentSha256 || null,
        changeType: data.changeType,
        changeSummary: data.changeSummary || null,
        requiresReacceptance: data.requiresReacceptance,
        createdByUserId: req.user.id,
        audiences: { create: [...new Set(data.audiences)].map((audience) => ({ audience })) }
      },
      include: { audiences: { select: { audience: true } } }
    });
    await writeAudit(req, "operations.legal_document_version_created", document.id, {
      versionId: version.id,
      version: version.versionLabel,
      contentSha256: version.contentSha256
    });
    res.status(201).json({ item: { ...version, audiences: version.audiences.map((item) => item.audience) } });
  } catch (error) {
    next(error);
  }
}

export async function transitionLegalDocumentVersion(req, res, next) {
  try {
    const data = transitionSchema.parse(req.body);
    const version = await prisma.legalDocumentVersion.findFirst({
      where: { id: req.params.versionId, documentId: req.params.id },
      include: { document: true, audiences: { select: { audience: true } } }
    });
    if (!version) return res.status(404).json({ message: "Versão do documento não encontrada." });
    if (version.status === "active" && data.status !== "archived") {
      return res.status(409).json({ message: "Uma versão vigente não pode ser alterada. Crie uma nova versão." });
    }
    const allowed = {
      draft: ["in_review", "archived"],
      in_review: ["draft", "approved", "archived"],
      approved: ["draft", "scheduled", "archived"],
      scheduled: ["draft", "active", "archived"],
      active: ["archived"]
    };
    if (!allowed[version.status]?.includes(data.status)) {
      return res.status(409).json({ message: "Esta transição não é permitida para o estado atual." });
    }
    const now = new Date();
    if (data.status === "scheduled" && (!data.effectiveAt || data.effectiveAt <= now)) {
      return res.status(422).json({ message: "Informe uma data e hora futuras para agendar a vigência." });
    }
    if (data.status === "active") {
      if (!version.effectiveAt) return res.status(409).json({ message: "Esta versão precisa ter vigência agendada antes de ser publicada." });
      if (version.effectiveAt > now) return res.status(409).json({ message: `A vigência está agendada para ${version.effectiveAt.toLocaleString("pt-BR")}.` });
    }
    const item = await prisma.$transaction(async (tx) => {
      if (data.status === "active") {
        await tx.legalDocumentVersion.updateMany({
          where: { documentId: version.documentId, status: "active", id: { not: version.id } },
          data: { status: "replaced", replacedAt: now }
        });
      }
      return tx.legalDocumentVersion.update({
        where: { id: version.id },
        data: {
          status: data.status,
          effectiveAt: data.status === "scheduled" ? data.effectiveAt : version.effectiveAt,
          reviewedAt: data.status === "in_review" ? now : version.reviewedAt,
          reviewedByUserId: data.status === "in_review" ? req.user.id : version.reviewedByUserId,
          approvedAt: data.status === "approved" ? now : version.approvedAt,
          approvedByUserId: data.status === "approved" ? req.user.id : version.approvedByUserId,
          publishedAt: data.status === "active" ? now : version.publishedAt,
          publishedByUserId: data.status === "active" ? req.user.id : version.publishedByUserId
        },
        include: { audiences: { select: { audience: true } } }
      });
    });
    await writeAudit(req, "operations.legal_document_version_status_changed", version.documentId, {
      versionId: item.id,
      from: version.status,
      to: data.status,
      note: data.note || null,
      contentSha256: item.contentSha256
    });
    res.json({ item: { ...item, audiences: item.audiences.map((entry) => entry.audience) } });
  } catch (error) {
    next(error);
  }
}

export async function getLegalDocumentVersionImpact(req, res, next) {
  try {
    const version = await prisma.legalDocumentVersion.findFirst({
      where: { id: req.params.versionId, documentId: req.params.id },
      include: { document: { select: { key: true, title: true, category: true } }, audiences: { select: { audience: true } } }
    });
    if (!version) return res.status(404).json({ message: "Versão do documento não encontrada." });

    const audienceCounts = await Promise.all(version.audiences.map(async ({ audience }) => {
      if (audience === "visitor") return { audience, estimatedAccounts: null, label: "Visitantes públicos" };
      if (audience === "user") return { audience, estimatedAccounts: await prisma.user.count(), label: "Contas de usuário" };
      if (audience === "venue_manager") return { audience, estimatedAccounts: await prisma.user.count({ where: { role: "venue_manager" } }), label: "Gestores de casa" };
      if (audience === "producer") return { audience, estimatedAccounts: await prisma.user.count({ where: { role: "producer" } }), label: "Produtores" };
      if (audience === "artist_manager") return { audience, estimatedAccounts: await prisma.artistAccess.count({ where: { status: "active" } }), label: "Gestores de artista ativos" };
      if (audience === "advertiser") return { audience, estimatedAccounts: await prisma.advertiserMembership.count({ where: { status: "active" } }), label: "Membros de contas anunciantes" };
      if (audience === "internal_operator") return { audience, estimatedAccounts: await prisma.operationAccessGrant.count({ where: { revokedAt: null } }), label: "Operadores internos com acesso" };
      return { audience, estimatedAccounts: 0, label: "Parceiros estratégicos vinculados" };
    }));
    const total = audienceCounts.reduce((sum, item) => sum + (item.estimatedAccounts || 0), 0);
    await writeAudit(req, "operations.legal_document_version_impact_viewed", version.documentId, { versionId: version.id, contentSha256: version.contentSha256 });
    res.json({ item: { document: version.document, versionId: version.id, versionLabel: version.versionLabel, requiresReacceptance: version.requiresReacceptance, audienceCounts, estimatedAccounts: total } });
  } catch (error) {
    next(error);
  }
}

const catalogue = [
  ["termos-de-uso", "Termos de Uso", "terms_of_use", ["visitor", "user", "artist_manager", "venue_manager", "producer", "advertiser", "strategic_partner"], true],
  ["politica-de-privacidade-e-cookies", "Política de Privacidade e Cookies", "privacy_cookies", ["visitor", "user", "artist_manager", "venue_manager", "producer", "advertiser", "strategic_partner"], true],
  ["politica-de-conteudo-moderacao-e-denuncias", "Política de Conteúdo, Moderação e Denúncias", "content_moderation", ["visitor", "user", "artist_manager", "venue_manager", "producer", "advertiser", "strategic_partner"], true],
  ["termo-reivindicacao-e-gestao-de-perfil", "Termo de Reivindicação e Gestão de Perfil", "claim_management", ["artist_manager", "venue_manager", "producer"], false],
  ["termos-de-publicidade", "Termos de Publicidade", "advertising_terms", ["advertiser", "venue_manager", "producer", "artist_manager"], false],
  ["regulamento-de-patacos-e-milipatacos", "Regulamento de Patacos e Milipatacos", "patacos_policy", ["advertiser", "venue_manager", "producer", "artist_manager"], false],
  ["termos-de-parceria", "Termos de Parceria", "partnership_terms", ["strategic_partner"], false],
  ["termos-internos-de-operacao", "Termos Internos de Acesso e Operação", "internal_operations", ["internal_operator"], false]
];

export async function bootstrapLegalDocumentCatalogue(req, res, next) {
  try {
    const existing = await prisma.legalDocument.findMany({ select: { key: true } });
    const existingKeys = new Set(existing.map((item) => item.key));
    const created = [];
    for (const [key, title, category, audiencesForDocument, isPublic] of catalogue) {
      if (existingKeys.has(key)) continue;
      const item = await createDocumentWithVersion({
        key,
        title,
        category,
        summary: "Estrutura documental criada. Importe a minuta revisada antes de encaminhar para revisão ou publicação.",
        isPublic,
        versionLabel: "0.1.0",
        contentText: "RASCUNHO INTERNO — conteúdo jurídico pendente de importação e revisão formal.",
        changeType: "material",
        changeSummary: "Catálogo-base criado para organização e revisão interna.",
        requiresReacceptance: false,
        audiences: audiencesForDocument
      }, req.user.id);
      created.push(serialize(item));
    }
    await writeAudit(req, "operations.legal_document_catalogue_bootstrapped", null, { created: created.map((item) => item.key) });
    res.status(201).json({ items: created });
  } catch (error) {
    next(error);
  }
}
