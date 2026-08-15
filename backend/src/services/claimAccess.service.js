function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Grants the professional access represented by an already validated claim.
 * This function is intentionally idempotent: signature retries must never
 * duplicate memberships or elevate a user twice.
 */
export async function activateClaimAccess({ tx, claim, actorUserId }) {
  let artistId = claim.artistId || null;

  if (claim.requestType === "artist_inclusion" && claim.targetType === "artist") {
    if (!artistId) {
      const requested = claim.requestedChanges && typeof claim.requestedChanges === "object" ? claim.requestedChanges : {};
      const artistName = String(requested.artistName || "").trim();
      if (!artistName) throw new Error("artist_inclusion_name_missing");
      const duplicate = await tx.artist.findFirst({ where: { name: { equals: artistName, mode: "insensitive" } }, select: { id: true } });
      if (duplicate) throw Object.assign(new Error("artist_already_exists"), { status: 409 });
      const baseSlug = slugify(artistName) || "artista";
      const slugTaken = await tx.artist.findUnique({ where: { slug: baseSlug }, select: { id: true } });
      const artist = await tx.artist.create({
        data: {
          name: artistName,
          slug: slugTaken ? `${baseSlug}-${claim.id.slice(0, 6)}` : baseSlug,
          genres: Array.isArray(requested.genres) ? requested.genres.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12) : ["samba"],
          isVerified: true,
          verifiedAt: new Date(),
          verifiedByUserId: actorUserId,
          professionalProfile: { create: { baseCity: String(requested.baseCity || "").trim() || null, baseState: String(requested.baseState || "").trim() || null } }
        }
      });
      artistId = artist.id;
    }
    await tx.artistAccess.upsert({
      where: { artistId_userId: { artistId, userId: claim.requestedById } },
      update: { role: "owner", status: "active", acceptedAt: new Date(), invitedByUserId: actorUserId },
      create: { artistId, userId: claim.requestedById, role: "owner", status: "active", acceptedAt: new Date(), invitedByUserId: actorUserId }
    });
  }

  if (claim.requestType === "venue_update" && claim.targetType === "venue" && claim.venueId) {
    const allowed = ["name", "description", "contactName", "contactPhone", "instagramUrl", "address", "neighborhood", "region", "city", "state", "imageUrl", "openDays"];
    const incoming = claim.requestedChanges && typeof claim.requestedChanges === "object" ? claim.requestedChanges : {};
    const safePatch = Object.fromEntries(Object.entries(incoming).filter(([key]) => allowed.includes(key)));
    if (Object.keys(safePatch).length) await tx.venue.update({ where: { id: claim.venueId }, data: safePatch });
  }

  if (["ownership", "team_access"].includes(claim.requestType) && claim.targetType === "venue" && claim.venueId) {
    const requester = await tx.user.findUnique({ where: { id: claim.requestedById }, select: { role: true } });
    const requested = claim.requestedChanges && typeof claim.requestedChanges === "object" ? claim.requestedChanges : {};
    const accessProfile = ["producer", "venue_manager"].includes(requested.requestedAccessProfile)
      ? requested.requestedAccessProfile
      : requester?.role === "producer" ? "producer" : "venue_manager";
    if (accessProfile === "venue_manager") {
      await tx.venueManagerAccess.upsert({ where: { userId_venueId: { userId: claim.requestedById, venueId: claim.venueId } }, update: {}, create: { userId: claim.requestedById, venueId: claim.venueId } });
      if (requester?.role === "attendee") await tx.user.update({ where: { id: claim.requestedById }, data: { role: "venue_manager" } });
    } else {
      await tx.producerVenueAccess.upsert({ where: { producerId_venueId: { producerId: claim.requestedById, venueId: claim.venueId } }, update: {}, create: { producerId: claim.requestedById, venueId: claim.venueId } });
      if (requester?.role === "attendee") await tx.user.update({ where: { id: claim.requestedById }, data: { role: "producer" } });
    }
  }

  if (claim.requestType === "ownership" && claim.targetType === "artist" && claim.artistId) {
    const requester = await tx.user.findUnique({ where: { id: claim.requestedById }, select: { role: true } });
    await tx.artistAccess.upsert({ where: { artistId_userId: { artistId: claim.artistId, userId: claim.requestedById } }, update: { role: "owner", status: "active", acceptedAt: new Date() }, create: { artistId: claim.artistId, userId: claim.requestedById, role: "owner", status: "active", acceptedAt: new Date(), invitedByUserId: actorUserId } });
    if (requester?.role === "producer") await tx.producerArtistAccess.upsert({ where: { producerId_artistId: { producerId: claim.requestedById, artistId: claim.artistId } }, update: {}, create: { producerId: claim.requestedById, artistId: claim.artistId } });
    await tx.artist.update({ where: { id: claim.artistId }, data: { isVerified: true, verifiedAt: new Date(), verifiedByUserId: actorUserId } });
  }

  if (claim.requestType === "team_access" && claim.targetType === "artist" && claim.artistId) {
    await tx.artistAccess.upsert({ where: { artistId_userId: { artistId: claim.artistId, userId: claim.requestedById } }, update: { role: "manager", status: "active", acceptedAt: new Date(), invitedByUserId: actorUserId }, create: { artistId: claim.artistId, userId: claim.requestedById, role: "manager", status: "active", acceptedAt: new Date(), invitedByUserId: actorUserId } });
  }

  return { artistId };
}
