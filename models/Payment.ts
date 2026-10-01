import { Schema, model, models } from "mongoose";

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    appId: { type: String, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true },
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded"], default: "pending" },
    transactionId: { type: String, trim: true, index: true },
    // Idempotency: duplicate (paymentMethod, transactionId) submissions are rejected
    // at the API layer with 409. Kept non-unique to avoid breaking existing data;
// enforce uniqueness in Phase 5 after production dedup verification.
    paymentMethod: { type: String, trim: true, lowercase: true, default: "other" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    notes: { type: String, trim: true },
    deadline: Date,
    providerPaymentId: String,
    paidAt: Date,
    refundedAt: Date,
  },
  { timestamps: true },
);

// Supports the idempotency lookup on duplicate submissions (non-unique until
// existing production duplicates are verified and backfilled in Phase 5).
PaymentSchema.index({ paymentMethod: 1, transactionId: 1 });

export default models.Payment || model("Payment", PaymentSchema);
