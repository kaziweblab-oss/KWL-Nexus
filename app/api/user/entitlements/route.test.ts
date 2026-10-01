/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "u@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve({ _id: "user1" }) }) }) },
}));
jest.mock("@/models/Entitlement", () => ({
  __esModule: true,
  default: {
    find: () => ({ sort: () => ({ lean: () => Promise.resolve(entDocs) }) }),
  },
}));
jest.mock("@/models/Plan", () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: () => Promise.resolve([{ _id: "p1", name: "Lifetime" }]) }) }) },
}));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: () => Promise.resolve([{ slug: "demo", name: "Demo App" }]) }) }) },
}));

const entDocs = [
  { _id: "e1", appSlug: "demo", planId: "p1", type: "lifetime", status: "active", endsAt: null },
];

import { GET } from "./route";

test("lists live entitlements with download paths", async () => {
  const res: any = await GET();
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data).toHaveLength(1);
  expect(json.data[0]).toMatchObject({ appSlug: "demo", appName: "Demo App", planName: "Lifetime", lifetime: true, downloadPath: "/download/demo" });
});
