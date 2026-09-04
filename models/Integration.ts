import { Schema, model, models } from "mongoose";

const IntegrationSchema = new Schema(
  {
    provider: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    role: { type: String, enum: ["PRIMARY", "STANDBY", "SECONDARY", "UTILITY"], default: "UTILITY" },
    priority: { type: Number, default: 100 },
    credentials: { type: Map, of: String, default: {} },
    status: { type: String, enum: ["incomplete", "connected", "error"], default: "incomplete" },
    statusMessage: { type: String, default: "" },
    lastChecked: { type: Date, default: null },
    lastCheckLatencyMs: { type: Number, default: null },
    health: { type: { status: { type: String, enum: ["healthy", "unhealthy", "unknown"], default: "unknown" }, lastChecked: { type: Date, default: null }, latencyMs: { type: Number, default: null }, error: { type: String, default: null } }, default: () => ({}) },
    capacity: { type: { storageBytes: { type: Number, default: null }, usedBytes: { type: Number, default: null }, freeBytes: { type: Number, default: null }, usedPercent: { type: Number, default: null }, lastUpdated: { type: Date, default: null } }, default: () => ({}) },
  },
  { timestamps: true },
);

export default models.Integration || model("Integration", IntegrationSchema);