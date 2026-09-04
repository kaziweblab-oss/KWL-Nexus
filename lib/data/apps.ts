export type AppRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  accent: string;
  icon: string;
  downloads: string;
  rating: string;
  featured?: boolean;
  platforms: string[];
  features?: string[];
  plans: { name: string; price: string; cadence: string; description: string; featured?: boolean }[];
  screenshots?: string[];
  versions?: { version: string; date: string; notes: string }[];
  tutorial?: { videoUrl: string; videoType: "youtube" | "vimeo" | "custom"; title: string; description: string; isActive: boolean };
};

export const categories = ["All apps", "Productivity", "Development", "Utilities", "Design", "Business", "Education"];

export const apps: AppRecord[] = [
  { id: "focus-flow", name: "Focus Flow", category: "Productivity", description: "A calm command center for deep work.", longDescription: "Focus Flow helps you turn a noisy day into a clear sequence of meaningful work. Plan sessions, protect your attention, and finish with a little more energy.", accent: "#6C63FF", icon: "✦", downloads: "24.8K", rating: "4.9", featured: true, platforms: ["Android", "Windows", "Linux"], screenshots: ["Focus sessions", "Weekly rhythm", "Quiet mode"], versions: [{ version: "2.4.0", date: "Aug 2026", notes: "Added focus rituals and faster sync." }, { version: "2.3.1", date: "Jun 2026", notes: "Improved session reminders." }], tutorial: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoType: "youtube", title: "Getting started with Focus Flow", description: "Learn the three-minute setup for your first focused session.", isActive: true }, plans: [{ name: "Monthly", price: "$6", cadence: "/ month", description: "Flexible access for your current season." }, { name: "Yearly", price: "$48", cadence: "/ year", description: "Two months free for committed focus.", featured: true }, { name: "Lifetime", price: "$119", cadence: " one-time", description: "Own the complete Focus Flow toolkit." }] },
  { id: "pixel-kit", name: "Pixel Kit", category: "Design", description: "Fast, thoughtful assets for visual teams.", longDescription: "Pixel Kit keeps your creative toolkit close with polished assets, quick exports, and a workspace built for momentum.", accent: "#FF7A59", icon: "◈", downloads: "18.2K", rating: "4.8", featured: true, platforms: ["Windows", "Linux"], plans: [{ name: "Monthly", price: "$9", cadence: "/ month", description: "A complete creative starter kit." }, { name: "Yearly", price: "$72", cadence: "/ year", description: "Best value for active teams.", featured: true }, { name: "Lifetime", price: "$189", cadence: " one-time", description: "Keep every asset and update." }] },
  { id: "shipyard", name: "Shipyard", category: "Development", description: "Ship better code with less ceremony.", longDescription: "Shipyard gives small engineering teams a lightweight space for releases, environments, and the decisions behind every deploy.", accent: "#00A99D", icon: "⌘", downloads: "12.6K", rating: "4.7", featured: true, platforms: ["Windows", "Linux"], plans: [{ name: "Monthly", price: "$12", cadence: "/ month", description: "For independent builders." }, { name: "Yearly", price: "$96", cadence: "/ year", description: "A full year of calmer shipping.", featured: true }, { name: "Lifetime", price: "$249", cadence: " one-time", description: "A permanent home for your releases." }] },
  { id: "ledger-lite", name: "Ledger Lite", category: "Business", description: "Small-business numbers, made legible.", longDescription: "Ledger Lite turns routine finance into an understandable rhythm, with simple tracking and useful signals for growing businesses.", accent: "#E4A11B", icon: "▦", downloads: "9.4K", rating: "4.6", featured: true, platforms: ["Android", "Windows"], plans: [{ name: "Monthly", price: "$8", cadence: "/ month", description: "Clear numbers for one business." }, { name: "Yearly", price: "$64", cadence: "/ year", description: "Save 33% with annual billing.", featured: true }, { name: "Lifetime", price: "$159", cadence: " one-time", description: "Your books, without the recurring fee." }] },
  { id: "study-space", name: "Study Space", category: "Education", description: "Make learning stick, one session at a time.", longDescription: "Study Space brings notes, recall prompts, and gentle planning together so learning feels active instead of endless.", accent: "#3B82F6", icon: "⌁", downloads: "15.1K", rating: "4.9", featured: true, platforms: ["Android", "Windows", "Linux"], plans: [{ name: "Monthly", price: "$4", cadence: "/ month", description: "A focused study companion." }, { name: "Yearly", price: "$32", cadence: "/ year", description: "Keep your learning system moving.", featured: true }, { name: "Lifetime", price: "$79", cadence: " one-time", description: "The complete study space, forever." }] },
  { id: "tidy-tools", name: "Tidy Tools", category: "Utilities", description: "The little utilities that keep things moving.", longDescription: "Tidy Tools collects the small, useful actions you reach for every day into one fast, friendly utility shelf.", accent: "#D14D72", icon: "⌘", downloads: "21.3K", rating: "4.8", featured: true, platforms: ["Windows", "Linux"], plans: [{ name: "Monthly", price: "$5", cadence: "/ month", description: "Everyday utility without clutter." }, { name: "Yearly", price: "$40", cadence: "/ year", description: "A tidy year at a tidy price.", featured: true }, { name: "Lifetime", price: "$99", cadence: " one-time", description: "Keep the whole utility shelf." }] },
];

const masterFeatures: Record<string, string[]> = {
  "focus-flow": ["Focus sessions", "Weekly rhythm", "Quiet mode"],
  "pixel-kit": ["Design assets", "Quick exports", "Team workspace"],
  shipyard: ["Release tracking", "Environments", "Deploy decisions"],
  "ledger-lite": ["Expense tracking", "Reports", "Business insights"],
  "study-space": ["Notes", "Recall prompts", "Study planning"],
  "tidy-tools": ["Daily utilities", "Fast actions", "Utility shelf"],
};

export const getApp = (id: string) => {
  const app = apps.find((entry) => entry.id === id);
  return app ? { ...app, features: app.features?.length ? app.features : masterFeatures[id] ?? [] } : undefined;
};
