"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Check, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
  success: () => undefined,
  error: () => undefined,
  warning: () => undefined,
  info: () => undefined,
});

// Toast Container - fixed to bottom-right corner (user requested: niche dan pashe)
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800";
      case "error":
        return "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800";
      case "info":
      default:
        return "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800";
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <Check size={18} className="flex-shrink-0" />;
      case "error":
        return <AlertCircle size={18} className="flex-shrink-0" />;
      case "warning":
        return <AlertTriangle size={18} className="flex-shrink-0" />;
      case "info":
      default:
        return <Info size={18} className="flex-shrink-0" />;
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2 duration-300 ${getToastStyles(toast.type)}`}
        >
          {getIcon(toast.type)}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Toast Provider - wraps app and provides toast context
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => showToast(message, "success", duration), [showToast]);
  const error = useCallback((message: string, duration?: number) => showToast(message, "error", duration), [showToast]);
  const warning = useCallback((message: string, duration?: number) => showToast(message, "warning", duration), [showToast]);
  const info = useCallback((message: string, duration?: number) => showToast(message, "info", duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// useToast Hook - for consuming toast in components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default ToastProvider;
