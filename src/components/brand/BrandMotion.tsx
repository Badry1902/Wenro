"use client";

import { useEffect, useState } from "react";

/**
 * WENRO "Coast Club" motion, built around the supplied logo files (the artwork itself is never redrawn):
 *  - BrandLoader: the five pins of the mark light up and dim at random — the loading sign.
 *  - LogoLoop: the wordmark floats gently above a moving wave line — where the brand greets people
 *    (sign-in, joining, page not found).
 * Pure CSS (transform/opacity); people who ask for reduced motion see the still logo.
 */
export function BrandLoader({ label, size = 96, className = "" }: { label: string; size?: number; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={`brand-loader inline-flex flex-col items-center gap-3 ${className}`}>
      <PinLights size={size} />
      <span className="text-small font-semibold text-ink-muted">{label}</span>
    </span>
  );
}

/**
 * The five pins of the logo (cut from the supplied mark, never redrawn) light up and dim one by one in a
 * random rhythm. Only opacity changes — no stretching or squeezing. Reduced motion: the still mark.
 */
function PinLights({ size }: { size: number }) {
  const [on, setOn] = useState([true, true, true, true, true]);
  const [ms, setMs] = useState([700, 700, 700, 700, 700]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true; let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      setOn((cur) => {
        const next = [...cur];
        const k = Math.floor(Math.random() * 5);
        const lit = next.filter(Boolean).length;
        next[k] = !next[k] ? true : lit > 2 ? false : true; // always keep at least two pins lit
        return next;
      });
      setMs((cur) => cur.map((v) => (Math.random() < 0.5 ? 450 + Math.random() * 600 : v)));
      t = setTimeout(tick, 220 + Math.random() * 380);
    };
    t = setTimeout(tick, 250);
    return () => { alive = false; clearTimeout(t); };
  }, []);
  const h = Math.round(size * 172 / 256);
  return (
    <span className="relative block" style={{ width: size, height: h }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={n} src={`/brand/coast/pins/pin-${n}.png`} alt="" width={size} height={h} decoding="async"
          className="absolute inset-0 h-full w-full"
          style={{ opacity: on[i] ? 1 : 0.16, transition: `opacity ${Math.round(ms[i])}ms cubic-bezier(0.45, 0, 0.55, 1)` }} />
      ))}
    </span>
  );
}

export function LogoLoop({ width = 200, className = "" }: { width?: number; className?: string }) {
  return (
    <span className={`logo-float inline-flex flex-col items-center ${className}`} style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/coast/wordmark-primary-480.png" alt="WENRO" width={width} height={Math.round(width * 89 / 480)} className="logo-bob" decoding="async" />
      <svg className="logo-wave mt-2" width={width} height="12" viewBox={`0 0 ${width} 12`} aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <pattern id="wenro-wave" width="40" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 Q10 0 20 6 T40 6" fill="none" stroke="#77B9B9" strokeWidth="2.5" strokeLinecap="round" />
          </pattern>
        </defs>
        <rect className="logo-wave-fill" x="-40" y="0" width={width + 80} height="12" fill="url(#wenro-wave)" />
      </svg>
    </span>
  );
}
