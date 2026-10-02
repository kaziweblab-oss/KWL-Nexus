/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "u@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: {
    findById: () => ({ lean: () => Promise.resolve(appDoc) }),
    findOne: () => ({ lean: () => Promise.resolve(appDoc) }),
  },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve({ _id: "user1" }) }) }) },
}));
const mockAccess = jest.fn();
jest.mock("@/lib/entitlements/grants", () => ({ checkAppAccess: (...args: any[]) => (mockAccess as any)(...args) }));

const appDoc = { _id: "app1", slug: "demo", name: "Demo", pricing: "paid", latestVersion: "1.0.0", downloadUrl: { windows: "https://cdn.example/a.exe" } };

import { NextRequest } from "next/server";
import { GET } from "./route";

beforeEach(() => mockAccess.mockReset());

test("paid app without entitlement is 403", async () => {
  mockAccess.mockResolvedValue({ allowed: false, via: null });
  const res: any = await GET(new NextRequest("http://localhost/api/apps/demo/download?platform=windows") as any, { params: { id: "demo" } } as any);
  expect(res.status).toBe(403);
});

test("paid app with entitlement returns the stored build", async () => {
  mockAccess.mockResolvedValue({ allowed: true, via: "entitlement" });
  const res: any = await GET(new NextRequest("http://localhost/api/apps/demo/download?platform=windows") as any, { params: { id: "demo" } } as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.downloadUrl).toBe("https://cdn.example/a.exe");
});
