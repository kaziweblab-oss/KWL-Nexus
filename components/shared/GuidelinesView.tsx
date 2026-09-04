"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

export function GuidelinesView({ className = "" }: { className?: string }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/update-guidelines", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setContent(j.data?.content ?? null))
      .catch(() => setContent(null));
  }, []);

  if (!content) return null;

  return (
    <div className={`rounded-2xl border border-primary/10 bg-white p-5 dark:border-white/10 dark:bg-white/5 ${className}`}>
      <div className="flex items-center gap-2">
        <FileText size={16} className="text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Update Guidelines</p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/70 dark:text-white/70">{content}</p>
    </div>
  );
}
