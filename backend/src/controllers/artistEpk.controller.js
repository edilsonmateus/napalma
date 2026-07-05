import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../lib/access.control.js";

const refSchema = z.object({ ref: z.string().trim().min(1).max(180) });
const idSchema = z.object({ id: z.string().uuid() });
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const optionalUrl = z.string().trim().url().max(500).nullable().optional();
const profileSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  bio: optionalText(2000),
  imageUrl: optionalUrl,
  genres: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  spotifyUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  instagramUrl: optionalUrl,
  profile: z.object({
    coverImageUrl: optionalUrl,
    shortBio: optionalText(320),
    fullBio: optionalText(8000),
    baseCity: optionalText(120),
    baseState: optionalText(40),
    serviceRegions: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    showFormats: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    eventTypes: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    averageDurationMinutes: z.number().int().min(15).max(600).nullable().optional(),
    formation: optionalText(500),
    availability: optionalText(500),
    websiteUrl: optionalUrl,
    tiktokUrl: optionalUrl,
    whatsappUrl: optionalUrl,
    soundcloudUrl: optionalUrl,
    professionalEmail: z.string().trim().email().max(200).nullable().optional(),
    professionalPhone: optionalText(40),
    contactPreference: optionalText(120)
  }).optional()
});

const accessInclude = {
  producerAccesses: { select: { producerId: true } },
  accesses: { select: { userId: true, role: true, status: true } }
};

function artistWhere(ref) {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ref) ? { id: ref } : { slug: ref.toLowerCase() };
}

function publicArtist(artist) {
  const profile = artist.professionalProfile;
  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.name,
    bio: artist.bio || "",
    shortBio: profile?.shortBio || artist.bio || "",
    fullBio: profile?.fullBio || "",
    imageUrl: artist.imageUrl || "",
    coverImageUrl: profile?.coverImageUrl || "",
    genres: artist.genres || [],
    isVerified: Boolean(artist.isVerified),
    verifiedAt: artist.verifiedAt || null,
    isClaimed: (artist._count?.accesses || 0) > 0 || (artist._count?.producerAccesses || 0) > 0,
    followersCount: artist._count?.followers || 0,
    eventsCount: artist._count?.events || 0,
    baseCity: profile?.baseCity || "",
    baseState: profile?.baseState || "",
    serviceRegions: profile?.serviceRegions || [],
    showFormats: profile?.showFormats || [],
    eventTypes: profile?.eventTypes || [],
    averageDurationMinutes: profile?.averageDurationMinutes || null,
    formation: profile?.formation || "",
    availability: profile?.availability || "",
    links: {
      spotify: artist.spotifyUrl || "",
      youtube: artist.youtubeUrl || "",
      instagram: artist.instagramUrl || "",
      website: profile?.websiteUrl || "",
      tiktok: profile?.tiktokUrl || "",
      soundcloud: profile?.soundcloudUrl || ""
    },
    bookingAvailable: Boolean(profile?.professionalEmail || profile?.professionalPhone || profile?.whatsappUrl),
    contactPreference: profile?.contactPreference || ""
    ,media: artist.media || []
  };
}

function eventPayload(event) {
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startDate,
    endsAt: event.endDate,
    status: event.status,
    type: event.type,
    tags: event.tags,
    imageUrl: event.imageUrl || event.venue?.imageUrl || "",
    venue: event.venue ? { id: event.venue.id, name: event.venue.name, neighborhood: event.venue.neighborhood, region: event.venue.region, city: event.venue.city, state: event.venue.state } : null
  };
}

export async function getArtistEpk(req, res, next) {
  try {
    const { ref } = refSchema.parse(req.params);
    const artist = await prisma.artist.findUnique({
      where: artistWhere(ref),
      include: {
        professionalProfile: true,
        media: { where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
        _count: { select: { events: true, followers: true, producerAccesses: true, accesses: { where: { status: "active" } } } }
      }
    });
    if (!artist) return res.status(404).json({ error: "artist_not_found", message: "Artista nao encontrado." });
    const now = new Date();
    const [upcoming, history, follow, pendingClaim] = await Promise.all([
      prisma.event.findMany({ where: { status: "confirmed", startDate: { gte: now }, artists: { some: { artistId: artist.id } } }, include: { venue: true }, orderBy: { startDate: "asc" }, take: 30 }),
      prisma.event.findMany({ where: { status: "confirmed", endDate: { lt: now }, artists: { some: { artistId: artist.id } } }, include: { venue: true }, orderBy: { startDate: "desc" }, take: 12 }),
      req.user ? prisma.artistFollow.findUnique({ where: { userId_artistId: { userId: req.user.id, artistId: artist.id } }, select: { id: true } }) : null,
      req.user ? prisma.claimRequest.findFirst({ where: { requestedById: req.user.id, artistId: artist.id, targetType: "artist", status: "pending" }, select: { id: true, createdAt: true } }) : null
    ]);
    return res.json({ item: { ...publicArtist(artist), isFollowing: Boolean(follow), pendingClaim: pendingClaim || null, upcomingEvents: upcoming.map(eventPayload), pastEvents: history.map(eventPayload) } });
  } catch (error) { return next(error); }
}

export async function listMyArtists(req, res, next) {
  try {
    const items = await prisma.artist.findMany({
      where: { OR: [{ accesses: { some: { userId: req.user.id, status: "active" } } }, ...(req.user.role === "producer" ? [{ producerAccesses: { some: { producerId: req.user.id } } }, { createdByUserId: req.user.id }] : [])] },
      include: { professionalProfile: true, accesses: { where: { userId: req.user.id, status: "active" }, select: { role: true, status: true } }, _count: { select: { events: true, followers: true } } },
      orderBy: { name: "asc" }
    });
    res.json({ items: items.map((item) => ({ ...publicArtist(item), myAccess: item.accesses[0] || (req.user.role === "producer" ? { role: "manager", status: "active" } : null) })) });
  } catch (error) { next(error); }
}

export async function getMyArtistProfile(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const artist = await prisma.artist.findUnique({ where: { id }, include: { professionalProfile: true, ...accessInclude } });
    if (!artist) return res.status(404).json({ error: "artist_not_found" });
    if (!canManageArtist(req.user, artist)) return res.status(403).json({ error: "forbidden", message: "Sem acesso a este perfil." });
    return res.json({ item: { ...artist, professionalProfile: artist.professionalProfile || null } });
  } catch (error) { return next(error); }
}

export async function updateMyArtistProfile(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = profileSchema.parse(req.body);
    const artist = await prisma.artist.findUnique({ where: { id }, include: accessInclude });
    if (!artist) return res.status(404).json({ error: "artist_not_found" });
    if (!canManageArtist(req.user, artist)) return res.status(403).json({ error: "forbidden", message: "Sem permissao para editar este perfil." });
    const { profile, ...artistData } = payload;
    const item = await prisma.$transaction(async (tx) => {
      await tx.artist.update({ where: { id }, data: artistData });
      if (profile) await tx.artistProfessionalProfile.upsert({ where: { artistId: id }, update: profile, create: { artistId: id, ...profile } });
      return tx.artist.findUnique({ where: { id }, include: { professionalProfile: true } });
    });
    return res.json({ item });
  } catch (error) { return next(error); }
}
