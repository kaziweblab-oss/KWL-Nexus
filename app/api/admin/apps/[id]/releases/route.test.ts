/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.ADMIN_EMAILS = "admin@e.com";

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: {
    findById: () => Promise.resolve({ _id: "app1", githubOwner: "o", githubRepo: "r" }),
    findOne: () => ({ lean: () => Promise.resolve({ _id: "app1", githubOwner: "o", githubRepo: "r" }) }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));
const mockReleaseFindOne = jest.fn();
jest.mock("@/models/Release", () => ({
  __esModule: true,
  default: {
    find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([{ tagName: "v1.0.0" }]) }) }) }) }),
    countDocuments: () => Promise.resolve(1),
    findOne: (...args: any[]) => ({ lean: () => (mockReleaseFindOne as any)(...args) }),
  },
}));
const mockVersionUpdate = jest.fn().mockResolvedValue({});
const mockVersionCreate = jest.fn().mockResolvedValue({});
jest.mock("@/models/AppVersion", () => ({
  __esModule: true,
  default: {
    updateMany: (...args: any[]) => (mockVersionUpdate as any)(...args),
    create: (...args: any[]) => (mockVersionCreate as any)(...args),
  },
}));
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";

beforeEach(() => {
  mockReleaseFindOne.mockReset();
  mockVersionUpdate.mockClear();
  mockVersionCreate.mockClear();
});

test("lists synced releases with pagination", async () => {
  const res: any = await GET(new NextRequest("http://localhost/api/admin/apps/app1/releases?page=1") as any, { params: { id: "app1" } } as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.total).toBe(1);
  expect(json.data.releases[0].tagName).toBe("v1.0.0");
});

test("promote moves the latest pointer and rotates snapshots", async () => {
  mockReleaseFindOne.mockResolvedValue({ tagName: "v2.0.0" });
  const res: any = await POST(
    new Request("http://localhost/api/admin/apps/app1/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagName: "v2.0.0" }) }) as any,
    { params: { id: "app1" } } as any,
  );
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.latestVersion).toBe("v2.0.0");
  expect(mockVersionUpdate).toHaveBeenCalled();
  expect(mockVersionCreate).toHaveBeenCalledWith(expect.objectContaining({ version: "v2.0.0", isCurrent: true }));
});

test("promote of an unknown tag is 404", async () => {
  mockReleaseFindOne.mockResolvedValue(null);
  const res: any = await POST(
    new Request("http://localhost/api/admin/apps/app1/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagName: "v9.9.9" }) }) as any,
    { params: { id: "app1" } } as any,
  );
  expect(res.status).toBe(404);
});
