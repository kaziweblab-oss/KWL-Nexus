/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "u@e.com", name: "U" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findOneAndUpdate: () => Promise.resolve({ _id: "user1" }) },
}));
const mockEntFind = jest.fn();
jest.mock("@/models/Entitlement", () => ({
  __esModule: true,
  default: { findOne: (...args: any[]) => ({ select: () => ({ lean: () => (mockEntFind as any)(...args) }) }) },
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

beforeEach(() => mockEntFind.mockReset());

test("grants access with a live entitlement", async () => {
  mockEntFind.mockResolvedValue({ type: "lifetime", endsAt: null });
  const res: any = await GET(new NextRequest("http://localhost/api/v1/apps/demo/entitlement") as any, { params: { slug: "demo" } } as any);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ success: true, data: { hasAccess: true, app: "demo", type: "lifetime", endsAt: null, lifetime: true } });
});

test("denies without entitlement", async () => {
  mockEntFind.mockResolvedValue(null);
  const res: any = await GET(new NextRequest("http://localhost/api/v1/apps/demo/entitlement") as any, { params: { slug: "demo" } } as any);
  expect(await res.json()).toEqual({ success: true, data: { hasAccess: false, app: "demo" } });
});
