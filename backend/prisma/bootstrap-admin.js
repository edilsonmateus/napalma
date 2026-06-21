import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/(^[._-]+|[._-]+$)/g, "");
}

async function main() {
  const email = requiredEnv("ADMIN_BOOTSTRAP_EMAIL").toLowerCase();
  const password = requiredEnv("ADMIN_BOOTSTRAP_PASSWORD");
  const firstName = process.env.ADMIN_BOOTSTRAP_FIRST_NAME?.trim() || "Admin";
  const lastName = process.env.ADMIN_BOOTSTRAP_LAST_NAME?.trim() || "77Gira";
  const username = normalizeUsername(
    process.env.ADMIN_BOOTSTRAP_USERNAME || email.split("@")[0] || "admin.77gira"
  );

  if (password.length < 10) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD precisa ter pelo menos 10 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          username,
          firstName,
          lastName,
          passwordHash,
          role: UserRole.admin
        }
      })
    : await prisma.user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          passwordHash,
          role: UserRole.admin
        }
      });

  console.log(`Admin definitivo pronto: ${user.email} (${user.username})`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
