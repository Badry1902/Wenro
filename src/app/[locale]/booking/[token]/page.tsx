import type { Metadata } from "next";
import QRCode from "qrcode";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { BookingView } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/SiteHeader";
import { Steps } from "@/components/Steps";
import { IconCheck } from "@/components/Icons";
import { cancelBooking, reconfirmBooking } from "../actions";
import { PrintButton } from "./PrintButton";
import { CalendarButton } from "./CalendarButton";
import { ReviewForm } from "./ReviewForm";
import { MeetingMap } from "@/components/site/MeetingMap";
import { siteUrl } from "@/lib/env";
import { patternStyle, themeFor } from "@/lib/themes";
import { ThemeBadge } from "@/components/brand/ThemeArt";

export const dynamic = "force-dynamic";

// The link itself is the key to the booking: keep it out of search engines and referrers.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ new?: string }> };

export default async function BookingPage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  const fresh = (await searchParams).new === "1"; // just booked: celebrate once
  setRequestLocale(locale);
  const t = await getTranslations();
  const format = await getFormatter();

  const b = /^[a-f0-9]{64}$/.test(token) ? await rpc<BookingView | null>("booking_by_token", { p_token: token }, "service") : null;
  if (!b) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-xl px-4 py-16"><p role="alert" className="rounded-card bg-surface p-6">{t("voucher.notFound")}</p></main>
      </>
    );
  }

  const review = await rpc<{ eligible: boolean; review: { rating: number; body: string | null; status: string } | null } | null>(
    "review_for_token", { p_token: token }, "service").catch(() => null);
  const start = new Date(b.starts_at);
  const money = formatMoney({ minor: b.paid_minor, currency: b.currency }, locale);
  const active = b.status === "confirmed" || b.status === "pending_request";
  const cancellable = active && b.execution_status === "scheduled" && start.getTime() > Date.now();
  const freeHours = b.terms.cancellation_policy?.free_cancel_hours ?? 0;
  const free = start.getTime() - Date.now() >= freeHours * 3600_000;
  const first = b.customer.full_name.split(" ")[0];
  const theme = themeFor({ theme: await rpc<string | null>("trip_theme", { p_slug: b.experience.slug }, "anon").catch(() => null), slug: b.experience.slug, title: b.experience.title });
  const qr = b.status === "confirmed"
    ? await QRCode.toString(b.qr_token, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#19244E", light: "#FFFFFF" } })
    : null;
  const count = (kind: string) => b.lines.find((l) => l.kind === kind)?.quantity ?? 0;
  const travelers = [
    count("adult") ? t("common.adultsCount", { n: count("adult") }) : null,
    count("child") ? t("common.childrenCount", { n: count("child") }) : null,
    count("infant") ? t("common.infantsCount", { n: count("infant") }) : null,
  ].filter(Boolean).join(" · ");

  const badge =
    b.status === "confirmed" ? "bg-success-tint text-success" :
    b.status === "pending_request" ? "bg-warning-tint text-warning" : "bg-critical-tint text-critical";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
        <div className="print:hidden"><Steps current={4} /></div>

        <div className="mt-5 flex flex-col gap-1.5">
          <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[14px] font-bold ${badge}`}>
            {b.status === "confirmed" && (fresh
              ? <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="check-draw"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              : <IconCheck size={16} />)}{t(`voucher.${b.status}`)}
          </span>
          <h1 className="font-display text-[32px] leading-tight">
            {b.status === "confirmed" ? t("voucher.headline", { name: first })
              : b.status === "pending_request" ? t("voucher.headlinePending", { name: first })
              : t("voucher.headlineCancelled")}
          </h1>
          {active && <p className="text-[14px] text-ink-muted">{t("voucher.sentTo", { email: b.customer.email })} {t("voucher.keepLink")}</p>}
        </div>

        {b.status === "confirmed" && b.reconfirm_status === "sent" && (
          <form action={reconfirmBooking} className="mt-4 flex flex-col gap-2 rounded-card border-2 border-discovery bg-discovery-tint p-4 print:hidden">
            <input type="hidden" name="token" value={token} />
            <div className="font-bold">{t("voucher.reconfirmTitle")}</div>
            <p className="text-[14px]">{t("voucher.reconfirmBody")}</p>
            <button className="btn-press min-h-12 rounded-control bg-discovery font-bold text-white hover:bg-discovery-hover">{t("voucher.reconfirmButton")}</button>
          </form>
        )}
        {b.reconfirm_status === "confirmed" && b.status === "confirmed" && (
          <p className="mt-4 rounded-card bg-success-tint p-3 font-semibold text-success">{t("voucher.reconfirmed")}</p>
        )}

        {review?.eligible && (
          <div className="mt-4 print:hidden">
            <ReviewForm token={token} labels={{
              title: t("reviews.formTitle"), intro: t("reviews.formIntro"), rate: t("reviews.rate"), body: t("reviews.body"),
              bodyHint: t("reviews.bodyHint"), send: t("reviews.send"), sending: t("reviews.sending"), thanks: t("reviews.thanks"),
              stars: [1, 2, 3, 4, 5].map((n) => t(`reviews.star${n}` as "reviews.star1")),
              errors: { invalid_rating: t("reviews.errRating"), already_reviewed: t("reviews.errAlready"), review_too_long: t("reviews.errLong"),
                review_not_yet: t("reviews.errNotYet"), review_too_late: t("reviews.errLate"), unexpected_error: t("reviews.errOther") },
            }} />
          </div>
        )}
        {review?.review && (
          <p className="mt-4 rounded-card bg-success-tint p-4 text-[14px] print:hidden">
            <b>{t("reviews.yours", { n: review.review.rating })}</b> {review.review.status === "published" ? t("reviews.yoursPublished") : review.review.status === "pending" ? t("reviews.yoursPending") : ""}
          </p>
        )}

        <section aria-label={t("voucher.label")} className={`${fresh ? "ticket-in " : ""}mt-4 overflow-hidden rounded-card border border-line bg-surface`}>
          <div className="relative h-14 print:hidden" style={patternStyle(theme, "feature", 220)} aria-hidden="true">
            <ThemeBadge theme={theme} label="" className="absolute -bottom-4 end-4 z-10 ring-4 ring-white" size={26} />
          </div>
          <div className="flex items-center justify-between bg-discovery px-4 py-3 text-white">
            <span className="font-bold uppercase tracking-wide">{t("voucher.label")}</span>
            <span className="font-bold" dir="ltr">{b.ref}</span>
          </div>
          {qr && (
            <div className="flex items-center gap-4 border-b border-dashed border-[#C9CDDA] p-4">
              <div role="img" aria-label={t("voucher.qr")} className="h-28 w-28 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
              <div className="flex flex-col gap-1 text-[14px]">
                <span className="font-bold">{t("voucher.showAtPickup")}</span>
                <span className="text-ink-muted">{t("voucher.showAtPickupBody")}</span>
              </div>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5 p-4">
            <div className="col-span-2"><dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("booking.trip")}</dt><dd className="font-bold">{b.experience.title}</dd></div>
            <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("voucher.date")}</dt><dd className="font-bold">{format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</dd></div>
            <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("voucher.departure")}</dt><dd className="font-bold">{format.dateTime(start, { hour: "2-digit", minute: "2-digit" })}</dd></div>
            <div className="col-span-2">
              <dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{b.transport ? t("voucher.pickup") : t("voucher.meetingPoint")}</dt>
              <dd className="font-bold">{b.transport ? b.hotel : b.experience.meeting_info ?? t("experience.pending")}</dd>
              {b.transport && <dd className="text-small text-ink-muted">{t("voucher.pickupNote")}</dd>}
            </div>
            <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("voucher.travelers")}</dt><dd className="font-bold">{travelers}</dd></div>
            <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("voucher.operator")}</dt>
              {b.operator ? (
                <>
                  <dd className="font-bold">{b.operator}</dd>
                  {b.operator_phone && <dd><a href={`tel:${b.operator_phone.replace(/[^+\d]/g, "")}`} dir="ltr" className="font-semibold text-discovery hover:underline">{b.operator_phone}</a></dd>}
                </>
              ) : (
                <dd><span className="font-bold">{t("voucher.operatorLater")}</span>
                  <span className="block text-small text-ink-muted">{t("voucher.operatorLaterNote", { when: format.dateTime(new Date(b.operator_reveal_at), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</span></dd>
              )}
            </div>
            <div className="col-span-2 rounded-[12px] bg-apricot-tint p-3">
              <dt className="text-[12px] font-semibold uppercase tracking-wider">{t("voucher.payAtPickup")}</dt>
              <dd className="text-[24px] font-bold tabular-nums">{money}</dd>
              <dd className="text-small">{t("voucher.exact", { currency: b.currency })}</dd>
            </div>
          </dl>
        </section>

        {b.location && active && !b.transport && (
          <MeetingMap className="mt-4" point={{ lat: Number(b.location.lat), lng: Number(b.location.lng) }} exact
            label={b.location.place ?? t("voucher.meetingPoint")} openLabel={t("map.open")} note={t("map.voucherNote")} />
        )}

        {active && (
          <div className="mt-4 grid gap-3 print:hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <PrintButton label={t("voucher.save")} />
              <CalendarButton label={t("voucher.calendar")} title={b.experience.title ?? "WENRO"} start={b.starts_at} reference={b.ref}
                location={(b.transport ? b.hotel : b.experience.meeting_info) ?? "Hurghada"} url={`${siteUrl()}/${locale}/booking/${token}`} />
            </div>
            {cancellable && (
              <details className="rounded-card border border-line bg-surface p-4">
                <summary className="min-h-11 cursor-pointer content-center font-bold text-critical">{t("voucher.cancel")}</summary>
                <form action={cancelBooking} className="reveal-in mt-3 flex flex-col gap-3">
                  <input type="hidden" name="token" value={token} />
                  <p className="font-bold">{t("voucher.cancelTitle")}</p>
                  <p className="text-[14px]">{free ? t("voucher.cancelFree") : t("voucher.cancelLate")}</p>
                  <button className="btn-press min-h-12 rounded-control bg-critical font-bold text-white">{t("voucher.yesCancel")}</button>
                </form>
              </details>
            )}
          </div>
        )}
      </main>
    </>
  );
}
