import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { routing } from "@/i18n/routing";

/** Pop-ups that may show on the public pages now, in one language. Shared-cacheable for a minute. */
export async function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get("locale") ?? "en";
  const locale = (routing.locales as readonly string[]).includes(l) ? l : "en";
  const list = await rpc<unknown[]>("active_popups", { p_locale: locale }, "anon").catch(() => []);
  return NextResponse.json(list, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
