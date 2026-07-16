import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageVenue } from "../lib/access.control.js";

export const MENU_CATEGORIES = Object.freeze([
  "petiscos", "porcoes", "pratos", "lanches", "sobremesas",
  "cervejas", "drinks", "doses", "vinhos_espumantes", "sem_alcool"
]);
export const MENU_SERVINGS = Object.freeze([
  "individual", "serve_2", "serve_3_ou_mais", "unidade", "dose",
  "garrafa", "lata", "porcao", "jarra", "balde"
]);
export const MENU_TAGS = Object.freeze([
  "especialidade_da_casa", "destaque_da_casa", "bom_para_compartilhar",
  "vegetariano", "vegano", "sem_alcool", "picante", "edicao_limitada"
]);
export const MENU_AD_INVENTORY_POLICY_VERSION = "2026-07-15";

const venueParams = z.object({ id: z.string().uuid() });
const itemParams = z.object({ id: z.string().uuid(), itemId: z.string().uuid() });
const interactionParams = itemParams.extend({
  type: z.enum(["want_to_try", "recommend", "save"])
});

const optionalText = (max) => z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z.string().trim().max(max).nullable().optional()
);
const menuSchema = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(),
  pricesVisible: z.boolean().optional(),
  markReviewed: z.boolean().optional(),
  acceptAdInventoryTerms: z.literal(true).optional()
});
const itemBaseSchema = z.object({
  category: z.enum(MENU_CATEGORIES),
  name: z.string().trim().min(2).max(100),
  description: optionalText(240),
  priceCents: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? null : Number(value),
    z.number().int().min(0).max(10_000_000).nullable().optional()
  ),
  priceMode: z.enum(["exact", "from", "hidden", "consultation"]).default("exact"),
  servingLabel: z.enum(MENU_SERVINGS).nullable().optional(),
  status: z.enum(["draft", "published", "unavailable", "archived"]).default("draft"),
  tags: z.array(z.enum(MENU_TAGS)).max(4).default([]),
  isHighlight: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0)
});
const validatePrice = (value, ctx) => {
  if (["exact", "from"].includes(value.priceMode) && value.priceCents === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["priceCents"], message: "Informe o preco ou escolha oculto/sob consulta." });
  }
};
const itemSchema = itemBaseSchema.superRefine(validatePrice);
const itemUpdateSchema = itemBaseSchema.partial().superRefine((value, ctx) => {
  if (value.priceMode && ["exact", "from"].includes(value.priceMode) && value.priceCents === null) validatePrice(value, ctx);
});
const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0).max(9999) })).min(1).max(50)
});
const importItemSchema = itemSchema.refine((item) => item.status !== "archived", {
  path: ["status"], message: "Itens arquivados nao podem ser criados pela importacao."
});
const importItemsSchema = z.object({
  items: z.array(importItemSchema).min(1).max(30)
});
const venueAccessInclude = {
  managerAccesses: { select: { userId: true } },
  producerAccesses: { select: { producerId: true } }
};

async function getManagedVenue(req, res, id) {
  const venue = await prisma.venue.findUnique({ where: { id }, include: venueAccessInclude });
  if (!venue) {
    res.status(404).json({ error: "venue_not_found", message: "Casa nao encontrada." });
    return null;
  }
  if (!canManageVenue(req.user, venue)) {
    res.status(403).json({ error: "forbidden", message: "Voce nao pode gerenciar o cardapio desta casa." });
    return null;
  }
  return venue;
}

function mapCounts(groups) {
  const counts = {};
  for (const group of groups) {
    counts[group.itemId] ||= { want_to_try: 0, recommend: 0, save: 0 };
    counts[group.itemId][group.type] = group._count._all;
  }
  return counts;
}

function serializeItem(item, counts = {}, viewer = []) {
  const itemCounts = counts[item.id] || { want_to_try: 0, recommend: 0, save: 0 };
  return {
    ...item,
    interactionCounts: itemCounts,
    viewerInteractions: viewer.filter((entry) => entry.itemId === item.id).map((entry) => entry.type),
    publicSignals: {
      wantToTry: itemCounts.want_to_try >= 5 ? itemCounts.want_to_try : null,
      recommends: itemCounts.recommend >= 5 ? itemCounts.recommend : null,
      saves: itemCounts.save >= 5 ? itemCounts.save : null,
      topRecommended: itemCounts.recommend >= 10
    }
  };
}

