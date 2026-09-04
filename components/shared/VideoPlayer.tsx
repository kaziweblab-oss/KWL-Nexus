"use client";

function embedUrl(url: string, type: "youtube" | "vimeo" | "custom") {
  if (type === "youtube") { const id = url.match(/(?:youtu\.be\/|v=|embed\/)([^?&/]+)/)?.[1]; return id ? `https://www.youtube.com/embed/${id}` : url; }
  if (type === "vimeo") { const id = url.match(/vimeo\.com\/(\d+)/)?.[1]; return id ? `https://player.vimeo.com/video/${id}` : url; }
  return url;
}

// Embed providers use an iframe; custom URLs use native video controls.
export function VideoPlayer({ url, type }: { url: string; type: "youtube" | "vimeo" | "custom" }) {
  if (type === "custom") return <video className="aspect-video w-full rounded-2xl bg-ink object-contain" src={url} controls playsInline />;
  return <iframe className="aspect-video w-full rounded-2xl bg-ink" src={embedUrl(url, type)} title="Video tutorial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
}
