/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "u@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve({ _id: "user1" }) }) }) },
}));

const mockOrderFindOne = jest.fn();
const mockOrderDelete = jest.fn().mockResolvedValue({});
jest.mock("@/models/Order", () => ({
  __esModule: true,
  default: {
    find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(orderDocs) }) }) }) }),
    countDocuments: () => Promise.resolve(1),
    findOne: (...args: any[]) => (mockOrderFindOne as any)(...args),
    deleteOne: (...args: any[]) => (mockOrderDelete as any)(...args),
  },
}));
jest.mock("@/models/Plan", () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: () => Promise.resolve([{ _id: "p1", name: "Monthly" }]) }) }) },
}));
jest.mock("@/models/Payment", () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: () => Promise.resolve([{ _id: "pay1", status: "succeeded", paymentMethod: "bkash", transactionId: "TX1" }]) }) }) },
}));
jest.mock("@/models/App", () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: () => Promise.resolve([{ slug: "demo", name: "Demo App" }]) }) }) },
}));

const orderDocs = [
  { _id: "o1", appSlug: "demo", appId: "demo", planId: "p1", paymentId: "pay1", amount: 100, currency: "BDT", status: "fulfilled", createdAt: new Date(), updatedAt: new Date() },
];

import { NextRequest } from "next/server";
import { GET, DELETE } from "./route";

beforeEach(() => {
  mockOrderFindOne.mockReset();
  mockOrderDelete.mockClear();
});

function getReq(query = "") {
  return new NextRequest(`http://localhost/api/user/orders${query}`) as any;
}

test("lists enriched orders with pagination", async () => {
  const res: any = await GET(getReq("?page=1&limit=20"));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.total).toBe(1);
  expect(json.data.orders[0]).toMatchObject({ planName: "Monthly", appName: "Demo App", paymentMethod: "bkash", transactionId: "TX1" });
});

test("removes only unpaid orders", async () => {
  mockOrderFindOne.mockResolvedValue({ _id: "o2", status: "pending" });
  const res: any = await DELETE(getReq("?id=507f1f77bcf86cd799439011"));
  expect(res.status).toBe(200);
  expect(mockOrderDelete).toHaveBeenCalled();
});

test("refuses to remove fulfilled orders", async () => {
  mockOrderFindOne.mockResolvedValue({ _id: "o1", status: "fulfilled" });
  const res: any = await DELETE(getReq("?id=507f1f77bcf86cd799439011"));
  expect(res.status).toBe(403);
});
