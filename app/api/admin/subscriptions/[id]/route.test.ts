/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.ADMIN_EMAILS = "admin@e.com";

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
const mockSubSave = jest.fn().mockResolvedValue(undefined);
const mockSubFind = jest.fn();
jest.mock("@/models/Subscription", () => ({
  __esModule: true,
  default: { findById: (...args: any[]) => (mockSubFind as any)(...args) },
}));
const mockEntUpdate = jest.fn().mockResolvedValue({});
jest.mock("@/models/Entitlement", () => ({
  __esModule: true,
  default: { updateMany: (...args: any[]) => (mockEntUpdate as any)(...args) },
}));

import { PATCH } from "./route";

beforeEach(() => {
  mockSubFind.mockReset();
  mockEntUpdate.mockClear();
});

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/subscriptions/s1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

test("cancel revokes linked entitlements", async () => {
  mockSubFind.mockResolvedValue({ _id: "s1", status: "active", save: mockSubSave });
  const res: any = await PATCH(patchReq({ action: "cancel" }), { params: { id: "507f1f77bcf86cd799439011" } } as any);
  expect(res.status).toBe(200);
  expect(mockEntUpdate).toHaveBeenCalledWith({ subscriptionId: "s1", status: "active" }, { $set: { status: "revoked" } });
});

test("invalid id is 400 without touching the database", async () => {
  const res: any = await PATCH(patchReq({ action: "cancel" }), { params: { id: "nope" } } as any);
  expect(res.status).toBe(400);
  expect(mockSubFind).not.toHaveBeenCalled();
});
