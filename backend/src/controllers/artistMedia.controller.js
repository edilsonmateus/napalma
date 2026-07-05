import { ArtistMediaType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../lib/access.control.js";

const uuid = z.string().uuid();
const artistParams = z.object({ artistId: uuid });
const mediaParams = z.object({ id: uuid });
const base = {
  title: z.string().trim().max(160).optional().nullable(),
  caption: z.string().trim().max(600).optional().nullable(),
  altText: z.string().trim().max(300).optional().nullable(),
  thumbnailUrl: z.string().url().max(600).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isPublished: z.boolean().default(true)
};
const createSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("photo"), url: z.string().url().max(600), storageProvider: z.literal("r2"), storageKey: z.string().trim().min(3).max(500), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), fileSizeBytes: z.number().int().positive().max(5 * 1024 * 1024) }),
  z.object({ ...base, type: z.literal("video_external"), url: z.string().url().max(600), storageProvider: z.null().optional(), storageKey: z.null().optional(), mimeType: z.null().optional(), fileSizeBytes: z.null().optional() })
]);
const updateSchema = z.object({ title: base.title, caption: base.caption, altText: base.altText, thumbnailUrl: base.thumbnailUrl, sortOrder: base.sortOrder.optional(), isPublished: base.isPublished.optional() });
const LIMITS = { photo: 12, video_external: 6 };
const VIDEO_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com", "instagram.com", "www.instagram.com", "tiktok.com", "www.tiktok.com"];

async function manageable(user, artistId) {
  const artist = await prisma.artist.findUnique({ where: { id: artistId }, include: { producerAccesses: { select: { producerId: true } }, accesses: { select: { userId: true, role: true, status: true } } } });
  return artist && canManageArtist(user, artist) ? artist : null;
}

export async function listMyArtistMedia(req, res, next) {
  try {
    const { artistId } = artistParams.parse(req.params);
    if (!(await manageable(req.user, artistId))) return res.status(403).json({ error: "forbidden" });
    const items = await prisma.artistMedia.findMany({ where: { artistId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    res.json({ items, limits: LIMITS });
  } catch (error) { next(error); }
}

export async function createArtistMedia(req, res, next) {
  try {
    const { artistId } = artistParams.parse(req.params);
    if (!(await manageable(req.user, artistId))) return res.status(403).json({ error: "forbidden" });
    const payload = createSchema.parse(req.body);
    if (payload.type === ArtistMediaType.video_external && !VIDEO_HOSTS.includes(new URL(payload.url).hostname.toLowerCase())) return res.status(400).json({ error: "unsupported_video_provider", message: "Use YouTube, Vimeo, Instagram ou TikTok." });
    const count = await prisma.artistMedia.count({ where: { artistId, type: payload.type } });
    if (count >= LIMITS[payload.type]) return res.status(409).json({ error: "artist_media_limit", message: `Limite de ${LIMITS[payload.type]} itens atingido.` });
    const item = await prisma.artistMedia.create({ data: { artistId, ...payload } });
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
}

export async function updateArtistMedia(req, res, next) {
  try {
    const { id } = mediaParams.parse(req.params);
    const current = await prisma.artistMedia.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "artist_media_not_found" });
    if (!(await manageable(req.user, current.artistId))) return res.status(403).json({ error: "forbidden" });
    const item = await prisma.artistMedia.update({ where: { id }, data: updateSchema.parse(req.body) });
    return res.json({ item });
  } catch (error) { return next(error); }
}

export async function deleteArtistMedia(req, res, next) {
  try {
    const { id } = mediaParams.parse(req.params);
    const current = await prisma.artistMedia.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "artist_media_not_found" });
    if (!(await manageable(req.user, current.artistId))) return res.status(403).json({ error: "forbidden" });
    await prisma.artistMedia.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) { return next(error); }
}
