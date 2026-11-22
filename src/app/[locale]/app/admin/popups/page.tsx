import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { Card, Empty, Flash, PageTitle, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { setPopupStatus } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; name: string; status: "draft" | "active" | "paused" | "archived"; layout: "card" | "modal" | "bar";
  pages: string[]; locales: string[] | null; device: string; starts_at: string | null; ends_at: string | null;
  image_url: string | null; content: Record<string, { title: string }>; live: boolean; views: number; clicks: number; closes: number;
};

const TONE: Record<Row["status"], string> = {
  active: "bg-success-tint text-success", draft: "bg-muted text-ink-muted", paused: "bg-warning-tint text-warning", archived: "bg-muted text-ink-muted",
};

export default async function AdminPopups({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale, "popups");
  const t = await getTranslations("app.popups");
  const format = await getFormatter();
  const rows = await rpc<Row[]>("admin_popups", {}, "user");
  const day = (s: string) => format.dateTime(new Date(s), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
  const now = Date.now();
  const hidden = <input type="hidden" name="locale" value={locale} />;

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} actions={<Link href="/app/admin/popups/new" className={btn.primary}>+ {t("new")}</Link>} />
      <Flash ok={q.ok} err={q.err} />

      {rows.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="mb-8 flex flex-col gap-3">
          {rows.map((r) => {
            const title = r.content[locale]?.title || r.content.ar?.title || r.content.en?.title || Object.values(r.content)[0]?.title || "";
            const timing = r.status !== "active" ? null : r.live ? "liveNow" : r.ends_at && Date.parse(r.ends_at) <= now ? "ended" : "scheduled";
            const ctr = r.views > 0 ? Math.round((r.clicks / r.views) * 1000) / 10 : 0;
            return (
              <li key={r.id} className={`flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4 ${r.status === "archived" ? "opacity-60" : ""}`}>
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-muted">
                  {r.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={r.image_url} alt="" className="size-full object-cover" />
                    : <span className="text-[11px] font-bold uppercase text-ink-muted">{t(`layout.${r.layout}`)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate">{r.name}</b>
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${TONE[r.status]}`}>{t(`status.${r.status}`)}</span>
                    {timing && <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${timing === "liveNow" ? "text-success" : "text-ink-muted"}`}>
                      {timing === "liveNow" && <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />}{t(timing)}</span>}
                  </div>
                  <p className="truncate text-small text-ink-muted">{title}</p>
                  <p className="text-[12px] text-ink-muted">
                    {t(`layout.${r.layout}`)} · {r.pages.map((p) => t(`page.${p}` as "page.home")).join("، ")}
                    {r.starts_at && <> · {t("startsAt")} {day(r.starts_at)}</>}{r.ends_at && <> · {t("endsAt")} {day(r.ends_at)}</>}
                  </p>
                  <p className="text-[12px] text-ink-muted">{t("stats", { views: r.views, clicks: r.clicks, closes: r.closes })}{r.views > 0 && <> · {t("ctr", { pct: ctr })}</>}</p>
                </div>
                {r.status !== "archived" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/app/admin/popups/${r.id}`} className={btn.quiet}>{t("editBtn")}</Link>
                    <form action={setPopupStatus}>
                      {hidden}<input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={r.status === "active" ? "paused" : "active"} />
                      <Submit className={r.status === "active" ? btn.quiet : btn.primary}>{r.status === "active" ? t("pause") : t("activate")}</Submit>
                    </form>
                    <details data-popover className="relative">
                      <summary className={`${btn.quiet} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{t("archive")}</summary>
                      <div className="popover-panel absolute end-0 top-full z-10 mt-2 w-72 rounded-card border border-line bg-surface p-4 shadow-lg">
                        <p className="mb-3 text-small">{t("archiveConfirm")}</p>
                        <form action={setPopupStatus}>
                          {hidden}<input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="archived" />
                          <Submit className={btn.danger}>{t("archive")}</Submit>
                        </form>
                      </div>
                    </details>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Card title={t("rulesTitle")}>
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-small text-ink-muted">
          {(["r1", "r2", "r3", "r4", "r5"] as const).map((k) => <li key={k}>{t(`rules.${k}`)}</li>)}
        </ul>
      </Card>
    </>
  );
}
