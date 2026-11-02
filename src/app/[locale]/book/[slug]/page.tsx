import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperiencePage } from "@/lib/data/types";
import { preview, type Selection } from "@/lib/pricing";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/auth";
import { getWorkspaces } from "@/lib/workspaces";
import { CheckoutFlow } from "./CheckoutFlow";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const int = (v: string | undefined, d: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= 0 && n <= 20 ? n : d;
};

export async function generateMetadata() {
  const t = await getTranslations("booking");
  return { title: `${t("detailsTitle")} · WENRO`, robots: { index: false } };
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const page = await rpc<ExperiencePage | null>("experience_page", { p_slug: slug, p_locale: locale }, "anon");
  if (!page) notFound();

  const slot = page.slots.find((s) => s.id === q.s);
  if (!slot) notFound();

  const sel: Selection = {
    adults: Math.max(1, int(q.a, 1)),
    children: int(q.c, 0),
    infants: int(q.i, 0),
    hotelId: page.hotels.some((h) => h.id === q.h) ? q.h! : null,
    transport: q.t === "1",
    extras: (q.x ?? "").split(",").filter((id) => page.extras.some((x) => x.id === id)),
  };
  // Agency counter booking: only for an active agency the signed-in person belongs to.
  let agency: { id: string; name: string } | null = null;
  if (q.ag && (await currentUserId())) {
    const w = (await getWorkspaces(locale)).find((x) => x.org_id === q.ag && x.type === "agency" && x.status === "active");
    if (w) agency = { id: w.org_id, name: w.name };
  }
  const display = q.cur && (q.cur === page.currency || page.fx[q.cur]) ? q.cur : page.currency;

  return (
    <>
      <SiteHeader />
      <CheckoutFlow
        page={page}
        slot={slot}
        sel={sel}
        totals={preview(page, sel)}
        display={display}
        rate={display === page.currency ? null : page.fx[display] ?? null}
        backHref={{ pathname: `/experiences/${slug}`, ...(agency ? { query: { ag: agency.id } } : {}) }}
        agency={agency}
      />
    </>
  );
}
