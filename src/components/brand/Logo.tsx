import Image from "next/image";

/**
 * WENRO "Coast Club" logo files, as supplied (never redrawn).
 * primary: on white or pale surfaces · reverse: on Midnight · white: on Cobalt or photos · midnight: on Aqua.
 * The wordmark is 480×89; the stand-alone mark (pins) is 256×172 and is used below ~100 CSS px.
 */
type Tone = "primary" | "reverse" | "white" | "midnight";

export function Wordmark({ tone = "primary", width = 132, priority = false, className = "" }: { tone?: Tone; width?: number; priority?: boolean; className?: string }) {
  return <Image src={`/brand/coast/wordmark-${tone}-480.png`} alt="WENRO" width={width} height={Math.round(width * 89 / 480)} priority={priority} className={className} />;
}

export function Mark({ tone = "primary", width = 48, className = "", alt = "" }: { tone?: Tone; width?: number; className?: string; alt?: string }) {
  return <Image src={`/brand/coast/mark-${tone}-256.png`} alt={alt} width={width} height={Math.round(width * 172 / 256)} className={className} />;
}

/** A single marine or trip motif (supplied artwork), decorative only (hidden from screen readers). */
export function MotifImg({ name, tone, size, className = "" }: { name: string; tone: "aqua" | "cobalt" | "persimmon" | "white"; size: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/brand/coast/motifs/${name}-${tone}.webp`} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" className={`motif h-auto ${className}`} style={{ width: size }} />;
}
