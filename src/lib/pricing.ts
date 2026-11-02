import type { ExperiencePage, HotelRow } from "@/lib/data/types";

/**
 * Price PREVIEW shown while the visitor chooses. It mirrors the booking engine's rules
 * (per person / per car transfer, extras per person or per booking) using display prices.
 * The database recomputes everything when the booking is created; this is never trusted.
 */
export type Selection = {
  adults: number;
  children: number;
  infants: number;
  hotelId: string | null;
  transport: boolean;
  extras: string[]; // extra ids, one unit per person (or per booking)
};

export type PreviewLine = { key: string; kind: string; quantity: number; unit: number; total: number; label?: string | null };

export function priceOf(page: ExperiencePage, kind: "adult" | "child" | "infant") {
  return page.prices.find((p) => p.kind === kind) ?? null;
}

export function transportFor(page: ExperiencePage, hotel: HotelRow | undefined) {
  if (!hotel) return null;
  return page.prices.find((p) => p.kind === "transport" && p.zone_id === hotel.zone_id) ?? null;
}

export function preview(page: ExperiencePage, s: Selection) {
  const lines: PreviewLine[] = [];
  for (const kind of ["adult", "child", "infant"] as const) {
    const qty = kind === "adult" ? s.adults : kind === "child" ? s.children : s.infants;
    const p = priceOf(page, kind);
    if (qty > 0 && p) lines.push({ key: kind, kind, quantity: qty, unit: p.price_minor, total: qty * p.price_minor });
  }
  const seats = s.adults + s.children;
  const persons = seats + s.infants;
  for (const id of s.extras) {
    const x = page.extras.find((e) => e.id === id);
    if (!x) continue;
    const qty = x.per === "booking" ? 1 : persons;
    if (qty > 0) lines.push({ key: `x-${id}`, kind: "extra", quantity: qty, unit: x.price_minor, total: qty * x.price_minor, label: x.name });
  }
  const hotel = page.hotels.find((h) => h.id === s.hotelId);
  const t = s.transport ? transportFor(page, hotel) : null;
  if (t && persons > 0) {
    const qty = t.per === "vehicle" ? Math.ceil(persons / (t.vehicle_capacity ?? 1)) : seats;
    lines.push({ key: "transport", kind: "transport", quantity: qty, unit: t.price_minor, total: qty * t.price_minor });
  }
  const total = lines.reduce((sum, l) => sum + l.total, 0);
  return { lines, total, seats, persons, transportUnavailable: s.transport && !!hotel && !t };
}

/** Group departures by their calendar day in Hurghada. */
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
