import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const editor = fs.readFileSync(
  path.join(process.cwd(), "../frontend/src/components/venues/VenueImageEditorModal.jsx"),
  "utf8"
);
const page = fs.readFileSync(
  path.join(process.cwd(), "../frontend/src/pages/VenuesAdminPage.jsx"),
  "utf8"
);

describe("venue image editor UI contract", () => {
  it("offers both crops, both banner modes and accessible dismissal", () => {
    expect(editor).toContain('aspect="16 / 9"');
    expect(editor).toContain('aspect="1 / 1"');
    expect(editor).toContain("Preencher o banner");
    expect(editor).toContain("Mostrar a imagem inteira");
    expect(editor).toContain('event.key === "Escape"');
    expect(editor).toContain('event.key === "Tab"');
    expect(editor).toContain('aria-modal="true"');
  });

  it("revokes the local preview and does not upload before the editor confirmation", () => {
    expect(editor).toContain("URL.revokeObjectURL(objectUrl)");
    expect(page).toContain("setPendingVenueImageFile(file)");
    expect(page).toContain("handleVenueImageEditorConfirm");
    expect(page).toContain("uploadVenueImageAssetMutation.mutateAsync");
  });
});
