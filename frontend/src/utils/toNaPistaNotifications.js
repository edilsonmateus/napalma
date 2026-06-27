import { api } from "../services/api";

const SW_PATH = "/sw.js";
const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();
const VISITOR_ID_KEYS = ["77gira:visitor-id", "napalma:visitor-id", "appteatro:visitor-id"];

export function getVisitorId() {
  try {
    for (const key of VISITOR_ID_KEYS) {
      const existing = window.localStorage.getItem(key);
      if (existing) {
        return existing;
      }
    }

    const id = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(VISITOR_ID_KEYS[0], id);
    return id;
  } catch {
    return null;
  }
}

export async function activateToNaPistaSession({ latitude, longitude }) {
  const response = await api.post("/push/to-na-pista/activate", {
    visitorId: getVisitorId(),
    latitude,
    longitude
  });
  return response.data;
}

export async function deactivateToNaPistaSession(sessionId) {
  if (!sessionId) return;
  await api.post("/push/to-na-pista/deactivate", {
    visitorId: getVisitorId(),
    sessionId
  });
}

export async function deliverToNaPistaSuggestion({ sessionId, eventId }) {
  const response = await api.post("/push/to-na-pista/notify", {
    visitorId: getVisitorId(),
    sessionId,
    eventId
  });
  return response.data;
}

function getPlatformLabel() {
  const userAgent = window.navigator.userAgent || "";

  if (/android/i.test(userAgent)) {
    return "android";
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }

  return "web";
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function subscribeToPushNotifications(registration) {
  if (!("PushManager" in window)) {
    return { subscribed: false, reason: "unsupported" };
  }

  if (!VAPID_PUBLIC_KEY) {
    return { subscribed: false, reason: "missing_vapid" };
  }

  const readyRegistration = registration || (await navigator.serviceWorker.ready);
  const existingSubscription = await readyRegistration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }));

  await api.post("/push/subscribe", {
    subscription: subscription.toJSON(),
    visitorId: getVisitorId(),
    platform: getPlatformLabel()
  });

  return { subscribed: true };
}

export async function ensureToNaPistaNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { supported: false, permission: "unsupported", registration: null };
  }

  const registration = await navigator.serviceWorker.register(SW_PATH);
  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "granted") {
    subscribeToPushNotifications(registration).catch(() => null);
  }

  return {
    supported: true,
    permission,
    registration
  };
}

export async function notifyToNaPista({ title, body, url }) {
  const result = await ensureToNaPistaNotifications();

  if (!result.supported || result.permission !== "granted" || !result.registration) {
    return false;
  }

  await result.registration.showNotification(title || "Tô na Pista sugeriu", {
    body: body || "Tem samba bom por perto.",
    icon: "/assets/brand/icon-192.png",
    badge: "/assets/brand/icon-192.png",
    tag: "77gira-to-na-pista",
    renotify: true,
    data: {
      url: url || "/explore"
    },
    actions: [
      {
        action: "open",
        title: "Partiu Agora!"
      }
    ]
  });

  return true;
}
