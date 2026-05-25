import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const FALLBACK_REGIONS = [
  "Centro",
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
  "Grande Sao Paulo"
];

function normalizeRegionKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const createRegionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80).default("Sao Paulo"),
  state: z.string().trim().length(2).transform((v) => v.toUpperCase()).default("SP"),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional()
});

const updateRegionSchema = createRegionSchema.partial();
const idSchema = z.object({ id: z.string().uuid() });

function mapRegionAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    venuesCount: row.venuesCount ?? 0,
    readOnly: Boolean(row.readOnly),
    source: row.source || "official",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listRegions(_req, res, next) {
  try {
    const officialRows = await prisma.region.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true }
    });
    const venueRows = await prisma.venue.findMany({
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" }
    });
    const ordered = [
      ...officialRows.map((row) => row.name),
      ...venueRows.map((row) => row.region),
      ...FALLBACK_REGIONS
    ];

    const dedup = [];
    const seen = new Set();
    for (const item of ordered) {
      const value = String(item || "").trim();
      if (!value) continue;
      const key = normalizeRegionKey(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      dedup.push(value);
    }

    return res.json({ items: dedup });
  } catch (error) {
    next(error);
  }
}

export async function listRegionsAdmin(req, res, next) {
  try {
    const includeInactive = String(req.query.includeInactive || "false") === "true";
    const rows = await prisma.region.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    const usage = await prisma.venue.groupBy({
      by: ["region"],
      _count: { _all: true }
    });
    const usageMap = new Map(
      usage
        .map((item) => [normalizeRegionKey(item.region), item._count?._all || 0])
        .filter(([key]) => key)
    );

    const officialItems = rows.map((row) => {
      const key = normalizeRegionKey(row.name);
      const venuesCount = usageMap.get(key) || 0;
      return mapRegionAdmin({ ...row, venuesCount });
    });
    const officialKeys = new Set(officialItems.map((item) => normalizeRegionKey(item.name)));

    const venueRows = await prisma.venue.findMany({
      select: { region: true, city: true, state: true },
      distinct: ["region"],
      orderBy: { region: "asc" }
    });
    const fallbackItems = venueRows
      .filter((row) => String(row.region || "").trim().length > 0)
      .map((row, idx) => {
        const name = String(row.region || "").trim();
        const key = normalizeRegionKey(name);
        return {
          idx,
          key,
          item: mapRegionAdmin({
            id: `legacy-${idx}-${key.replace(/\s+/g, "-")}`,
            name,
            city: String(row.city || "Sao Paulo").trim() || "Sao Paulo",
            state: String(row.state || "SP").trim().toUpperCase() || "SP",
            isActive: true,
            sortOrder: 1000 + idx,
            venuesCount: usageMap.get(key) || 0,
            readOnly: true,
            source: "legacy",
            createdAt: new Date(0),
            updatedAt: new Date(0)
          })
        };
      })
      .filter((entry) => !officialKeys.has(entry.key))
      .map((entry) => entry.item);

    const mergedKeys = new Set([...officialKeys, ...fallbackItems.map((item) => normalizeRegionKey(item.name))]);
    const baseItems = FALLBACK_REGIONS
      .map((name, idx) => ({ name, idx, key: normalizeRegionKey(name) }))
      .filter((item) => item.key && !mergedKeys.has(item.key))
      .map((item) =>
        mapRegionAdmin({
          id: `base-${item.idx}-${item.key.replace(/\s+/g, "-")}`,
          name: item.name,
          city: "Sao Paulo",
          state: "SP",
          isActive: true,
          sortOrder: 2000 + item.idx,
          venuesCount: usageMap.get(item.key) || 0,
          readOnly: true,
          source: "base",
          createdAt: new Date(0),
          updatedAt: new Date(0)
        })
      );

    const items = [...officialItems, ...fallbackItems, ...baseItems].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createRegion(req, res, next) {
  try {
    const data = createRegionSchema.parse(req.body);
    const item = await prisma.region.create({
      data: {
        name: data.name,
        city: data.city,
        state: data.state,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdByUserId: req.user?.id || null
      }
    });
    res.status(201).json({ item: mapRegionAdmin(item) });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "region_already_exists", message: "Regiao ja cadastrada para esta cidade." });
    }
    next(error);
  }
}

export async function updateRegion(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const data = updateRegionSchema.parse(req.body);

    const existing = await prisma.region.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return res.status(404).json({ error: "region_not_found", message: "Regiao nao encontrada." });
    }

    const item = await prisma.region.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.state ? { state: data.state } : {}),
        ...(data.sortOrder != null ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive != null ? { isActive: data.isActive } : {})
      }
    });

    res.json({ item: mapRegionAdmin(item) });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "region_already_exists", message: "Regiao ja cadastrada para esta cidade." });
    }
    next(error);
  }
}

export async function deleteRegion(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const existing = await prisma.region.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "region_not_found", message: "Regiao nao encontrada." });
    }

    const linkedVenues = await prisma.venue.count({
      where: {
        region: {
          equals: existing.name,
          mode: "insensitive"
        }
      }
    });
    if (linkedVenues > 0) {
      return res.status(409).json({
        error: "region_in_use",
        message: "Regiao com casas vinculadas nao pode ser excluida."
      });
    }

    await prisma.region.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
