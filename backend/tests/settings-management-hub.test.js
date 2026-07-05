import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const settings = fs.readFileSync(path.join(root, "frontend/src/pages/SettingsPage.jsx"), "utf8");
const hub = fs.readFileSync(path.join(root, "frontend/src/components/settings/ManagementHub.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "frontend/src/styles/globals.css"), "utf8");

describe("settings management hub", () => {
  it("replaces loose management links with the hub", () => {
    expect(settings).toContain("<ManagementHub");
    expect(settings).not.toContain('className="btn-link">Meu perfil de artista');
    expect(settings).not.toContain('className="btn-link">Central do Anunciante');
  });

  it("derives cards from authorized resources and existing flags", () => {
    expect(hub).toContain("getMyArtists()");
    expect(hub).toContain("getMyAdvertiserAccounts()");
    expect(hub).toContain("VITE_ARTIST_SELF_SERVICE_ENABLED");
    expect(hub).toContain("VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED");
  });

  it("is accessible, persistent and mobile-first", () => {
    expect(hub).toContain('aria-expanded={!collapsed}');
    expect(hub).toContain('aria-controls="managementHubContent"');
    expect(hub).toContain("77gira.config.hubGestao.collapsed");
    expect(css).toContain("@media (max-width: 620px)");
    expect(css).toContain(".management-hub-grid { grid-template-columns: 1fr; }");
  });
});
