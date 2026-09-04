import { Schema, model, models } from "mongoose";

const SystemConfigSchema = new Schema(
  {
    brandName: { type: String, default: "KWL-NEXUS" },
    brandLogo: { type: String, default: "" },
    brandLogoLight: { type: String, default: "" },
    brandLogoDark: { type: String, default: "" },
    brandIcon: { type: String, default: "" },
    brandIconLight: { type: String, default: "" },
    brandIconDark: { type: String, default: "" },
    brandFavicon: { type: String, default: "" },
    brandBanner: { type: String, default: "" },
    brandBannerLight: { type: String, default: "" },
    brandBannerDark: { type: String, default: "" },
    brandAppIcon: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    primaryColor: { type: String, default: "#6C63FF" },
    secondaryColor: { type: String, default: "#00D4FF" },
    accentColor: { type: String, default: "#17172B" },
    githubToken: { type: String, default: "", select: false },
    githubTokenLastUpdated: { type: Date },
    githubDefaultOwner: { type: String, default: "", trim: true },
    githubDefaultRepo: { type: String, default: "", trim: true },
    githubOwner: { type: String, default: "", trim: true },
    // Global hero/tutorial video — admin editable without code refactor
    tutorialVideoUrl: { type: String, default: "", trim: true },
    tutorialVideoType: { type: String, enum: ["youtube", "vimeo", "custom"], default: "youtube" },
    tutorialTitle: { type: String, default: "How to use KWL Nexus Apps", trim: true },
    tutorialDescription: { type: String, default: "Watch this quick guide to learn how to browse, download and use our apps.", trim: true },
    tutorialIsActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default models.SystemConfig || model("SystemConfig", SystemConfigSchema);
