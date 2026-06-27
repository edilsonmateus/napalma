import webpush from "web-push";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

let configured = false;

export function hasPushConfig() {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject);
}

function ensurePushConfigured() {
  if (!hasPushConfig()) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    configured = true;
  }

  return true;
}

function toWebPushSubscription(subscription) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.authKey
    }
  };
}

function shouldDeactivate(error) {
  return error?.statusCode === 404 || error?.statusCode === 410;
}

export async function sendPushToSubscriptions({ where, payload, limit = 50 }) {
  if (!ensurePushConfigured()) {
    return {
      configured: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      deactivated: 0
    };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      isActive: true,
      ...where
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: limit
  });

  let sent = 0;
  let failed = 0;
  let deactivated = 0;
  const body = JSON.stringify(payload);

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), body);
      sent += 1;
    } catch (error) {
      failed += 1;

      if (shouldDeactivate(error)) {
        deactivated += 1;
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false }
        });
      }
    }
  }

  return {
    configured: true,
    attempted: subscriptions.length,
    sent,
    failed,
    deactivated
  };
}

export async function linkPushSubscriptionsToUser(visitorId, userId) {
  if (!visitorId || !userId) {
    return { count: 0 };
  }

  try {
    return await prisma.pushSubscription.updateMany({
      where: {
        visitorId
      },
      data: {
        userId
      }
    });
  } catch (error) {
    // Push is an optional capability and must never prevent account access.
    console.warn("Nao foi possivel vincular push ao usuario:", error?.code || error?.message);
    return { count: 0 };
  }
}
