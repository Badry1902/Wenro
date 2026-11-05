// One icon family: 24px grid, ~1.8px stroke, rounded caps (design guide § Icon language).
type P = { size?: number; className?: string };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.2}><path d="M5 12l4 4 10-10" /></svg>
);
export const IconClose = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconClock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconSea = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 10c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0" /></svg>
);
export const IconCar = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 16V8h12l4 4v4" /><circle cx="7" cy="17" r="2" /><circle cx="16" cy="17" r="2" /></svg>
);
export const IconCalendar = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconCash = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
);
export const IconBack = ({ size, className }: P) => (
  <svg {...base(size)} className={`rtl:rotate-180 ${className ?? ""}`}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconDownload = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
);
export const IconSearch = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const IconHeart = ({ size, className, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>
);
export const IconStar = ({ size, className, filled = true }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"} strokeWidth={1.5}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);
export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size)} className={`rtl:rotate-180 ${className ?? ""}`}><path d="M9 5l7 7-7 7" /></svg>
);
export const IconUser = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const IconGrid = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
);
export const IconShield = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IconPin = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>
);
export const IconSpark = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></svg>
);
export const IconExpand = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const IconPlay = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M8 5l11 7-11 7z" /></svg>
);
export const IconPause = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M8 5v14M16 5v14" /></svg>
);

/* Category pictograms (same 24px family) */
export const IconCategory = ({ name, size, className }: P & { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    sea: <path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 14c3-3 6 3 9 0s6 3 9 0M3 19c3-3 6 3 9 0s6 3 9 0" />,
    desert: <><circle cx="17" cy="7" r="2.5" /><path d="M2 19c4-6 8-6 11-2 2-3 5-3 9 2" /></>,
    culture: <><path d="M4 20h16M5 20V10M19 20V10M9 20v-6M15 20v-6M3 10l9-6 9 6z" /></>,
    diving: <><rect x="3" y="7" width="18" height="8" rx="4" /><path d="M12 7v8M18 15v3a2 2 0 01-2 2h-2" /></>,
    watersports: <><path d="M3 18c3-2 6 2 9 0s6 2 9 0" /><path d="M6 14l9-9 3 3-9 9z" /></>,
    family: <><circle cx="8" cy="6" r="2.5" /><circle cx="17" cy="9" r="2" /><path d="M3 20c0-4 2-7 5-7s5 3 5 7M13 20c0-3 1.5-5 4-5s4 2 4 5" /></>,
    evening: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
    daytrips: <><path d="M3 20h18M6 20l6-14 6 14" /><path d="M9 13h6" /></>,
    wellness: <><path d="M12 20c-4-2-7-5-7-9 3 0 5 1.5 7 4 2-2.5 4-4 7-4 0 4-3 7-7 9z" /><path d="M12 15V5" /></>,
  };
  return <svg {...base(size)} className={className}>{paths[name] ?? <circle cx="12" cy="12" r="8" />}</svg>;
};
