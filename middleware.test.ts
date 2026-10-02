/** @jest-environment node */

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { middleware } from "./middleware";

const mockGetToken = getToken as jest.Mock;

function req(path: string) {
  return new NextRequest(`http://localhost${path}`) as any;
}

beforeEach(() => {
  mockGetToken.mockReset();
  delete process.env.ADMIN_EMAILS;
});

test("dashboard without session redirects to signin", async () => {
  mockGetToken.mockResolvedValue(null);
  const res: any = await middleware(req("/dashboard"));
  expect(res.status).toBe(307);
  expect(String(res.headers.get("location"))).toContain("/api/auth/signin");
});

test("admin without admin rights redirects with error flag", async () => {
  process.env.ADMIN_EMAILS = "boss@e.com";
  mockGetToken.mockResolvedValue({ email: "user@e.com" });
  const res: any = await middleware(req("/admin/payments"));
  expect(res.status).toBe(307);
  expect(String(res.headers.get("location"))).toContain("admin_access_required");
});

test("admin with env email passes through", async () => {
  process.env.ADMIN_EMAILS = "boss@e.com";
  mockGetToken.mockResolvedValue({ email: "boss@e.com" });
  const res: any = await middleware(req("/admin/payments"));
  expect(res.headers.get("location")).toBeNull();
});

test("logged-in user is kept away from /login", async () => {
  mockGetToken.mockResolvedValue({ email: "user@e.com" });
  const res: any = await middleware(req("/login"));
  expect(res.status).toBe(307);
  expect(String(res.headers.get("location"))).toContain("/dashboard");
});
