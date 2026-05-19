import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const trackVisitSchema = z.object({
  visitorId: z.string().min(8).max(120)
});

function daysAgoStart(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function trackAudienceVisit(req, res) {
  const parsed = trackVisitSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      message: "visitorId invalido.",
      details: parsed.error.flatten()
    });
  }

  const { visitorId } = parsed.data;
  const userId = req.user?.id || null;

  const existing = await prisma.audienceVisitor.findUnique({ where: { visitorId } });

  if (!existing) {
    await prisma.audienceVisitor.create({
      data: {
        visitorId,
        userId
      }
    });
    return res.status(201).json({ ok: true, created: true });
  }

  await prisma.audienceVisitor.update({
    where: { visitorId },
    data: {
      lastSeenAt: new Date(),
      hits: { increment: 1 },
      userId: existing.userId || userId
    }
  });

  return res.json({ ok: true, created: false });
}

export async function getAudienceSummary(_req, res) {
  const [registeredUsers, visitors30d, loggedVisitors30d, totalVisitors] = await Promise.all([
    prisma.user.count(),
    prisma.audienceVisitor.count({
      where: { lastSeenAt: { gte: daysAgoStart(30) } }
    }),
    prisma.audienceVisitor.count({
      where: {
        userId: { not: null },
        lastSeenAt: { gte: daysAgoStart(30) }
      }
    }),
    prisma.audienceVisitor.count()
  ]);

  return res.json({
    registeredUsers,
    activeAudience30d: visitors30d,
    activeRegistered30d: loggedVisitors30d,
    activeVisitorsOnly30d: Math.max(visitors30d - loggedVisitors30d, 0),
    totalAudienceTracked: totalVisitors
  });
}
