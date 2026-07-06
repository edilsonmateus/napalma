import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const page = (name) => fs.readFileSync(path.join(root, `frontend/src/pages/${name}.jsx`), "utf8");

describe("final product legal and support copy", () => {
  it("updates privacy coverage for current data flows", () => {
    const privacy = page("PrivacyPage");
    for (const topic of ["Contratações", "campanhas publicitárias", "localização", "armazenamento local", "Seus direitos"]) expect(privacy).toContain(topic);
    expect(privacy).toContain("06/07/2026");
  });

  it("covers professional profiles, bookings, ads and user conduct in terms", () => {
    const terms = page("TermsPage");
    for (const topic of ["Contratações de artistas", "Publicidade", "Conteúdo enviado", "Condutas proibidas", "Moderação e suspensão"]) expect(terms).toContain(topic);
    expect(terms).toContain('to="/privacy"');
  });

  it("keeps help and about aligned with released features", () => {
    const help = page("HelpPage"); const about = page("AboutPage");
    for (const topic of ["Radar", "EPK", "Central do Anunciante", "foto de perfil"]) expect(help).toContain(topic);
    for (const audience of ["Para o público", "Para artistas", "Para casas e produtores", "Para anunciantes"]) expect(about).toContain(audience);
  });
});
