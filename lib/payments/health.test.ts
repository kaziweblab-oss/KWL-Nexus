/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { checkPaymentMethodHealth } from "./health";

// Mock decryptToken to be identity for tests
jest.mock("@/lib/github/client", () => ({
  decryptToken: jest.fn((v: string) => v),
}));

describe("checkPaymentMethodHealth", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn() as any;
  });

  test("manual: valid accountNumber is healthy", async () => {
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "bKash",
      slug: "bkash",
      type: "manual",
      provider: "bkash",
      accountNumber: "01797347560",
      gatewayConfig: {},
    });
    expect(res.healthy).toBe(true);
    expect(res.errorCode).toBeNull();
  });

  test("manual: missing accountNumber is invalid", async () => {
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "bKash",
      slug: "bkash",
      type: "manual",
      provider: "bkash",
      accountNumber: "",
      gatewayConfig: {},
    });
    expect(res.healthy).toBe(false);
    expect(res.errorCode).toBe("INVALID_CREDENTIALS");
  });

  test("stripe: missing apiKey is invalid", async () => {
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "Stripe",
      slug: "stripe",
      type: "gateway",
      provider: "stripe",
      gatewayConfig: {},
    });
    expect(res.healthy).toBe(false);
    expect(res.errorCode).toBe("INVALID_CREDENTIALS");
  });

  test("stripe: valid apiKey calls Stripe and succeeds", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, text: async () => "{}" });
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "Stripe",
      slug: "stripe",
      type: "gateway",
      provider: "stripe",
      gatewayConfig: { apiKey: "sk_test_123" },
    });
    expect(res.healthy).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("https://api.stripe.com/v1/balance", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer sk_test_123" }) }));
  });

  test("stripe: invalid apiKey returns 401", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, text: async () => JSON.stringify({ error: { message: "Invalid API Key" } }) });
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "Stripe",
      slug: "stripe",
      type: "gateway",
      provider: "stripe",
      gatewayConfig: { apiKey: "sk_test_invalid" },
    });
    expect(res.healthy).toBe(false);
    expect(res.errorCode).toBe("INVALID_CREDENTIALS");
  });

  test("stripe: timeout", async () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 5000ms")), 10)));
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "Stripe",
      slug: "stripe",
      type: "gateway",
      provider: "stripe",
      gatewayConfig: { apiKey: "sk_test_123" },
    }, { timeoutMs: 10 });
    expect(res.healthy).toBe(false);
    expect(res.errorCode).toBe("TIMEOUT");
  }, 10000);

  test("sslcommerz: missing storeId fails", async () => {
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "SSLCommerz",
      slug: "sslcommerz",
      type: "gateway",
      provider: "sslcommerz",
      gatewayConfig: { storeId: "test" },
    });
    expect(res.healthy).toBe(false);
  });

  test("custom: healthCheckUrl is fetched", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "Custom",
      slug: "custom",
      type: "gateway",
      provider: "custom",
      gatewayConfig: { healthCheckUrl: "https://example.com/health" },
    });
    expect(res.healthy).toBe(true);
  });

  test("custom: no healthCheckUrl and no keys fails", async () => {
    const res = await checkPaymentMethodHealth({
      _id: "1",
      name: "Custom",
      slug: "custom",
      type: "gateway",
      provider: "custom",
      gatewayConfig: {},
    });
    expect(res.healthy).toBe(false);
  });
});
