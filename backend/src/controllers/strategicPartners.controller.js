import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const nullableText = (max) => z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  z.string().trim().max(max).nullable().optional()
);

const nullableDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.date().nullable().optional()
);

const partnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  logoUrl: nullableText(1200),
  publicDescription: nullableText(600),
  internalNotes: nullableText(5000),
  contactName: nullableText(120),
  contactEmail: z.preprocess((value) => (typeof value === "string" && !value.trim() ? null : value), z.string().trim().email().max(160).nullable().optional()),
  contactPhone: nullableText(40),
  partnershipType: z.enum(["operation", "project", "activation", "institutional", "other"]),
  counterpartAgreements: nullableText(5000),
  status: z.enum(["prospect", "negotiating", "active", "paused", "closed"]),
  startsAt: nullableDate,
  endsAt: nullableDate,
  isPermanent: z.boolean().default(false),
  publicVisible: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  initiativeName: nullableText(160),
  destinationUrl: z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? null : value),
    z.string().trim().url().max(1200).nullable().optional()
  ),
  activationStartsAt: nullableDate,
  activationEndsAt: nullableDate,
  canAppearAsSupporter: z.boolean().default(false)
});

function validateDates(data) {
  if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
    const error = new Error("A data de término não pode ser anterior ao início da parceria.");
    error.status = 400;
    throw error;
  }
  if (data.activationStartsAt && data.activationEndsAt && data.activationEndsAt < data.activationStartsAt) {
    const error = new Error("O fim da ativação não pode ser anterior ao início.");
    error.status = 400;
    throw error;
  }
}

function serializePartner(item, includePrivate = false) {
  const base = {
    id: item.id,
    name: item.name,
    logoUrl: item.logoUrl,
    publicDescription: item.publicDescription,
    partnershipType: item.partnershipType,
    status: item.status,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    isPermanent: item.isPermanent,
    publicVisible: item.publicVisible,
    displayOrder: item.displayOrder,
    initiativeName: item.initiativeName,
    destinationUrl: item.destinationUrl,
    activationStartsAt: item.activationStartsAt,
    activationEndsAt: item.activationEndsAt,
    canAppearAsSupporter: item.canAppearAsSupporter,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
  if (!includePrivate) return base;
  return {
    ...base,
    internalNotes: item.internalNotes,
    contactName: item.contactName,
    contactEmail: item.contactEmail,
    contactPhone: item.contactPhone,
    counterpartAgreements: item.counterpartAgreements
  };
}

export async function listStrategicPartners(_req, res, next) {
  try {
    const items = await prisma.strategicPartner.findMany({
      orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }]
    });
    res.json({ items: items.map((item) => serializePartner(item, true)) });
  } catch (error) { next(error); }
}

export async function createStrategicPartner(req, res, next) {
  try {
    const data = partnerSchema.parse(req.body || {});
    validateDates(data);
    const item = await prisma.strategicPartner.create({ data });
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "strategic_partner.created",
        subjectType: "strategic_partner",
        subjectId: item.id,
        metadata: { status: item.status, publicVisible: item.publicVisible, partnershipType: item.partnershipType }
      }
    });
    res.status(201).json({ item: serializePartner(item, true), message: "Parceiro estratégico cadastrado." });
  } catch (error) { next(error); }
}

export async function updateStrategicPartner(req, res, next) {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const data = partnerSchema.partial().parse(req.body || {});
    const current = await prisma.strategicPartner.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "strategic_partner_not_found", message: "Parceiro não encontrado." });
    const nextData = { ...current, ...data };
    validateDates(nextData);
    const item = await prisma.strategicPartner.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "strategic_partner.updated",
        subjectType: "strategic_partner",
        subjectId: item.id,
        metadata: { status: item.status, publicVisible: item.publicVisible, changed: Object.keys(data) }
      }
    });
    res.json({ item: serializePartner(item, true), message: "Parceiro estratégico atualizado." });
  } catch (error) { next(error); }
}

export async function listPublicStrategicPartners(_req, res, next) {
  try {
    const now = new Date();
    const items = await prisma.strategicPartner.findMany({
      where: {
        status: "active",
        publicVisible: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ isPermanent: true }, { endsAt: null }, { endsAt: { gte: now } }] }
        ]
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    });
    res.json({ items: items.map((item) => serializePartner(item, false)) });
  } catch (error) { next(error); }
}
