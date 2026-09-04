import { Schema, model, models } from "mongoose";

const AppVersionSchema = new Schema(
  {
    appId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    notes: { type: String, default: "" },
    changedBy: { type: String, default: "system" },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default models.AppVersion || model("AppVersion", AppVersionSchema);
