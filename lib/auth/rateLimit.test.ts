/** @jest-environment node */
import { checkRateLimit, clientIp } from "./rateLimit";

test("allows up to the limit then blocks inside the window", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  expect(checkRateLimit(key, 2, 60000)).toBe(true);
  expect(checkRateLimit(key, 2, 60000)).toBe(true);
  expect(checkRateLimit(key, 2, 60000)).toBe(false);
});

test("extracts client IP from proxy headers", () => {
  const req = new Request("http://localhost/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
  expect(clientIp(req)).toBe("1.2.3.4");
  expect(clientIp(new Request("http://localhost/"))).toBe("unknown");
});
