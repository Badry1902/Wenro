"use client";

import { useEffect, useRef, useState } from "react";

/**
 * WENRO "Coast Club" motion, built around the supplied logo files (the artwork itself is never redrawn):
 *  - BrandLoader: the five pins of the mark flicker at random like neon — the loading sign.
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
 * The five pins of the logo (cut from the supplied mark, never redrawn) flicker like neon tubes: each pin on its
 * own random clock — quick stutters, short blackouts, several dark at once — always at least one lit.
 * Only opacity and a soft glow change; nothing is stretched or squeezed. Reduced motion: the still mark.
 */
const GLOW = ["37,60,150", "37,60,150", "37,60,150", "243,107,46", "243,107,46"]; // cobalt top row, persimmon bottom row
function PinLights({ size }: { size: number }) {
  const [on, setOn] = useState([true, true, true, true, true]);
  const lit = useRef([true, true, true, true, true]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const set = (i: number, v: boolean) => {
      if (!v && lit.current.filter(Boolean).length <= 1 && lit.current[i]) return false; // keep one pin glowing
      lit.current[i] = v; setOn([...lit.current]); return true;
    };
    const later = (ms: number, f: () => void) => { const t = setTimeout(() => alive && f(), ms); timers.push(t); };
    const cycle = (i: number) => {
      const r = Math.random();
      if (r < 0.38) {
        // neon stutter: off/on 2–4 times very fast, then stay lit a while
        const n = 2 + Math.floor(Math.random() * 3); let t = 0;
        for (let k = 0; k < n; k++) { later(t, () => set(i, false)); t += 40 + Math.random() * 70; later(t, () => set(i, true)); t += 40 + Math.random() * 90; }
        later(t + 300 + Math.random() * 1200, () => cycle(i));
      } else if (r < 0.72) {
        // blackout: dark for a moment (often overlaps with other pins), then snaps back
        later(0, () => { const ok = set(i, false); later(ok ? 250 + Math.random() * 1100 : 0, () => { set(i, true); later(200 + Math.random() * 900, () => cycle(i)); }); });
      } else {
        later(400 + Math.random() * 1400, () => cycle(i)); // steady glow
      }
    };
    [0, 1, 2, 3, 4].forEach((i) => later(Math.random() * 600, () => cycle(i)));
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);
  const h = Math.round(size * 172 / 256);
  return (
    <span className="relative block" style={{ width: size, height: h }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={n} src={`/brand/coast/pins/pin-${n}.png`} alt="" width={size} height={h} decoding="async"
          className="absolute inset-0 h-full w-full"
          style={{
            opacity: on[i] ? 1 : 0.1,
            filter: on[i] ? `drop-shadow(0 0 ${Math.round(size / 18)}px rgba(${GLOW[i]},0.55))` : "none",
            transition: on[i] ? "opacity 45ms linear, filter 120ms linear" : "opacity 70ms linear, filter 70ms linear",
          }} />
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
