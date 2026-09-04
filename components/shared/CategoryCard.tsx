import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Category cards give the homepage a direct path into filtered listings.
export function CategoryCard({ name, icon: Icon }: { name: string; icon: LucideIcon }) {
  return <Link href={`/apps?category=${name}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"><Icon size={20} className="text-primary transition group-hover:scale-110" /><p className="mt-8 text-sm font-semibold text-ink">{name}</p></Link>;
}
