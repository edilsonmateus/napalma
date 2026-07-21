import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertDestructiveSeedAllowed } from "../prisma/lib/seed-safety.js";

describe("destructive seed safety", () => {
  it("blocks the destructive fixture seed in production", () => {
    expect(() => assertDestructiveSeedAllowed("production")).toThrow(/bloqueado em producao/i);
    expect(() => assertDestructiveSeedAllowed("PRODUCTION")).toThrow(/bloqueado em producao/i);
  });

  it("keeps explicit local and test fixture setup available", () => {
    expect(() => assertDestructiveSeedAllowed("development")).not.toThrow();
    expect(() => assertDestructiveSeedAllowed("test")).not.toThrow();
    expect(() => assertDestructiveSeedAllowed(undefined)).not.toThrow();
  });

  it("runs the guard before the first Prisma operation", () => {
    const seed = fs.readFileSync(path.resolve(import.meta.dirname, "..", "prisma", "seed.js"), "utf8");
    const guardPosition = seed.indexOf("assertDestructiveSeedAllowed();");
    const firstPrismaOperation = seed.indexOf("prisma.$queryRaw");
    expect(guardPosition).toBeGreaterThan(-1);
    expect(firstPrismaOperation).toBeGreaterThan(-1);
    expect(guardPosition).toBeLessThan(firstPrismaOperation);
  });
});
