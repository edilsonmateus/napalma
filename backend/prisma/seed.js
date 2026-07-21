import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeKey(value) {
  return slugify(value).replace(/-/g, "");
}

function readRowValue(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] != null && String(row[alias]).trim().length > 0) {
      return row[alias];
    }
  }
  const normalizedEntries = Object.entries(row).map(([key, val]) => [normalizeKey(key), val]);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const found = normalizedEntries.find(([key]) => key === target);
    if (found && found[1] != null && String(found[1]).trim().length > 0) {
      return found[1];
    }
    const fuzzy = normalizedEntries.find(([key]) => key.startsWith(target.slice(0, 8)) || target.startsWith(key.slice(0, 8)));
    if (fuzzy && fuzzy[1] != null && String(fuzzy[1]).trim().length > 0) {
      return fuzzy[1];
    }
  }
  return "";
}

function safeText(value) {
  return String(value || "")
    .replace(/\uFEFF/g, "")
    .replace(/ÃƒÂ§/g, "Ã§")
    .replace(/ÃƒÂ£/g, "Ã£")
    .replace(/ÃƒÂ¡/g, "Ã¡")
    .replace(/ÃƒÂ©/g, "Ã©")
    .replace(/ÃƒÂª/g, "Ãª")
    .replace(/ÃƒÂ­/g, "Ã­")
    .replace(/ÃƒÂ³/g, "Ã³")
    .replace(/ÃƒÂµ/g, "Ãµ")
    .replace(/ÃƒÂº/g, "Ãº")
    .replace(/Ãƒâ€°/g, "Ã‰")
    .replace(/Ãƒâ€œ/g, "Ã“")
    .replace(/Ãƒ/g, "Ã ")
    .replace(/Ã°Å¸â€â€™/g, "")
    .trim();
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const rows = lines.map((line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          cur += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((cell) => safeText(cell));
  });
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = cells[idx] ?? "";
    });
    return obj;
  });
}

function mapRegion(neighborhood) {
  const n = slugify(neighborhood);
  const byRegion = {
    Centro: ["se", "barra-funda", "campos-eliseos", "bela-vista", "republica", "santa-cecilia", "consolacao"],
    "Zona Norte": ["casa-verde", "santana", "vila-guilherme", "vila-maria", "limao"],
    "Zona Sul": ["vila-mariana", "campo-grande", "santo-amaro", "vila-olimpia", "moema"],
    "Zona Oeste": ["pinheiros", "vila-madalena", "perdizes", "lapa", "butanta"],
    "Zona Leste": ["tatuape", "vila-formosa", "mooca"]
  };
  for (const [region, list] of Object.entries(byRegion)) {
    if (list.includes(n)) return region;
  }
  return "Centro";
}

function parseOpenDays(value) {
  return safeText(value)
    .split(".")
    .map((item) => safeText(item))
    .filter(Boolean)
    .map((d) => d.replace(/\.$/, ""));
}

function mapEventType(value, eventTypeResolver) {
  const v = slugify(value);
  if (v.includes("gafieira")) return eventTypeResolver.gafieira;
  if (v.includes("pagode")) return eventTypeResolver.pagode;
  if (v.includes("samba-rock") || v.includes("samba-rock")) return eventTypeResolver.samba_rock;
  if (v.includes("feijoada")) return eventTypeResolver.feijoada_sambista;
  return eventTypeResolver.roda_samba;
}

function parsePrice(value) {
  const raw = safeText(value).toLowerCase();
  if (!raw || raw.includes("gratis") || raw.includes("grÃ¡tis")) {
    return { ticketType: "free", priceMin: null, priceMax: null };
  }
  const numeric = raw
    .replace("r$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const amount = Number(numeric);
  if (Number.isFinite(amount)) {
    return { ticketType: "paid", priceMin: amount, priceMax: amount };
  }
  return { ticketType: "consumacao", priceMin: null, priceMax: null };
}

function parseTimeToMinutes(value) {
  const clean = safeText(value).replace(/\t/g, "").replace("h", "");
  const match = clean.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

function parseDateWithCurrentYear(value) {
  const clean = safeText(value);
  const full = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (full) return { day: Number(full[1]), month: Number(full[2]), year: Number(full[3]) };
  const short = clean.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (short) return { day: Number(short[1]), month: Number(short[2]), year: new Date().getFullYear() };
  return null;
}

function buildEventDates(dayRef, startMinutes, endMinutes) {
  const base = new Date(dayRef.year, dayRef.month - 1, dayRef.day, 0, 0, 0, 0);
  const start = new Date(base.getTime() + startMinutes * 60000);
  let end = new Date(base.getTime() + endMinutes * 60000);
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60000);
  }
  return { startDate: start, endDate: end };
}

