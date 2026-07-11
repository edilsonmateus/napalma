import { prisma } from "../lib/prisma.js";

const DEFAULT_DATABASE_TIMEOUT_MS = 3000;

export async function checkDatabaseReadiness(timeoutMs = Number(process.env.HEALTH_DATABASE_TIMEOUT_MS || DEFAULT_DATABASE_TIMEOUT_MS)) {
  const effectiveTimeoutMs = Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 500), 10000) : DEFAULT_DATABASE_TIMEOUT_MS;
  let timer;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
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
