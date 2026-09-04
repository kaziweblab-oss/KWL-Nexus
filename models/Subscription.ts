import { Schema, model, models } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: { type: String, enum: ["active", "past_due", "cancelled", "expired"], default: "active" },
    startedAt: { type: Date, default: Date.now },
    endsAt: Date,
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    providerSubscriptionId: String,
  },
  { timestamps: true },
);

export default models.Subscription || model("Subscription", SubscriptionSchema);