export async function getPublicVenueMenu(req, res, next) {
  try {
    const { id } = venueParams.parse(req.params);
    const menu = await prisma.venueMenu.findFirst({
      where: { venueId: id, status: "published", adInventoryAcceptedAt: { not: null } },
      include: {
        venue: { select: { id: true, name: true, slug: true, neighborhood: true, region: true, imageUrl: true } },
        items: {
          where: { status: { in: ["published", "unavailable"] }, archivedAt: null },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
        }
      }
    });
    if (!menu) return res.status(404).json({ error: "menu_not_published", message: "Esta casa ainda nao publicou o cardapio." });
    const itemIds = menu.items.map((item) => item.id);
    const [groups, viewer] = await Promise.all([
      itemIds.length ? prisma.venueMenuInteraction.groupBy({ by: ["itemId", "type"], where: { itemId: { in: itemIds } }, _count: { _all: true } }) : [],
      req.user && itemIds.length ? prisma.venueMenuInteraction.findMany({ where: { userId: req.user.id, itemId: { in: itemIds } }, select: { itemId: true, type: true } }) : []
    ]);
    const counts = mapCounts(groups);
    return res.json({
      item: {
        id: menu.id,
        venue: menu.venue,
        pricesVisible: menu.pricesVisible,
        reviewedAt: menu.reviewedAt,
        publishedAt: menu.publishedAt,
        updatedAt: menu.updatedAt,
        categories: MENU_CATEGORIES,
        items: menu.items.map((item) => serializeItem(item, counts, viewer))
      }
    });
  } catch (error) { next(error); }
}

