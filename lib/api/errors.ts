/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Centralized API error messages in Bengali
 * Used for consistent error handling across the application
 */

export const API_ERRORS = {
  USER_NOT_LOGGED_IN: "এই ফিচার ব্যবহার করতে লগইন করুন",
  SUBSCRIPTION_EXPIRED: "আপনার সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে",
  PAYMENT_NOT_VERIFIED: "পেমেন্ট এখনও ভেরিফাই হয়নি",
  DOWNLOAD_URL_NOT_FOUND: "ডাউনলোড লিংক পাওয়া যায়নি",
  PAYMENT_GATEWAY_NOT_SET: "পেমেন্ট গেটওয়ে কনফিগার করা হয়নি",
  DATABASE_CONNECTION_FAILED: "ডাটাবেস কানেক্ট করতে পারছি না",
  API_KEY_INVALID: "API কী ভ্যালিড নয়",
  RATE_LIMIT_EXCEEDED: "অনেক বেশি রিকোয়েস্ট, কিছুক্ষণ পর চেষ্টা করুন",
  APP_NOT_FOUND: "অ্যাপ পাওয়া যায়নি",
  PLAN_NOT_FOUND: "প্ল্যান পাওয়া যায়নি",
} as const;

export type ApiErrorKey = keyof typeof API_ERRORS;

/**
 * Create a standardized API error response
 */
export function createErrorResponse(key: ApiErrorKey, status: number = 400) {
  return {
    status,
    error: API_ERRORS[key],
    code: key,
  };
}

/**
 * Check if a response has an error
 */
export function isApiError(response: any): response is { error: string; code: string } {
  return Boolean(response && typeof response.error === "string" && typeof response.code === "string");
}
