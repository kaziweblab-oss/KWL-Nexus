// In-memory OTP fallback when MongoDB is unavailable (e.g., Atlas IP not whitelisted).
// This allows dev testing with previewCode even if DB is down.
// Not for production — use persistent store.

type Entry = { code: string; expiresAt: Date; channel: "email" | "phone" };

const globalStore = globalThis as unknown as { __otpMemory?: Map<string, Entry> };

function getStore() {
  if (!globalStore.__otpMemory) globalStore.__otpMemory = new Map<string, Entry>();
  return globalStore.__otpMemory;
}

function keyFor(channel: "email" | "phone", target: string) {
  return `${channel}:${target.toLowerCase().trim()}`;
}

export function setMemoryOtp(channel: "email" | "phone", target: string, code: string, expiresAt: Date) {
  getStore().set(keyFor(channel, target), { code, expiresAt, channel });
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
