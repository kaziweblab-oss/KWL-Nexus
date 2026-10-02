import { hashOtpCode, verifyOtpCode } from "./hash";

test("hashes deterministically and verifies timing-safely", () => {
  const h = hashOtpCode("123456");
  expect(h).toHaveLength(64);
  expect(verifyOtpCode("123456", h)).toBe(true);
  expect(verifyOtpCode(" 123456 ", h)).toBe(true);
});

test("rejects wrong codes and malformed stored values", () => {
  const h = hashOtpCode("123456");
  expect(verifyOtpCode("000000", h)).toBe(false);
  expect(verifyOtpCode("123456", "plaintext-short")).toBe(false);
  expect(verifyOtpCode("123456", null)).toBe(false);
  expect(verifyOtpCode("123456", undefined)).toBe(false);
});
