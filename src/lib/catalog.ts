import type { ExperienceCard } from "@/lib/data/types";

/** Trip categories in display order (slugs match the categories table). */
export const CATEGORIES = ["sea", "diving", "watersports", "desert", "family", "evening", "culture", "daytrips", "wellness"] as const;
export type CategorySlug = (typeof CATEGORIES)[number];

export const isCategory = (s: string | null | undefined): s is CategorySlug => !!s && (CATEGORIES as readonly string[]).includes(s);

/** Photos for a card: the gallery list when present, otherwise the cover. */
export function cardImages(c: ExperienceCard): string[] {
  if (c.images?.length) return c.images;
  return c.cover && c.cover.kind !== "video" ? [c.cover.path] : [];
}

/**
 * "Similar trips": same category first, then trips that share hotel pickup and a similar length,
 * never the trip itself. Stable order so the page does not reshuffle on every visit.
 */
export function similarTo(all: ExperienceCard[], current: { id: string; category: string | null; duration_minutes: number | null }, n: number) {
  const d = current.duration_minutes ?? 0;
  const score = (c: ExperienceCard) =>
    (c.category === current.category ? 100 : 0) - Math.min(60, Math.abs((c.duration_minutes ?? 0) - d) / 10);
  return all.filter((c) => c.id !== current.id).sort((a, b) => score(b) - score(a)).slice(0, n);
}
