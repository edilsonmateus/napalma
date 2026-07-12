import { describe, expect, it } from "vitest";
import { isDefinitiveSessionFailure, isTransientSessionFailure } from "../../frontend/src/utils/authSession.js";

function failure(status, error, url = "/auth/me") {
  return { response: status ? { status, data: { error } } : undefined, config: { url } };
}

describe("auth session resilience", () => {
  it("only treats a confirmed refresh-token failure as definitive", () => {
    expect(isDefinitiveSessionFailure(failure(401, "invalid_refresh_token", "/auth/refresh"))).toBe(true);
    expect(isDefinitiveSessionFailure(failure(400, "validation_error", "/auth/refresh"))).toBe(true);
    expect(isDefinitiveSessionFailure(failure(401, "unauthorized", "/auth/me"))).toBe(false);
    expect(isDefinitiveSessionFailure(failure(403, "forbidden"))).toBe(false);
    expect(isDefinitiveSessionFailure(failure(500, "server_error"))).toBe(false);
    expect(isDefinitiveSessionFailure(failure(0))).toBe(false);
  });

  it("preserves the session for temporary infrastructure failures", () => {
    expect(isTransientSessionFailure(failure(0))).toBe(true);
    expect(isTransientSessionFailure(failure(429, "rate_limited"))).toBe(true);
    expect(isTransientSessionFailure(failure(503, "unavailable"))).toBe(true);
    expect(isTransientSessionFailure(failure(401, "unauthorized", "/auth/me"))).toBe(true);
    expect(isTransientSessionFailure(failure(401, "invalid_refresh_token", "/auth/refresh"))).toBe(false);
  });
});
