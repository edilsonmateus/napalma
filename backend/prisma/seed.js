import bcrypt from "bcryptjs";
import { PrismaClient, EventType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.refreshToken.deleteMany();
  await prisma.eventArtist.deleteMany();
  await prisma.markedEvent.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.venueManagerAccess.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);

  const [admin, producer, venueManager, attendee] = await Promise.all([
    prisma.user.create({ data: { email: "admin@napalma.app", username: "admin.napalma", firstName: "Admin", lastName: "NaPalma", passwordHash, role: UserRole.admin } }),
    prisma.user.create({ data: { email: "produtor@napalma.app", username: "produtor.samba", firstName: "Produtor", lastName: "Samba", passwordHash, role: UserRole.producer } }),
    prisma.user.create({ data: { email: "casa@napalma.app", username: "gestor.casa", firstName: "Gestor", lastName: "Casa", passwordHash, role: UserRole.venue_manager } }),
    prisma.user.create({ data: { email: "lia@napalma.app", username: "lia.samba", firstName: "Lia", lastName: "Campos", passwordHash, role: UserRole.attendee } })
  ]);

  const [venueCentro, venueSul, venueOeste] = await Promise.all([
    prisma.venue.create({
      data: {
        name: "Bar do Bixiga",
        slug: "bar-do-bixiga",
        description: "Casa tradicional de roda de samba no centro de Sao Paulo.",
        address: "Rua Treze de Maio, 811",
        neighborhood: "Bela Vista",
        region: "Centro",
        city: "Sao Paulo",
        state: "SP",
        imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=80",
        createdByUserId: producer.id,
        managerUserId: venueManager.id
      }
    }),
    prisma.venue.create({
      data: {
        name: "Quintal da Vila",
        slug: "quintal-da-vila",
        description: "Pagode de bairro com repertorio autoral e classicos.",
        address: "Rua das Mangueiras, 220",
        neighborhood: "Vila Mariana",
        region: "Zona Sul",
        city: "Sao Paulo",
        state: "SP",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80",
        createdByUserId: producer.id
      }
    }),
    prisma.venue.create({
      data: {
        name: "Salao Aurora",
        slug: "salao-aurora",
        description: "Baile de gafieira em ambiente classico na Zona Oeste.",
        address: "Rua Harmonia, 640",
        neighborhood: "Vila Madalena",
        region: "Zona Oeste",
        city: "Sao Paulo",
        state: "SP",
        imageUrl: "https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=1400&q=80",
        createdByUserId: admin.id
      }
    })
  ]);

  await prisma.venueManagerAccess.createMany({
    data: [
      { userId: venueManager.id, venueId: venueCentro.id },
      { userId: venueManager.id, venueId: venueSul.id }
    ]
  });

  const [artist1, artist2, artist3] = await Promise.all([
    prisma.artist.create({ data: { name: "Comunidade Bixiga Samba Clube", slug: "comunidade-bixiga-samba-clube", genres: ["samba", "roda_samba"], createdByUserId: producer.id } }),
    prisma.artist.create({ data: { name: "Grupo Corda Solta", slug: "grupo-corda-solta", genres: ["pagode", "samba"], createdByUserId: producer.id } }),
    prisma.artist.create({ data: { name: "Orquestra NaPalma", slug: "orquestra-napalma", genres: ["gafieira", "samba"], createdByUserId: admin.id } })
  ]);

  const [event1, event2, event3] = await Promise.all([
    prisma.event.create({ data: { title: "Roda de Samba no Bixiga", description: "Samba de raiz com convidados e quintal lotado.", imageUrl: venueCentro.imageUrl, type: EventType.roda_samba, tags: ["samba", "roda_de_samba"], startDate: new Date("2026-05-16T20:00:00-03:00"), endDate: new Date("2026-05-16T23:30:00-03:00"), ticketType: "paid", priceMin: 35, priceMax: 35, venueId: venueCentro.id, createdByUserId: venueManager.id } }),
    prisma.event.create({ data: { title: "Pagode da Vila", description: "Pagode com repertorio classico e autoral.", imageUrl: venueSul.imageUrl, type: EventType.pagode, tags: ["pagode", "samba"], startDate: new Date("2026-05-17T18:30:00-03:00"), endDate: new Date("2026-05-17T22:00:00-03:00"), ticketType: "paid", priceMin: 40, priceMax: 40, venueId: venueSul.id, createdByUserId: producer.id } }),
    prisma.event.create({ data: { title: "Noite de Gafieira", description: "Baile para dancar com orquestra ao vivo.", imageUrl: venueOeste.imageUrl, type: EventType.gafieira, tags: ["gafieira", "samba"], startDate: new Date("2026-05-18T21:00:00-03:00"), endDate: new Date("2026-05-19T00:00:00-03:00"), ticketType: "paid", priceMin: 50, priceMax: 50, venueId: venueOeste.id, createdByUserId: admin.id } })
  ]);

  await prisma.eventArtist.createMany({ data: [{ eventId: event1.id, artistId: artist1.id, order: 0 }, { eventId: event2.id, artistId: artist2.id, order: 0 }, { eventId: event3.id, artistId: artist3.id, order: 0 }] });

  void attendee;
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
