/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
jest.mock("next-auth", () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { email: "admin@example.com" } }) }));
jest.mock("@/lib/auth/admin", () => ({ isAdmin: jest.fn().mockResolvedValue(true) }));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/notifications/admin", () => ({ notifyAdmins: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/PaymentConfig", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  },
}));

const mockCreate = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();

jest.mock("@/models/PaymentMethod", () => ({
  __esModule: true,
  default: {
    create: (...args: any[]) => mockCreate(...args),
    findOne: (...args: any[]) => mockFindOne(...args),
    find: (...args: any[]) => mockFind(...args),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

import { POST as POSTCreate } from "./route";
import PaymentMethod from "@/models/PaymentMethod";

describe("POST /api/admin/payment-methods - new gateway", () => {
  beforeEach(() => jest.clearAllMocks());

  test("new gateway starts NOT_CHECKED and disabled=false is forced to false", async () => {
    mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    mockCreate.mockImplementation((doc: any) => Promise.resolve({ ...doc, _id: "test123", toObject: () => doc }));
    const req = new Request("http://localhost/api/admin/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Stripe", slug: "test-stripe", type: "gateway", provider: "stripe", gatewayConfig: { apiKey: "sk_test_123" }, enabled: true }),
    });
    const res: any = await POSTCreate(req as any);
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        status: "NOT_CHECKED",
        health: expect.objectContaining({ status: "UNKNOWN" }),
      })
    );
  });

  test("new gateway with enabled:true is forced to false", async () => {
    mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    mockCreate.mockImplementation((doc: any) => Promise.resolve({ ...doc, _id: "test123", toObject: () => doc }));
    const req = new Request("http://localhost/api/admin/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "test2", type: "manual", provider: "bkash", accountNumber: "01797347560", enabled: true }),
    });
    const res: any = await POSTCreate(req as any);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe("PUT /api/admin/payment-methods/[id] - enable guard", () => {
  beforeEach(() => jest.clearAllMocks());

  test("enable before health check rejected", async () => {
    const { PUT } = await import("./[id]/route");
    const mockFindById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "test123", name: "Test", slug: "test", status: "NOT_CHECKED", health: { status: "UNKNOWN" }, isDeleted: false }) });
    (PaymentMethod as any).findById = mockFindById;
    const req = new Request("http://localhost/api/admin/payment-methods/test123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    const res: any = await PUT(req as any, { params: { id: "test123" } } as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Health check required/);
  });

  test("enable while CHECKING rejected", async () => {
    const { PUT } = await import("./[id]/route");
    const mockFindById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "test123", status: "CHECKING", health: { status: "CHECKING" } }) });
    (PaymentMethod as any).findById = mockFindById;
    const req = new Request("http://localhost/api/admin/payment-methods/test123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    const res: any = await PUT(req as any, { params: { id: "test123" } } as any);
    expect(res.status).toBe(400);
  });

  test("enable after ACTIVE+HEALTHY succeeds", async () => {
    const { PUT } = await import("./[id]/route");
    const mockDoc = { _id: "test123", name: "Test", slug: "test", status: "ACTIVE", health: { status: "HEALTHY", checkVersion: 1 }, enabled: false, isDeleted: false };
    const mockFindById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(mockDoc) });
    const mockFindByIdAndUpdate = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ ...mockDoc, enabled: true }) });
    (PaymentMethod as any).findById = mockFindById;
    (PaymentMethod as any).findByIdAndUpdate = mockFindByIdAndUpdate;
    (PaymentMethod as any).findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const req = new Request("http://localhost/api/admin/payment-methods/test123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    const res: any = await PUT(req as any, { params: { id: "test123" } } as any);
    expect(res.status).toBe(200);
  });

  test("credential change resets status to NOT_CHECKED and disables", async () => {
    const { PUT } = await import("./[id]/route");
    const mockDoc = { _id: "test123", name: "Test", slug: "test", status: "ACTIVE", health: { status: "HEALTHY", checkVersion: 1 }, enabled: true, isDeleted: false, provider: "stripe", gatewayConfig: { apiKey: "old" } };
    const mockFindById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(mockDoc) });
    (PaymentMethod as any).findById = mockFindById;
    const mockFindByIdAndUpdate = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ ...mockDoc, status: "NOT_CHECKED", enabled: false }) });
    (PaymentMethod as any).findByIdAndUpdate = mockFindByIdAndUpdate;
    (PaymentMethod as any).findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const req = new Request("http://localhost/api/admin/payment-methods/test123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gatewayConfig: { apiKey: "new" } }),
    });
    const res: any = await PUT(req as any, { params: { id: "test123" } } as any);
    expect(res.status).toBe(200);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $set: expect.objectContaining({ status: "NOT_CHECKED", enabled: false }) }), expect.anything());
  });
});

describe("GET /api/payment/methods - public filtering", () => {
  test("only returns ACTIVE+HEALTHY+enabled", async () => {
    const mockFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ name: "Stripe", slug: "stripe", enabled: true, status: "ACTIVE", health: { status: "HEALTHY" } }]),
        }),
      }),
    });
    (PaymentMethod as any).find = mockFind;
    const { GET } = await import("../../payment/methods/route");
    const res: any = await GET();
    const json = await res.json();
    // Should not contain gatewayConfig
    expect(json.data[0]).not.toHaveProperty("gatewayConfig");
  });

  test("does not return NOT_CHECKED or FAILED", async () => {
    const mockFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    (PaymentMethod as any).find = mockFind;
    const { GET } = await import("../../payment/methods/route");
    await GET();
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: "ACTIVE", "health.status": "HEALTHY", enabled: true }));
  });
});
