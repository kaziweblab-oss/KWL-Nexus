import { Schema, model, models } from "mongoose";

// Append-only audit trail for admin/business actions (approvals, refunds, key
// lifecycle, role changes, releases). Never updated, never deleted by the app.
const AuditLogSchema = new Schema(
  {
    actor: { type: String, trim: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    target: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
