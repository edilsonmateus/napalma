import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const querySchema = z.object({
  q: z.string().trim().min(1).optional()
});

export async function listVenueManagerUsers(req, res, next) {
  try {
    const { q } = querySchema.parse(req.query);
    const items = await prisma.user.findMany({
      where: {
        role: "venue_manager",
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 20
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
}
