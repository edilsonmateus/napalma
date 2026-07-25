import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { ensureAdminBootstrap } from "../src/lib/adminBootstrap.js";

async function main() {
  const result = await ensureAdminBootstrap();
  if (result.created) {
    console.log(`Admin definitivo criado: ${result.email}`);
    return;
  }
  if (result.passwordReset) {
    console.warn(`Senha do admin redefinida explicitamente por bootstrap: ${result.email}`);
    return;
  }
  if (result.skipped && result.reason === "already_exists") {
    console.log(`Admin definitivo preservado: ${result.email}`);
    return;
  }
  throw new Error(`Admin bootstrap nao executado: ${result.reason}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
