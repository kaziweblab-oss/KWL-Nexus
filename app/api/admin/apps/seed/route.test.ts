/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.ADMIN_EMAILS = "admin@e.com";

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: () => Promise.resolve({ _id: "app1", isPublished: false, save: jest.fn() }),
    findById: () => ({ select: () => ({ lean: () => Promise.resolve({}) }) }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock("@/models/Plan", () => ({
  __esModule: true,
  default: {
    findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
    create: jest.fn().mockResolvedValue({}),
  },
}));

import { GET, POST } from "./route";

function postReq(body: unknown) {
  return new Request("http://localhost/api/admin/apps/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

test("seed preview returns the product definition", async () => {
  const res: any = await GET();
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.app.slug).toBe("kwl-video-downloader");
  expect(json.data.plans).toHaveLength(3);
});

test("seed creates missing app, plans and tutorial", async () => {
  const res: any = await POST(postReq({ key: "kwl-video-downloader" }));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.app.slug).toBe("kwl-video-downloader");
  expect(json.data.plans.every((p: any) => p.status === "created")).toBe(true);
  expect(json.data.tutorial).toBe("created");
});

test("unknown seed key is rejected", async () => {
  const res: any = await POST(postReq({ key: "something-else" }));
  expect(res.status).toBe(400);
});
