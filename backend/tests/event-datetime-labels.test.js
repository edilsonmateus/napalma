import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const venuesAdminPage = fs.readFileSync(
  path.resolve(process.cwd(), "../frontend/src/pages/VenuesAdminPage.jsx"),
  "utf8"
);

describe("event date and time fields", () => {
  it("identifies the beginning and end fields with explicit accessible labels", () => {
    expect(venuesAdminPage).toContain("Dia e hora do começo do evento");
    expect(venuesAdminPage).toContain("Dia e hora do fim do evento");
    expect(venuesAdminPage).toMatch(/<label className="event-datetime-field">[\s\S]*?name="startDate"/);
    expect(venuesAdminPage).toMatch(/<label className="event-datetime-field">[\s\S]*?name="endDate"/);
  });
});
