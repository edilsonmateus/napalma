import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const STATUSES = [
  "mapped",
  "contact_started",
  "in_conversation",
  "presentation_scheduled",
  "proposal_sent",
  "negotiating",
  "closed",
  "lost",
  "follow_up_later"
];

const TEMPERATURES = ["cold", "warm", "hot"];

const leadSchema = z.object({
  venueName: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80).default("São Paulo"),
  region: z.string().trim().max(80).optional().nullable(),
  neighborhood: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(180).optional().nullable(),
  addressNumber: z.string().trim().max(20).optional().nullable(),
  addressComplement: z.string().trim().max(80).optional().nullable(),
  zipCode: z.string().trim().max(20).optional().nullable(),
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
  instagramUrl: z.string().trim().max(180).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  contactName: z.string().trim().max(100).optional().nullable(),
  contactRole: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  status: z.enum(STATUSES).default("mapped"),
  temperature: z.enum(TEMPERATURES).default("warm"),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  presentationAt: z.string().datetime().optional().nullable(),
  presentationFormat: z.string().trim().max(80).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  potential: z.string().trim().max(80).optional().nullable(),
  objections: z.string().trim().max(600).optional().nullable(),
  notes: z.string().trim().max(1200).optional().nullable()
});

const updateLeadSchema = leadSchema.partial();

const interactionSchema = z.object({
  type: z.enum(["note", "call", "whatsapp", "meeting", "proposal", "email"]).default("note"),
  summary: z.string().trim().min(2).max(1200),
  nextAction: z.string().trim().max(400).optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable()
});

const idSchema = z.object({ id: z.string().uuid() });

