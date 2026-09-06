import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("pending legal signature indicator", () => {
  it("keeps the actionable count visible in explore and settings", () => {
    const explore = read("frontend/src/pages/ExplorePage.jsx");
    const settings = read("frontend/src/pages/SettingsPage.jsx");
    const css = read("frontend/src/styles/globals.css");
    expect(explore).toContain('to="/settings/account#assinaturas-formais"');
    expect(settings).toContain('to="/settings/account#assinaturas-formais"');
    expect(explore).toContain("pending-signature-badge");
    expect(settings).toContain("pending-signature-badge");
    expect(css).toContain(".pending-signature-badge {");
  });

  it("uses an explicit, gated approval message", () => {
    const card = read("frontend/src/components/settings/MyLegalSignaturesCard.jsx");
    expect(card).toContain("foi aprovada na etapa de elegibilidade");
    expect(card).toContain("concluir a reivindicação e liberar seu acesso de gestão");
    expect(card).toContain('id="assinaturas-formais"');
  });

  it("makes password confirmation visibly precede e-mail code delivery", () => {
    const card = read("frontend/src/components/settings/MyLegalSignaturesCard.jsx");
    expect(card).toContain("Confirme sua senha do 77Gira");
    expect(card).toContain("O código ainda não foi enviado");
    expect(card).toContain("Confirmar minha senha e enviar código");
    expect(card).toContain("ETAPA 3 DE 3");
  });
});
