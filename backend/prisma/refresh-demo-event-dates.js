import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { refreshDemoEventDates } from "../src/services/demoEventsRefresh.service.js";

async function main() {
  const result = await refreshDemoEventDates({ force: true });
  console.log(`Eventos demo reconhecidos: ${result.recognized}. Datas atualizadas: ${result.updated}. Eventos reais preservados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
