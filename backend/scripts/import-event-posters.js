import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { isR2Configured, uploadBufferToR2 } from "../src/services/r2Storage.service.js";
import { eventPosterKey, indexEventsForPosters, isFourByFive, readPosterMappings } from "./lib/event-poster-import.js";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const localOnly = process.argv.includes("--local");
const inboxDirectory = path.resolve(process.cwd(), "..", "assets", "event-posters-inbox");
const mappingPath = path.join(inboxDirectory, "event-posters.csv");

function mimeTypeFor(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  return ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" })[extension] || "";
}

async function inspectMapping(mapping, eventIndex) {
  const errors = [];
  if (!mapping.fileName || !mapping.venueName || !mapping.eventTitle) {
    return { mapping, errors: [`linha ${mapping.row}: arquivo, casa e evento são obrigatórios`] };
  }

  const mimeType = mimeTypeFor(mapping.fileName);
  if (!mimeType) {
    return { mapping, errors: [`linha ${mapping.row}: formato não suportado (${mapping.fileName})`] };
  }

  const matches = eventIndex.get(eventPosterKey(mapping.venueName, mapping.eventTitle)) || [];
  if (matches.length !== 1) {
    const reason = matches.length ? "mais de um evento correspondente" : "nenhum evento correspondente";
    return { mapping, errors: [`linha ${mapping.row}: ${reason} para ${mapping.venueName} — ${mapping.eventTitle}`] };
  }

  const filePath = path.join(inboxDirectory, mapping.fileName);
  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    return { mapping, errors: [`linha ${mapping.row}: arquivo não encontrado (${mapping.fileName})`] };
  }

  const metadata = await sharp(buffer).metadata();
  if (!isFourByFive(metadata.width, metadata.height)) {
    return {
      mapping,
      errors: [`linha ${mapping.row}: ${mapping.fileName} tem ${metadata.width || "?"}×${metadata.height || "?"}; o cartaz precisa ser 4:5`]
    };
  }

  return { mapping, event: matches[0], buffer, mimeType, extension: path.extname(mapping.fileName).slice(1).toLowerCase(), errors };
}

async function main() {
  const csvContent = await fs.readFile(mappingPath, "utf8");
  const mappings = readPosterMappings(csvContent);
  if (!mappings.length) throw new Error("Nenhum cartaz foi encontrado no arquivo event-posters.csv.");

  const events = await prisma.event.findMany({
    select: { id: true, title: true, posterImageUrl: true, venue: { select: { name: true } } }
  });
  const eventIndex = indexEventsForPosters(events);
  const inspections = await Promise.all(mappings.map((mapping) => inspectMapping(mapping, eventIndex)));
  const errors = inspections.flatMap((entry) => entry.errors || []);
  const ready = inspections.filter((entry) => entry.event && !entry.event.posterImageUrl || (entry.event && force));
  const skipped = inspections.filter((entry) => entry.event?.posterImageUrl && !force);

  if (errors.length) {
    console.error("Importação cancelada. Corrija os itens abaixo antes de enviar qualquer cartaz:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  if (!applyChanges) {
    console.log(`Prévia concluída: ${ready.length} cartaz(es) prontos para importar; ${skipped.length} já possuem cartaz e serão preservados.`);
    console.log("Para efetivar, execute: npm run events:posters:import");
    return;
  }

  if (localOnly && String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    throw new Error("A vinculação local de cartazes é permitida somente fora de produção.");
  }
  if (!localOnly && !isR2Configured()) throw new Error("R2 não está configurado. A importação não foi iniciada.");
  for (const item of ready) {
    const uploaded = localOnly ? { url: `/event-posters/${encodeURIComponent(item.mapping.fileName)}` } : await uploadBufferToR2({
      buffer: item.buffer,
      mimeType: item.mimeType,
      extension: item.extension,
      keyPrefix: `events/posters/${item.event.id}`,
      metadata: {
        source: "event-posters-inbox",
        eventid: item.event.id,
        venue: item.mapping.venueName,
        event: item.mapping.eventTitle,
        date: item.mapping.date
      }
    });
    await prisma.event.update({ where: { id: item.event.id }, data: { posterImageUrl: uploaded.url } });
    console.log(`Importado: ${item.mapping.eventTitle} — ${item.mapping.venueName}`);
  }

  console.log(`Importação concluída: ${ready.length} cartaz(es) vinculados; ${skipped.length} preservados.`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
