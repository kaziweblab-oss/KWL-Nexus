/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.CRON_SECRET = "test-cron";

jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
const mockSubUpdate = jest.fn().mockResolvedValue({ modifiedCount: 1 });
jest.mock("@/models/Subscription", () => ({
  __esModule: true,
  default: {
    find: () => ({
      select: () => ({ limit: () => ({ lean: () => Promise.resolve([{ _id: "s1", userId: "u1", planId: "p1" }]) }) }),
      lean: () => Promise.resolve([]),
    }),
    updateMany: (...args: any[]) => (mockSubUpdate as any)(...args),
  },
}));
const mockEntUpdate = jest.fn().mockResolvedValue({});
jest.mock("@/models/Entitlement", () => ({
  __esModule: true,
  default: { updateMany: (...args: any[]) => (mockEntUpdate as any)(...args) },
}));
jest.mock("@/models/Plan", () => ({
  __esModule: true,
  default: { findById: () => Promise.resolve(null) },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findById: () => Promise.resolve(null) },
}));
jest.mock("@/models/Notification", () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: () => Promise.resolve(null) }), create: jest.fn().mockResolvedValue({}) },
}));

import { POST } from "./route";

test("expiry run is bounded and expires linked entitlements", async () => {
  const res: any = await POST(new Request("http://localhost/api/cron/subscriptions", {
    method: "POST",
    headers: { authorization: "Bearer test-cron" },
  }) as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.expired).toBe(1);
  expect(mockEntUpdate).toHaveBeenCalledWith(
    { subscriptionId: { $in: ["s1"] }, status: "active" },
    { $set: { status: "expired" } },
  );
});

test("rejects missing cron secret", async () => {
  const res: any = await POST(new Request("http://localhost/api/cron/subscriptions", { method: "POST" }) as any);
  expect(res.status).toBe(401);
});
