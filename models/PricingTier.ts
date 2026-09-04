import { Schema, model, models } from "mongoose";

const PricingTierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: String, required: true },
    cadence: { type: String, required: true, default: "/month" },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    cta: { type: String, default: "Get Started" },
    href: { type: String, default: "/apps" },
    isPopular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.PricingTier || model("PricingTier", PricingTierSchema);
