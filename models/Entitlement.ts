import { Schema, model, models } from "mongoose";

// Entitlement means "this user is allowed to use/download this product under these
// conditions". It is separate from Payment: a successful payment creates/updates an
// entitlement; a refund/cancellation/expiration revokes or expires it.
const EntitlementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Canonical product key (lowercase slug). Resolved from Plan.appSlug ?? Plan.appId
    // ?? Order.appId at grant time so legacy String/ObjectId inconsistency stops here.
    appSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", index: true },
    type: { type: String, enum: ["free", "lifetime", "subscription", "promo"], default: "subscription", index: true },
    status: { type: String, enum: ["active", "expired", "revoked"], default: "active", index: true },
    startedAt: { type: Date, default: Date.now },
    // Null endsAt = never expires (lifetime).
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EntitlementSchema.index({ userId: 1, appSlug: 1, status: 1 });

export default models.Entitlement || model("Entitlement", EntitlementSchema);
