import "server-only";
import { dataMode } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import type { ExperienceCard } from "./types";

/**
 * Meeting points for trip cards when the list came without them (a database that hasn't run the
 * 2026-11-10 update yet). Same privacy rule as the database: exact only when the operator made it
 * public, otherwise rounded to ~1 km. Published trips only. Never throws: cards come back as they were.
 */
export async function withCoords(cards: ExperienceCard[]): Promise<ExperienceCard[]> {
  if (!cards.length || cards.some((c) => c.lat != null) || dataMode() === "localpg") return cards;
  try {
    const { data, error } = await createServiceClient().from("experiences")
      .select("id, meeting_lat, meeting_lng, meeting_exact_public").eq("status", "published").in("id", cards.map((c) => c.id));
    if (error || !data) return cards;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const by = new Map(data.filter((x) => x.meeting_lat != null && x.meeting_lng != null).map((x) => [x.id as string, x]));
    return cards.map((c) => {
      const x = by.get(c.id);
      if (!x) return c;
      const exact = !!x.meeting_exact_public;
      return { ...c, lat: exact ? Number(x.meeting_lat) : r2(Number(x.meeting_lat)), lng: exact ? Number(x.meeting_lng) : r2(Number(x.meeting_lng)) };
    });
  } catch {
    return cards;
  }
}
