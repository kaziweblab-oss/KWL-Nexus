import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, sparse: true },
    image: String,
    role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    blockedApps: { type: [String], default: [] },
    passwordHash: String,
  },
  { timestamps: true },
);

export default models.User || model("User", UserSchema);
