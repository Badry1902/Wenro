import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { formatMoney } from "@/lib/money";
import { dayKey } from "@/lib/pricing";
import { requirePlatform } from "@/lib/workspaces";
import { Empty, PageTitle, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { createPayouts } from "../../../actions";

export const dynamic = "force-dynamic";

type Row = {
  partner: string; partner_type: string; instapay: string | null; currency: string; total_minor: number;
  trips: { ref: string; starts_at: string; title: string | null; operator: string; seats: number; paid_minor: number; commission_minor: number }[];
};

/** "Owed to partners": payable commissions not in a payout yet, partner by partner, with the trips that earned them. */
export default async function PartnerDues({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePlatform(locale, "finance");
  const t = await getTranslations("app.dues");
  const tf = await getTranslations("app.finance");
  const tt = await getTranslations("app.types");
  const format = await getFormatter();
  const rows = await rpc<Row[]>("admin_partner_dues", {}, "user");
  const m = (minor: number, c: string) => formatMoney({ minor: Number(minor), currency: c as "EUR" }, locale);
  const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: "Africa/Cairo" });
  const thisMonth = dayKey(new Date().toISOString()).slice(0, 7);

  return (
    <>
      <PageTitle title={t("partnersTitle")} sub={t("partnersSub")} actions={<Link href="/app/admin/finance" className={btn.quiet}>{t("backToFinance")}</Link>} />

      {rows.length === 0 ? <Empty>{t("partnersNone")}</Empty> : (
        <div className="flex flex-col gap-4">
          {rows.map((p) => (
            <details key={p.partner + p.currency} className="rounded-card border border-line" open={rows.length <= 3}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="flex flex-wrap items-center gap-2 font-bold">{p.partner}<span className="text-small font-semibold text-ink-muted">{tt(p.partner_type as "agency")}</span></span>
                  <span className="text-small text-ink-muted">{tf("trips", { n: p.trips.length })} · InstaPay: <span dir="ltr">{p.instapay ?? tf("noInstapay")}</span></span>
                </span>
                <span className="text-h3 font-bold tabular-nums">{m(p.total_minor, p.currency)}</span>
              </summary>
              <div className="overflow-x-auto border-t border-line p-2 md:p-4">
                <table className="w-full min-w-[560px] text-small">
                  <thead className="text-ink-muted">
                    <tr className="border-b border-line">
                      <th className="p-2 text-start font-semibold">{t("trip")}</th>
                      <th className="p-2 text-start font-semibold">{t("date")}</th>
                      <th className="p-2 text-start font-semibold">{t("operator")}</th>
                      <th className="p-2 text-end font-semibold">{t("collected")}</th>
                      <th className="p-2 text-end font-semibold">{t("commission")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.trips.map((r) => (
                      <tr key={r.ref} className="border-b border-line last:border-0">
                        <td className="p-2"><span className="font-semibold">{r.title ?? "—"}</span><br /><span className="text-ink-muted" dir="ltr">{r.ref}</span> · {t("seats", { n: r.seats })}</td>
                        <td className="p-2 whitespace-nowrap">{day(r.starts_at)}</td>
                        <td className="p-2">{r.operator}</td>
                        <td className="p-2 text-end tabular-nums">{m(r.paid_minor, p.currency)}</td>
                        <td className="p-2 text-end font-bold tabular-nums">{m(r.commission_minor, p.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
          <form action={createPayouts} className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-discovery-tint p-4">
            <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value="/app/admin/finance" />
            <input type="hidden" name="month" value={`${thisMonth}-01`} />
            <p className="max-w-xl text-small">{tf("createPayoutsHint", { month: format.dateTime(new Date(`${thisMonth}-15T12:00:00Z`), { month: "long", year: "numeric" }) })}</p>
            <Submit className={btn.primary}>{tf("createPayouts")}</Submit>
          </form>
        </div>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("partnersNote")}</p>
    </>
  );
}
