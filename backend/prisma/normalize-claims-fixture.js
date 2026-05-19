import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@napalma.app" },
    select: { id: true }
  });

  if (!admin) {
    throw new Error("Usuario admin@napalma.app nao encontrado.");
  }

  await prisma.$transaction([
    prisma.claimRequest.deleteMany(),
    prisma.producerVenueAccess.deleteMany(),
    prisma.producerArtistAccess.deleteMany(),
    prisma.venue.updateMany({
      data: { createdByUserId: admin.id }
    }),
    prisma.artist.updateMany({
      data: { createdByUserId: admin.id }
    }),
    prisma.event.updateMany({
      data: { createdByUserId: admin.id }
    })
  ]);

  console.log("Fixture normalizada: ownership base em admin e acessos/claims de produtor limpos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

