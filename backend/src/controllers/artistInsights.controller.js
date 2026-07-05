import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../lib/access.control.js";

const paramsSchema = z.object({ artistId: z.string().uuid() });
const querySchema = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });
const accessInclude = {
  producerAccesses: { select: { producerId: true } },
  accesses: { select: { userId: true, role: true, status: true } }
};

export async function getArtistInsights(req, res, next) {
  try {
    const { artistId } = paramsSchema.parse(req.params);
    const { days } = querySchema.parse(req.query);
    const artist = await prisma.artist.findUnique({ where: { id: artistId }, include: accessInclude });
    if (!artist) return res.status(404).json({ error: "artist_not_found" });
    if (!canManageArtist(req.user, artist)) return res.status(403).json({ error: "forbidden", message: "Sem acesso aos insights deste artista." });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [events, followers, newFollowers, bookings, upcomingEvents, publishedMedia] = await Promise.all([
      prisma.analyticsEvent.groupBy({ by: ["type"], where: { artistId, createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.artistFollow.count({ where: { artistId } }),
      prisma.artistFollow.count({ where: { artistId, createdAt: { gte: since } } }),
      prisma.artistBookingRequest.groupBy({ by: ["status"], where: { artistId, createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.event.count({ where: { status: "confirmed", startDate: { gte: new Date() }, artists: { some: { artistId } } } }),
      prisma.artistMedia.count({ where: { artistId, isPublished: true } })
    ]);
    const eventCounts = Object.fromEntries(events.map((item) => [item.type, item._count._all]));
    const bookingCounts = Object.fromEntries(bookings.map((item) => [item.status, item._count._all]));
    const bookingRequests = bookings.reduce((total, item) => total + item._count._all, 0);

    return res.json({
      item: {
        artistId, days, since,
        summary: {
          profileViews: eventCounts.artist_profile_view || 0,
          linkClicks: eventCounts.artist_link_click || 0,
          bookingClicks: eventCounts.artist_booking_click || 0,
          shares: eventCounts.artist_epk_share || 0,
          mediaClicks: eventCounts.artist_media_click || 0,
          followers, newFollowers, bookingRequests,
          wonBookings: bookingCounts.won || 0,
          upcomingEvents, publishedMedia
        },
        eventsByType: eventCounts,
        bookingsByStatus: bookingCounts
      }
    });
  } catch (error) { return next(error); }
}
