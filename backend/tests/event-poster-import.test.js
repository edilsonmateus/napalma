import { describe, expect, it } from "vitest";
import { eventPosterKey, indexEventsForPosters, isFourByFive, readPosterMappings } from "../scripts/lib/event-poster-import.js";

describe("event poster import", () => {
  it("reads the mapping file with the required fields", () => {
    const rows = readPosterMappings("arquivo,casa,evento,data,artista\nposter.jpg,Cruz da Esperança,Samba do Tatu,2026-08-03,Samba do Tatu\n");
    expect(rows).toEqual([expect.objectContaining({ fileName: "poster.jpg", venueName: "Cruz da Esperança", eventTitle: "Samba do Tatu" })]);
  });

  it("matches event identity without being affected by accents or case", () => {
    const index = indexEventsForPosters([{ id: "event-1", title: "Samba do Tatu", venue: { name: "Cruz da Esperança" } }]);
    expect(index.get(eventPosterKey("cruz da esperanca", "SAMBA DO TATU"))).toHaveLength(1);
  });

  it("accepts 4:5 art and rejects a landscape creative", () => {
    expect(isFourByFive(1080, 1350)).toBe(true);
    expect(isFourByFive(580, 350)).toBe(false);
  });
});
