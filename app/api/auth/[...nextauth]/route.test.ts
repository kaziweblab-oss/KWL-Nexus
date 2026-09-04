jest.mock("next-auth", () => jest.fn(() => jest.fn()));
jest.mock("next-auth/providers/google", () => jest.fn(() => ({})));
jest.mock("next-auth/providers/github", () => jest.fn(() => ({})));

import { GET, POST } from "./route";

test("exports NextAuth GET and POST handlers", () => {
  expect(GET).toBeDefined();
  expect(POST).toBeDefined();
});
