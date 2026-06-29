import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { buildAdvertiserBackfillPlan } from "./lib/advertiser-backfill-plan.js";

if (process.argv.slice(2).length > 0) {
  console.error("Este comando aceita somente dry-run e nao possui modo de escrita.");
  process.exit(2);
}

async function main() {
  const [campaigns, accounts] = await Promise.all([
    prisma.adCampaign.findMany({
      select: {
        id: true,
        advertiser: true,
        advertiserAccountId: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
    }),
    prisma.advertiserAccount.findMany({
      select: {
        id: true,
        name: true,
        legacyKey: true,
        source: true,
        status: true,
        type: true
      },
      orderBy: { id: "asc" }
    })
  ]);

  const report = buildAdvertiserBackfillPlan(campaigns, accounts);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
