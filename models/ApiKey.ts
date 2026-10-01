import { Schema, model, models } from "mongoose";

const ApiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    // Optional app scope: when set, the key works only for this app (slug). Null = all apps (admin keys).
    appId: { type: String, trim: true, index: true, default: null },
    // Last app this key called (for the "used by" card). Updated non-blocking by app endpoints.
    lastAppSlug: { type: String, trim: true, default: null },
    lastAppAt: { type: Date, default: null },
    // AES-GCM encrypted secret for admin reveal-on-demand. Old keys lack this (hash-only) and can't be revealed.
    keyEnc: { type: String, select: false },
    lastUsedAt: Date,
    expiresAt: Date,
    isRevoked: { type: Boolean, default: false },
    rateLimitPerHour: { type: Number, default: 1000, min: 1 },
    // Granular scopes. Absent/empty = all scopes (backward compatible with old keys).
    // Known: app:read, release:read, entitlement:read, update:read.
    scopes: { type: [String], default: undefined },
  },
  { timestamps: true },
);

export default models.ApiKey || model("ApiKey", ApiKeySchema);
