import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("campaign review preview", () => {
  it("uses creatives linked to the campaign instead of an empty campaign placeholder", () => {
    const page = read("frontend/src/pages/AdsAdminPage.jsx");
    expect(page).toContain('const creatives = isCreative ? [item] : (item.creatives || []);');
    expect(page).toContain('const imageUrl = selectedCreative?.imageUrl || "";');
    expect(page).toContain('role="group" aria-label="Selecionar criativo para prévia"');
    expect(page).toContain("Prévia de veiculação: ${slotLabel}.");
  });

  it("keeps the empty state only when the campaign has no linked creative", () => {
    const page = read("frontend/src/pages/AdsAdminPage.jsx");
    expect(page).toContain('"Campanha sem criativos vinculados"');
    expect(page).not.toContain('"Campanha sem imagem própria"');
  });
});
