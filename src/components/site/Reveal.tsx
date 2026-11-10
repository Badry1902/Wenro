"use client";

import { useEffect, useRef, useState } from "react";

/** Fades a section up the first time it scrolls into view (skipped with reduced motion). */
export function Reveal({ children, className = "", as: Tag = "div", delay = 0, style, ...rest }: { children: React.ReactNode; className?: string; as?: "div" | "section"; delay?: number; "aria-label"?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} {...rest} data-shown={shown} style={{ ...style, transitionDelay: `${delay}ms` }} className={`reveal ${className}`}>{children}</Tag>;
}
