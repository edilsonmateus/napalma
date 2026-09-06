import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const eventsService = fs.readFileSync(path.join(projectRoot, "frontend/src/services/events.service.js"), "utf8");

describe("URL de clique de publicidade", () => {
  it("mantém a origem da API disponível ao criar o link de clique", () => {
    expect(eventsService).toContain('import { api, apiBaseUrl, publicApi } from "./api";');
    expect(eventsService).toContain('return `${apiBaseUrl}/ads/deliveries/${encodeURIComponent(token)}/click`;');
  });
});
