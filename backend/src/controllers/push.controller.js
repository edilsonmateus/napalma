import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hasPushConfig, sendPushToSubscriptions } from "../services/push.service.js";
import { deliverToNaPistaSession, ToNaPistaServiceError } from "../services/toNaPista.service.js";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(5)
  })
});

const subscribeSchema = z.object({
  subscription: pushSubscriptionSchema,
  visitorId: z.string().trim().max(120).optional().nullable(),
  platform: z.string().trim().max(80).optional().nullable()
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
});

const testPushSchema = z.object({
  userId: z.string().uuid().optional(),
  visitorId: z.string().trim().max(120).optional(),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().max(220).optional(),
  url: z.string().trim().max(500).optional()
});

const toNaPistaIdentitySchema = z.object({
  visitorId: z.string().trim().min(3).max(120).optional().nullable()
});

const activateToNaPistaSchema = toNaPistaIdentitySchema.extend({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

const toNaPistaSessionSchema = toNaPistaIdentitySchema.extend({
  sessionId: z.string().uuid()
});

const notifyToNaPistaSchema = toNaPistaSessionSchema.extend({
  eventId: z.string().uuid()
});

function identityWhere(req, visitorId) {
  const userId = req.user?.id || null;
  const identities = [
    userId ? { userId } : null,
    visitorId ? { visitorId } : null
  ].filter(Boolean);

  return { userId, identities };
}

function serializeToNaPistaSession(session) {
  return {
    id: session.id,
    startedAt: session.startsAt.getTime(),
    expiresAt: session.expiresAt.getTime(),
    maxNotifications: session.maxNotifications,
    notificationsSent: session.notificationsSent,
    active: session.isActive && session.expiresAt > new Date(),
    location: {
      latitude: session.latitude,
      longitude: session.longitude
    }
  };
}

export async function subscribePush(req, res) {
  const payload = subscribeSchema.parse(req.body);
  const userId = req.user?.id || null;
  const userAgent = req.header("user-agent") || null;

  const subscription = await prisma.pushSubscription.upsert({
    where: {
      endpoint: payload.subscription.endpoint
    },
    update: {
      p256dh: payload.subscription.keys.p256dh,
      authKey: payload.subscription.keys.auth,
      userId,
      visitorId: payload.visitorId || null,
      platform: payload.platform || null,
      userAgent,
      isActive: true
    },
    create: {
      endpoint: payload.subscription.endpoint,
      p256dh: payload.subscription.keys.p256dh,
      authKey: payload.subscription.keys.auth,
      userId,
      visitorId: payload.visitorId || null,
      platform: payload.platform || null,
      userAgent
    }
  });

  res.status(201).json({
    id: subscription.id,
    active: subscription.isActive
  });
}

export async function unsubscribePush(req, res) {
  const payload = unsubscribeSchema.parse(req.body);

  await prisma.pushSubscription.updateMany({
    where: {
      endpoint: payload.endpoint
    },
    data: {
      isActive: false
    }
  });

  res.json({ ok: true });
}

export async function getPushStatus(req, res) {
  const userId = req.user?.id || null;
  const visitorId = typeof req.query.visitorId === "string" ? req.query.visitorId : null;

  if (!userId && !visitorId) {
    return res.json({ activeSubscriptions: 0 });
  }

  const activeSubscriptions = await prisma.pushSubscription.count({
    where: {
      isActive: true,
      OR: [
        userId ? { userId } : undefined,
        visitorId ? { visitorId } : undefined
      ].filter(Boolean)
    }
  });

  return res.json({ activeSubscriptions });
}

export async function sendTestPush(req, res) {
  if (!hasPushConfig()) {
    return res.status(503).json({
      error: "push_not_configured",
      message: "Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY para enviar push real."
    });
  }

  const payload = testPushSchema.parse(req.body || {});
  const targetUserId = payload.userId || req.user?.id || null;
  const targetVisitorId = payload.visitorId || null;

  if (!targetUserId && !targetVisitorId) {
    return res.status(400).json({
      error: "missing_target",
      message: "Informe userId, visitorId ou envie autenticado."
    });
  }

  const result = await sendPushToSubscriptions({
    where: targetUserId ? { userId: targetUserId } : { visitorId: targetVisitorId },
    payload: {
      title: payload.title || "Tô na Pista sugeriu",
      body: payload.body || "Tem samba perto de você agora. Partiu?",
      url: payload.url || "/explore",
      tag: "77gira-to-na-pista-test"
    },
    limit: 10
  });

  return res.json(result);
}

export async function activateToNaPista(req, res) {
  const payload = activateToNaPistaSchema.parse(req.body || {});
  const { userId, identities } = identityWhere(req, payload.visitorId);

  if (!identities.length) {
    return res.status(400).json({
      error: "missing_identity",
      message: "Não foi possível identificar esta sessão."
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  const session = await prisma.$transaction(async (tx) => {
    await tx.toNaPistaSession.updateMany({
      where: {
        isActive: true,
        OR: identities
      },
      data: {
        isActive: false
      }
    });

    return tx.toNaPistaSession.create({
      data: {
        userId,
        visitorId: payload.visitorId || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        startsAt: now,
        expiresAt,
        maxNotifications: 2
      }
    });
  });

  return res.status(201).json(serializeToNaPistaSession(session));
}

export async function deactivateToNaPista(req, res) {
  const payload = toNaPistaSessionSchema.parse(req.body || {});
  const { identities } = identityWhere(req, payload.visitorId);

  if (!identities.length) {
    return res.status(400).json({ error: "missing_identity" });
  }

  await prisma.toNaPistaSession.updateMany({
    where: {
      id: payload.sessionId,
      OR: identities
    },
    data: {
      isActive: false
    }
  });

  return res.json({ ok: true });
}

export async function getToNaPistaStatus(req, res) {
  const visitorId = typeof req.query.visitorId === "string" ? req.query.visitorId : null;
  const { identities } = identityWhere(req, visitorId);

  if (!identities.length) {
    return res.json({ active: false, session: null });
  }

  const session = await prisma.toNaPistaSession.findFirst({
    where: {
      isActive: true,
      expiresAt: { gt: new Date() },
      OR: identities
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return res.json({
    active: Boolean(session),
    session: session ? serializeToNaPistaSession(session) : null
  });
}

export async function deliverToNaPistaSuggestion(req, res) {
  const payload = notifyToNaPistaSchema.parse(req.body || {});
  const { identities } = identityWhere(req, payload.visitorId);

  if (!identities.length) {
    return res.status(400).json({ error: "missing_identity" });
  }
  try {
    const result = await deliverToNaPistaSession({
      sessionId: payload.sessionId,
      eventId: payload.eventId,
      identities
    });
    return res.json({
      ...result,
      session: serializeToNaPistaSession(result.session)
    });
  } catch (error) {
    if (error instanceof ToNaPistaServiceError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}
