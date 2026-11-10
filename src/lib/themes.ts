/**
 * Coast Club trip collections: every trip carries the design of the place it belongs to.
 * reef (the sea), desert, trail (mountains), heritage (ancient Egypt), souk (markets, local life), nile.
 * The operator can pick one in the editor; otherwise it is chosen from the trip's category and name.
 * Artwork is the supplied WENRO files (patterns: 640px tiles; motifs: 256px transparent PNG → WebP).
 */
import type { CSSProperties } from "react";

export const THEMES = ["reef", "desert", "trail", "heritage", "souk", "nile"] as const;
export type Theme = (typeof THEMES)[number];
export const isTheme = (s: unknown): s is Theme => typeof s === "string" && (THEMES as readonly string[]).includes(s);

export type MotifTone = "aqua" | "cobalt" | "persimmon" | "white";
export type PatternVariant = "feature" | "colour" | "aqua" | "cobalt" | "midnight" | "overlay";

type Spec = {
  motifs: readonly string[];   // the collection's five (six for reef) motifs, most typical first
  icon: string;                // the one motif that stands for the collection
  dark: boolean;               // is the feature tile dark (white text on it)?
  base: string;                // solid colour behind the feature tile while it loads
};

export const THEME: Record<Theme, Spec> = {
  reef: { motifs: ["turtle", "coral", "fish", "starfish", "seagrass", "reef"], icon: "turtle", dark: false, base: "#C4E7E5" },
  desert: { motifs: ["dromedary", "safari-4x4", "dunes", "desert-camp", "date-palm"], icon: "dromedary", dark: false, base: "#FCD9B4" },
  trail: { motifs: ["ridgeline", "trail-boot", "stone-cairn", "daypack", "compass"], icon: "ridgeline", dark: true, base: "#19244E" },
  heritage: { motifs: ["temple-gate", "lotus", "scarab", "temple-column", "obelisk"], icon: "temple-gate", dark: true, base: "#253C96" },
  souk: { motifs: ["souk-lantern", "clay-jug", "woven-basket", "market-stall", "tea-glass"], icon: "souk-lantern", dark: false, base: "#F7BB8C" },
  nile: { motifs: ["felucca", "river-heron", "papyrus", "crossed-oars", "life-ring"], icon: "felucca", dark: false, base: "#B3DBD9" },
};

export const patternUrl = (t: Theme, v: PatternVariant) => `/brand/coast/patterns/${t}-${v}.webp`;
export const motifUrl = (name: string, tone: MotifTone) => `/brand/coast/motifs/${name}-${tone}.webp`;

/** Inline style for a tiled pattern surface (320 CSS px per tile = compact print, 480 = generous). */
export function patternStyle(t: Theme, v: PatternVariant, size = 320): CSSProperties {
  return {
    backgroundColor: v === "overlay" ? undefined : v === "feature" ? THEME[t].base : v === "midnight" ? "#19244E" : v === "cobalt" ? "#253C96" : v === "aqua" ? "#C4E7E5" : "#FBF8F2",
    backgroundImage: `url("${patternUrl(t, v)}")`, backgroundSize: `${size}px ${size}px`, backgroundRepeat: "repeat",
  };
}

// Words that point to a collection (slug and English title are checked; order matters: Nile before temples).
const RULES: [Theme, RegExp][] = [
  ["nile", /\b(nile|felucca)/],
  ["trail", /\b(hike|hiking|trail|mountain|ridge|trek|canyon|climb)/],
  ["heritage", /\b(luxor|cairo|pyramid|temple|museum|karnak|valley of|pharaoh|tomb|giza|abydos|dendera|balloon)/],
  ["souk", /\b(souk|market|bazaar|dahar|old[- ]town|spice|cooking|city[- ]tour|oriental|tanoura|hammam)/],
  ["desert", /\b(desert|safari|quad|camel|bedouin|dune|buggy|jeep|stargaz|horse)/],
];
const BY_CATEGORY: Record<string, Theme> = { desert: "desert", culture: "souk", daytrips: "heritage" };

/** The collection a trip belongs to: the operator's choice, else guessed from its name and category. */
export function themeFor(t: { theme?: string | null; category?: string | null; slug?: string | null; title?: string | null }): Theme {
  if (isTheme(t.theme)) return t.theme;
  const text = `${t.slug ?? ""} ${t.title ?? ""}`.toLowerCase().replace(/-/g, " ");
  for (const [theme, re] of RULES) if (re.test(text)) return theme;
  return (t.category && BY_CATEGORY[t.category]) || "reef";
}

/** Each category's usual collection (category tiles, filters). */
export const CATEGORY_THEME: Record<string, Theme> = {
  sea: "reef", diving: "reef", watersports: "reef", family: "reef", evening: "desert", wellness: "reef",
  desert: "desert", culture: "souk", daytrips: "heritage",
};
