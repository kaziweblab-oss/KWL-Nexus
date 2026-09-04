/** @jest-environment node */

jest.mock("@/lib/api/auth", () => ({ authenticateApiRequest: jest.fn().mockResolvedValue({ userId: "user-1" }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/Feedback", () => ({ __esModule: true, default: { create: jest.fn().mockResolvedValue({ id: "feedback-1", status: "pending" }), find: jest.fn() } }));

import { POST } from "./route";

test("accepts a valid structured feedback payload", async () => {
  const response = await POST(new Request("http://localhost/api/feedback", { method: "POST", body: JSON.stringify({ appId: "app-1", type: "bug_report", title: "Crash on launch", description: "The app closes after opening." }) }));
  expect(response.status).toBe(201);
  expect((await response.json()).data.status).toBe("pending");
});

test("rejects incomplete feedback", async () => {
  const response = await POST(new Request("http://localhost/api/feedback", { method: "POST", body: JSON.stringify({ appId: "app-1" }) }));
  expect(response.status).toBe(400);
});
