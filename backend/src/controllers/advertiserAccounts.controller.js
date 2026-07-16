import {
  AdvertiserAccountStatus,
  AdvertiserAccountType,
  AdvertiserMembershipRole,
  AdvertiserMembershipStatus
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";

const uuid = z.string().uuid();
const idSchema = z.object({ id: uuid });
const accountIdSchema = z.object({ accountId: uuid });
const nullableText = (max) => z.string().trim().max(max).nullable().optional();
const createAccountSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.nativeEnum(AdvertiserAccountType).default("unclassified"),
  status: z.nativeEnum(AdvertiserAccountStatus).default("draft"),
  legalName: nullableText(200),
  documentNumber: nullableText(40),
  contactEmail: z.string().trim().email().max(200).nullable().optional(),
  contactPhone: nullableText(40),
  commercialCategory: nullableText(80),
  notes: nullableText(2000)
});
const updateAccountSchema = createAccountSchema.partial();
const listAccountsQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.nativeEnum(AdvertiserAccountStatus).optional(),
  type: z.nativeEnum(AdvertiserAccountType).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});
const createMembershipSchema = z
  .object({
    userId: uuid.optional(),
    email: z.string().trim().email().max(200).optional(),
    role: z.nativeEnum(AdvertiserMembershipRole).default("viewer"),
    status: z.nativeEnum(AdvertiserMembershipStatus).default("invited")
  })
  .refine((payload) => payload.userId || payload.email, "Informe userId ou email.");
const updateMembershipSchema = z
  .object({
    role: z.nativeEnum(AdvertiserMembershipRole).optional(),
    status: z.nativeEnum(AdvertiserMembershipStatus).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, "Informe ao menos uma alteracao.");
const campaignAccountSchema = z.object({ accountId: uuid.nullable() });
const accessDecisionSchema = z.object({
  reason: z.string().trim().max(1000).optional().nullable()
});

function mapAccount(item, { includeSensitive = false } = {}) {
  const mapped = {
    id: item.id,
    name: item.name,
    type: item.type,
    status: item.status,
    source: item.source,
    legalName: item.legalName,
    contactEmail: item.contactEmail,
    contactPhone: item.contactPhone,
    commercialCategory: item.commercialCategory,
    notes: item.notes,
    approvedAt: item.approvedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
  if (includeSensitive) mapped.documentNumber = item.documentNumber;
  if (item._count) mapped.counts = item._count;
  if (item.memberships) mapped.memberships = item.memberships;
  if (item.campaigns) mapped.campaigns = item.campaigns;
  return mapped;
}

async function findAccountOrRespond(id, res) {
  const account = await prisma.advertiserAccount.findUnique({ where: { id } });
  if (!account) {
    res.status(404).json({
      error: "advertiser_account_not_found",
      message: "Conta anunciante nao encontrada."
    });
    return null;
  }
  return account;
}

export async function listAdvertiserAccounts(req, res, next) {
  try {
    const { query, status, type, limit } = listAccountsQuerySchema.parse(req.query ?? {});
    const items = await prisma.advertiserAccount.findMany({
      where: {
        status,
        type,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { legalName: { contains: query, mode: "insensitive" } },
                { contactEmail: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: { _count: { select: { campaigns: true, memberships: true } } }
    });
    res.json({ items: items.map((item) => mapAccount(item)) });
  } catch (error) {
    next(error);
  }
}

export async function getAdvertiserAccount(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const item = await prisma.advertiserAccount.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, email: true, username: true, role: true } } }
        },
        campaigns: {
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true, advertiser: true, status: true, isEnabled: true }
        }
      }
    });
    if (!item) {
      return res.status(404).json({
        error: "advertiser_account_not_found",
        message: "Conta anunciante nao encontrada."
      });
    }
    return res.json({ item: mapAccount(item, { includeSensitive: true }) });
  } catch (error) {
    return next(error);
  }
}

export async function createAdvertiserAccount(req, res, next) {
  try {
    const payload = createAccountSchema.parse(req.body);
    const approved = payload.status === "active";
    const item = await prisma.advertiserAccount.create({
      data: {
        ...payload,
        source: "manual",
        createdByUserId: req.user.id,
        approvedByUserId: approved ? req.user.id : null,
        approvedAt: approved ? new Date() : null
      }
    });
    await recordAuditEvent({ req, action: "advertiser_account.created", subjectType: "advertiser_account", subjectId: item.id, metadata: { type: item.type, status: item.status, source: item.source } });
    return res.status(201).json({ item: mapAccount(item, { includeSensitive: true }) });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdvertiserAccount(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = updateAccountSchema.parse(req.body);
    if (!(await findAccountOrRespond(id, res))) return;
    const approvalData = payload.status === "active"
      ? { approvedByUserId: req.user.id, approvedAt: new Date() }
      : {};
    const item = await prisma.advertiserAccount.update({
      where: { id },
      data: { ...payload, ...approvalData }
    });
    await recordAuditEvent({ req, action: "advertiser_account.updated", subjectType: "advertiser_account", subjectId: item.id, metadata: { status: item.status, fields: Object.keys(payload) } });
    return res.json({ item: mapAccount(item, { includeSensitive: true }) });
  } catch (error) {
    return next(error);
  }
}

export async function approveAdvertiserAccessRequest(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const account = await prisma.advertiserAccount.findUnique({
      where: { id },
      include: { memberships: true }
    });
    if (!account) {
      return res.status(404).json({
        error: "advertiser_account_not_found",
        message: "Conta anunciante nao encontrada."
      });
    }
    if (account.status === "archived") {
      return res.status(409).json({
        error: "advertiser_account_archived",
        message: "Conta arquivada nao pode ser aprovada."
      });
    }

    const now = new Date();
    const item = await prisma.$transaction(async (tx) => {
      await tx.advertiserMembership.updateMany({
        where: { accountId: id, status: "invited" },
        data: { status: "active", acceptedAt: now }
      });
      return tx.advertiserAccount.update({
        where: { id },
        data: {
          status: "active",
          approvedByUserId: req.user.id,
          approvedAt: now
        },
        include: {
          memberships: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { id: true, email: true, username: true, role: true } } }
          },
          campaigns: {
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, advertiser: true, status: true, isEnabled: true }
          }
        }
      });
    });
    await recordAuditEvent({ req, action: "advertiser_account.access_approved", subjectType: "advertiser_account", subjectId: item.id, metadata: { status: item.status } });
    return res.json({ item: mapAccount(item, { includeSensitive: true }) });
  } catch (error) {
    return next(error);
  }
}

