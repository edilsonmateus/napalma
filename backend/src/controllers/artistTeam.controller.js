import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const artistParams = z.object({ artistId: z.string().uuid() });
const accessParams = z.object({ id: z.string().uuid() });
const inviteSchema = z.object({
  email: z.string().trim().email().max(200),
  role: z.enum(["manager", "editor", "viewer"])
});
const updateSchema = z.object({
  role: z.enum(["manager", "editor", "viewer"]).optional(),
  status: z.enum(["active", "suspended", "revoked"]).optional()
}).refine((value) => value.role || value.status, { message: "Informe a alteracao." });

const teamInclude = {
  accesses: {
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, avatarUrl: true } } },
    orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }]
  },
  producerAccesses: { select: { producerId: true } }
};

function canManageTeam(user, artist) {
  if (user?.role === "admin") return true;
  if (user?.role === "producer" && artist.createdByUserId === user.id) return true;
  if (user?.role === "producer" && artist.producerAccesses.some((item) => item.producerId === user.id)) return true;
  return artist.accesses.some((item) => item.userId === user?.id && item.status === "active" && item.role === "owner");
}

function canViewTeam(user, artist) {
  if (canManageTeam(user, artist)) return true;
  return artist.accesses.some((item) => item.userId === user?.id && item.status === "active" && ["manager", "editor", "viewer"].includes(item.role));
}

function mapAccess(item) {
  return {
    id: item.id,
    artistId: item.artistId,
    role: item.role,
    status: item.status,
    acceptedAt: item.acceptedAt,
    createdAt: item.createdAt,
    user: item.user
  };
}

async function manageableArtist(user, artistId) {
  const artist = await prisma.artist.findUnique({ where: { id: artistId }, include: teamInclude });
  return artist && canManageTeam(user, artist) ? artist : null;
}

async function activeOwnerCount(artistId) {
  return prisma.artistAccess.count({ where: { artistId, role: "owner", status: "active" } });
}

export async function listArtistTeam(req, res, next) {
  try {
    const { artistId } = artistParams.parse(req.params);
    const artist = await prisma.artist.findUnique({ where: { id: artistId }, include: teamInclude });
    if (!artist || !canViewTeam(req.user, artist)) return res.status(403).json({ error: "forbidden", message: "Você não pode visualizar esta equipe." });
    return res.json({ artist: { id: artist.id, name: artist.name }, items: artist.accesses.map(mapAccess), limit: 10, canManage: canManageTeam(req.user, artist) });
  } catch (error) { return next(error); }
}

export async function inviteArtistTeamMember(req, res, next) {
  try {
    const { artistId } = artistParams.parse(req.params);
    const payload = inviteSchema.parse(req.body || {});
    const artist = await manageableArtist(req.user, artistId);
    if (!artist) return res.status(403).json({ error: "forbidden", message: "Somente proprietarios podem convidar a equipe." });
    const occupied = artist.accesses.filter((item) => ["active", "invited"].includes(item.status)).length;
    if (occupied >= 10) return res.status(409).json({ error: "artist_team_limit", message: "A equipe atingiu o limite de 10 integrantes." });
    const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() }, select: { id: true } });
    if (!user) return res.status(404).json({ error: "user_not_found", message: "Peça para essa pessoa criar uma conta no 77Gira antes do convite." });
    if (user.id === req.user.id) return res.status(409).json({ error: "self_invite", message: "Você já faz parte da gestão deste artista." });
    const item = await prisma.artistAccess.upsert({
      where: { artistId_userId: { artistId, userId: user.id } },
      update: { role: payload.role, status: "invited", invitedByUserId: req.user.id, acceptedAt: null },
      create: { artistId, userId: user.id, role: payload.role, status: "invited", invitedByUserId: req.user.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, avatarUrl: true } } }
    });
    return res.status(201).json({ item: mapAccess(item) });
  } catch (error) { return next(error); }
}

export async function updateArtistTeamMember(req, res, next) {
  try {
    const { id } = accessParams.parse(req.params);
    const payload = updateSchema.parse(req.body || {});
    const current = await prisma.artistAccess.findUnique({ where: { id }, include: { artist: { include: teamInclude } } });
    if (!current) return res.status(404).json({ error: "artist_access_not_found", message: "Acesso não encontrado." });
    if (!canManageTeam(req.user, current.artist)) return res.status(403).json({ error: "forbidden", message: "Sem permissão para alterar esta equipe." });
    const removesOwner = current.role === "owner" && current.status === "active" && (
      (payload.role && payload.role !== "owner") ||
      (payload.status && payload.status !== "active")
    );
    if (removesOwner && await activeOwnerCount(current.artistId) <= 1) return res.status(409).json({ error: "last_artist_owner", message: "O último proprietário ativo não pode ser removido ou rebaixado." });
    const item = await prisma.artistAccess.update({
      where: { id }, data: payload,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, username: true, avatarUrl: true } } }
    });
    return res.json({ item: mapAccess(item) });
  } catch (error) { return next(error); }
}

export async function revokeArtistTeamMember(req, res, next) {
  try {
    const { id } = accessParams.parse(req.params);
    const current = await prisma.artistAccess.findUnique({ where: { id }, include: { artist: { include: teamInclude } } });
    if (!current) return res.status(404).json({ error: "artist_access_not_found", message: "Acesso não encontrado." });
    if (!canManageTeam(req.user, current.artist)) return res.status(403).json({ error: "forbidden" });
    if (current.role === "owner" && current.status === "active" && await activeOwnerCount(current.artistId) <= 1) return res.status(409).json({ error: "last_artist_owner", message: "O último proprietário ativo não pode ser removido." });
    await prisma.artistAccess.update({ where: { id }, data: { status: "revoked" } });
    return res.status(204).send();
  } catch (error) { return next(error); }
}

export async function listMyArtistInvitations(req, res, next) {
  try {
    const items = await prisma.artistAccess.findMany({
      where: { userId: req.user.id, status: "invited" },
      include: { artist: { select: { id: true, slug: true, name: true, imageUrl: true, genres: true } } },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ items: items.map((item) => ({ id: item.id, role: item.role, createdAt: item.createdAt, artist: item.artist })) });
  } catch (error) { return next(error); }
}

export async function decideMyArtistInvitation(req, res, next) {
  try {
    const { id } = accessParams.parse(req.params);
    const decision = z.object({ accept: z.boolean() }).parse(req.body || {});
    const current = await prisma.artistAccess.findFirst({ where: { id, userId: req.user.id, status: "invited" } });
    if (!current) return res.status(404).json({ error: "artist_invitation_not_found", message: "Convite não encontrado." });
    const item = await prisma.artistAccess.update({ where: { id }, data: decision.accept ? { status: "active", acceptedAt: new Date() } : { status: "revoked" } });
    return res.json({ item });
  } catch (error) { return next(error); }
}
