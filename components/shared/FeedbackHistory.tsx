"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";
type FeedbackItem = { _id: string; title: string; description: string; status: string; adminReply?: string };

// Users see only their own feedback and any reply sent by an administrator.
export function FeedbackHistory() {
  const { t } = useLanguage();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/feedback", { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) throw new Error("Non-JSON");
        const text = await response.text();
        if (!text) throw new Error("Empty response");
        const result = JSON.parse(text);
        if (!cancelled) setItems(result.data ?? []);
      } catch (error) {
        console.error("FeedbackHistory fetch failed:", error);
        if (!cancelled) setItems([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!items.length) return <p className="mt-4 text-sm text-ink/50 dark:text-white/50">{t("noFeedback")}</p>;
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <article key={item._id} className="rounded-xl bg-paper p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-ink">{item.title}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink/55">{item.status}</span>
          </div>
          <p className="mt-2 text-sm text-ink/55">{item.description}</p>
          {item.adminReply && <p className="mt-3 text-sm font-medium text-primary">Admin reply: {item.adminReply}</p>}
        </article>
      ))}
    </div>
  );
}
