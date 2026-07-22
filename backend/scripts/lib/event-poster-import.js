import { normalizeDemoIdentity, parseDemoCsv } from "../../prisma/lib/demo-event-fixtures.js";

export function readPosterMappings(csvContent) {
  return parseDemoCsv(csvContent)
    .map((row, index) => ({
      row: index + 2,
      fileName: String(row.arquivo || "").trim(),
      venueName: String(row.casa || "").trim(),
      eventTitle: String(row.evento || "").trim(),
      date: String(row.data || "").trim(),
      artistName: String(row.artista || "").trim()
    }))
    .filter((row) => row.fileName || row.venueName || row.eventTitle);
}

export function eventPosterKey(venueName, eventTitle) {
  return `${normalizeDemoIdentity(venueName)}::${normalizeDemoIdentity(eventTitle)}`;
}

export function indexEventsForPosters(events) {
  const index = new Map();
  for (const event of events) {
    const key = eventPosterKey(event.venue?.name, event.title);
    const entries = index.get(key) || [];
    entries.push(event);
    index.set(key, entries);
  }
  return index;
}

export function isFourByFive(width, height, tolerance = 0.015) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
  return Math.abs((width / height) - (4 / 5)) <= tolerance;
}
