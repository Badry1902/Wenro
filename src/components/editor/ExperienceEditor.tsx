"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/lib/money";
import { saveExperience, type SaveState } from "@/app/[locale]/app/editor-actions";
import { LOCALES, TEXT_FIELDS, type EditorData, type EditorOptions, type Loc, type TextField } from "./types";

const input = "min-h-11 w-full rounded-control border border-[#8A90A6] bg-surface px-3";
const toMajor = (minor: number | null | undefined) => (minor == null ? "" : String(minor / 100));
const toMinor = (major: string) => {
  const n = Number.parseFloat(major.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

function Save({ label, pending }: { label: string; pending: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button disabled={busy} data-pending={busy || undefined} className="btn-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-discovery px-5 font-bold text-white hover:bg-discovery-hover disabled:opacity-80">
      {busy && <span className="spinner" aria-hidden="true" />}
      {busy ? pending : label}
    </button>
  );
}

export function ExperienceEditor({ initial, options, back, base }: { initial: EditorData; options: EditorOptions; back: string; base: string }) {
  const t = useTranslations("app.editor");
  const locale = useLocale();
  const [d, setD] = useState<EditorData>(initial);
  const [tab, setTab] = useState<Loc>("en");
  // Languages filled in by machine translation (until someone edits them), and languages edited in this session
  const [machine] = useState<Set<Loc>>(() => new Set(LOCALES.filter((l) => (initial.translations[l] as { machine_translated?: boolean } | undefined)?.machine_translated)));
  const [touched, setTouched] = useState<Set<Loc>>(() => new Set());
  const [state, action] = useActionState<SaveState, FormData>(saveExperience, undefined);

  // Same rule as the database: guest price = net ÷ operator share, rounded up to whole units.
  const guest = (net: number | null | undefined) => {
    if (net == null) return null;
    if (net === 0) return 0;
    const { operator_share_bps: share, rounding_minor: r } = options.pricing;
    return Math.ceil((net * 10000) / share / r) * r;
  };
  const eur = (minor: number | null) => (minor == null ? "—" : formatMoney({ minor, currency: "EUR" }, locale));

  const setText = (loc: Loc, f: TextField, v: string) => {
    setTouched((s) => (s.has(loc) ? s : new Set(s).add(loc)));
    setD((x) => ({ ...x, translations: { ...x.translations, [loc]: { ...(x.translations[loc] ?? {}), [f]: v } } }));
  };
  const setPrice = (kind: "adult" | "child" | "infant" | "private_group", patch: Partial<{ net_minor: number | null; age_min: number | null; age_max: number | null; max_group: number | null }>) =>
    setD((x) => {
      const cur = x.prices[kind] ?? { net_minor: 0, age_min: null, age_max: null, max_group: null, active: true };
      const next = { ...cur, ...patch, active: true } as typeof cur & { net_minor: number | null };
      const prices = { ...x.prices };
      if (next.net_minor == null) delete prices[kind];
      else prices[kind] = next as typeof cur;
      return { ...x, prices };
    });

  const payload = useMemo(() => JSON.stringify({
    id: d.id, operator_id: d.operator_id, category_id: d.category_id, booking_mode: d.booking_mode,
    duration_minutes: d.duration_minutes, cancellation_policy_id: d.cancellation_policy_id,
    private_available: d.private_available, private_max_group: d.private_max_group,
    // only the text fields (the stored rows also carry flags such as machine_translated)
    translations: Object.fromEntries(Object.entries(d.translations).map(([l, tr]) => [l, Object.fromEntries(TEXT_FIELDS.map((f) => [f, tr?.[f] ?? null]))])),
    touched: [...touched],
    machine: [...machine].filter((l) => !touched.has(l)),
    prices: Object.fromEntries(Object.entries(d.prices).filter(([, v]) => v && v.active !== false)),
    extras: d.extras, transport: d.transport,
  }), [d, touched, machine]);

  const priceRow = (kind: "adult" | "child" | "infant", ages: boolean) => {
    const p = d.prices[kind];
    const active = p && p.active !== false;
    return (
      <div className="grid gap-3 rounded-card border border-line p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-small font-bold">{t(`price.${kind}`)} · {t("netLabel")}
          <input inputMode="decimal" dir="ltr" placeholder={kind === "adult" ? "24" : t("optional")} className={input}
            value={active ? toMajor(p!.net_minor) : ""} onChange={(e) => setPrice(kind, { net_minor: e.target.value === "" ? null : toMinor(e.target.value) })} />
        </label>
        {ages && (
          <div className="flex gap-2">
            <label className="flex w-20 flex-col gap-1.5 text-small font-bold">{t("ageFrom")}
              <input type="number" min={0} max={99} className={input} value={p?.age_min ?? ""} disabled={!active}
                onChange={(e) => setPrice(kind, { age_min: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
            <label className="flex w-20 flex-col gap-1.5 text-small font-bold">{t("ageTo")}
              <input type="number" min={0} max={99} className={input} value={p?.age_max ?? ""} disabled={!active}
                onChange={(e) => setPrice(kind, { age_max: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
          </div>
        )}
        <output aria-live="polite" className="text-small sm:pb-3 sm:text-end">
          {t("guestPays")} <b key={active ? p!.net_minor : "none"} className="value-tick tabular-nums">{active ? eur(guest(p!.net_minor)) : "—"}</b>
        </output>
      </div>
    );
  };

  return (
    <form action={action} className="flex flex-col gap-8 pb-24">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="payload" value={payload} />

      {state?.error && <p role="alert" className="flash-in rounded-card bg-critical-tint p-3 font-semibold text-critical">{t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t("errors.unexpected_error")}</p>}

      <section className="grid gap-4 md:grid-cols-2" aria-labelledby="ed-basics">
        <h2 id="ed-basics" className="text-h3 font-bold md:col-span-2">{t("basics")}</h2>
        {options.operators && !d.id && (
          <label className="flex flex-col gap-1.5 text-small font-bold md:col-span-2">{t("operator")}
            <select required className={input} value={d.operator_id ?? ""} onChange={(e) => setD({ ...d, operator_id: e.target.value })}>
              <option value="" disabled>{t("choose")}</option>
              {options.operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-small font-bold">{t("category")}
          <select className={input} value={d.category_id ?? ""} onChange={(e) => setD({ ...d, category_id: e.target.value || null })}>
            <option value="">{t("choose")}</option>
            {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-small font-bold">{t("duration")}
          <input type="number" min={0.25} max={48} step={0.25} className={input} value={d.duration_minutes ? d.duration_minutes / 60 : ""}
            onChange={(e) => setD({ ...d, duration_minutes: e.target.value ? Math.round(Number(e.target.value) * 60) : null })} />
        </label>
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-small font-bold">{t("bookingMode")}</legend>
          <div className="flex flex-col gap-2">
            {(["instant", "request"] as const).map((m) => (
              <label key={m} className="flex min-h-11 items-start gap-3 rounded-control border border-line p-3 has-[:checked]:border-discovery has-[:checked]:bg-discovery-tint">
                <input type="radio" name="mode" checked={d.booking_mode === m} onChange={() => setD({ ...d, booking_mode: m })} className="mt-1 h-5 w-5 accent-discovery" />
                <span><span className="font-semibold">{t(`mode.${m}`)}</span><br /><span className="text-small text-ink-muted">{t(`mode.${m}Hint`)}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-small font-bold">{t("policy")}
          <select className={input} value={d.cancellation_policy_id ?? ""} onChange={(e) => setD({ ...d, cancellation_policy_id: e.target.value || null })}>
            {options.policies.map((p) => <option key={p.id} value={p.id}>{t("policyHours", { hours: p.hours })}</option>)}
          </select>
        </label>
      </section>

      <section aria-labelledby="ed-texts">
        <h2 id="ed-texts" className="mb-1 text-h3 font-bold">{t("texts")}</h2>
        <p className="mb-3 text-small text-ink-muted">{t("textsHint")}</p>
        <div role="tablist" aria-label={t("texts")} className="mb-4 flex flex-wrap gap-1">
          {LOCALES.map((l) => {
            const filled = !!d.translations[l]?.title?.trim();
            return (
              <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)}
                className={`tab-chip btn-press min-h-11 rounded-control border px-4 font-semibold ${tab === l ? "border-discovery bg-discovery text-white" : "border-line bg-surface"}`}>
                {l.toUpperCase()}{filled && <span aria-label={t("filled")} className="ms-1.5 inline-block h-2 w-2 rounded-full bg-success align-middle" />}
                {filled && machine.has(l) && !touched.has(l) && <span className={`ms-1.5 rounded-full px-1.5 text-[10px] font-bold uppercase ${tab === l ? "bg-white/25" : "bg-apricot-tint text-ink"}`}>{t("auto")}</span>}
              </button>
            );
          })}
        </div>
        {machine.has(tab) && !touched.has(tab) && !!d.translations[tab]?.title?.trim() && (
          <p className="mb-3 rounded-card bg-apricot-tint p-3 text-small">{t("autoNote")}</p>
        )}
        <div key={tab} className="panel-in grid gap-4" dir={tab === "ar" ? "rtl" : "ltr"}>
          {TEXT_FIELDS.map((f) => {
            const long = !["title", "summary"].includes(f);
            const v = d.translations[tab]?.[f] ?? "";
            return (
              <label key={f} className="flex flex-col gap-1.5 text-small font-bold">
                <span>{t(`field.${f}`)}{tab === "en" && f === "title" ? " *" : ""}</span>
                {long ? (
                  <textarea rows={f === "description" ? 5 : 3} className={`${input} py-2`} value={v} onChange={(e) => setText(tab, f, e.target.value)} />
                ) : (
                  <input className={input} value={v} maxLength={f === "title" ? 120 : 300} onChange={(e) => setText(tab, f, e.target.value)} />
                )}
                {["itinerary", "included", "excluded"].includes(f) && <span className="font-normal text-ink-muted">{t("onePerLine")}</span>}
              </label>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="ed-prices" className="flex flex-col gap-3">
        <h2 id="ed-prices" className="text-h3 font-bold">{t("prices")}</h2>
        <p className="text-small text-ink-muted">{t("pricesHint")}</p>
        {priceRow("adult", true)}
        {priceRow("child", true)}
        {priceRow("infant", true)}
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-discovery" checked={d.private_available}
            onChange={(e) => setD({ ...d, private_available: e.target.checked })} />
          <span className="font-semibold">{t("private")}</span>
        </label>
        {d.private_available && (
          <div className="reveal-in grid gap-3 rounded-card border border-line p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="flex flex-col gap-1.5 text-small font-bold">{t("price.private_group")} · {t("netLabel")}
              <input inputMode="decimal" dir="ltr" className={input} value={toMajor(d.prices.private_group?.net_minor)}
                onChange={(e) => setPrice("private_group", { net_minor: e.target.value === "" ? null : toMinor(e.target.value) })} />
            </label>
            <label className="flex w-28 flex-col gap-1.5 text-small font-bold">{t("maxGroup")}
              <input type="number" min={1} max={100} className={input} value={d.private_max_group ?? ""}
                onChange={(e) => { const n = e.target.value ? Number(e.target.value) : null; setD({ ...d, private_max_group: n }); setPrice("private_group", { max_group: n }); }} />
            </label>
            <output className="text-small sm:pb-3">{t("guestPays")} <b className="tabular-nums">{eur(guest(d.prices.private_group?.net_minor))}</b></output>
          </div>
        )}
      </section>

      <section aria-labelledby="ed-extras" className="flex flex-col gap-3">
        <h2 id="ed-extras" className="text-h3 font-bold">{t("extras")}</h2>
        {d.extras.map((x, i) => (
          <div key={i} className="reveal-in grid gap-3 rounded-card border border-line p-4 md:grid-cols-[1fr_1fr_8rem_9rem_auto] md:items-end">
            {(["en", "ar"] as const).map((l) => (
              <label key={l} className="flex flex-col gap-1.5 text-small font-bold">{t("extraName", { lang: l.toUpperCase() })}
                <input dir={l === "ar" ? "rtl" : "ltr"} className={input} value={x.names[l] ?? ""}
                  onChange={(e) => setD({ ...d, extras: d.extras.map((y, j) => (j === i ? { ...y, names: { ...y.names, [l]: e.target.value } } : y)) })} />
              </label>
            ))}
            <label className="flex flex-col gap-1.5 text-small font-bold">{t("netLabel")}
              <input inputMode="decimal" dir="ltr" className={input} value={toMajor(x.net_minor)}
                onChange={(e) => setD({ ...d, extras: d.extras.map((y, j) => (j === i ? { ...y, net_minor: toMinor(e.target.value) ?? 0 } : y)) })} />
            </label>
            <label className="flex flex-col gap-1.5 text-small font-bold">{t("per")}
              <select className={input} value={x.per} onChange={(e) => setD({ ...d, extras: d.extras.map((y, j) => (j === i ? { ...y, per: e.target.value as "person" | "booking" } : y)) })}>
                <option value="person">{t("perPerson")}</option><option value="booking">{t("perBooking")}</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
              <span className="text-small">{t("guestPays")} <b className="tabular-nums">{eur(guest(x.net_minor))}</b></span>
              <button type="button" className="btn-press min-h-11 rounded-control border border-line px-3 text-small font-semibold" onClick={() => setD({ ...d, extras: d.extras.filter((_, j) => j !== i) })}>{t("remove")}</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn-press min-h-11 self-start rounded-control border border-discovery px-4 font-bold text-discovery"
          onClick={() => setD({ ...d, extras: [...d.extras, { id: null, net_minor: 0, per: "person", names: {} }] })}>+ {t("addExtra")}</button>
      </section>

      <section aria-labelledby="ed-transfer" className="flex flex-col gap-3">
        <h2 id="ed-transfer" className="text-h3 font-bold">{t("transfer")}</h2>
        <p className="text-small text-ink-muted">{t("transferHint")}</p>
        <ul className="divide-y divide-line rounded-card border border-line">
          {options.zones.map((z) => {
            const tr = d.transport.find((x) => x.zone_id === z.id);
            const upd = (patch: Partial<EditorData["transport"][number]>) =>
              setD({ ...d, transport: d.transport.map((x) => (x.zone_id === z.id ? { ...x, ...patch } : x)) });
            return (
              <li key={z.id} className="grid gap-3 p-3 md:grid-cols-[12rem_1fr] md:items-center">
                <label className="flex min-h-11 items-center gap-3 font-semibold">
                  <input type="checkbox" className="h-5 w-5 accent-discovery" checked={!!tr}
                    onChange={(e) => setD({ ...d, transport: e.target.checked ? [...d.transport, { zone_id: z.id, net_minor: 1600, per: "vehicle", vehicle_capacity: 7 }] : d.transport.filter((x) => x.zone_id !== z.id) })} />
                  {z.name}
                </label>
                {tr && (
                  <div className="reveal-in flex flex-wrap items-end gap-3">
                    <label className="flex w-28 flex-col gap-1 text-small font-bold">{t("netLabel")}
                      <input inputMode="decimal" dir="ltr" className={input} value={toMajor(tr.net_minor)} onChange={(e) => upd({ net_minor: toMinor(e.target.value) ?? 0 })} />
                    </label>
                    <label className="flex flex-col gap-1 text-small font-bold">{t("per")}
                      <select className={input} value={tr.per} onChange={(e) => upd({ per: e.target.value as "vehicle" | "person", vehicle_capacity: e.target.value === "vehicle" ? tr.vehicle_capacity ?? 7 : null })}>
                        <option value="vehicle">{t("perVehicle")}</option><option value="person">{t("perPerson")}</option>
                      </select>
                    </label>
                    {tr.per === "vehicle" && (
                      <label className="flex w-24 flex-col gap-1 text-small font-bold">{t("seatsPerCar")}
                        <input type="number" min={1} max={60} className={input} value={tr.vehicle_capacity ?? 7} onChange={(e) => upd({ vehicle_capacity: Number(e.target.value) || 7 })} />
                      </label>
                    )}
                    <span className="pb-3 text-small">{t("guestPays")} <b className="tabular-nums">{eur(guest(tr.net_minor))}</b></span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10">
        <a href={back} className="btn-press inline-flex min-h-11 items-center rounded-control border border-line px-4 font-semibold">{t("cancel")}</a>
        <Save label={d.id ? t("save") : t("create")} pending={t("saving")} />
      </div>
    </form>
  );
}
