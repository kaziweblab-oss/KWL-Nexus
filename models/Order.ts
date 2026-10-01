import { Schema, model, models } from "mongoose";

// Order is a first-class business entity. It answers "what did the user purchase?"
// Payment answers "how was money processed?" — never use Payment as a substitute for Order.
// Lifecycle: created → pending → paid → fulfilled. Terminal: failed, cancelled, refunded.
const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Raw product reference as submitted (slug or ObjectId string). Canonical matching
    // happens via appSlug, resolved from the Plan at fulfillment time.
    appId: { type: String, trim: true, index: true },
    appSlug: { type: String, trim: true, lowercase: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT", uppercase: true },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "fulfilled", "failed", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

OrderSchema.index({ userId: 1, createdAt: -1 });

export default models.Order || model("Order", OrderSchema);
