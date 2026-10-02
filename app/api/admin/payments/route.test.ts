/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.ADMIN_EMAILS = "admin@e.com";

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));

const mockPaymentSave = jest.fn().mockResolvedValue(undefined);
const mockPaymentFind = jest.fn();
jest.mock("@/models/Payment", () => ({
  __esModule: true,
  default: {
    findById: (...args: any[]) => (mockPaymentFind as any)(...args),
    find: () => ({ populate: () => ({ populate: () => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve([{ _id: "pay1", subscriptionId: "sub1" }]) }) }) }) }) }),
  },
}));
const mockSubUpdate = jest.fn().mockResolvedValue({});
jest.mock("@/models/Subscription", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: (...args: any[]) => (mockSubUpdate as any)(...args),
    create: jest.fn().mockResolvedValue({ _id: "sub1", id: "sub1", endsAt: new Date(), endDate: new Date() }),
  },
}));
const mockEntUpdate = jest.fn().mockResolvedValue({});
const mockEntCreate = jest.fn().mockResolvedValue({ _id: "ent1" });
jest.mock("@/models/Entitlement", () => ({
  __esModule: true,
  default: {
    updateMany: (...args: any[]) => (mockEntUpdate as any)(...args),
    create: (...args: any[]) => (mockEntCreate as any)(...args),
    find: () => ({ select: () => ({ lean: () => Promise.resolve([{ orderId: "o1", status: "active" }]) }) }),
  },
}));
const mockOrderSave = jest.fn().mockResolvedValue(undefined);
const mockOrderFind = jest.fn();
const mockOrderCreate = jest.fn().mockResolvedValue({ _id: "o1", save: jest.fn() });
jest.mock("@/models/Order", () => ({
  __esModule: true,
  default: {
    findOne: (...args: any[]) => (mockOrderFind as any)(...args),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    create: (...args: any[]) => (mockOrderCreate as any)(...args),
    find: () => ({ select: () => ({ lean: () => Promise.resolve([{ _id: "o1", paymentId: "pay1", status: "fulfilled" }]) }) }),
  },
}));
jest.mock("@/models/Plan", () => ({
  __esModule: true,
  default: { findById: () => Promise.resolve({ _id: "p1", name: "Monthly", interval: "month", appSlug: "demo" }) },
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
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) },
}));

import { PATCH, GET } from "./route";

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

test("list carries order and entitlement lifecycle status", async () => {
  const res: any = await GET(new Request("http://localhost/api/admin/payments") as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data[0]).toMatchObject({ orderStatus: "fulfilled", entitlementStatus: "active" });
});

test("verify approves payment, activates subscription and grants entitlement", async () => {
  mockPaymentFind.mockResolvedValue({
    _id: "pay3", status: "pending", userId: "u1", planId: "p1", appId: "demo",
    amount: 100, currency: "BDT", transactionId: "TX9", save: mockPaymentSave,
  });
  mockOrderFind.mockResolvedValue(null);
  const res: any = await PATCH(req({ paymentId: "507f1f77bcf86cd799439011", action: "verify" }));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.status).toBe("succeeded");
  expect(json.data.subscriptionId).toBeDefined();
  expect(mockEntCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", appSlug: "demo", status: "active" }));
  expect(mockOrderCreate).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" }));
});