export async function getManagedVenueMenu(req, res, next) {
  try {
    const { id } = venueParams.parse(req.params);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const menu = await prisma.venueMenu.findUnique({
      where: { venueId: id },
      include: {
        items: { orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        adInventoryAcceptedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    return res.json({ item: menu, options: { categories: MENU_CATEGORIES, servings: MENU_SERVINGS, tags: MENU_TAGS } });
  } catch (error) { next(error); }
}

export async function updateVenueMenu(req, res, next) {
  try {
    const { id } = venueParams.parse(req.params);
    const payload = menuSchema.parse(req.body);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const now = new Date();
    const existing = await prisma.venueMenu.findUnique({ where: { venueId: id }, select: { adInventoryAcceptedAt: true } });
    const acceptingNow = Boolean(payload.acceptAdInventoryTerms && !existing?.adInventoryAcceptedAt);
    if (payload.status === "published" && !existing?.adInventoryAcceptedAt && !acceptingNow) {
      return res.status(409).json({
        error: "ad_inventory_terms_required",
        message: "Confirme as condicoes do inventario publicitario antes de publicar o cardapio."
      });
    }
    const data = {
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.pricesVisible !== undefined ? { pricesVisible: payload.pricesVisible } : {}),
      ...(payload.status === "published" ? { publishedAt: now } : {}),
      ...(payload.markReviewed ? { reviewedAt: now, reviewedByUserId: req.user.id } : {}),
      ...(acceptingNow ? {
        adInventoryAcceptedAt: now,
        adInventoryAcceptedByUserId: req.user.id,
        adInventoryPolicyVersion: MENU_AD_INVENTORY_POLICY_VERSION
      } : {})
    };
    const item = await prisma.$transaction(async (tx) => {
      const saved = await tx.venueMenu.upsert({
        where: { venueId: id },
        update: data,
        create: { venueId: id, ...data }
      });
      if (acceptingNow) {
        await tx.auditLog.create({ data: { actorUserId: req.user.id, action: "venue_menu.ad_inventory_terms_accepted", subjectType: "venue_menu", subjectId: saved.id, metadata: { venueId: id, policyVersion: MENU_AD_INVENTORY_POLICY_VERSION } } });
      }
      await tx.auditLog.create({ data: { actorUserId: req.user.id, action: "venue_menu.updated", subjectType: "venue_menu", subjectId: saved.id, metadata: { venueId: id, status: saved.status } } });
      return saved;
    });
    return res.json({ item });
  } catch (error) { next(error); }
}

export async function createVenueMenuItem(req, res, next) {
  try {
    const { id } = venueParams.parse(req.params);
    const payload = itemSchema.parse(req.body);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const activeCount = await prisma.venueMenuItem.count({ where: { menu: { venueId: id }, status: { not: "archived" } } });
    if (activeCount >= 30) return res.status(409).json({ error: "menu_item_limit", message: "O Cardapio Essencial aceita ate 30 itens ativos." });
    const item = await prisma.$transaction(async (tx) => {
      const menu = await tx.venueMenu.upsert({ where: { venueId: id }, update: {}, create: { venueId: id } });
      const created = await tx.venueMenuItem.create({ data: { menuId: menu.id, ...payload } });
      await tx.auditLog.create({ data: { actorUserId: req.user.id, action: "venue_menu_item.created", subjectType: "venue_menu_item", subjectId: created.id, metadata: { venueId: id } } });
      return created;
    });
    return res.status(201).json({ item });
  } catch (error) { next(error); }
}

export async function updateVenueMenuItem(req, res, next) {
  try {
    const { id, itemId } = itemParams.parse(req.params);
    const payload = itemUpdateSchema.parse(req.body);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const existing = await prisma.venueMenuItem.findFirst({ where: { id: itemId, menu: { venueId: id } } });
    if (!existing) return res.status(404).json({ error: "menu_item_not_found", message: "Item nao encontrado." });
    const item = await prisma.venueMenuItem.update({ where: { id: itemId }, data: payload });
    await prisma.auditLog.create({ data: { actorUserId: req.user.id, action: "venue_menu_item.updated", subjectType: "venue_menu_item", subjectId: item.id, metadata: { venueId: id } } });
    return res.json({ item });
  } catch (error) { next(error); }
}

export async function archiveVenueMenuItem(req, res, next) {
  try {
    const { id, itemId } = itemParams.parse(req.params);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const existing = await prisma.venueMenuItem.findFirst({
      where: { id: itemId, menu: { venueId: id }, status: { not: "archived" } },
      select: { status: true }
    });
    if (!existing) return res.status(404).json({ error: "menu_item_not_found", message: "Item nao encontrado." });
    await prisma.$transaction(async (tx) => {
      await tx.venueMenuItem.update({
        where: { id: itemId },
        data: { status: "archived", archivedAt: new Date() }
      });
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "venue_menu_item.archived",
          subjectType: "venue_menu_item",
          subjectId: itemId,
          metadata: { venueId: id, previousStatus: existing.status }
        }
      });
    });
    return res.status(204).send();
  } catch (error) { next(error); }
}

export async function restoreVenueMenuItem(req, res, next) {
  try {
    const { id, itemId } = itemParams.parse(req.params);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const activeCount = await prisma.venueMenuItem.count({ where: { menu: { venueId: id }, status: { not: "archived" } } });
    if (activeCount >= 30) return res.status(409).json({ error: "menu_item_limit", message: "Arquive outro item antes de restaurar. O limite e de 30 itens ativos." });
    const existing = await prisma.venueMenuItem.findFirst({
      where: { id: itemId, menu: { venueId: id }, status: "archived" },
      include: { menu: { select: { status: true } } }
    });
    if (!existing) return res.status(404).json({ error: "menu_item_not_found", message: "Item arquivado nao encontrado." });
    const archiveLog = await prisma.auditLog.findFirst({
      where: { action: "venue_menu_item.archived", subjectType: "venue_menu_item", subjectId: itemId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true }
    });
    const previousStatus = archiveLog?.metadata?.previousStatus;
    const restoreStatus = ["draft", "published", "unavailable"].includes(previousStatus)
      ? previousStatus
      : existing.menu.status === "published" ? "published" : "draft";
    const item = await prisma.$transaction(async (tx) => {
      const restored = await tx.venueMenuItem.update({
        where: { id: itemId },
        data: { status: restoreStatus, archivedAt: null }
      });
      await tx.auditLog.create({ data: { actorUserId: req.user.id, action: "venue_menu_item.restored", subjectType: "venue_menu_item", subjectId: itemId, metadata: { venueId: id, restoredStatus: restoreStatus } } });
      return restored;
    });
    return res.json({ item });
  } catch (error) { next(error); }
}

