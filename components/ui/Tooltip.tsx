"use client";

import { ReactNode } from "react";

type Props = {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

export function Tooltip({ content, children, side = "top" }: Props) {
  if (!content) return <>{children}</>;
  const pos =
    side === "bottom"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : "bottom-full mb-2 left-1/2 -translate-x-1/2";
  const arrow =
    side === "bottom"
      ? "bottom-full left-1/2 -translate-x-1/2 border-b-[#0f172a] dark:border-b-white border-x-transparent border-t-transparent"
      : "top-full left-1/2 -translate-x-1/2 border-t-[#0f172a] dark:border-t-white border-x-transparent border-b-transparent";
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${pos} z-40 hidden max-w-[220px] whitespace-nowrap rounded-xl bg-[#0f172a] px-3 py-1.5 text-center text-xs font-medium leading-tight text-white shadow-xl ring-1 ring-white/10 group-hover:block dark:bg-white dark:text-[#0f172a] dark:ring-black/10`}
      >
        {content}
        <span
          className={`absolute ${arrow} h-0 w-0 border-4`}
          aria-hidden
        />
      </span>
    </span>
  );
}
