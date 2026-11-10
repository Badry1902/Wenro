"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExperiencePage, SlotRow } from "@/lib/data/types";
import type { PreviewLine, Selection } from "@/lib/pricing";
import { approxDisplay, formatMoney } from "@/lib/money";
import { Steps } from "@/components/Steps";
import { IconBack, IconCash } from "@/components/Icons";
import { placeBooking, type PlaceBookingState } from "../actions";

const CODES = ["+49", "+7", "+44", "+33", "+20", "+48", "+420", "+31", "+32", "+41", "+43", "+39", "+34", "+1", "+380", "+36", "+40", "+966", "+971"];
const defaultCode: Record<string, string> = { de: "+49", ru: "+7", fr: "+33", ar: "+20", en: "+44" };

type Props = {
  page: ExperiencePage;
  slot: SlotRow;
  sel: Selection;
  totals: { lines: PreviewLine[]; total: number };
  display: string;
  rate: number | null;
  backHref: { pathname: string; query?: Record<string, string> };
  agency?: { id: string; name: string } | null;
};

export function CheckoutFlow({ page, slot, sel, totals, display, rate, backHref, agency }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const [step, setStep] = useState<2 | 3>(2);
  const [state, action] = useActionState<PlaceBookingState, FormData>(placeBooking, undefined);
  // Controlled fields: React resets uncontrolled inputs after every form action, including a refused one.
  const [f, setF] = useState({ name: "", email: "", code: defaultCode[locale] ?? "+49", phone: "", room: "", coupon: "", accept: false });
  const [touched, setTouched] = useState(false);

  const errs = {
    name: f.name.trim().length < 2,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()),
    phone: f.phone.replace(/\D/g, "").length < 6,
  };
  const valid = !errs.name && !errs.email && !errs.phone;
  const money = (minor: number) => formatMoney({ minor, currency: page.currency }, locale);
  const start = new Date(slot.starts_at);
  const when = format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const hotel = page.hotels.find((h) => h.id === sel.hotelId);
  const freeUntil = page.policy ? new Date(start.getTime() - page.policy.free_cancel_hours * 3600_000) : null;
  const label = (l: PreviewLine) =>
    l.kind === "adult" ? t("common.adults") : l.kind === "child" ? t("common.children") : l.kind === "infant" ? t("common.infants")
      : l.kind === "transport" ? t("common.transfer") : l.label ?? "";
  const travelers = [
    sel.adults ? t("common.adultsCount", { n: sel.adults }) : null,
    sel.children ? t("common.childrenCount", { n: sel.children }) : null,
    sel.infants ? t("common.infantsCount", { n: sel.infants }) : null,
  ].filter(Boolean).join(" · ");

  const field = "min-h-12 rounded-control border border-[#8A90A6] bg-surface px-3.5 text-[16px]";
  const input = `${field} w-full`;
  const bad = "border-2 border-critical";

  return (
    <main className="mx-auto max-w-xl px-4 pb-40 pt-4">
      <div className="mb-3 flex items-center gap-1">
        {step === 2 ? (
          <Link href={backHref} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-control hover:bg-discovery-tint"><IconBack size={22} /></Link>
        ) : (
          <button type="button" onClick={() => setStep(2)} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-control hover:bg-discovery-tint"><IconBack size={22} /></button>
        )}
        <h1 className="text-h3 font-bold">{step === 2 ? t("booking.detailsTitle") : t("booking.reviewTitle")}</h1>
      </div>
      <Steps current={step} />
      {agency && <p role="status" className="mt-3 rounded-card bg-discovery-tint p-3 text-small font-semibold text-discovery">{t("booking.agencyBanner", { name: agency.name })}</p>}

      <div className="mt-4 flex items-center gap-3 rounded-card border border-line bg-surface p-3.5">
        <div className="h-14 w-14 shrink-0 rounded-[12px] bg-[#CBD3F7]" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-bold">{page.title}</div>
          <div className="text-small text-ink-muted">{when} · {travelers}</div>
        </div>
      </div>

      <form action={action} noValidate className="mt-5">
        {/* What is being booked. The database re-checks and re-prices all of it. */}
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="experience_id" value={page.id} />
        <input type="hidden" name="slot_id" value={slot.id} />
        <input type="hidden" name="adults" value={sel.adults} />
        <input type="hidden" name="children" value={sel.children} />
        <input type="hidden" name="infants" value={sel.infants} />
        <input type="hidden" name="hotel_id" value={sel.hotelId ?? ""} />
        <input type="hidden" name="transport" value={sel.transport ? "1" : "0"} />
        <input type="hidden" name="extras" value={sel.extras.join(",")} />
        <input type="hidden" name="display_currency" value={display} />
        {agency && <input type="hidden" name="agency_id" value={agency.id} />}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <div className={step === 2 ? "panel-in flex flex-col gap-5" : "hidden"}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full_name" className="text-small font-bold">{t("booking.fullName")}</label>
            <input id="full_name" name="full_name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
              aria-invalid={touched && errs.name} aria-describedby="name-help" className={`${input} ${touched && errs.name ? bad : ""}`} />
            <span id="name-help" className={`text-small ${touched && errs.name ? "font-semibold text-critical" : "text-ink-muted"}`}>
              {touched && errs.name ? t("booking.nameError") : t("booking.fullNameHelp")}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-small font-bold">{t("booking.email")}</label>
            <input id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
              aria-invalid={touched && errs.email} aria-describedby="email-err" className={`${input} ${touched && errs.email ? bad : ""}`} />
            {touched && errs.email && <span id="email-err" className="reveal-in text-small font-semibold text-critical">{t("booking.emailError")}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-small font-bold">{t("booking.whatsapp")}</label>
            <div className="flex gap-2" dir="ltr">
              <select name="country_code" aria-label={t("booking.countryCode")} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className={`${field} w-28 shrink-0`}>
                {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input id="phone" name="phone"  type="tel" autoComplete="tel-national" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })}
                aria-invalid={touched && errs.phone} aria-describedby="phone-help" className={`${field} min-w-0 flex-1 ${touched && errs.phone ? bad : ""}`} />
            </div>
            <span id="phone-help" className={`text-small ${touched && errs.phone ? "font-semibold text-critical" : "text-ink-muted"}`}>
              {touched && errs.phone ? t("booking.phoneError") : t("booking.whatsappHelp")}
            </span>
          </div>

          {sel.transport && hotel && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="room" className="text-small font-bold">{t("booking.room")} <span className="font-normal text-ink-muted">{t("common.optional")}</span></label>
              <input id="room" name="room" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} className={input} />
              <span className="text-small text-ink-muted">{t("booking.roomHelp", { hotel: hotel.name })}</span>
            </div>
          )}
        </div>

        <div className={step === 3 ? "panel-in flex flex-col gap-3" : "hidden"}>
          {state?.error && (
            <div role="alert" className="flash-in rounded-card bg-critical-tint p-4 font-semibold text-critical">
              {t(`booking.errors.${state.error}` as "booking.errors.unexpected_error")}
              {(state.error === "sold_out" || state.error === "slot_closed") && (
                <div className="mt-2"><Link href={backHref} className="underline">{t("widget.chooseDeparture")}</Link></div>
              )}
            </div>
          )}

          <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("booking.trip")}</div>
            <div className="text-[17px] font-bold">{page.title}</div>
            <div>{when} <span className="text-ink-muted">· {t("common.hurghadaTime")}</span></div>
            <div className="flex justify-between gap-3">
              <span>{sel.transport && hotel ? t("booking.pickup", { hotel: hotel.name }) : t("booking.noPickup")}</span>
              <button type="button" onClick={() => setStep(2)} className="text-small font-semibold text-discovery">{t("common.edit")}</button>
            </div>
          </section>

          <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("booking.price")}</div>
            {totals.lines.map((l) => (
              <div key={l.key} className="flex justify-between gap-3"><span>{l.quantity} × {label(l)}</span><span className="tabular-nums">{money(l.total)}</span></div>
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
              <span className="font-bold">{t("common.total")}</span><span className="text-[24px] font-bold tabular-nums">{money(totals.total)}</span>
            </div>
          </section>

          <section className="flex gap-3 rounded-card bg-apricot-tint p-4">
            <IconCash size={24} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-bold">{t("booking.payTitle", { amount: money(totals.total) })}</div>
              <div className="text-[14px]">{t("booking.payBody", { currency: page.currency })}{" "}
                {rate ? t("booking.payApprox", { approx: approxDisplay(totals.total, rate, display, locale) ?? "" }) : ""}</div>
            </div>
          </section>

          {freeUntil && (
            <section className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-4">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("booking.cancellation")}</div>
              <p>{t("booking.freeUntil", { date: format.dateTime(freeUntil, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</p>
              <p className="text-[14px] text-ink-muted">{t("booking.reconfirmNote")}</p>
            </section>
          )}
          {page.booking_mode === "request" && <p className="rounded-card bg-warning-tint p-3 text-[14px] text-warning">{t("booking.requestNote")}</p>}

          <section className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{t("booking.yourDetails")}</div>
            <div className="flex justify-between gap-3"><span>{f.name}</span><button type="button" onClick={() => setStep(2)} className="text-small font-semibold text-discovery">{t("common.edit")}</button></div>
            <div className="text-[14px] text-ink-muted" dir="ltr">{f.email} · {f.code} {f.phone}</div>
          </section>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="coupon" className="text-small font-bold">{t("booking.promo")} <span className="font-normal text-ink-muted">{t("common.optional")}</span></label>
            <input id="coupon" name="coupon" autoCapitalize="characters" value={f.coupon} onChange={(e) => setF({ ...f, coupon: e.target.value })} className={`${input} uppercase`} />
            <span className="text-small text-ink-muted">{t("booking.promoNote")}</span>
          </div>

          <label className="mt-1 flex items-start gap-3 text-[14px]">
            <input type="checkbox" name="accept" checked={f.accept} onChange={(e) => setF({ ...f, accept: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-discovery" />
            <span>{t("booking.accept")}</span>
          </label>
          <label className="flex items-start gap-3 text-[14px]">
            <input type="checkbox" name="whatsapp" defaultChecked className="mt-0.5 h-5 w-5 shrink-0 accent-discovery" />
            <span>{t("booking.whatsappOptIn")}</span>
          </label>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-3">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="text-small text-ink-muted">{t("common.total")}</div>
              <div className="text-[22px] font-bold tabular-nums">{money(totals.total)}</div>
            </div>
            {step === 2 ? (
              <button type="button" onClick={() => { setTouched(true); if (valid) { setStep(3); window.scrollTo({ top: 0 }); } }}
                className="btn-press min-h-13 rounded-control bg-discovery px-6 text-[16px] font-bold text-white hover:bg-discovery-hover">
                {t("booking.reviewBooking")}
              </button>
            ) : (
              <Submit />
            )}
          </div>
          {step === 3 && <p className="mt-1 text-center text-small text-ink-muted">{t("booking.nothingCharged")}</p>}
        </div>
      </form>
    </main>
  );
}

function Submit() {
  const t = useTranslations("booking");
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      className="btn-press inline-flex min-h-13 min-w-48 items-center justify-center gap-2 rounded-control bg-discovery px-6 text-[16px] font-bold text-white hover:bg-discovery-hover disabled:opacity-80">
      {pending && <span className="spinner" aria-hidden="true" />}
      {pending ? t("confirming") : t("confirm")}
    </button>
  );
}