export async function importVenueMenuItems(req, res, next) {
  try {
    const { id } = venueParams.parse(req.params);
    const { items } = importItemsSchema.parse(req.body);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const existingItems = await prisma.venueMenuItem.findMany({
      where: { menu: { venueId: id }, status: { not: "archived" } },
      select: { name: true, sortOrder: true }
    });
    if (existingItems.length + items.length > 30) {
      return res.status(409).json({
        error: "menu_item_limit",
        message: `A importacao ultrapassa o limite de 30 itens ativos. Ha ${existingItems.length} itens e o arquivo contem ${items.length}.`
      });
    }
    const normalizeName = (value) => value.trim().toLocaleLowerCase("pt-BR");
    const existingNames = new Set(existingItems.map((item) => normalizeName(item.name)));
    const importedNames = new Set();
    const duplicate = items.find((item) => {
      const normalized = normalizeName(item.name);
      if (existingNames.has(normalized) || importedNames.has(normalized)) return true;
      importedNames.add(normalized);
      return false;
    });
    if (duplicate) {
      return res.status(409).json({ error: "duplicate_menu_item", message: `O item "${duplicate.name}" ja existe ou esta repetido no arquivo.` });
    }
    const nextSortOrder = existingItems.reduce((highest, item) => Math.max(highest, item.sortOrder), -10) + 10;
    const result = await prisma.$transaction(async (tx) => {
      const menu = await tx.venueMenu.upsert({ where: { venueId: id }, update: {}, create: { venueId: id } });
      const created = await tx.venueMenuItem.createMany({
        data: items.map((item, index) => ({ ...item, menuId: menu.id, sortOrder: nextSortOrder + index * 10 }))
      });
      await tx.auditLog.create({
        data: { actorUserId: req.user.id, action: "venue_menu_items.imported", subjectType: "venue_menu", subjectId: menu.id, metadata: { venueId: id, count: created.count } }
      });
      return created;
    });
    return res.status(201).json({ count: result.count });
  } catch (error) { next(error); }
}

export async function reorderVenueMenuItems(req, res, next) {
  try {
    const { id } = venueParams.parse(req.params);
    const { items } = reorderSchema.parse(req.body);
    const venue = await getManagedVenue(req, res, id);
    if (!venue) return;
    const validCount = await prisma.venueMenuItem.count({ where: { id: { in: items.map((item) => item.id) }, menu: { venueId: id } } });
    if (validCount !== items.length) return res.status(400).json({ error: "invalid_menu_items", message: "A ordenacao contem itens de outro cardapio." });
    await prisma.$transaction(items.map((item) => prisma.venueMenuItem.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
    return res.status(204).send();
  } catch (error) { next(error); }
}

export async function addVenueMenuInteraction(req, res, next) {
  try {
    const { id, itemId, type } = interactionParams.parse(req.params);
    const item = await prisma.venueMenuItem.findFirst({ where: { id: itemId, menu: { venueId: id, status: "published" }, status: { in: ["published", "unavailable"] }, archivedAt: null }, select: { id: true } });
    if (!item) return res.status(404).json({ error: "menu_item_not_found", message: "Item indisponivel." });
    await prisma.venueMenuInteraction.upsert({
      where: { userId_itemId_type: { userId: req.user.id, itemId, type } },
      update: {}, create: { userId: req.user.id, itemId, type }
    });
    return res.status(200).json({ ok: true });
  } catch (error) { next(error); }
}

export async function removeVenueMenuInteraction(req, res, next) {
  try {
    const { id, itemId, type } = interactionParams.parse(req.params);
    await prisma.venueMenuInteraction.deleteMany({ where: { userId: req.user.id, itemId, type, item: { menu: { venueId: id } } } });
    return res.status(204).send();
  } catch (error) { next(error); }
}
