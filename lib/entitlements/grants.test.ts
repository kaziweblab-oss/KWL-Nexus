/** @jest-environment node */
import { resolveAppSlug, subscriptionExpiry, isLiveEntitlement } from "./grants";

describe("resolveAppSlug", () => {
  test("prefers plan.appSlug over appId", () => {
    expect(resolveAppSlug({ appSlug: "Kwl-Video-Downloader", appId: "other" }, "raw")).toBe("kwl-video-downloader");
  });
  test("falls back to plan.appId then raw ref", () => {
    expect(resolveAppSlug({ appId: "My-App" }, null)).toBe("my-app");
    expect(resolveAppSlug(null, "507f1f77bcf86cd799439011")).toBe("507f1f77bcf86cd799439011");
  });
  test("returns null when nothing resolvable", () => {
    expect(resolveAppSlug(null, null)).toBeNull();
    expect(resolveAppSlug({}, "   ")).toBeNull();
  });
});

describe("subscriptionExpiry", () => {
  test("prefers endsAt over endDate", () => {
    const endsAt = new Date("2030-01-01");
    const endDate = new Date("2031-01-01");
    expect(subscriptionExpiry({ endsAt, endDate })).toEqual(endsAt);
  });
  test("falls back to endDate and handles missing", () => {
    expect(subscriptionExpiry({ endDate: new Date("2031-06-01") })).toEqual(new Date("2031-06-01"));
    expect(subscriptionExpiry({})).toBeNull();
    expect(subscriptionExpiry(null)).toBeNull();
  });
});

describe("isLiveEntitlement", () => {
  test("lifetime (null endsAt) is live when active", () => {
    expect(isLiveEntitlement({ status: "active", endsAt: null })).toBe(true);
  });
  test("expired and revoked are not live", () => {
    expect(isLiveEntitlement({ status: "active", endsAt: new Date(Date.now() - 1000) })).toBe(false);
    expect(isLiveEntitlement({ status: "expired", endsAt: null })).toBe(false);
    expect(isLiveEntitlement({ status: "revoked", endsAt: new Date(Date.now() + 100000) })).toBe(false);
    expect(isLiveEntitlement(null)).toBe(false);
  });
});
