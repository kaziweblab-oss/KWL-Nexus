/** @jest-environment node */

jest.mock("@/lib/api/auth", () => ({ authenticateApiRequest: jest.fn().mockResolvedValue({ userId: "user-1" }) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({ __esModule: true, default: { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ name: "Test App" }]) }) }) } }));

import { GET } from "./route";

test("lists published apps with metadata", async () => {
  const response = await GET(new Request("http://localhost/api/apps", { headers: { "x-api-key": "test" } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(expect.objectContaining({ data: [{ name: "Test App" }] }));
});
