jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("next-auth/providers/google", () => jest.fn(() => ({})));
jest.mock("next-auth/providers/github", () => jest.fn(() => ({})));
jest.mock("@/models/ApiKey", () => ({ __esModule: true, default: {} }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn() }));

import { createApiKey, hashApiKey } from "./auth";

test("creates a prefixed API key and a stable one-way hash", () => {
  const key = createApiKey();
  expect(key).toMatch(/^kn_live_[a-f0-9]{48}$/);
  expect(hashApiKey(key)).toBe(hashApiKey(key));
  expect(hashApiKey(key)).not.toBe(key);
});
