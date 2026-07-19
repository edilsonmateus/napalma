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
const analyticsSchema = z.object({
  days: z.coerce.number().int().refine((value) => [1, 7, 30, 90, 120].includes(value)).default(30),
  status: z.enum([...STATUSES, "all"]).default("all")
});

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_TIME_ZONE = "America/Sao_Paulo";
const reportDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const reportDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function formatterParts(formatter, value) {
  return Object.fromEntries(
    formatter.formatToParts(new Date(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}

function dateKey(value) {
  const { year, month, day } = formatterParts(reportDateFormatter, value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function timeZoneOffsetMs(value) {
  const parts = formatterParts(reportDateTimeFormatter, value);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return representedAsUtc - new Date(value).getTime();
}

function startOfReportDay(key) {
  const [year, month, day] = key.split("-").map(Number);
  const targetWallClock = Date.UTC(year, month - 1, day);
  let result = new Date(targetWallClock);
  // Recalculate once to remain correct if the time-zone offset changes around this date.
  result = new Date(targetWallClock - timeZoneOffsetMs(result));
  return new Date(targetWallClock - timeZoneOffsetMs(result));
}

function reportDateKeys(days, now = new Date()) {
  const { year, month, day } = formatterParts(reportDateFormatter, now);
  const today = Date.UTC(year, month - 1, day);
  return Array.from({ length: days }, (_, index) => (
    new Date(today - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10)
  ));
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

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
    const current = await prisma.acquisitionLead.findUniqueOrThrow({
      where: { id },
      select: { status: true }
    });
    const statusChanged = payload.status !== undefined && payload.status !== current.status;
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.acquisitionLead.update({
        where: { id },
        data: buildLeadData(payload),
        include: {
          interactions: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { interactions: true } }
        }
      });
      if (statusChanged) {
        await tx.acquisitionStatusHistory.create({
          data: {
            leadId: id,
            fromStatus: current.status,
            toStatus: payload.status,
            changedByUserId: req.user?.id || null
          }
        });
      }
      return updated;
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

export async function getAcquisitionLeadTimeline(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const lead = await prisma.acquisitionLead.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        venueName: true,
        status: true,
        createdAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        interactions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            summary: true,
            nextAction: true,
            nextFollowUpAt: true,
            createdAt: true,
            createdBy: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            changedAt: true,
            changedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    const items = [
      {
        id: `created-${lead.id}`,
        kind: "lead_created",
        occurredAt: lead.createdAt,
        actor: lead.createdBy,
        title: "Oportunidade criada"
      },
      ...lead.interactions.map((item) => ({
        id: item.id,
        kind: "interaction",
        interactionType: item.type,
        occurredAt: item.createdAt,
        actor: item.createdBy,
        title: item.summary,
        nextAction: item.nextAction,
        nextFollowUpAt: item.nextFollowUpAt
      })),
      ...lead.statusHistory.map((item) => ({
        id: item.id,
        kind: "status_changed",
        occurredAt: item.changedAt,
        actor: item.changedBy,
        title: "Status alterado",
        fromStatus: item.fromStatus,
        toStatus: item.toStatus
      }))
    ].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

    res.json({ lead: { id: lead.id, venueName: lead.venueName, status: lead.status }, items });
  } catch (error) {
    next(error);
  }
}

export async function getAcquisitionAnalytics(req, res, next) {
  try {
    const { days, status } = analyticsSchema.parse(req.query);
    const dateKeys = reportDateKeys(days);
    const start = startOfReportDay(dateKeys[0]);
    const leadWhere = status === "all" ? {} : { status };

    const [newLeads, interactions, statusChanges, activeLeads, periodLeads, statusGroups] = await Promise.all([
      prisma.acquisitionLead.findMany({
        where: { ...leadWhere, createdAt: { gte: start } },
        select: { id: true, createdAt: true }
      }),
      prisma.acquisitionInteraction.findMany({
        where: { createdAt: { gte: start }, ...(status === "all" ? {} : { lead: { status } }) },
        select: { id: true, type: true, createdAt: true, leadId: true }
      }),
      prisma.acquisitionStatusHistory.findMany({
        where: { changedAt: { gte: start }, ...(status === "all" ? {} : { toStatus: status }) },
        select: { id: true, fromStatus: true, toStatus: true, changedAt: true, leadId: true }
      }),
      prisma.acquisitionLead.findMany({
        where: { status: { notIn: ["closed", "lost"] } },
        select: {
          id: true,
          venueName: true,
          status: true,
          nextFollowUpAt: true,
          createdAt: true,
          interactions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } }
        }
      }),
      prisma.acquisitionLead.findMany({
        where: { ...leadWhere, createdAt: { gte: start } },
        select: {
          createdAt: true,
          interactions: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } }
        }
      }),
      prisma.acquisitionLead.groupBy({ by: ["status"], _count: { _all: true } })
    ]);

    const buckets = new Map();
    for (const key of dateKeys) {
      buckets.set(key, {
        date: key,
        newLeads: 0,
        contacts: 0,
        meetings: 0,
        proposals: 0,
        statusChanges: 0,
        closed: 0,
        lost: 0,
        notes: 0
      });
    }

    newLeads.forEach((item) => { const bucket = buckets.get(dateKey(item.createdAt)); if (bucket) bucket.newLeads += 1; });
    interactions.forEach((item) => {
      const bucket = buckets.get(dateKey(item.createdAt));
      if (!bucket) return;
      if (["call", "whatsapp", "email"].includes(item.type)) bucket.contacts += 1;
      else if (item.type === "meeting") bucket.meetings += 1;
      else if (item.type === "proposal") bucket.proposals += 1;
      else bucket.notes += 1;
    });
    statusChanges.forEach((item) => {
      const bucket = buckets.get(dateKey(item.changedAt));
      if (!bucket) return;
      bucket.statusChanges += 1;
      if (item.toStatus === "closed") bucket.closed += 1;
      if (item.toStatus === "lost") bucket.lost += 1;
    });

    const now = Date.now();
    const stalled = activeLeads
      .map((lead) => {
        const lastMovementAt = lead.interactions[0]?.createdAt || lead.createdAt;
        return {
          id: lead.id,
          venueName: lead.venueName,
          status: lead.status,
          nextFollowUpAt: lead.nextFollowUpAt,
          lastMovementAt,
          idleDays: Math.floor((now - new Date(lastMovementAt).getTime()) / DAY_MS)
        };
      })
      .filter((lead) => lead.idleDays >= 7)
      .sort((a, b) => b.idleDays - a.idleDays);

    const firstContactHours = periodLeads
      .filter((lead) => lead.interactions[0])
      .map((lead) => (new Date(lead.interactions[0].createdAt) - new Date(lead.createdAt)) / (60 * 60 * 1000))
      .filter((value) => value >= 0);
    const overdue = activeLeads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < now).length;

    res.json({
      rangeDays: days,
      generatedAt: new Date(),
      totals: {
        movements: newLeads.length + interactions.length + statusChanges.length,
        newLeads: newLeads.length,
        contacts: interactions.filter((item) => ["call", "whatsapp", "email"].includes(item.type)).length,
        meetings: interactions.filter((item) => item.type === "meeting").length,
        proposals: interactions.filter((item) => item.type === "proposal").length,
        statusChanges: statusChanges.length,
        closed: statusChanges.filter((item) => item.toStatus === "closed").length,
        lost: statusChanges.filter((item) => item.toStatus === "lost").length,
        overdue,
        stalled: stalled.length,
        averageFirstContactHours: average(firstContactHours)
      },
      series: [...buckets.values()],
      statusDistribution: statusGroups.map((item) => ({ status: item.status, count: item._count._all })),
      alerts: stalled.slice(0, 8)
    });
  } catch (error) {
    next(error);
  }
}
