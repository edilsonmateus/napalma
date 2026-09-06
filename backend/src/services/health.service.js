import { prisma } from "../lib/prisma.js";

const DEFAULT_DATABASE_TIMEOUT_MS = 3000;

export async function checkDatabaseReadiness(timeoutMs = Number(process.env.HEALTH_DATABASE_TIMEOUT_MS || DEFAULT_DATABASE_TIMEOUT_MS)) {
  const effectiveTimeoutMs = Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 500), 10000) : DEFAULT_DATABASE_TIMEOUT_MS;
  let timer;
  try {
    await Promise.race([
      Promise.all([
        prisma.$queryRaw`SELECT 1`,
        // A formal-signature claim reads this field as soon as an eligibility
        // decision is made. Catch a pending schema migration before exposing
        // an action that would otherwise fail with a generic server error.
        prisma.legalSignatureEnvelope.findFirst({ select: { issueContext: true } })
      ]),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("database_readiness_timeout")), effectiveTimeoutMs);
      })
    ]);
    return { ready: true };
  } catch (_error) {
    return { ready: false };
  } finally {
    clearTimeout(timer);
  }
}
