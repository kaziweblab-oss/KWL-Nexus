import { Schema, model, models } from "mongoose";

const ApiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    // AES-GCM encrypted secret for admin reveal-on-demand. Old keys lack this (hash-only) and can't be revealed.
    keyEnc: { type: String, select: false },
    lastUsedAt: Date,
    expiresAt: Date,
    isRevoked: { type: Boolean, default: false },
    rateLimitPerHour: { type: Number, default: 1000, min: 1 },
  },
  { timestamps: true },
);

export default models.ApiKey || model("ApiKey", ApiKeySchema);
