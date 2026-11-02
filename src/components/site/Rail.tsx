"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevron } from "../Icons";

/**
 * Horizontal row of cards with snap scrolling. Arrow buttons (pointer devices) scroll one page;
 * on phones you swipe. Works in both reading directions.
 */
export function Rail({ children, labels }: { children: React.ReactNode; labels: { prev: string; next: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current; if (!el) return;
    const x = Math.abs(el.scrollLeft); // negative in RTL
    setEdge({ start: x < 8, end: x + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => { update(); const el = ref.current; el?.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update);
    return () => { el?.removeEventListener("scroll", update); window.removeEventListener("resize", update); }; }, []);
  const go = (dir: 1 | -1) => {
    const el = ref.current; if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.9, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const btn = "btn-press absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface shadow-[0_8px_24px_-8px_rgb(35_43_69/0.35)] transition-opacity duration-200 md:grid";
  return (
    <div className="relative">
      <div ref={ref} className="rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2">
        {children}
      </div>
      <button type="button" aria-label={labels.prev} onClick={() => go(-1)} className={`${btn} -start-5 ${edge.start ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <IconChevron size={20} className="-scale-x-100" />
      </button>
      <button type="button" aria-label={labels.next} onClick={() => go(1)} className={`${btn} -end-5 ${edge.end ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <IconChevron size={20} />
      </button>
    </div>
  );
}

export const RailItem = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-[31%] lg:w-[23.5%]">{children}</div>
);
