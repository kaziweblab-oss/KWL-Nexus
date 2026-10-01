export type UserRole = "user" | "admin" | "superadmin";
export type AppPricing = "free" | "paid" | "freemium";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";
// Order answers "what did the user purchase?". Lifecycle: created → pending → paid → fulfilled.
// Terminal: failed, cancelled, refunded.
export type OrderStatus = "created" | "pending" | "paid" | "fulfilled" | "failed" | "cancelled" | "refunded";
// Entitlement answers "is this user allowed to use/download this product?".
export type EntitlementType = "free" | "lifetime" | "subscription" | "promo";
export type EntitlementStatus = "active" | "expired" | "revoked";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type ReleasePlatform = "Android" | "Windows" | "Linux" | "Other";
export type ReleaseArch = "x64" | "arm64" | "arm" | "universal";
