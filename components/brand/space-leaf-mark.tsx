import type { SVGProps } from "react";

export function SpaceLeafMark({ className = "", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden {...props}>
      <defs>
        <linearGradient id="leaf-gradient" x1="15" y1="50" x2="48" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8fce4e" />
          <stop offset="1" stopColor="#28a66a" />
        </linearGradient>
        <linearGradient id="orbit-gradient" x1="7" y1="18" x2="57" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5bd5ff" />
          <stop offset="1" stopColor="#87f0bc" />
        </linearGradient>
      </defs>
      <path d="M11 47c8-16 20-25 38-28-1 17-10 29-27 34-4 1-8-1-11-6Z" fill="url(#leaf-gradient)" />
      <path d="M16 48c8-10 17-17 29-23M22 51c1-7 1-13-1-18M31 45c1-7 1-12-1-17" stroke="#eefbea" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7 31C12 14 32 5 49 11c8 3 11 8 8 12-2 3-7 3-11 1" stroke="url(#orbit-gradient)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="54" cy="12" r="3.5" fill="#5bd5ff" />
    </svg>
  );
}
