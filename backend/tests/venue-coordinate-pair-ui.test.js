import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const venuesAdminPage = fs.readFileSync(
  path.join(root, "frontend/src/pages/VenuesAdminPage.jsx"),
  "utf8"
);

describe("venue coordinate pair field", () => {
  it("uses one Google Maps-compatible field in both venue forms", () => {
    expect(venuesAdminPage.match(/name="coordinates"/g)).toHaveLength(2);
    expect(venuesAdminPage).not.toContain('name="latitude" type="number"');
    expect(venuesAdminPage).not.toContain('name="longitude" type="number"');
    expect(venuesAdminPage).toContain("Cole latitude e longitude como o Google Maps entrega, separadas por vírgula.");
  });

  it("keeps the backend contract split into latitude and longitude", () => {
    expect(venuesAdminPage).toContain("latitude: coordinatePair?.latitude ?? null");
    expect(venuesAdminPage).toContain("longitude: coordinatePair?.longitude ?? null");
    expect(venuesAdminPage).toContain("coordinates: formatCoordinatePair(detail.latitude, detail.longitude)");
    expect(venuesAdminPage).toContain("Informe latitude e longitude válidas, separadas por vírgula.");
  });
});
