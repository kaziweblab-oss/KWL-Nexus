import { Schema, model, models } from "mongoose";

const AppSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    category: { type: String, required: true, index: true },
    iconUrl: String,
    websiteUrl: String,
    pricing: { type: String, enum: ["free", "paid", "freemium"], default: "free" },
    isPublished: { type: Boolean, default: false },
    githubOwner: String,
    githubRepo: String,
    githubUrl: String,
    latestVersion: String,
    downloadUrl: {
      android: String,
      windows: String,
      linux: String,
      apk: String,
      exe: String,
      deb: String,
    },
    tutorial: {
      videoUrl: String,
      videoType: { type: String, enum: ["youtube", "vimeo", "custom"] },
      title: String,
      description: String,
      isActive: { type: Boolean, default: false },
      sections: {
        type: [{ heading: String, bodyMarkdown: String }],
        default: undefined,
      },
      contentUpdatedAt: Date,
    },
    isNewRelease: { type: Boolean, default: false, index: true },
    newReleaseImageUrl: String,
    size: { type: String, trim: true },
    // App-API sync metadata (desktop heartbeat + feature pushes).
    apiLastSeenAt: { type: Date },
    featuresSource: { type: String, enum: ["manual", "app"], default: "manual" },
    featuresUpdatedAt: { type: Date },
    newReleaseOrder: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0, index: true },
    screenshots: { type: [String], default: [] },
    previewImageUrl: String,
    previewImages: { type: [String], default: [] },
    previewVideoUrl: String,
    screenshotVideos: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default models.App || model("App", AppSchema);
