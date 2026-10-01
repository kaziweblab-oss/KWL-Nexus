/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.GITHUB_WEBHOOK_SECRET = "test-secret";

jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
const mockUpsert = jest.fn().mockResolvedValue({ _id: "rel1" });
const mockReleaseUpdate = jest.fn().mockResolvedValue({});
jest.mock("@/models/Release", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: any[]) => (mockUpsert as any)(...args),
    updateOne: (...args: any[]) => (mockReleaseUpdate as any)(...args),
  },
}));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve({ _id: "app1" }) }) }) },
}));

import crypto from "node:crypto";
import { POST } from "./route";

function signed(payload: string) {
  return `sha256=${crypto.createHmac("sha256", "test-secret").update(payload).digest("hex")}`;
}

function releasePayload(tag = "v1.2.3") {
  return JSON.stringify({
    action: "published",
    release: {
      tag_name: tag,
      name: "Release",
      body: "notes",
      published_at: new Date().toISOString(),
      assets: [{ name: "app-setup.exe", browser_download_url: "https://cdn.example/app.exe", content_type: "application/octet-stream", size: 10 }],
      target_commitish: "main",
    },
    repository: { name: "kwl-video-downloader", owner: { login: "kaziweblab-oss" } },
  });
}

function req(payload: string, signature: string | null, event = "release") {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-github-event": event };
  if (signature !== null) headers["x-hub-signature-256"] = signature;
  return new Request("http://localhost/api/webhooks/github", { method: "POST", headers, body: payload });
}

test("rejects a missing signature with 401", async () => {
  const res: any = await POST(req(releasePayload(), null));
  expect(res.status).toBe(401);
});

test("rejects a malformed signature with 401 instead of throwing 500", async () => {
  const res: any = await POST(req(releasePayload(), "bad"));
  expect(res.status).toBe(401);
});

test("upserts a valid published release (idempotent by unique tag)", async () => {
  const payload = releasePayload();
  const res: any = await POST(req(payload, signed(payload)));
  expect(res.status).toBe(200);
  expect(mockUpsert).toHaveBeenCalled();
  expect(mockReleaseUpdate).toHaveBeenCalledWith({ _id: "rel1" }, { $set: { appId: "app1" } });
  const json = await res.json();
  expect(json).toEqual({ received: true, tag: "v1.2.3" });
});

test("ignores invalid tags", async () => {
  const payload = releasePayload("'; DROP TABLE releases; --");
  const res: any = await POST(req(payload, signed(payload)));
  const json = await res.json();
  expect(json).toEqual({ received: true, ignored: true });
});

test("ignores non-release events", async () => {
  const payload = JSON.stringify({ action: "opened" });
  const res: any = await POST(req(payload, signed(payload), "push"));
  const json = await res.json();
  expect(json).toEqual({ received: true, ignored: true });
});
