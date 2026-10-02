/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve({ _id: "app1", slug: "demo", githubOwner: "o", githubRepo: "r" }) }) }) },
}));
jest.mock("@/models/Release", () => ({
  __esModule: true,
  default: {
    find: () => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(releases) }) }) }) }),
  },
}));

const releases = [
  { tagName: "v2.0.0", name: "V2", body: "new", publishedAt: new Date().toISOString(), assets: [{ platform: "Windows" }] },
  { tagName: "v1.0.0", name: "V1", body: "old", publishedAt: new Date().toISOString(), assets: [{ platform: "Android" }] },
];

import { NextRequest } from "next/server";
import { GET } from "./route";

test("changelog returns stable releases with notes and platforms", async () => {
  const res: any = await GET(new NextRequest("http://localhost/api/v1/apps/demo/releases") as any, { params: { slug: "demo" } } as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.success).toBe(true);
  expect(json.data.releases).toHaveLength(2);
  expect(json.data.releases[0]).toMatchObject({ tag: "v2.0.0", platforms: ["Windows"] });
  expect(json.data.releases[0]).not.toHaveProperty("url");
});
