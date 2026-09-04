import { Schema, model, models } from "mongoose";

const OtpSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    phone: { type: String, trim: true, index: true, sparse: true },
    channel: { type: String, enum: ["email", "phone"], default: "email", index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// TTL index ensures expired OTPs auto-delete
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.Otp || model("Otp", OtpSchema);
