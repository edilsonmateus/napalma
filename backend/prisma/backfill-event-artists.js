import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const events = await prisma.event.findMany({
    where: { artists: { none: {} } },
    select: { id: true, title: true, createdByUserId: true }
  });

  let linked = 0;
  for (const event of events) {
    const artistName = String(event.title || "").trim();
    if (!artistName) continue;
    const slug = slugify(artistName);

    const artist = await prisma.artist.upsert({
      where: { slug },
      update: { name: artistName },
      create: {
        name: artistName,
        slug,
        genres: ["samba"],
        createdByUserId: event.createdByUserId || undefined
      },
      select: { id: true }
    });

    await prisma.eventArtist.upsert({
      where: {
        eventId_artistId: {
          eventId: event.id,
          artistId: artist.id
        }
      },
      update: { order: 0 },
      create: {
        eventId: event.id,
        artistId: artist.id,
        order: 0
      }
    });
    linked += 1;
  }

  console.log(`Backfill concluido: ${linked} eventos vinculados a artistas.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

