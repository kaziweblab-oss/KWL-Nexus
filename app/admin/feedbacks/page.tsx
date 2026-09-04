"use client";

import { MessageSquare } from "lucide-react";
import { FeedbackManager } from "@/components/admin/FeedbackManager";
import { useLanguage } from "@/components/shared/LanguageProvider";

// KWL-NEXUS API: GET /api/admin/feedbacks → admin panel feedback list
// PUT /api/admin/feedbacks/[id] → reply & resolve
export default function AdminFeedbacksPage() {
  const { t } = useLanguage();
  return (
    <main>
      <div className="flex items-center gap-3">
        <MessageSquare className="text-primary" />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("customerVoice")}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">{t("feedbackManagement")}</h1>
        </div>
      </div>
      <p className="mt-2 text-ink/55">{t("reviewBugsDesc")}</p>
      <div className="mt-8">
        <FeedbackManager />
      </div>
    </main>
  );
}
