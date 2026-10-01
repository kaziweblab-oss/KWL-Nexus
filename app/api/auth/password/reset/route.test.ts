/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));

const mockOtpDelete = jest.fn().mockResolvedValue({});
const mockOtpUpdate = jest.fn().mockResolvedValue({});
const mockOtpFind = jest.fn();
jest.mock("@/models/Otp", () => ({
  __esModule: true,
  default: {
    findOne: (...args: any[]) => (mockOtpFind as any)(...args),
    deleteOne: (...args: any[]) => (mockOtpDelete as any)(...args),
    updateOne: (...args: any[]) => (mockOtpUpdate as any)(...args),
  },
}));

const mockUserSave = jest.fn().mockResolvedValue(undefined);
const mockUserFind = jest.fn();
jest.mock("@/models/User", () => ({
  __esModule: true,
  default: { findOne: (...args: any[]) => (mockUserFind as any)(...args) },
}));

import bcrypt from "bcryptjs";
import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/password/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockOtpFind.mockReset();
  mockUserFind.mockReset();
  mockOtpDelete.mockClear();
});

test("resets password with a valid OTP and consumes it", async () => {
  const user: any = { passwordHash: "old", save: mockUserSave };
  mockOtpFind.mockReturnValue({ sort: () => Promise.resolve({ _id: "otp1", code: "123456", expiresAt: new Date(Date.now() + 60000), attempts: 0 }) });
  mockUserFind.mockResolvedValue(user);
  const res: any = await POST(req({ email: "a@b.com", code: "123456", newPassword: "newpass1" }) as any);
  expect(res.status).toBe(200);
  expect(await bcrypt.compare("newpass1", user.passwordHash)).toBe(true);
  expect(mockOtpDelete).toHaveBeenCalled();
});

test("counts a wrong code instead of resetting", async () => {
  mockOtpFind.mockReturnValue({ sort: () => Promise.resolve({ _id: "otp1", code: "123456", expiresAt: new Date(Date.now() + 60000), attempts: 0 }) });
  const res: any = await POST(req({ email: "a@b.com", code: "000000", newPassword: "newpass1" }) as any);
  expect(res.status).toBe(400);
  expect(mockOtpUpdate).toHaveBeenCalled();
  expect(mockUserFind).not.toHaveBeenCalled();
});

test("rejects a weak new password", async () => {
  const res: any = await POST(req({ email: "a@b.com", code: "123456", newPassword: "weakpw" }) as any);
  expect(res.status).toBe(400);
});
