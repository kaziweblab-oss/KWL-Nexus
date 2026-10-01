/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: {
    find: () => ({ select: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([appDoc]) }) }) }) }) }),
    countDocuments: () => Promise.resolve(1),
    findOne: () => ({ select: () => ({ lean: () => Promise.resolve(appDoc) }) }),
  },
}));

const appDoc = { slug: "demo", name: "Demo App", description: "d", category: "Tools", pricing: "free", latestVersion: "1.2.0", updatedAt: new Date() };

import { NextRequest } from "next/server";
import { GET as listApps } from "@/app/api/v1/apps/route";
import { GET as getApp } from "@/app/api/v1/apps/[slug]/route";

test("v1 catalog returns public fields only", async () => {
  const res: any = await listApps(new NextRequest("http://localhost/api/v1/apps") as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.success).toBe(true);
  expect(json.data.apps[0]).toMatchObject({ slug: "demo", name: "Demo App" });
  expect(json.data.apps[0]).not.toHaveProperty("githubToken");
});

test("v1 app metadata returns the public app", async () => {
  const res: any = await getApp(new NextRequest("http://localhost/api/v1/apps/demo") as any, { params: { slug: "demo" } } as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json).toEqual({ success: true, data: { app: expect.objectContaining({ slug: "demo" }) } });
});
