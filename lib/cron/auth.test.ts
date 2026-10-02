/** @jest-environment node */
import { isCronAuthorized } from "./auth";

const OLD = process.env.CRON_SECRET;
process.env.CRON_SECRET = "s3cr3t";

test("accepts bearer header", () => {
  expect(isCronAuthorized(new Request("http://localhost/api/cron/x", { headers: { authorization: "Bearer s3cr3t" } }))).toBe(true);
});

test("accepts scheduler query secret", () => {
  expect(isCronAuthorized(new Request("http://localhost/api/cron/x?secret=s3cr3t"))).toBe(true);
});

test("rejects wrong or missing secrets", () => {
  expect(isCronAuthorized(new Request("http://localhost/api/cron/x"))).toBe(false);
  expect(isCronAuthorized(new Request("http://localhost/api/cron/x?secret=nope"))).toBe(false);
  expect(isCronAuthorized(new Request("http://localhost/api/cron/x", { headers: { authorization: "Bearer nope" } }))).toBe(false);
});

afterAll(() => {
  if (OLD === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = OLD;
});