function nullIfEmpty(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function dateOrNull(value) {
  if (value === undefined) return undefined;
  if (!value) return null;
  return new Date(value);
}

function mapLead(row) {
  const latestInteraction = row.interactions?.[0] || null;
  return {
    id: row.id,
    venueName: row.venueName,
    city: row.city,
    region: row.region,
    neighborhood: row.neighborhood,
    address: row.address,
    addressNumber: row.addressNumber,
    addressComplement: row.addressComplement,
    zipCode: row.zipCode,
    latitude: row.latitude,
    longitude: row.longitude,
    instagramUrl: row.instagramUrl,
    phone: row.phone,
    contactName: row.contactName,
    contactRole: row.contactRole,
    email: row.email,
    status: row.status,
    temperature: row.temperature,
    nextFollowUpAt: row.nextFollowUpAt,
    presentationAt: row.presentationAt,
    presentationFormat: row.presentationFormat,
    source: row.source,
    potential: row.potential,
    objections: row.objections,
    notes: row.notes,
    latestInteraction,
    interactionsCount: row._count?.interactions ?? row.interactions?.length ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function buildLeadData(payload, userId) {
  return {
    ...(payload.venueName !== undefined ? { venueName: payload.venueName } : {}),
    ...(payload.city !== undefined ? { city: payload.city || "São Paulo" } : {}),
    ...(payload.region !== undefined ? { region: nullIfEmpty(payload.region) } : {}),
    ...(payload.neighborhood !== undefined ? { neighborhood: nullIfEmpty(payload.neighborhood) } : {}),
    ...(payload.address !== undefined ? { address: nullIfEmpty(payload.address) } : {}),
    ...(payload.addressNumber !== undefined ? { addressNumber: nullIfEmpty(payload.addressNumber) } : {}),
    ...(payload.addressComplement !== undefined ? { addressComplement: nullIfEmpty(payload.addressComplement) } : {}),
    ...(payload.zipCode !== undefined ? { zipCode: nullIfEmpty(payload.zipCode) } : {}),
    ...(payload.latitude !== undefined ? { latitude: payload.latitude } : {}),
    ...(payload.longitude !== undefined ? { longitude: payload.longitude } : {}),
    ...(payload.instagramUrl !== undefined ? { instagramUrl: nullIfEmpty(payload.instagramUrl) } : {}),
    ...(payload.phone !== undefined ? { phone: nullIfEmpty(payload.phone) } : {}),
    ...(payload.contactName !== undefined ? { contactName: nullIfEmpty(payload.contactName) } : {}),
    ...(payload.contactRole !== undefined ? { contactRole: nullIfEmpty(payload.contactRole) } : {}),
    ...(payload.email !== undefined ? { email: nullIfEmpty(payload.email) } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
    ...(payload.nextFollowUpAt !== undefined ? { nextFollowUpAt: dateOrNull(payload.nextFollowUpAt) } : {}),
    ...(payload.presentationAt !== undefined ? { presentationAt: dateOrNull(payload.presentationAt) } : {}),
    ...(payload.presentationFormat !== undefined ? { presentationFormat: nullIfEmpty(payload.presentationFormat) } : {}),
    ...(payload.source !== undefined ? { source: nullIfEmpty(payload.source) } : {}),
    ...(payload.potential !== undefined ? { potential: nullIfEmpty(payload.potential) } : {}),
    ...(payload.objections !== undefined ? { objections: nullIfEmpty(payload.objections) } : {}),
    ...(payload.notes !== undefined ? { notes: nullIfEmpty(payload.notes) } : {}),
    ...(userId ? { createdByUserId: userId } : {})
  };
}

async function getSummary() {
  const now = new Date();
  const [
    total,
    active,
    presentations,
    proposals,
    closed,
    overdue
  ] = await Promise.all([
    prisma.acquisitionLead.count(),
    prisma.acquisitionLead.count({
      where: { status: { notIn: ["closed", "lost"] } }
    }),
    prisma.acquisitionLead.count({
      where: {
        OR: [
          { status: "presentation_scheduled" },
          { presentationAt: { not: null } }
        ]
      }
    }),
    prisma.acquisitionLead.count({ where: { status: "proposal_sent" } }),
    prisma.acquisitionLead.count({ where: { status: "closed" } }),
    prisma.acquisitionLead.count({
      where: {
        status: { notIn: ["closed", "lost"] },
        nextFollowUpAt: { lt: now }
      }
    })
  ]);

  return { total, active, presentations, proposals, closed, overdue };
}

export async function listAcquisitionLeads(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim();
    const temperature = String(req.query.temperature || "").trim();
    const city = String(req.query.city || "").trim();
    const followUp = String(req.query.followUp || "").trim();
    const now = new Date();

    const where = {
      ...(status && status !== "all" ? { status } : {}),
      ...(temperature && temperature !== "all" ? { temperature } : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(followUp === "overdue"
        ? { status: { notIn: ["closed", "lost"] }, nextFollowUpAt: { lt: now } }
        : {}),
      ...(q
        ? {
            OR: [
              { venueName: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { region: { contains: q, mode: "insensitive" } },
              { neighborhood: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { addressNumber: { contains: q, mode: "insensitive" } },
              { zipCode: { contains: q, mode: "insensitive" } },
              { contactName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { instagramUrl: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, summary] = await Promise.all([
      prisma.acquisitionLead.findMany({
        where,
        include: {
          interactions: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { interactions: true } }
        },
        orderBy: [
          { nextFollowUpAt: "asc" },
          { updatedAt: "desc" }
        ]
      }),
      getSummary()
    ]);

    res.json({ items: items.map(mapLead), summary });
  } catch (error) {
    next(error);
  }
}

export async function createAcquisitionLead(req, res, next) {
  try {
    const payload = leadSchema.parse(req.body);
    const item = await prisma.acquisitionLead.create({
      data: buildLeadData(payload, req.user?.id),
      include: {
        interactions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { interactions: true } }
      }
    });
    res.status(201).json({ item: mapLead(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateAcquisitionLead(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = updateLeadSchema.parse(req.body);
    const item = await prisma.acquisitionLead.update({
      where: { id },
      data: buildLeadData(payload),
      include: {
        interactions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { interactions: true } }
      }
    });
    res.json({ item: mapLead(item) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAcquisitionLead(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    await prisma.acquisitionLead.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createAcquisitionInteraction(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = interactionSchema.parse(req.body);
    const nextFollowUpAt = dateOrNull(payload.nextFollowUpAt);

    const interaction = await prisma.acquisitionInteraction.create({
      data: {
        leadId: id,
        type: payload.type,
        summary: payload.summary,
        nextAction: nullIfEmpty(payload.nextAction),
        nextFollowUpAt,
        createdByUserId: req.user?.id || null
      }
    });

    if (nextFollowUpAt) {
      await prisma.acquisitionLead.update({
        where: { id },
        data: { nextFollowUpAt }
      });
    }

    res.status(201).json({ item: interaction });
  } catch (error) {
    next(error);
  }
}
