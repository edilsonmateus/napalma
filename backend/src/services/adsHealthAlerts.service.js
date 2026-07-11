import { env } from "../config/env.js";
import { getAdsHealthSnapshot } from "./adsHealth.service.js";

let schedulerTimer = null;
let schedulerRunning = false;
let lastSignature = null;
let lastSentAt = 0;

function alertSignature(snapshot) {
  return snapshot.alerts
    .filter((alert) => alert.severity === "critical" || alert.severity === "warning")
    .map((alert) => `${alert.code}:${alert.count}`)
    .sort()
    .join("|");
}

async function postWebhook(snapshot) {
  const importantAlerts = snapshot.alerts.filter((alert) => alert.severity === "critical" || alert.severity === "warning");
  if (!importantAlerts.length) return { sent: false, reason: "no_important_alerts" };

  const signature = alertSignature(snapshot);
  const now = Date.now();
  if (signature === lastSignature && now - lastSentAt < env.adsHealthAlertCooldownMs) {
    return { sent: false, reason: "cooldown" };
  }

  const response = await fetch(env.adsHealthAlertWebhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      source: "77gira-ads",
      type: "ads_delivery_health",
      generatedAt: new Date().toISOString(),
      summary: snapshot.summary,
      alerts: importantAlerts.map(({ severity, code, count, title, detail }) => ({ severity, code, count, title, detail })),
      inventory: snapshot.inventory.map(({ slot, capacity, used, remaining, utilization }) => ({ slot, capacity, used, remaining, utilization }))
    })
  });
  if (!response.ok) throw new Error(`ads_health_webhook_${response.status}`);

  lastSignature = signature;
  lastSentAt = now;
  return { sent: true, alertCount: importantAlerts.length };
}

export async function runAdsHealthAlertCycle() {
  if (!env.adsHealthAlertsEnabled || !env.adsHealthAlertWebhookUrl) return { skipped: true, reason: "not_configured" };
  const snapshot = await getAdsHealthSnapshot(24);
  return postWebhook(snapshot);
}

export function startAdsHealthAlertScheduler() {
  if (!env.adsHealthAlertsEnabled || !env.adsHealthAlertWebhookUrl || schedulerTimer) return null;
  const tick = async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      await runAdsHealthAlertCycle();
    } catch (error) {
      console.error("Erro no alerta operacional de Ads:", error.message);
    } finally {
      schedulerRunning = false;
    }
  };
  setTimeout(tick, 20_000).unref?.();
  schedulerTimer = setInterval(tick, Math.max(300_000, env.adsHealthAlertIntervalMs));
  schedulerTimer.unref?.();
  return schedulerTimer;
}
