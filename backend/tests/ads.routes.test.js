import { describe, expect, it, vi } from "vitest";
import { router } from "../src/routes/index.js";

function findRoute(path, method) {
  return router.stack.find(
    (layer) => layer.route?.path === path && layer.route?.methods?.[method]
  )?.route;
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

describe("Ads route contracts", () => {
  it.each([
    ["/ads/slots/:slot/delivery", "get"],
    ["/ads/track/impression", "post"],
    ["/ads/track/click", "post"],
    ["/ads/report", "get"],
    ["/ads/activity", "get"],
    ["/ads/venue-summary", "get"],
    ["/ads/campaigns", "get"],
    ["/ads/campaigns", "post"],
    ["/ads/campaigns/:id", "patch"],
    ["/ads/campaigns/:campaignId/creatives", "post"],
    ["/ads/creatives/:id", "patch"]
  ])("keeps %s %s registered", (path, method) => {
    expect(findRoute(path, method)).toBeTruthy();
  });

  it("keeps campaign management protected by authentication and admin role", () => {
    const route = findRoute("/ads/campaigns", "post");
    expect(route.stack).toHaveLength(3);

    const requireAuth = route.stack[0].handle;
    const requireAdmin = route.stack[1].handle;
    const unauthenticatedResponse = createResponse();

    requireAuth({ user: null }, unauthenticatedResponse, vi.fn());
    expect(unauthenticatedResponse.status).toHaveBeenCalledWith(401);

    const forbiddenResponse = createResponse();
    requireAdmin({ userRole: "producer" }, forbiddenResponse, vi.fn());
    expect(forbiddenResponse.status).toHaveBeenCalledWith(403);

    const adminNext = vi.fn();
    requireAdmin({ userRole: "admin" }, createResponse(), adminNext);
    expect(adminNext).toHaveBeenCalledOnce();
  });

  it("keeps venue summary available to admin and venue manager only", () => {
    const route = findRoute("/ads/venue-summary", "get");
    expect(route.stack).toHaveLength(3);
    const requireAllowedRole = route.stack[1].handle;

    for (const role of ["admin", "venue_manager"]) {
      const next = vi.fn();
      requireAllowedRole({ userRole: role }, createResponse(), next);
      expect(next).toHaveBeenCalledOnce();
    }

    const response = createResponse();
    requireAllowedRole({ userRole: "producer" }, response, vi.fn());
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it.each([
    ["/ads/advertiser-accounts", "get"],
    ["/ads/advertiser-accounts", "post"],
    ["/ads/advertiser-accounts/:id", "get"],
    ["/ads/advertiser-accounts/:id", "patch"],
    ["/ads/advertiser-accounts/:accountId/memberships", "get"],
    ["/ads/advertiser-accounts/:accountId/memberships", "post"],
    ["/ads/advertiser-memberships/:id", "patch"],
    ["/ads/advertiser-memberships/:id", "delete"],
    ["/ads/campaigns/:id/advertiser-account", "patch"]
  ])("registers the flagged advertiser route %s %s", (path, method) => {
    expect(findRoute(path, method)).toBeTruthy();
  });

  it("keeps advertiser accounts admin-only and disabled by default", () => {
    const previous = process.env.ADS_ADVERTISER_ACCOUNTS_ENABLED;
    delete process.env.ADS_ADVERTISER_ACCOUNTS_ENABLED;
    const route = findRoute("/ads/advertiser-accounts", "post");
    expect(route.stack).toHaveLength(4);

    const unauthenticated = createResponse();
    route.stack[0].handle({ user: null }, unauthenticated, vi.fn());
    expect(unauthenticated.status).toHaveBeenCalledWith(401);

    const producer = createResponse();
    route.stack[1].handle({ userRole: "producer" }, producer, vi.fn());
    expect(producer.status).toHaveBeenCalledWith(403);

    const disabled = createResponse();
    route.stack[2].handle({}, disabled, vi.fn());
    expect(disabled.status).toHaveBeenCalledWith(404);

    process.env.ADS_ADVERTISER_ACCOUNTS_ENABLED = "true";
    const enabledNext = vi.fn();
    route.stack[2].handle({}, createResponse(), enabledNext);
    expect(enabledNext).toHaveBeenCalledOnce();

    if (previous === undefined) delete process.env.ADS_ADVERTISER_ACCOUNTS_ENABLED;
    else process.env.ADS_ADVERTISER_ACCOUNTS_ENABLED = previous;
  });
});
