import { Schema, model, models } from "mongoose";

const UpdateGuidelineSchema = new Schema(
  {
    content: { type: String, required: true, default: "1. Update your app to the latest version.\n2. Backup your data before updating.\n3. Follow the official KWL-NEXUS guidelines." },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export default models.UpdateGuideline || model("UpdateGuideline", UpdateGuidelineSchema);
