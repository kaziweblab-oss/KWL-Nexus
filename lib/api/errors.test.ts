import { API_ERRORS, createErrorResponse, isApiError } from "@/lib/api/errors";

describe("API Error Handling", () => {
  it("should have all required error messages", () => {
    expect(API_ERRORS.USER_NOT_LOGGED_IN).toBeDefined();
    expect(API_ERRORS.SUBSCRIPTION_EXPIRED).toBeDefined();
    expect(API_ERRORS.PAYMENT_NOT_VERIFIED).toBeDefined();
    expect(API_ERRORS.DOWNLOAD_URL_NOT_FOUND).toBeDefined();
    expect(API_ERRORS.PAYMENT_GATEWAY_NOT_SET).toBeDefined();
    expect(API_ERRORS.DATABASE_CONNECTION_FAILED).toBeDefined();
    expect(API_ERRORS.API_KEY_INVALID).toBeDefined();
    expect(API_ERRORS.RATE_LIMIT_EXCEEDED).toBeDefined();
    expect(API_ERRORS.APP_NOT_FOUND).toBeDefined();
    expect(API_ERRORS.PLAN_NOT_FOUND).toBeDefined();
  });

  it("should contain Bengali text in error messages", () => {
    expect(API_ERRORS.USER_NOT_LOGGED_IN).toContain("লগইন");
    expect(API_ERRORS.SUBSCRIPTION_EXPIRED).toContain("সাবস্ক্রিপশন");
    expect(API_ERRORS.PAYMENT_NOT_VERIFIED).toContain("পেমেন্ট");
  });

  it("should create error response with correct status", () => {
    const response = createErrorResponse("USER_NOT_LOGGED_IN", 401);
    expect(response.status).toBe(401);
    expect(response.error).toBe(API_ERRORS.USER_NOT_LOGGED_IN);
    expect(response.code).toBe("USER_NOT_LOGGED_IN");
  });

  it("should use default status 400 if not provided", () => {
    const response = createErrorResponse("APP_NOT_FOUND");
    expect(response.status).toBe(400);
  });

  it("should check if object is an API error", () => {
    const errorResponse = { error: "Test error", code: "TEST_ERROR" };
    const validResponse = { success: true };

    expect(isApiError(errorResponse)).toBe(true);
    expect(isApiError(validResponse)).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
