import type { MetadataRoute } from "next";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { siteUrl } from "@/lib/env";
import { routing } from "@/i18n/routing";
import { CATEGORIES } from "@/lib/catalog";

export const revalidate = 3600;

/** Every public page in every language, with the other languages listed as alternates (search engines). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.NEXT_PUBLIC_SITE_MODE === "preview") return [];
  const base = siteUrl();
  const cards = await rpc<ExperienceCard[]>("experience_list", { p_locale: "en" }, "anon").catch(() => [] as ExperienceCard[]);
  const paths = ["", "/experiences", ...CATEGORIES.map((c) => `/experiences?cat=${c}`), ...cards.map((c) => `/experiences/${c.slug}`)];
  return paths.map((p) => ({
    url: `${base}/en${p}`,
    changeFrequency: p.startsWith("/experiences/") ? "daily" : "weekly",
    priority: p === "" ? 1 : p.startsWith("/experiences/") ? 0.8 : 0.6,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${p}`])) },
  }));
}
