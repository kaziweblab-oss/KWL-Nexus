/** @jest-environment node */
import { cappedLimit, isValidId } from "./validate";

test("cappedLimit clamps ?limit= into range", () => {
  const req = (limit?: string) => new Request(`http://localhost/x${limit === undefined ? "" : `?limit=${limit}`}`);
  expect(cappedLimit(req())).toBe(200);
  expect(cappedLimit(req("10"))).toBe(10);
  expect(cappedLimit(req("99999"))).toBe(500);
  expect(cappedLimit(req("abc"))).toBe(200);
});

test("isValidId accepts only ObjectIds", () => {
  expect(isValidId("507f1f77bcf86cd799439011")).toBe(true);
  expect(isValidId("nope")).toBe(false);
  expect(isValidId(null)).toBe(false);
});
