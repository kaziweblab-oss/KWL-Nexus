import { Schema, model, models } from "mongoose";

const PaymentMethodSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // Display name e.g. bKash, Stripe
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9_-]+$/ },
    type: { type: String, enum: ["manual", "gateway"], default: "manual", required: true },
    provider: { type: String, trim: true, default: "" }, // e.g. stripe, sslcommerz, bkash_gateway
    accountNumber: { type: String, default: "", trim: true }, // for manual
    instructions: { type: String, default: "" },
    qrImageUrl: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    icon: { type: String, default: "" }, // optional icon name
    gatewayConfig: { type: Schema.Types.Mixed, default: {}, select: false }, // apiKey, secret, webhook etc - never returned by default
    status: { type: String, enum: ["NOT_CHECKED", "CHECKING", "ACTIVE", "FAILED"], default: "NOT_CHECKED", index: true },
    health: {
      status: { type: String, enum: ["HEALTHY", "UNHEALTHY", "UNKNOWN", "CHECKING"], default: "UNKNOWN" },
      lastChecked: { type: Date, default: null },
      lastSuccessAt: { type: Date, default: null },
      lastFailedAt: { type: Date, default: null },
      latencyMs: { type: Number, default: null },
      error: { type: String, default: null },
      errorCode: { type: String, default: null },
      consecutiveFailures: { type: Number, default: 0 },
      checkVersion: { type: Number, default: 0 },
      requestId: { type: String, default: null },
    },
    lastCheckedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PaymentMethodSchema.index({ slug: 1 }, { unique: true });
PaymentMethodSchema.index({ enabled: 1, order: 1 });
PaymentMethodSchema.index({ status: 1, enabled: 1 });
PaymentMethodSchema.index({ "health.status": 1 });
PaymentMethodSchema.index({ isDeleted: 1 });

export default models.PaymentMethod || model("PaymentMethod", PaymentMethodSchema);
