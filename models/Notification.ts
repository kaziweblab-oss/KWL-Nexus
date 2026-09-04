import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["block", "unblock", "subscription", "payment", "integration", "general"], default: "general" },
    appId: { type: String, trim: true },
    appName: { type: String, trim: true },
    integrationId: { type: Schema.Types.ObjectId, ref: "Integration", index: true },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", index: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ email: 1, read: 1 });

export default models.Notification || model("Notification", NotificationSchema);
