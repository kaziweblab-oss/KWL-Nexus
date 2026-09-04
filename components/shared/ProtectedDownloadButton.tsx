"use client";

import { ArrowDownToLine } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

// Downloads require an account while tutorials remain publicly accessible.
// All buttons stay enabled; errors are shown via Toast per spec.
export function ProtectedDownloadButton({ href = "#", label = "Download app" }: { href?: string; label?: string }) {
  const { status } = useSession();
  const { showToast } = useToast();
  function download() {
    try {
      if (status !== "authenticated") {
        showToast("ডাউনলোড করতে লগইন করুন", "warning");
        return void signIn("google");
      }
      if (!href || href === "#") {
        showToast("ডাউনলোড লিংক প্রস্তুত হচ্ছে - একটি প্ল্যান নির্বাচন করুন", "info");
        return;
      }
      window.location.assign(href);
    } catch {
      showToast("ডাউনলোড শুরু করতে সমস্যা হয়েছে", "error");
    }
  }
  return (
    <button
      type="button"
      onClick={download}
      className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary"
    >
      <ArrowDownToLine size={15} /> {label}
    </button>
  );
}
