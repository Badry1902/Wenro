import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { dataMode } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import type { ExperiencePage } from "@/lib/data/types";

const GUID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
type Trip = { id: string; slug: string; title: string | null; duration_minutes: number | null; slots: { id: string; starts_at: string; seats_left: number }[] };

const cairoDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

/**
 * Same answer as plan_slots, built from the public trip pages. Used while a database hasn't run the
 * 2026-11-10 update (plan_slots missing). Published trips only, open departures with free seats,
 * at least 2 hours ahead, within the guest's dates (max 31 days).
 */
async function fallback(ids: string[], from: string, to: string, locale: string): Promise<Trip[]> {
  if (dataMode() === "localpg") return [];
  const { data } = await createServiceClient().from("experiences").select("id, slug").eq("status", "published").in("id", ids);
  const last = new Date(Date.parse(`${from}T12:00:00Z`) + 30 * 864e5).toISOString().slice(0, 10);
  const end = to < last ? to : last, soon = Date.now() + 2 * 3600_000;
  const pages = await Promise.all((data ?? []).map((x) => rpc<ExperiencePage | null>("experience_page", { p_slug: x.slug, p_locale: locale }, "anon").catch(() => null)));
  return pages.filter((p): p is ExperiencePage => !!p).map((p) => ({
    id: p.id, slug: p.slug, title: p.title, duration_minutes: p.duration_minutes,
    slots: p.slots.filter((s) => s.seats_left > 0 && Date.parse(s.starts_at) > soon && cairoDay(s.starts_at) >= from && cairoDay(s.starts_at) <= end)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  }));
}

/** Open departures with free seats for the trips in a guest's plan (public data only). */
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  const ids = (s.get("ids") ?? "").split(",").filter((x) => GUID.test(x)).slice(0, 12);
  const from = s.get("from") ?? "", to = s.get("to") ?? "";
  const locale = /^(en|de|ru|fr|ar)$/.test(s.get("locale") ?? "") ? s.get("locale")! : "en";
  if (!ids.length || !DAY.test(from) || !DAY.test(to)) return NextResponse.json([]);
  let data: Trip[];
  try { data = await rpc<Trip[]>("plan_slots", { p_ids: ids, p_from: from, p_to: to, p_locale: locale }, "anon"); }
  catch { data = await fallback(ids, from, to, locale).catch(() => []); }
  return NextResponse.json(data ?? [], { headers: { "cache-control": "public, max-age=60" } });
}
