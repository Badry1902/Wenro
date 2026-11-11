import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { withCoords } from "@/lib/data/coords";
import type { ExperienceCard } from "@/lib/data/types";
import { cardImages } from "@/lib/catalog";

const cardImagesSlim = (c: ExperienceCard) => cardImages(c).slice(0, 1);

/** Published trips for the header search (public card data only), cached for 5 minutes. */
export async function GET(req: NextRequest) {
  const locale = /^(en|de|ru|fr|ar)$/.test(req.nextUrl.searchParams.get("locale") ?? "") ? req.nextUrl.searchParams.get("locale")! : "en";
  const cards = await withCoords(await rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]));
  const slim: ExperienceCard[] = cards.map((c) => ({
    id: c.id, slug: c.slug, title: c.title, summary: c.summary, category: c.category, theme: c.theme ?? null,
    lat: c.lat ?? null, lng: c.lng ?? null, from_minor: c.from_minor, currency: c.currency, cover: c.cover ?? null,
    images: cardImagesSlim(c), duration_minutes: c.duration_minutes,
    city: c.city ?? null, alat: c.alat ?? null, alng: c.alng ?? null,
  }));
  return NextResponse.json(slim, { headers: { "cache-control": "public, max-age=300, s-maxage=300" } });
}
