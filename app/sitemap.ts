import type { MetadataRoute } from "next";

function baseUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/apps`, lastModified: now },
    { url: `${base}/pricing`, lastModified: now },
    { url: `${base}/tutorial`, lastModified: now },
    { url: `${base}/docs`, lastModified: now },
  ];
}
