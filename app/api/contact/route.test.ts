/** @jest-environment node */

const contactFind = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/models/ContactConfig", () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => contactFind(...args),
  },
}));

jest.mock("@/lib/db/connect", () => ({
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/auth/admin", () => ({
  isAdminEmail: jest.fn().mockReturnValue(true),
}));

import { GET as getPublicContacts } from "./route";
import { GET as getAdminContacts } from "../admin/contact/route";

describe("contact routes", () => {
  beforeEach(() => {
    contactFind.mockReset();
  });

  test("public route only returns active contacts", async () => {
    contactFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { type: "email", value: "hello@kwl-nexus.com", label: "Support", isActive: true, order: 1 },
          { type: "phone", value: "+123456789", label: "Phone", isActive: false, order: 2 },
        ]),
      }),
    });

    const response = await getPublicContacts();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        { type: "email", value: "hello@kwl-nexus.com", label: "Support", isActive: true, order: 1 },
      ],
    });
  });

  test("admin route requires an authenticated admin", async () => {
    const { getServerSession } = jest.requireMock("next-auth") as { getServerSession: jest.Mock };
    getServerSession.mockResolvedValue({ user: { email: "admin@example.com" } });

    contactFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });

    const response = await getAdminContacts();
    expect(response.status).toBe(200);
  });
});
