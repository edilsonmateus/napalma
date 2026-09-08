import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn() }));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: { user: { findMany: mocks.findMany, create: mocks.create } }
}));

import { buildProducerSearchWhere, createProducerUser, listProducerUsers } from "../src/controllers/users.controller.js";

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
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

  it("identifies the conflicting producer field without creating a duplicate account", async () => {
    mocks.findMany.mockResolvedValue([{
      email: "edilsonmateus@gmail.com",
      username: "admin.77gira"
    }]);
    const res = response();
    const next = vi.fn();

    await createProducerUser({
      body: {
        firstName: "Edilson",
        lastName: "Oliveira",
        username: "edilsonoliveira",
        email: "EDILSONMATEUS@gmail.com",
        password: "segredo"
      }
    }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "user_already_exists",
      fieldErrors: {
        email: [expect.stringContaining("já está vinculado")]
      }
    }));
  });

  it("keeps producer creation feedback beside the form and selects a successful result", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "../frontend/src/pages/VenuesAdminPage.jsx"),
      "utf8"
    );

    expect(source).toContain("setManagerCreateFeedback({ type: \"error\", text: message })");
    expect(source).toContain("setSelectedManagerUserId(createdProducer.id)");
    expect(source).toContain("Produtor criado e já selecionado abaixo");
    expect(source).toContain("aria-invalid={Boolean(managerCreateErrors.email?.[0])}");
  });
});
