// In-memory OTP fallback when MongoDB is unavailable (e.g., Atlas IP not whitelisted).
// This allows dev testing with previewCode even if DB is down.
// Not for production — use persistent store. Codes are stored hashed (see lib/otp/hash).

import { hashOtpCode, verifyOtpCode } from "./hash";

type Entry = { codeHash: string; expiresAt: Date; channel: "email" | "phone"; attempts: number };

const globalStore = globalThis as unknown as { __otpMemory?: Map<string, Entry> };

function getStore() {
  if (!globalStore.__otpMemory) globalStore.__otpMemory = new Map<string, Entry>();
  return globalStore.__otpMemory;
}

function keyFor(channel: "email" | "phone", target: string) {
  return `${channel}:${target.toLowerCase().trim()}`;
}

export function setMemoryOtp(channel: "email" | "phone", target: string, code: string, expiresAt: Date) {
  getStore().set(keyFor(channel, target), { codeHash: hashOtpCode(code), expiresAt, channel, attempts: 0 });
}

// Timing-safe single-use check: true once, then the entry is consumed.
export function matchMemoryOtp(channel: "email" | "phone", target: string, code: string): boolean {
  const entry = getMemoryOtp(channel, target);
  if (!entry || !verifyOtpCode(code, entry.codeHash)) return false;
  getStore().delete(keyFor(channel, target));
  return true;
}

// Increment failed-attempt counter; entry is removed once the limit is reached.
export function bumpMemoryOtpAttempts(channel: "email" | "phone", target: string, limit = 5): number {
  const store = getStore();
  const key = keyFor(channel, target);
  const entry = store.get(key);
  if (!entry) return limit;
  entry.attempts += 1;
  if (entry.attempts >= limit) store.delete(key);
  return entry.attempts;
}

export function getMemoryOtp(channel: "email" | "phone", target: string) {
  const entry = getStore().get(keyFor(channel, target));
  if (!entry) return null;
  if (entry.expiresAt < new Date()) {
    getStore().delete(keyFor(channel, target));
    return null;
  }
  return entry;
}

export function deleteMemoryOtp(channel: "email" | "phone", target: string) {
  getStore().delete(keyFor(channel, target));
}

export function clearMemoryOtpForTarget(target: string) {
  const lower = target.toLowerCase().trim();
  for (const key of Array.from(getStore().keys())) {
    if (key.endsWith(`:${lower}`)) getStore().delete(key);
  }
}
