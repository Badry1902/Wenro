/**
 * WENRO "Coast Club" motion, built around the supplied logo files (the artwork itself is never redrawn):
 *  - BrandLoader: the pin mark lands like a map pin and sends out a soft water ripple — the loading sign.
 *  - LogoLoop: the wordmark floats gently above a moving wave line — where the brand greets people
 *    (sign-in, joining, page not found).
 * Pure CSS (transform/opacity); people who ask for reduced motion see the still logo.
 */
export function BrandLoader({ label, size = 96, className = "" }: { label: string; size?: number; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={`brand-loader inline-flex flex-col items-center gap-3 ${className}`}>
      <span className="pin-loader relative grid place-items-end justify-items-center" style={{ width: size, height: Math.round(size * 0.95) }} aria-hidden="true">
        <span className="pin-ripple" />
        <span className="pin-ripple pin-ripple-2" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/coast/mark-primary-256.png" alt="" width={size} height={Math.round(size * 172 / 256)} className="pin-drop relative" decoding="async" fetchPriority="high" />
      </span>
      <span className="text-small font-semibold text-ink-muted">{label}</span>
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