function buildRollingDayRef(index) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  // Sempre ancora os mocks a partir de hoje e concentra alguns eventos no mesmo dia
  // para simular uma agenda mais viva durante testes de feed, filtros e "ao vivo".
  const mockDayOffsets = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
  const offsetDays = mockDayOffsets[index % mockDayOffsets.length];
  base.setDate(base.getDate() + offsetDays);
  return {
    day: base.getDate(),
    month: base.getMonth() + 1,
    year: base.getFullYear()
  };
}

function buildMockEventTimes(index, startMinutes, endMinutes) {
  const mockDayOffsets = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
  const offsetDays = mockDayOffsets[index % mockDayOffsets.length];
  const originalDuration = endMinutes <= startMinutes
    ? endMinutes + 24 * 60 - startMinutes
    : endMinutes - startMinutes;

  if (offsetDays !== 0) {
    return { startMinutes, endMinutes };
  }

  const tonightSlots = [18 * 60, 19 * 60 + 30, 21 * 60, 22 * 60 + 30];
  const newStart = tonightSlots[index % tonightSlots.length];
  return {
    startMinutes: newStart,
    endMinutes: newStart + originalDuration
  };
}

async function main() {
  const enumRows = await prisma.$queryRaw`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'EventType'
  `;
  const enumSet = new Set(enumRows.map((row) => String(row.enumlabel)));
  const eventTypeResolver = {
    roda_samba: enumSet.has("roda_samba")
      ? "roda_samba"
      : enumSet.has("roda_de_samba")
      ? "roda_de_samba"
      : "pagode",
    pagode: enumSet.has("pagode") ? "pagode" : "roda_samba",
    gafieira: enumSet.has("gafieira") ? "gafieira" : "pagode",
    samba_rock: enumSet.has("samba_rock") ? "samba_rock" : "pagode",
    feijoada_sambista: enumSet.has("feijoada_sambista") ? "feijoada_sambista" : "pagode"
  };

  await prisma.refreshToken.deleteMany();
  await prisma.itineraryItem.deleteMany();
  await prisma.itinerary.deleteMany();
  await prisma.eventArtist.deleteMany();
  await prisma.markedEvent.deleteMany();
  await prisma.userEventHistory.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.claimRequest.deleteMany();
  await prisma.region.deleteMany();
  await prisma.producerArtistAccess.deleteMany();
  await prisma.producerVenueAccess.deleteMany();
  await prisma.artistFollow.deleteMany();
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

  const defaultRegions = ["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste", "Grande São Paulo"];

  await prisma.region.createMany({
    data: defaultRegions.map((name, index) => ({
      name,
      city: "São Paulo",
      state: "SP",
      sortOrder: index,
      isActive: true,
      createdByUserId: admin.id
    }))
  });

  const importsDir = path.resolve(process.cwd(), "..", "docs", "imports");
  const housesCsv = fs.readFileSync(path.join(importsDir, "TAB-CASA.csv"), "utf8");
  const attractionsCsv = fs.readFileSync(path.join(importsDir, "TAB-ATRACOES.csv"), "utf8");

  const houseRows = parseCsv(housesCsv);
  const attractionRows = parseCsv(attractionsCsv);

  const venueByName = new Map();
  const venueBySlug = new Map();
  for (const row of houseRows) {
    const name = safeText(row.nomeCasa);
    if (!name) continue;
    const neighborhood = safeText(row.bairroCasa) || "Centro";
    const venue = await prisma.venue.create({
      data: {
        name,
        slug: slugify(name),
        description: safeText(row.descricaoCasa) || undefined,
        address: safeText(row.enderecoCasa) || `Endereco de ${name}`,
        neighborhood,
        region: mapRegion(neighborhood),
        city: "São Paulo",
        state: "SP",
        imageUrl: safeText(row.imgCasa) || undefined,
        openDays: parseOpenDays(row.diasFunciona),
        createdByUserId: producer.id
      }
    });
    venueByName.set(name.toLowerCase(), venue);
    venueBySlug.set(slugify(name), venue);
  }

  const artistBySlug = new Map();
  const createdEvents = [];
  let skippedNoTitle = 0;
  let skippedNoVenue = 0;
  let skippedInvalidDate = 0;

  for (let index = 0; index < attractionRows.length; index += 1) {
    const row = attractionRows[index];
    const title = safeText(readRowValue(row, ["nomeAtracao", "nomeAtração", "nomeAtraÃ§Ã£o", "nomeAtraçao", "nomeAtraÃ§ao"]));
    const venueNameRaw = safeText(readRowValue(row, ["nomeCasa"]));
    const venueName = venueNameRaw.toLowerCase();
    const venue = venueByName.get(venueName) || venueBySlug.get(slugify(venueNameRaw));
    if (!title) {
      skippedNoTitle += 1;
      continue;
    }
    if (!venue) {
      skippedNoVenue += 1;
      continue;
    }

    const dateRef = buildRollingDayRef(index);
    const startMinutes = parseTimeToMinutes(readRowValue(row, ["horaAtracao", "horaAtração", "horaAtraÃ§Ã£o"]));
    const endMinutes = parseTimeToMinutes(readRowValue(row, ["hora_final_Atracao", "horaFinalAtracao", "horaFinalAtração", "horaFinalAtraÃ§Ã£o"]));
    if (startMinutes == null || endMinutes == null) {
      skippedInvalidDate += 1;
      continue;
    }

    const mockTimes = buildMockEventTimes(index, startMinutes, endMinutes);
    const { startDate, endDate } = buildEventDates(dateRef, mockTimes.startMinutes, mockTimes.endMinutes);
    const price = parsePrice(readRowValue(row, ["precoEntrada", "preÃ§oEntrada"]));
    const artistName = title;
    const artistSlug = slugify(artistName);

    let artist = artistBySlug.get(artistSlug);
    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: artistName,
          slug: artistSlug,
          bio: safeText(readRowValue(row, ["descricaoAtracao", "descriÃ§Ã£oAtracao", "descricaoAtraÃ§Ã£o"])) || undefined,
          imageUrl: safeText(readRowValue(row, ["imgAtracao", "imgAtraÃ§Ã£o"])) || undefined,
          genres: ["samba"],
          createdByUserId: producer.id
        }
      });
      artistBySlug.set(artistSlug, artist);
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: safeText(readRowValue(row, ["descricaoAtracao", "descriÃ§Ã£oAtracao", "descricaoAtraÃ§Ã£o"])) || undefined,
        imageUrl: safeText(readRowValue(row, ["imgAtracao", "imgAtraÃ§Ã£o"])) || undefined,
        type: mapEventType(readRowValue(row, ["estiloAtracao", "estiloAtraÃ§Ã£o"]), eventTypeResolver),
        tags: ["samba"],
        startDate,
        endDate,
        ticketType: price.ticketType,
        priceMin: price.priceMin,
        priceMax: price.priceMax,
        status: String(readRowValue(row, ["soudOut", "soldOut"]) || "").toLowerCase() === "true" ? "sold_out" : "confirmed",
        isDemo: true,
        venueId: venue.id,
        createdByUserId: producer.id,
        artists: {
          create: [{ artistId: artist.id, order: 0 }]
        }
      }
    });
    createdEvents.push(event);
  }

  await prisma.venueManagerAccess.createMany({
    data: Array.from(venueByName.values()).slice(0, 3).map((venue) => ({ userId: venueManager.id, venueId: venue.id }))
  });

  const firstEvent = createdEvents[0];
  if (firstEvent) {
    await prisma.markedEvent.create({ data: { userId: attendee.id, eventId: firstEvent.id } });
  }

  const historySeed = createdEvents.slice(0, 3).map((event) => ({ userId: attendee.id, eventId: event.id }));
  if (historySeed.length > 0) {
    await prisma.userEventHistory.createMany({ data: historySeed });
  }

  await prisma.achievement.createMany({
    data: [
      { key: "first_radar", name: "No Radar", description: "Marcou seu primeiro samba no Radar", icon: "target", points: 5, requirement: { type: "marked_events", count: 1 } },
      { key: "samba_lover", name: "Sambista Raiz", description: "Foi em 5 sambas diferentes", icon: "music", points: 30, requirement: { type: "history_events", count: 5 } },
      { key: "pagodeiro_assumido", name: "Pagodeiro Assumido", description: "Foi em 3 pagodes", icon: "mic", points: 20, requirement: { type: "event_type", eventType: "pagode", count: 3 } },
      { key: "pe_de_valsa", name: "Pé de Valsa", description: "Foi em 2 gafieiras", icon: "dance", points: 20, requirement: { type: "event_type", eventType: "gafieira", count: 2 } }
    ]
  });

  console.log(`Seed finalizado: ${venueByName.size} casas, ${artistBySlug.size} artistas, ${createdEvents.length} eventos. Pulados -> sem titulo: ${skippedNoTitle}, sem casa: ${skippedNoVenue}, data/hora invalida: ${skippedInvalidDate}.`);
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


















