import { Schema, model, models } from "mongoose";

// Releases are stored independently so an app can keep a complete version history.
const ReleaseSchema = new Schema(
  {
    appId: { type: Schema.Types.ObjectId, ref: "App", index: true },
    githubOwner: { type: String, required: true },
    githubRepo: { type: String, required: true },
    tagName: { type: String, required: true },
    name: String,
    body: String,
    publishedAt: Date,
    assets: [
      {
        name: String,
        url: String,
        contentType: String,
        size: Number,
        platform: { type: String, enum: ["Android", "Windows", "Linux", "Other"], default: "Other" },
        arch: { type: String, enum: ["x64", "arm64", "arm", "universal"], default: null },
      },
    ],
  },
  { timestamps: true },
);

ReleaseSchema.index({ githubOwner: 1, githubRepo: 1, tagName: 1 }, { unique: true });

export default models.Release || model("Release", ReleaseSchema);
