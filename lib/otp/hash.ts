import crypto from "node:crypto";

// OTP codes are stored hashed (SHA-256, like API keys) so a database read never
// exposes a live code. Comparison is timing-safe. Old plaintext rows simply stop
// matching and expire via TTL — no migration needed (codes live 5 minutes).
export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export function verifyOtpCode(code: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  const a = Buffer.from(hashOtpCode(code));
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
