/** Trip quality: what makes guests book. Each item has a weight; the score is out of 100. */
export type TripQuality = { id: string; slug: string; status: string; title: string | null; photos: number; videos: number; languages: number;
  description: number; itinerary: boolean; included: boolean; meeting: boolean; departures: number; reviews: number; rating: number | null };

export const QUALITY_ITEMS = [
  { key: "photos", weight: 20, ok: (q: TripQuality) => q.photos >= 5 },
  { key: "languages", weight: 15, ok: (q: TripQuality) => q.languages >= 5 },
  { key: "description", weight: 10, ok: (q: TripQuality) => q.description >= 300 },
  { key: "itinerary", weight: 10, ok: (q: TripQuality) => q.itinerary },
  { key: "included", weight: 10, ok: (q: TripQuality) => q.included },
  { key: "meeting", weight: 10, ok: (q: TripQuality) => q.meeting },
  { key: "departures", weight: 15, ok: (q: TripQuality) => q.departures >= 8 },
  { key: "video", weight: 5, ok: (q: TripQuality) => q.videos >= 1 },
  { key: "reviews", weight: 5, ok: (q: TripQuality) => q.reviews >= 1 },
] as const;

export function qualityScore(q: TripQuality) {
  const missing = QUALITY_ITEMS.filter((i) => !i.ok(q));
  return { score: 100 - missing.reduce((a, i) => a + i.weight, 0), missing: missing.map((i) => i.key) };
}
