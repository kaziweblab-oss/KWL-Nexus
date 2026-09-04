"use client";

// Re-export canonical Toast from ui folder to keep both import paths working
// UI/Toast handles top-right container; this file keeps backward compatibility.
export { ToastProvider, useToast } from "@/components/ui/Toast";
export type { ToastType, ToastItem } from "@/components/ui/Toast";
