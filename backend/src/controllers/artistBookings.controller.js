import { ArtistBookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../lib/access.control.js";

const uuid = z.string().uuid();
const createSchema = z.object({
  artistId: uuid,
  requesterName: z.string().trim().min(2).max(140),
  requesterEmail: z.string().trim().email().max(200),
  requesterPhone: z.string().trim().min(8).max(40).optional().nullable(),
  desiredDate: z.string().datetime().optional().nullable(),
  city: z.string().trim().min(2).max(120),
  neighborhood: z.string().trim().max(120).optional().nullable(),
  eventType: z.string().trim().min(2).max(120),
  estimatedAudience: z.number().int().min(1).max(1_000_000).optional().nullable(),
  budgetRange: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().min(10).max(3000),
  companyWebsite: z.string().max(500).optional()
});
const listSchema = z.object({ status: z.nativeEnum(ArtistBookingStatus).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });
const paramsSchema = z.object({ artistId: uuid });
const requestParamsSchema = z.object({ id: uuid });
const statusSchema = z.object({ status: z.nativeEnum(ArtistBookingStatus) });

async function manageableArtist(user, artistId) {
  const artist = await prisma.artist.findUnique({ where: { id: artistId }, include: { producerAccesses: { select: { producerId: true } }, accesses: { select: { userId: true, role: true, status: true } } } });
  return artist && canManageArtist(user, artist) ? artist : null;
}

export async function createArtistBookingRequest(req, res, next) {
  try {
    const payload = createSchema.parse(req.body);
    if (payload.companyWebsite) return res.status(201).json({ accepted: true });
    const artist = await prisma.artist.findFirst({ where: { id: payload.artistId, isVerified: true, OR: [{ accesses: { some: { status: "active" } } }, { producerAccesses: { some: {} } }] }, select: { id: true } });
    if (!artist) return res.status(409).json({ error: "artist_booking_unavailable", message: "Este artista ainda nao recebe solicitacoes pela plataforma." });
    const item = await prisma.artistBookingRequest.create({ data: { artistId: payload.artistId, requesterUserId: req.user?.id || null, requesterName: payload.requesterName, requesterEmail: payload.requesterEmail.toLowerCase(), requesterPhone: payload.requesterPhone || null, desiredDate: payload.desiredDate ? new Date(payload.desiredDate) : null, city: payload.city, neighborhood: payload.neighborhood || null, eventType: payload.eventType, estimatedAudience: payload.estimatedAudience || null, budgetRange: payload.budgetRange || null, message: payload.message, source: "artist_epk" }, select: { id: true, createdAt: true } });
    return res.status(201).json({ accepted: true, item });
  } catch (error) { return next(error); }
}

export async function listArtistBookingRequests(req, res, next) {
  try {
    const { artistId } = paramsSchema.parse(req.params);
    const { status, limit } = listSchema.parse(req.query || {});
    if (!(await manageableArtist(req.user, artistId))) return res.status(403).json({ error: "forbidden", message: "Sem acesso às solicitacoes deste artista." });
    const items = await prisma.artistBookingRequest.findMany({ where: { artistId, status }, take: limit, orderBy: { createdAt: "desc" } });
    return res.json({ items });
  } catch (error) { return next(error); }
}

export async function updateArtistBookingStatus(req, res, next) {
  try {
    const { id } = requestParamsSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    const current = await prisma.artistBookingRequest.findUnique({ where: { id }, select: { id: true, artistId: true } });
    if (!current) return res.status(404).json({ error: "booking_request_not_found" });
    if (!(await manageableArtist(req.user, current.artistId))) return res.status(403).json({ error: "forbidden", message: "Sem acesso a esta solicitacao." });
    const item = await prisma.artistBookingRequest.update({ where: { id }, data: { status, lastStatusAt: new Date() } });
    return res.json({ item });
  } catch (error) { return next(error); }
}
