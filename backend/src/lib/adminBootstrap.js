import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";

function clean(value) {
  return String(value || "").trim();
}

function normalizeUsername(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/(^[._-]+|[._-]+$)/g, "");
}

export async function ensureAdminBootstrap({ logger = console } = {}) {
  const email = clean(process.env.ADMIN_BOOTSTRAP_EMAIL).toLowerCase();
  const password = clean(process.env.ADMIN_BOOTSTRAP_PASSWORD);

  if (!email && !password) return { skipped: true, reason: "missing_env" };

  if (!email || !password) {
    logger.warn("Admin bootstrap incompleto: defina ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD.");
    return { skipped: true, reason: "incomplete_env" };
  }

  if (password.length < 10) {
    logger.warn("Admin bootstrap ignorado: ADMIN_BOOTSTRAP_PASSWORD deve ter pelo menos 10 caracteres.");
    return { skipped: true, reason: "weak_password" };
  }

  const username = normalizeUsername(
    process.env.ADMIN_BOOTSTRAP_USERNAME || email.split("@")[0] || "admin.77gira"
  );
  const firstName = clean(process.env.ADMIN_BOOTSTRAP_FIRST_NAME) || "Admin";
  const lastName = clean(process.env.ADMIN_BOOTSTRAP_LAST_NAME) || "77Gira";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        username,
        firstName,
        lastName,
        passwordHash,
        role: UserRole.admin
      }
    });
    return { updated: true, email };
  }

  await prisma.user.create({
    data: {
      email,
      username,
      firstName,
      lastName,
      passwordHash,
      role: UserRole.admin
    }
  });

  return { created: true, email };
}
