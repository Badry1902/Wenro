import { THEME, motifUrl, patternStyle, type MotifTone, type PatternVariant, type Theme } from "@/lib/themes";

/**
 * Building blocks for a trip's collection design (supplied Coast Club artwork, never redrawn).
 * Patterns stay in margins, card headers and image panels; text always sits on a solid surface.
 */

/** A tiled pattern surface. */
export function ThemeSurface({ theme, variant = "feature", size = 320, className = "", children, ...rest }:
  { theme: Theme; variant?: PatternVariant; size?: number; className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={className} style={{ ...patternStyle(theme, variant, size), ...rest.style }}>{children}</div>;
}

/** One motif from the trip's collection (decorative). */
export function ThemeMotif({ theme, index = 0, tone = "cobalt", size = 24, className = "" }: { theme: Theme; index?: number; tone?: MotifTone; size?: number; className?: string }) {
  const m = THEME[theme].motifs;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={motifUrl(m[index % m.length], tone)} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" className={`h-auto object-contain ${className}`} style={{ width: size }} />;
}

/** The collection's icon in a small white badge, with its name for screen readers or as a label. */
export function ThemeBadge({ theme, label, showLabel = false, size = 22, className = "" }: { theme: Theme; label: string; showLabel?: boolean; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 shadow-sm ${showLabel ? "py-1 ps-1.5 pe-3" : "p-1.5"} ${className}`} title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={motifUrl(THEME[theme].icon, "cobalt")} alt="" aria-hidden="true" width={size} height={size} className="h-auto object-contain" style={{ width: size }} />
      {showLabel ? <span className="text-small font-bold text-ink">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
