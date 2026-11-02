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
