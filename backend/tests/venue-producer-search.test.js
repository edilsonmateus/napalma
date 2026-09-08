import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: { user: { findMany: mocks.findMany } }
}));

import { buildProducerSearchWhere, listProducerUsers } from "../src/controllers/users.controller.js";

function response() {
  return { json: vi.fn().mockReturnThis() };
}

describe("venue producer search", () => {
  it("matches every part of a full name without expanding the eligible role", () => {
    const where = buildProducerSearchWhere("  Produtor   Samba  ");

    expect(where.role).toBe("producer");
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0].OR).toContainEqual({ firstName: { contains: "Produtor", mode: "insensitive" } });
    expect(where.AND[1].OR).toContainEqual({ lastName: { contains: "Samba", mode: "insensitive" } });
  });

  it("keeps email and username searchable with a single term", () => {
    const where = buildProducerSearchWhere("produtor.samba");

    expect(where.AND).toHaveLength(1);
    expect(where.AND[0].OR).toContainEqual({ username: { contains: "produtor.samba", mode: "insensitive" } });
    expect(where.AND[0].OR).toContainEqual({ email: { contains: "produtor.samba", mode: "insensitive" } });
  });

  it("uses the guarded producer filter in the endpoint", async () => {
    mocks.findMany.mockResolvedValue([{ id: "producer-1" }]);
    const res = response();
    const next = vi.fn();

    await listProducerUsers({ query: { q: "Eu Artista" } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: "producer", AND: expect.any(Array) }),
      take: 20
    }));
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: "producer-1" }] });
  });

  it("distinguishes an empty result from a failed lookup in the venue UI", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "../frontend/src/pages/VenuesAdminPage.jsx"),
      "utf8"
    );

    expect(source).toContain("Nenhum produtor elegível foi encontrado com esses dados.");
    expect(source).toContain("Não foi possível buscar produtores. Tente novamente.");
    expect(source).toContain("somente contas que já concluíram o cadastro como produtor");
  });
});
