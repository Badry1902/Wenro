import QRCode from "qrcode";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/env";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { CopyButton } from "@/components/CopyButton";
import { setPayoutHandle } from "../../actions";

export const dynamic = "force-dynamic";

type Summary = {
  org: { id: string; type: "marketer" | "agency"; name: string; status: string; instapay: string | null };
  codes: { code: string; active: boolean; clicks: number }[];
  totals: Record<string, number>; // "EUR:pending" → minor units
  payouts: { period_month: string; currency: string; amount_minor: number; status: string; paid_at: string | null }[];
};
type Props = { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ x?: string; ok?: string; err?: string }> };

const STAGES = ["pending", "eligible", "payable", "paid"] as const;

export default async function PartnerHome({ params, searchParams }: Props) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requireWorkspace(locale, org, ["marketer", "agency"]);
  const t = await getTranslations("app.partner");
  const format = await getFormatter();
  const [s, experiences] = await Promise.all([
    rpc<Summary>("partner_summary", { p_partner: org }, "user"),
    rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]),
  ]);
  const code = s.codes.find((c) => c.active)?.code ?? null;
  const target = experiences.find((e) => e.slug === q.x) ?? null;
  const link = code ? `${siteUrl()}/${locale}${target ? `/experiences/${target.slug}` : ""}?ref=${code}` : null;
  const qr = link ? await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#232B45", light: "#FFFFFF" } }) : null;

  const currencies = [...new Set(Object.keys(s.totals).map((k) => k.split(":")[0]))];
  const m = (minor: number, c: string) => formatMoney({ minor: Number(minor), currency: c as "EUR" }, locale);
  const back = `/app/p/${org}`;

  return (
    <>
      <PageTitle title={t("title")} sub={t(ws.type === "agency" ? "subAgency" : "subMarketer")} />
      <Flash ok={q.ok} err={q.err} />

      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card title={t("linkTitle")}>
          {!code ? <p className="text-ink-muted">{t("noCode")}</p> : (
            <>
              <p className="mb-3 text-small text-ink-muted">{t("linkHint")}</p>
              <form className="mb-3 flex flex-wrap items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-small font-bold">{t("linkTo")}
                  <select name="x" defaultValue={target?.slug ?? ""} className={field}>
                    <option value="">{t("homePage")}</option>
                    {experiences.map((e) => <option key={e.slug} value={e.slug}>{e.title}</option>)}
                  </select>
                </label>
                <Submit className={btn.quiet}>{t("makeLink")}</Submit>
              </form>
              <p dir="ltr" className="mb-3 select-all break-all rounded-control bg-[#F7F8FC] p-3 font-mono text-[14px]">{link}</p>
              <div className="flex flex-wrap items-center gap-3">
                <CopyButton text={link!} label={t("copy")} done={t("copied")} />
                <span className="text-small">{t("code")}: <b dir="ltr" className="tracking-wider">{code}</b></span>
              </div>
              <p className="mt-3 text-small text-ink-muted">{t("rules")}</p>
            </>
          )}
        </Card>
        {qr && (
          <figure className="flex flex-col items-center gap-2 rounded-card border border-line p-4">
            <div className="h-44 w-44" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} />
            <figcaption className="max-w-44 text-center text-small text-ink-muted">{t("qrHint")}</figcaption>
          </figure>
        )}
      </div>

      <h2 className="mb-3 text-h3 font-bold">{t("earningsTitle")}</h2>
      {currencies.length === 0 ? <Empty>{t("noEarnings")}</Empty> : currencies.map((c) => (
        <div key={c} className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((st) => (
            <div key={st} className="rounded-card border border-line p-4">
              <div className="text-small font-semibold text-ink-muted">{t(`stage.${st}`)}</div>
              <div className="text-h3 font-bold tabular-nums">{m(s.totals[`${c}:${st}`] ?? 0, c)}</div>
            </div>
          ))}
        </div>
      ))}
      <p className="mb-8 text-small text-ink-muted">{t("stagesHint")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("clicksTitle")}>
          {s.codes.length === 0 ? <p className="text-ink-muted">—</p> : (
            <ul className="flex flex-col gap-1">
              {s.codes.map((c) => <li key={c.code} className="flex justify-between gap-2"><span dir="ltr" className="font-semibold">{c.code}</span><span className="tabular-nums">{t("clicks", { n: c.clicks })}</span></li>)}
            </ul>
          )}
          <p className="mt-2 text-small text-ink-muted">{t("clicksHint")}</p>
        </Card>
        <Card title={t("payoutTitle")}>
          {canManage(ws) ? (
            <form action={setPayoutHandle} className="mb-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="org" value={org} />
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-small font-bold">{t("instapay")}
                <input name="handle" defaultValue={s.org.instapay ?? ""} maxLength={80} dir="ltr" placeholder="name@instapay" className={field} />
              </label>
              <Submit className={btn.quiet}>{t("save")}</Submit>
            </form>
          ) : <p className="mb-4 text-small">{t("instapay")}: <span dir="ltr">{s.org.instapay ?? "—"}</span></p>}
          {s.payouts.length === 0 ? <p className="text-ink-muted">{t("noPayouts")}</p> : (
            <ul className="divide-y divide-line">
              {s.payouts.map((p) => (
                <li key={p.period_month + p.currency} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{format.dateTime(new Date(`${p.period_month.slice(0, 10)}T12:00:00Z`), { month: "long", year: "numeric" })}</span>
                  <span className="flex items-center gap-2 tabular-nums"><b>{m(p.amount_minor, p.currency)}</b><Badge value={p.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
