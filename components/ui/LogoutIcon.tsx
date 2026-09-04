import type { SVGProps } from "react";

export function LogoutIcon({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <g className="logout-arrow transition-transform duration-200 group-hover:translate-x-1">
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </g>
    </svg>
  );
}
