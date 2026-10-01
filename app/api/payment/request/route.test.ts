/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "test@example.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/User", () => ({ __esModule: true, default: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "user1", email: "test@example.com" }) }) } }));
jest.mock("@/models/Plan", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011", price: 12, currency: "USD", name: "Monthly" }) }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  },
}));
jest.mock("@/lib/notifications/admin", () => ({ notifyAdmins: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/PaymentMethod", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "pm1", slug: "bkash", enabled: true, status: "ACTIVE", health: { status: "HEALTHY" } }),
    }),
  },
}));
jest.mock("@/models/PaymentConfig", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  },
}));
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockPaymentFindOne = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
const mockOrderCreate = jest.fn().mockResolvedValue({ _id: "order-1" });
jest.mock("@/models/Payment", () => ({
  __esModule: true,
  default: Object.assign(jest.fn().mockImplementation((data: any) => ({ ...data, _id: "payment-1", save: mockSave })), {
    findOne: (...args: any[]) => (mockPaymentFindOne as any)(...args),
  }),
}));

import { POST } from "./route";
import { notifyAdmins } from "@/lib/notifications/admin";

jest.mock("@/models/Order", () => ({
  __esModule: true,
  default: { create: (...args: any[]) => (mockOrderCreate as any)(...args) },
}));

test("creates a pending payment request", async () => {
  const request = new Request("http://localhost/api/payment/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: "507f1f77bcf86cd799439011", appId: "focus-flow", paymentMethod: "bkash", transactionId: "TX123" }),
  });
  const response: any = await POST(request as any);
  expect(response.status).toBe(201);
  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.paymentId).toBeDefined();
  expect(json.orderId).toBe("order-1");
  expect(mockOrderCreate).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", appId: "focus-flow" }));
  expect(notifyAdmins).toHaveBeenCalledWith(
    "New payment request",
    expect.stringContaining("TX123"),
    "payment",
  );
});

test("rejects a duplicate transaction with 409", async () => {
  mockPaymentFindOne.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "payment-9", status: "pending" }) }),
  });
  const request = new Request("http://localhost/api/payment/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: "507f1f77bcf86cd799439011", appId: "focus-flow", paymentMethod: "bkash", transactionId: "TX123" }),
  });
  const response: any = await POST(request as any);
  expect(response.status).toBe(409);
  const json = await response.json();
  expect(json.paymentId).toBe("payment-9");
});

test("rejects an invalid payment request", async () => {
  const request = new Request("http://localhost/api/payment/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: -1 } as any),
  });
  const response: any = await POST(request as any);
  expect(response.status).toBe(400);
});
