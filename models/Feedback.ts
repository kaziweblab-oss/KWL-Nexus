import { Schema, model, models } from "mongoose";

const FeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    appId: { type: Schema.Types.ObjectId, ref: "App" },
    type: { type: String, enum: ["bug_report", "suggestion", "feature_request", "rating"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    screenshot: { type: String, maxlength: 1500000 },
    rating: { type: Number, min: 1, max: 5 },
    status: { type: String, enum: ["pending", "resolved", "ignored", "replied"], default: "pending", index: true },
    adminReply: { type: String, trim: true, maxlength: 5000 },
    resolvedAt: Date,
  },
  { timestamps: true },
);

export default models.Feedback || model("Feedback", FeedbackSchema);
