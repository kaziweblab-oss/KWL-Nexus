/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@e.com" } }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/auth/admin", () => ({ isAdmin: jest.fn().mockResolvedValue(true) }));
jest.mock("@/models/AuditLog", () => ({
  __esModule: true,
  default: {
    find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([{ action: "payment.approved" }]) }) }) }) }),
    countDocuments: () => Promise.resolve(1),
  },
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

test("lists audit entries newest-first with pagination", async () => {
  const res: any = await GET(new NextRequest("http://localhost/api/admin/audit-log?action=payment.approved") as any);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.data.total).toBe(1);
  expect(json.data.logs[0].action).toBe("payment.approved");
});
