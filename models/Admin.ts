import { Schema, model, models } from "mongoose";

const AdminSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    permissions: { type: [String], default: ["read"] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default models.Admin || model("Admin", AdminSchema);
