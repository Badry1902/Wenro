import QRCode from "qrcode";
import { FirstSteps } from "@/components/growth/Steps";
import { PartnerGrowth, type PartnerStats } from "@/components/growth/PartnerGrowth";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/env";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, Stat, StatRow, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { CopyButton } from "@/components/CopyButton";
import { QrDownload, ShareKit } from "@/components/ShareKit";
import { Link } from "@/i18n/navigation";
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
  const tg = await getTranslations("app.growth");
  const format = await getFormatter();
  const [s, experiences, bookings, stats] = await Promise.all([
    rpc<Summary>("partner_summary", { p_partner: org }, "user"),
    rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]),
    rpc<{ status: string; execution_status: string }[]>("partner_bookings", { p_partner: org }, "user").catch(() => []),
    rpc<PartnerStats>("partner_stats", { p_partner: org }, "user").catch(() => null),
  ]);
  const visits = s.codes.reduce((a, c) => a + Number(c.clicks), 0);
  const booked = bookings.filter((b) => !["cancelled", "expired", "declined"].includes(b.status)).length;
  const done = bookings.filter((b) => b.execution_status === "executed").length;
  // Only meaningful once visits are counted for most bookings (older bookings came before link counting)
  const conversion = visits > 0 && booked <= visits ? Math.round((booked / visits) * 1000) / 10 : null;
  const base = siteUrl();
  const code = s.codes.find((c) => c.active)?.code ?? null;
  const target = experiences.find((e) => e.slug === q.x) ?? null;
  const link = code ? `${base}/${locale}${target ? `/experiences/${target.slug}` : ""}?ref=${code}` : null;
  const qr = link ? await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#19244E", light: "#FFFFFF" } }) : null;

  const currencies = [...new Set(Object.keys(s.totals).map((k) => k.split(":")[0]))];
  const m = (minor: number, c: string) => formatMoney({ minor: Number(minor), currency: c as "EUR" }, locale);
  const back = `/app/p/${org}`;

  return (
    <>
      <PageTitle title={t(ws.type === "agency" ? "titleAgency" : "titleMarketer")} sub={t(ws.type === "agency" ? "subAgency" : "subMarketer")}
        actions={ws.type === "agency" ? <Link href={`/app/p/${org}/book`} className={btn.primary}>{t("bookNow")}</Link> : undefined} />
      <Flash ok={q.ok} err={q.err} />
      <FirstSteps title={tg("stepsTitle")} sub={tg("stepsSub")} steps={[
        { label: tg("pStep.payout"), done: !!s.org.instapay, href: `${back}#payout`, cta: tg("go") },
        { label: tg(ws.type === "agency" ? "pStep.bookAgency" : "pStep.share"), done: visits > 0 || booked > 0, href: ws.type === "agency" ? `${back}/book` : `${back}/kit`, cta: tg("go") },
        { label: tg("pStep.firstBooking"), done: booked > 0 },
        { label: tg("pStep.firstTrip"), done: done > 0 },
      ]} />
      {stats && <PartnerGrowth s={stats} locale={locale} org={org} />}

      {/* At a glance */}
      <div className="mb-8">
        <StatRow>
          <Stat label={t("kpiVisits")} value={format.number(visits)} note={t("kpiVisitsHint")} />
          <Stat label={t("kpiBookings")} value={format.number(booked)} note={t("kpiBookingsHint", { done })} />
          <Stat label={t("kpiConversion")} value={conversion == null ? "—" : `${format.number(conversion)}%`} note={t("kpiConversionHint")} />
          <Stat label={t("kpiReady")} value={currencies.length ? currencies.map((c) => m(s.totals[`${c}:payable`] ?? 0, c)).join(" · ") : "—"} note={t("kpiReadyHint")} />
        </StatRow>
      </div>

      {/* How earning works, in three steps */}
      <ol className="mb-8 grid gap-x-6 gap-y-3 border-y border-line py-4 md:grid-cols-3">
        {(["how1", "how2", "how3"] as const).map((k, n) => (
          <li key={k} className="flex gap-3 text-[14px] text-ink-muted">
            <span className="font-mono text-[13px] tabular-nums text-ink">{String(n + 1).padStart(2, "0")}</span>
            <span>{t(`${k}${ws.type === "agency" ? "Agency" : ""}` as "how1")}</span>
          </li>
        ))}
      </ol>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card title={t("linkTitle")}>
          {!code ? <p className="text-ink-muted">{t("noCode")}</p> : (
            <>
              <p className="mb-3 text-small text-ink-muted">{t("linkHint")}</p>
              <form className="mb-3 flex flex-wrap items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-medium text-ink-muted">{t("linkTo")}
                  <select name="x" defaultValue={target?.slug ?? ""} className={field}>
                    <option value="">{t("homePage")}</option>
                    {experiences.map((e) => <option key={e.slug} value={e.slug}>{e.title}</option>)}
                  </select>
                </label>
                <Submit className={btn.quiet}>{t("makeLink")}</Submit>
              </form>
              <p dir="ltr" className="mb-3 select-all break-all rounded-control border border-line bg-[#FAF9F6] p-3 font-mono text-[13px]">{link}</p>
              <div className="flex flex-wrap items-center gap-3">
                <CopyButton text={link!} label={t("copy")} done={t("copied")} />
                <span className="text-[14px] text-ink-muted">{t("code")}: <span dir="ltr" className="font-mono text-ink">{code}</span></span>
              </div>
              <p className="mt-3 text-small text-ink-muted">{t("rules")}</p>
            </>
          )}
        </Card>
        {qr && (
          <figure className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-4">
            <div className="h-44 w-44" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} />
            <figcaption className="max-w-44 text-center text-small text-ink-muted">{t("qrHint")}</figcaption>
            <QrDownload svg={qr} name={`wenro-${code}`} labels={{ png: t("qrPng"), svg: t("qrSvg") }} />
          </figure>
        )}
      </div>

      {code && experiences.length > 0 && (
        <Card title={t("shareTitle")} className="mb-8">
          <p className="mb-3 text-small text-ink-muted">{t("shareHint")}</p>
          <ShareKit
            items={experiences.map((e) => ({ title: e.title ?? e.slug, url: `${base}/${locale}/experiences/${e.slug}?ref=${code}` }))}
            labels={{ more: t("shareMore"), search: t("shareSearch"), copy: t("copy"), copied: t("copied"), whatsapp: "WhatsApp", telegram: "Telegram", facebook: "Facebook", message: t("shareMessage"), none: t("shareNone") }}
          />
        </Card>
      )}

      <h2 className="mb-3 text-[18px] font-semibold">{t("earningsTitle")}</h2>
      {currencies.length === 0 ? <Empty>{t("noEarnings")}</Empty> : currencies.map((c) => (
        <div key={c} className="mb-3">
          <StatRow>
            {STAGES.map((st) => <Stat key={st} label={t(`stage.${st}`)} value={m(s.totals[`${c}:${st}`] ?? 0, c)} />)}
          </StatRow>
        </div>
      ))}
      <p className="mb-8 text-small text-ink-muted">{t("stagesHint")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("clicksTitle")}>
          {s.codes.length === 0 ? <p className="text-ink-muted">—</p> : (
            <ul className="flex flex-col gap-1">
              {s.codes.map((c) => <li key={c.code} className="flex justify-between gap-2"><span dir="ltr" className="font-mono">{c.code}</span><span className="tabular-nums">{t("clicks", { n: c.clicks })}</span></li>)}
            </ul>
          )}
          <p className="mt-2 text-small text-ink-muted">{t("clicksHint")}</p>
        </Card>
        <Card title={t("payoutTitle")} className="scroll-mt-6" id="payout">
          {canManage(ws) ? (
            <form action={setPayoutHandle} className="mb-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="org" value={org} />
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-medium text-ink-muted">{t("instapay")}
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
                  <span className="flex items-center gap-2 tabular-nums"><span className="font-medium">{m(p.amount_minor, p.currency)}</span><Badge value={p.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
