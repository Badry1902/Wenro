/**
 * WENRO's own logo animations (files supplied by WENRO, not redrawn):
 *  - BrandLoader: the "journey" loop, used as the loading sign while a page is on its way.
 *  - LogoLoop: the map folding open into the logo and back, used where the brand greets people
 *    (sign-in, joining, page not found).
 * Both are transparent animated WebP files (play in every current browser, Safari included). People who
 * ask their device for reduced motion get a still frame instead.
 */
const M = "/brand/motion";

export function BrandLoader({ label, size = 96, className = "" }: { label: string; size?: number; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={`brand-loader inline-flex flex-col items-center gap-3 ${className}`}>
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet={`${M}/wenro-loader-still.png`} />
        <img src={`${M}/wenro-loader.webp`} alt="" width={size} height={Math.round(size * 0.733)} decoding="async" fetchPriority="high" />
      </picture>
      <span className="text-small font-semibold text-ink-muted">{label}</span>
    </span>
  );
}

export function LogoLoop({ width = 200, className = "" }: { width?: number; className?: string }) {
  return (
    <picture className={className}>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`${M}/wenro-logo-still.png`} />
      <img src={`${M}/wenro-logo-loop.webp`} alt="WENRO" width={width} height={Math.round(width * 0.733)} decoding="async" />
    </picture>
  );
}
