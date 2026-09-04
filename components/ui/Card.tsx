import type { HTMLAttributes } from "react";

// A neutral surface for repeated UI content and dashboard panels.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[1.25rem] border border-ink/10 bg-white p-6 shadow-sm ${className}`} {...props} />;
}
