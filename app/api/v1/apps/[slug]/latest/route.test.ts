/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: () => Promise.resolve(appDoc) }) },
}));
jest.mock("@/models/Release", () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: () => Promise.resolve(releaseDoc) }) },
}));

const appDoc = { _id: "app1", slug: "demo", name: "Demo App", description: "d", category: "Tools", pricing: "free", latestVersion: "v1.2.0", githubOwner: "o", githubRepo: "r", updatedAt: new Date() };
const releaseDoc = {
  tagName: "v1.2.0",
  name: "Demo 1.2.0",
  body: "notes",
  publishedAt: new Date().toISOString(),
  prerelease: false,
  githubOwner: "o",
  githubRepo: "r",
  assets: [
    { name: "demo-x64.exe", url: "https://cdn.example/x64.exe", size: 10, platform: "Windows", arch: "x64", checksumSha256: "abc" },
    { name: "demo-arm64.exe", url: "https://cdn.example/arm64.exe", size: 11, platform: "Windows", arch: "arm64" },
  ],
};

import { NextRequest } from "next/server";
import { GET } from "./route";

function getReq(query: string) {
  return new NextRequest(`http://localhost/api/v1/apps/demo/latest${query}`) as any;
}

test("latest returns manifest with matched asset", async () => {
  const res: any = await GET(getReq("?platform=windows&arch=arm64&current=1.0.0"), { params: { slug: "demo" } } as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json).toEqual({
    success: true,
    data: {
      app: expect.objectContaining({ slug: "demo" }),
      version: "v1.2.0",
      release: expect.objectContaining({ tag: "v1.2.0", url: "https://github.com/o/r/releases/tag/v1.2.0" }),
      asset: expect.objectContaining({ file: "demo-arm64.exe", arch: "arm64" }),
      updateAvailable: true,
    },
  });
});

test("no update when already current", async () => {
  const res: any = await GET(getReq("?platform=windows&current=v1.2.0"), { params: { slug: "demo" } } as any);
  const json = await res.json();
  expect(json.data.updateAvailable).toBe(false);
});

test("invalid platform is 400", async () => {
  const res: any = await GET(getReq("?platform=macos"), { params: { slug: "demo" } } as any);
  expect(res.status).toBe(400);
});
