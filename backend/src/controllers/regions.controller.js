import { prisma } from "../lib/prisma.js";

const FALLBACK_REGIONS = [
  "Centro",
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
  "Grande Sao Paulo"
];

export async function listRegions(_req, res, next) {
  try {
    const rows = await prisma.venue.findMany({
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" }
    });

    const items = rows.map((row) => row.region).filter(Boolean);
    res.json({ items: items.length ? items : FALLBACK_REGIONS });
  } catch (error) {
    next(error);
  }
}