export async function rejectAdvertiserAccessRequest(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = accessDecisionSchema.parse(req.body ?? {});
    const account = await prisma.advertiserAccount.findUnique({ where: { id } });
    if (!account) {
      return res.status(404).json({
        error: "advertiser_account_not_found",
        message: "Conta anunciante nao encontrada."
      });
    }
    if (account.status === "active") {
      return res.status(409).json({
        error: "advertiser_account_active",
        message: "Conta ativa nao deve ser rejeitada por este atalho."
      });
    }

    const notes = [account.notes, payload.reason ? `Rejeitado pela equipe 77Gira: ${payload.reason}` : null]
      .filter(Boolean)
      .join("\n\n");
    const item = await prisma.$transaction(async (tx) => {
      await tx.advertiserMembership.updateMany({
        where: { accountId: id, status: { in: ["invited", "suspended"] } },
        data: { status: "revoked" }
      });
      return tx.advertiserAccount.update({
        where: { id },
        data: { status: "rejected", notes },
        include: {
          memberships: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { id: true, email: true, username: true, role: true } } }
          },
          campaigns: {
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, advertiser: true, status: true, isEnabled: true }
          }
        }
      });
    });
    await recordAuditEvent({ req, action: "advertiser_account.access_rejected", subjectType: "advertiser_account", subjectId: item.id, metadata: { status: item.status } });
    return res.json({ item: mapAccount(item, { includeSensitive: true }) });
  } catch (error) {
    return next(error);
  }
}

export async function listAdvertiserMemberships(req, res, next) {
  try {
    const { accountId } = accountIdSchema.parse(req.params);
    if (!(await findAccountOrRespond(accountId, res))) return;
    const items = await prisma.advertiserMembership.findMany({
      where: { accountId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, email: true, username: true, role: true } } }
    });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

export async function createAdvertiserMembership(req, res, next) {
  try {
    const { accountId } = accountIdSchema.parse(req.params);
    const payload = createMembershipSchema.parse(req.body);
    if (!(await findAccountOrRespond(accountId, res))) return;
    const user = await prisma.user.findUnique({
      where: payload.userId ? { id: payload.userId } : { email: payload.email.toLowerCase() },
      select: { id: true }
    });
    if (!user) {
      return res.status(404).json({ error: "user_not_found", message: "Usuario nao encontrado." });
    }
    const duplicate = await prisma.advertiserMembership.findUnique({
      where: { accountId_userId: { accountId, userId: user.id } },
      select: { id: true }
    });
    if (duplicate) {
      return res.status(409).json({
        error: "membership_exists",
        message: "Usuario ja vinculado a esta conta."
      });
    }
    const item = await prisma.advertiserMembership.create({
      data: {
        accountId,
        userId: user.id,
        role: payload.role,
        status: payload.status,
        invitedByUserId: req.user.id,
        acceptedAt: payload.status === "active" ? new Date() : null
      }
    });
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdvertiserMembership(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = updateMembershipSchema.parse(req.body);
    const current = await prisma.advertiserMembership.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: "membership_not_found", message: "Vinculo nao encontrado." });
    }
    const item = await prisma.advertiserMembership.update({
      where: { id },
      data: {
        ...payload,
        acceptedAt: payload.status === "active" && !current.acceptedAt ? new Date() : undefined
      }
    });
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
}

export async function revokeAdvertiserMembership(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const current = await prisma.advertiserMembership.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!current) {
      return res.status(404).json({ error: "membership_not_found", message: "Vinculo nao encontrado." });
    }
    const item = await prisma.advertiserMembership.update({
      where: { id },
      data: { status: "revoked" }
    });
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
}

export async function setCampaignAdvertiserAccount(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const { accountId } = campaignAccountSchema.parse(req.body);
    const campaign = await prisma.adCampaign.findUnique({ where: { id }, select: { id: true } });
    if (!campaign) {
      return res.status(404).json({ error: "campaign_not_found", message: "Campanha nao encontrada." });
    }
    if (accountId) {
      const account = await prisma.advertiserAccount.findUnique({
        where: { id: accountId },
        select: { id: true, status: true }
      });
      if (!account) {
        return res.status(404).json({
          error: "advertiser_account_not_found",
          message: "Conta anunciante nao encontrada."
        });
      }
      if (account.status === "archived") {
        return res.status(409).json({
          error: "advertiser_account_archived",
          message: "Conta anunciante arquivada."
        });
      }
    }
    const item = await prisma.adCampaign.update({
      where: { id },
      data: { advertiserAccountId: accountId },
      select: { id: true, name: true, advertiser: true, advertiserAccountId: true }
    });
    return res.json({ item });
  } catch (error) {
    return next(error);
  }
}
