"use client";

import { AlertCircle, X } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorMessage({ title = "Error", message, onRetry, onClose }: ErrorMessageProps) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 dark:text-red-200">{title}</h3>
          <p className="text-red-700 dark:text-red-300 text-sm mt-1">{message}</p>
          {(onRetry || onClose) && (
            <div className="flex gap-3 mt-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-red-700 dark:text-red-200 bg-white dark:bg-white/10 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-white/20 transition"
                >
                  পুনরায় চেষ্টা করুন
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                >
                  বন্ধ করুন
                </button>
              )}
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
