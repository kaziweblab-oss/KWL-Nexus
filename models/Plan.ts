import { Schema, model, models } from "mongoose";

const PlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    appId: { type: String, trim: true, index: true, default: null },
    appSlug: { type: String, trim: true, index: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    interval: { type: String, enum: ["month", "year", "lifetime", "custom"], required: true },
    durationDays: { type: Number, min: 1, default: null },
    refundEnabled: { type: Boolean, default: false },
    refundDays: { type: Number, min: 1, default: null },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default models.Plan || model("Plan", PlanSchema);
