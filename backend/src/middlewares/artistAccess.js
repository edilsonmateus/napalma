import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../lib/access.control.js";

export async function requireArtistWrite(req, res, next) {
  try {
    const artistId = req.params.artistId || req.body?.artistId;
    const artist = await prisma.artist.findUnique({ where: { id: artistId }, include: { producerAccesses: { select: { producerId: true } }, accesses: { select: { userId: true, role: true, status: true } } } });
    if (!artist) return res.status(404).json({ error: "artist_not_found" });
    if (!canManageArtist(req.user, artist)) return res.status(403).json({ error: "forbidden", message: "Sem permissao para alterar este artista." });
    req.managedArtist = artist;
    return next();
  } catch (error) { return next(error); }
}
