/**
 * Where WENRO works: Egypt's tourist governorates and their cities. A traveller picks the city they stay in;
 * trips are then sorted by distance from it (a trip's meeting point), so the nearest come first.
 * Names live in messages (places.gov.* and places.city.*). Coordinates are city centres (WGS84).
 */
export type City = { slug: string; gov: string; lat: number; lng: number };

export const GOVERNORATES = ["redsea", "southsinai", "luxor", "aswan", "cairo", "giza", "alexandria", "matrouh"] as const;

export const CITIES: City[] = [
  { slug: "hurghada", gov: "redsea", lat: 27.2579, lng: 33.8116 },
  { slug: "el-gouna", gov: "redsea", lat: 27.3942, lng: 33.6782 },
  { slug: "makadi", gov: "redsea", lat: 26.9897, lng: 33.8986 },
  { slug: "sahl-hasheesh", gov: "redsea", lat: 27.0459, lng: 33.8820 },
  { slug: "soma-bay", gov: "redsea", lat: 26.8481, lng: 33.9860 },
  { slug: "safaga", gov: "redsea", lat: 26.7292, lng: 33.9365 },
  { slug: "el-quseir", gov: "redsea", lat: 26.1043, lng: 34.2779 },
  { slug: "marsa-alam", gov: "redsea", lat: 25.0676, lng: 34.8790 },
  { slug: "sharm", gov: "southsinai", lat: 27.9158, lng: 34.3300 },
  { slug: "dahab", gov: "southsinai", lat: 28.5010, lng: 34.5136 },
  { slug: "nuweiba", gov: "southsinai", lat: 29.0333, lng: 34.6667 },
  { slug: "st-catherine", gov: "southsinai", lat: 28.5559, lng: 33.9760 },
  { slug: "luxor", gov: "luxor", lat: 25.6872, lng: 32.6396 },
  { slug: "aswan", gov: "aswan", lat: 24.0889, lng: 32.8998 },
  { slug: "abu-simbel", gov: "aswan", lat: 22.3372, lng: 31.6258 },
  { slug: "cairo", gov: "cairo", lat: 30.0444, lng: 31.2357 },
  { slug: "giza", gov: "giza", lat: 29.9870, lng: 31.2118 },
  { slug: "alexandria", gov: "alexandria", lat: 31.2001, lng: 29.9187 },
  { slug: "marsa-matrouh", gov: "matrouh", lat: 31.3543, lng: 27.2373 },
  { slug: "siwa", gov: "matrouh", lat: 29.2032, lng: 25.5195 },
];

export const cityBySlug = (s: string | null | undefined) => CITIES.find((c) => c.slug === s) ?? null;

/** Great-circle distance in km. */
export function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** The city a trip starts in (closest city centre to its meeting point). */
export function nearestCity(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return null;
  let best: City | null = null, d = Infinity;
  for (const c of CITIES) { const x = km(lat, lng, c.lat, c.lng); if (x < d) { d = x; best = c; } }
  return best ? { city: best, km: d } : null;
}

/** Distance from the chosen city to a trip (null when the trip has no meeting point yet). */
export function distanceTo(city: City, t: { lat?: number | null; lng?: number | null }) {
  return t.lat == null || t.lng == null ? null : km(city.lat, city.lng, Number(t.lat), Number(t.lng));
}

/** "In the city" (≤ 25 km), "nearby" (≤ 90 km, an easy pickup), else "a day trip away". */
export const nearness = (d: number | null) => d == null ? "unknown" : d <= 25 ? "in" : d <= 90 ? "near" : "far";

export const CITY_KEY = "wenro.city";
export const CITY_EVENT = "wenro:city";
