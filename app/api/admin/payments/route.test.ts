/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.ADMIN_EMAILS = "admin@e.com";

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));

const mockPaymentSave = jest.fn().mockResolvedValue(undefined);
const mockPaymentFind = jest.fn();
jest.mock("@/models/Payment", () => ({
  __esModule: true,
  default: { findById: (...args: any[]) => (mockPaymentFind as any)(...args) },
}));
const mockSubUpdate = jest.fn().mockResolvedValue({});
jest.mock("@/models/Subscription", () => ({
  __esModule: true,
  default: { findByIdAndUpdate: (...args: any[]) => (mockSubUpdate as any)(...args) },
}));
const mockEntUpdate = jest.fn().mockResolvedValue({});
jest.mock("@/models/Entitlement", () => ({
  __esModule: true,
  default: { updateMany: (...args: any[]) => (mockEntUpdate as any)(...args) },
}));
const mockOrderSave = jest.fn().mockResolvedValue(undefined);
const mockOrderFind = jest.fn();
jest.mock("@/models/Order", () => ({
  __esModule: true,
  default: { findOne: (...args: any[]) => (mockOrderFind as any)(...args) },
}));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: {
    findOne: () => Promise.resolve({ _id: "admin1", email: "admin@e.com" }),
    findById: () => ({ select: () => ({ lean: () => Promise.resolve({ email: "u@e.com" }) }) }),
  },
}));
jest.mock("@/models/Notification", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

import { PATCH } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/admin/payments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  mockPaymentFind.mockReset();
  mockOrderFind.mockReset();
  mockSubUpdate.mockClear();
  mockEntUpdate.mockClear();
});

function succeededPayment() {
  return { _id: "pay1", status: "succeeded", subscriptionId: "sub1", userId: "u1", appId: "demo", planId: "p1", transactionId: "TX1", save: mockPaymentSave };
}

test("refund cascades to subscription, entitlements and order", async () => {
  mockPaymentFind.mockResolvedValue(succeededPayment());
  mockOrderFind.mockResolvedValue({ _id: "o1", status: "paid", save: mockOrderSave });
  const res: any = await PATCH(req({ paymentId: "507f1f77bcf86cd799439011", action: "refund", notes: "oops" }));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.status).toBe("refunded");
  expect(mockSubUpdate).toHaveBeenCalled();
  expect(mockEntUpdate).toHaveBeenCalled();
  expect(mockOrderSave).toHaveBeenCalled();
});

test("refund of a non-successful payment is rejected", async () => {
  mockPaymentFind.mockResolvedValue({ _id: "pay2", status: "pending", save: mockPaymentSave });
  const res: any = await PATCH(req({ paymentId: "507f1f77bcf86cd799439011", action: "refund" }));
  expect(res.status).toBe(409);
  expect(mockSubUpdate).not.toHaveBeenCalled();
});
