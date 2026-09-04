import { Schema, model, models } from "mongoose";

const ContactConfigSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["email", "phone", "whatsapp", "facebook", "twitter", "instagram", "youtube", "telegram", "github", "custom"],
      required: true,
      index: true,
    },
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    section: { type: String, enum: ["getInTouch", "social"], default: "getInTouch", index: true },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export default models.ContactConfig || model("ContactConfig", ContactConfigSchema);
