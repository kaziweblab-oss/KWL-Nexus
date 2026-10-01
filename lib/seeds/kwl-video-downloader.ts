// Canonical product definition for KWL Video Downloader (Tauri desktop).
// Prices are DEFAULTS in BDT — adjust in /admin/pricing, the seed never overwrites
// existing plans. App slug is stable: desktop teams hardcode it.
export const KWL_VIDEO_DOWNLOADER_SLUG = "kwl-video-downloader";

export const kwlVideoDownloaderSeed = {
  app: {
    name: "KWL Video Downloader",
    slug: KWL_VIDEO_DOWNLOADER_SLUG,
    description:
      "Download videos for offline viewing. Paste a link, pick quality and format, queue multiple downloads, and track everything in history.",
    features: ["Link analysis", "Quality picker", "Download queue", "History", "Format conversion"],
    category: "Multimedia",
    pricing: "paid" as const,
    githubOwner: "kaziweblab-oss",
    githubRepo: "kwl-video-downloader",
    githubUrl: "https://github.com/kaziweblab-oss/kwl-video-downloader",
    isPublished: false,
  },
  plans: [
    {
      name: "Monthly",
      slug: "kwl-video-downloader-monthly",
      interval: "month" as const,
      price: 199,
      description: "Full access for 30 days.",
      features: ["All download features", "Queue + history", "Updates for 30 days"],
    },
    {
      name: "Yearly",
      slug: "kwl-video-downloader-yearly",
      interval: "year" as const,
      price: 1990,
      description: "Full access for 12 months.",
      features: ["All download features", "Queue + history", "Updates for 12 months"],
    },
    {
      name: "Lifetime",
      slug: "kwl-video-downloader-lifetime",
      interval: "lifetime" as const,
      price: 4990,
      description: "Pay once, use forever.",
      features: ["All download features", "Queue + history", "Lifetime updates"],
    },
  ],
  tutorial: {
    title: "KWL Video Downloader Guide",
    description: "Install, analyze, queue, and manage downloads.",
    isActive: true,
    sections: [
      { heading: "Install", bodyMarkdown: "Download the installer for your platform from the download page and run it. Windows: run the .exe and follow the wizard." },
      { heading: "Analyze a link", bodyMarkdown: "Paste a video link into the app and press Analyze. Pick your preferred quality and format from the results." },
      { heading: "Queue downloads", bodyMarkdown: "Add multiple links to the queue. Downloads run one by one and resume after restart." },
      { heading: "History and formats", bodyMarkdown: "Finished files appear in History with their format and size. Re-download or convert from there." },
    ],
  },
};
