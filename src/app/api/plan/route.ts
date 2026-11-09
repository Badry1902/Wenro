import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";

const GUID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Open departures with free seats for the trips in a guest's plan (public data only). */
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  const ids = (s.get("ids") ?? "").split(",").filter((x) => GUID.test(x)).slice(0, 12);
  const from = s.get("from") ?? "", to = s.get("to") ?? "";
  const locale = /^(en|de|ru|fr|ar)$/.test(s.get("locale") ?? "") ? s.get("locale")! : "en";
  if (!ids.length || !DAY.test(from) || !DAY.test(to)) return NextResponse.json([]);
  const data = await rpc("plan_slots", { p_ids: ids, p_from: from, p_to: to, p_locale: locale }, "anon").catch(() => []);
  return NextResponse.json(data, { headers: { "cache-control": "public, max-age=60" } });
}
