import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { saveCoupon } from "../../actions";

export const dynamic = "force-dynamic";

type Coupon = { id: string; code: string; percent_bps: number; valid_to: string | null; max_uses: number | null; uses: number; active: boolean };

export default async function AdminCoupons({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale);
  const t = await getTranslations("app.coupons");
  const format = await getFormatter();
  const data = await rpc<{ max_bps: number; coupons: Coupon[] }>("admin_coupons", {}, "user");
  const max = data.max_bps / 100;
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value="/app/admin/coupons" /></>);

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub", { max })} />
      <Flash ok={q.ok} err={q.err} />
      <Card title={t("new")} className="mb-8">
        <form action={saveCoupon} className="flex flex-wrap items-end gap-3">
          {hidden}
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("code")}
            <input name="code" required pattern="[A-Za-z0-9]{3,20}" dir="ltr" className={`${field} w-40 uppercase`} placeholder="SUMMER10" />
          </label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("percent")}
            <input name="percent" type="number" required min={1} max={max} step={0.5} defaultValue={Math.min(10, max)} className={`${field} w-24`} />
          </label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("validTo")}
            <input name="valid_to" type="date" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("maxUses")}
            <input name="max_uses" type="number" min={1} className={`${field} w-28`} />
          </label>
          <Submit className={btn.primary}>{t("save")}</Submit>
        </form>
        <p className="mt-3 text-small text-ink-muted">{t("hint")}</p>
      </Card>
      {data.coupons.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="divide-y divide-line rounded-card border border-line">
          {data.coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <span className="flex flex-wrap items-center gap-2">
                <b dir="ltr" className="tracking-wider">{c.code}</b> · {c.percent_bps / 100}%
                <Badge value={c.active ? "active" : "closed"} />
                <span className="text-small text-ink-muted">
                  {t("uses", { n: c.uses })}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  {c.valid_to && <> · {t("until", { date: format.dateTime(new Date(c.valid_to), { day: "numeric", month: "short", year: "numeric" }) })}</>}
                </span>
              </span>
              <form action={saveCoupon}>
                {hidden}<input type="hidden" name="code" value={c.code} /><input type="hidden" name="percent" value={c.percent_bps / 100} />
                <input type="hidden" name="valid_to" value={c.valid_to ? c.valid_to.slice(0, 10) : ""} /><input type="hidden" name="max_uses" value={c.max_uses ?? ""} />
                <input type="hidden" name="active" value={c.active ? "0" : "1"} />
                <Submit className={btn.quiet}>{c.active ? t("turnOff") : t("turnOn")}</Submit>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
