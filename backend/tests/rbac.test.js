import { describe, expect, it, vi } from "vitest";
import { requireRole } from "../src/middlewares/rbac.js";

describe("rbac middleware", () => {
  it("calls next when role is allowed", () => {
    const req = { userRole: "admin" };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireRole(["admin", "producer"])(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when role is not allowed", () => {
    const req = { userRole: "attendee" };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireRole(["admin", "producer"])(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "forbidden",
      message: "Seu perfil nao possui permissao para esta acao.",
      role: "attendee"
    });
  });
});
