"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface PlanSelectButtonProps {
  appId: string;
  planName: string;
  planPrice: string;
}

export function PlanSelectButton({ appId, planName, planPrice: _planPrice }: PlanSelectButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  void _planPrice;

  function handleSelectPlan() {
    try {
      if (!appId || !planName) {
        showToast("অ্যাপ বা প্ল্যান তথ্য পাওয়া যায়নি", "error");
        return;
      }
      // Spec: Download button click -> /payment page with appId & planId
      router.push(`/payment?appId=${appId}&planId=${encodeURIComponent(planName)}`);
    } catch {
      showToast("ডাউনলোড শুরু করতে সমস্যা হয়েছে", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleSelectPlan}
      // Spec: সব বাটন এনাবল থাকবে - always enabled, no disabled prop
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-2.5 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-primary/30 active:scale-95"
    >
      <ArrowDownToLine size={15} /> ডাউনলোড শুরু করুন
    </button>
  );
}
