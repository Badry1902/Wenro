import Image from "next/image";

/**
 * WENRO "Coast Club" logo files, as supplied (never redrawn).
 * primary: on white or pale surfaces · reverse: on Midnight · white: on Cobalt or photos · midnight: on Aqua.
 * The wordmark is 480×89; the stand-alone mark (pins) is 256×172 and is used below ~100 CSS px.
 * In dark mode the files made for light surfaces (primary, midnight) switch to the reverse file (CSS: .logo-light/.logo-dark).
 */
type Tone = "primary" | "reverse" | "white" | "midnight";

const followsTheme = (tone: Tone) => tone === "primary" || tone === "midnight";

export function Wordmark({ tone = "primary", width = 132, priority = false, className = "" }: { tone?: Tone; width?: number; priority?: boolean; className?: string }) {
  const h = Math.round(width * 89 / 480);
  if (!followsTheme(tone)) return <Image src={`/brand/coast/wordmark-${tone}-480.png`} alt="WENRO" width={width} height={h} priority={priority} className={className} />;
  return (
    <>
      <Image src={`/brand/coast/wordmark-${tone}-480.png`} alt="WENRO" width={width} height={h} priority={priority} className={`logo-light ${className}`} />
      <Image src="/brand/coast/wordmark-reverse-480.png" alt="WENRO" width={width} height={h} className={`logo-dark ${className}`} />
    </>
  );
}

export function Mark({ tone = "primary", width = 48, className = "", alt = "" }: { tone?: Tone; width?: number; className?: string; alt?: string }) {
  const h = Math.round(width * 172 / 256);
  if (!followsTheme(tone)) return <Image src={`/brand/coast/mark-${tone}-256.png`} alt={alt} width={width} height={h} className={className} />;
  return (
    <>
      <Image src={`/brand/coast/mark-${tone}-256.png`} alt={alt} width={width} height={h} className={`logo-light ${className}`} />
      <Image src="/brand/coast/mark-reverse-256.png" alt="" width={width} height={h} className={`logo-dark ${className}`} />
    </>
  );
}

/** A single marine or trip motif (supplied artwork), decorative only (hidden from screen readers). */
export function MotifImg({ name, tone, size, className = "" }: { name: string; tone: "aqua" | "cobalt" | "persimmon" | "white"; size: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/brand/coast/motifs/${name}-${tone}.webp`} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" className={`motif h-auto ${className}`} style={{ width: size }} />;
}
