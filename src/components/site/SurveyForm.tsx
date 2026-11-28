"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Answers, Question, Section } from "@/lib/survey";

type Lang = "en" | "ar";

const UI = {
  en: {
    required: "Required", optional: "Optional", pickUpTo: (n: number) => `Up to ${n}`, other: "Something else",
    otherPh: "Tell us", textPh: "Type here", progress: (a: number, b: number) => `${a} of ${b} required answered`,
    contactTitle: "Can we ask you a follow-up question?",
    contactBody: "Leave an email or WhatsApp number only if you're happy for us to contact you for a short chat. Otherwise your answers stay anonymous.",
    consent: "Yes, you may contact me about this survey", contactPh: "Email or WhatsApp number",
    privacy: "How we handle data", send: "Send my answers", sending: "Sending…",
    missing: "Please answer the questions marked Required.", tooMany: "Too many answers from this connection. Please try again in an hour.",
    failed: "Something went wrong. Your answers are still here, please try again.",
    doneTitle: "Thank you!", doneBody: "Your answers will help us shape WENRO. If you left your contact details, we may reach out in the next few weeks.",
    browse: "See trips on WENRO", scaleLow: "Doesn't matter", scaleHigh: "A must",
  },
  ar: {
    required: "مطلوب", optional: "اختياري", pickUpTo: (n: number) => `لحد ${n}`, other: "حاجة تانية",
    otherPh: "اكتبها هنا", textPh: "اكتب هنا", progress: (a: number, b: number) => `جاوبت ${a} من ${b} سؤال مطلوب`,
    contactTitle: "ممكن نسألك سؤال كمان بعدين؟",
    contactBody: "سيب إيميلك أو رقم الواتساب بس لو موافق نتواصل معاك لدردشة قصيرة. غير كده إجاباتك بتفضل من غير اسم.",
    consent: "أيوه، موافق تتواصلوا معايا بخصوص الاستبيان ده", contactPh: "الإيميل أو رقم الواتساب",
    privacy: "إزاي بنتعامل مع البيانات", send: "ابعت إجاباتي", sending: "بيتبعت…",
    missing: "من فضلك جاوب على الأسئلة المكتوب جنبها مطلوب.", tooMany: "اتبعت إجابات كتير من نفس الاتصال. جرب تاني بعد ساعة.",
    failed: "حصلت مشكلة. إجاباتك لسه موجودة، جرب تبعت تاني.",
    doneTitle: "شكرًا ليك!", doneBody: "إجاباتك هتساعدنا نطور WENRO. لو سيبت بيانات تواصل، ممكن نكلمك في الأسابيع الجاية.",
    browse: "شوف الرحلات على WENRO", scaleLow: "مش فارقة", scaleHigh: "لازم",
  },
};

const DRAFT = "wenro-survey-draft";
type Draft = { answers: Answers; other: Record<string, string> };

function answered(q: Question, a: Answers, other: Record<string, string>) {
  const v = a[q.id];
  if (q.kind === "many") return (Array.isArray(v) && v.length > 0) || !!other[q.id]?.trim();
  if (q.kind === "scale") return !!v && typeof v === "object" && Object.keys(v).length > 0;
  return typeof v === "string" && v.trim() !== "";
}

const chip = (on: boolean) =>
  `flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3.5 py-2.5 text-start transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link ${
    on ? "border-ink bg-ink text-surface" : "border-field bg-surface text-ink hover:border-ink"}`;

export function SurveyForm({ sections, lang, locale, source }: { sections: Section[]; lang: Lang; locale: string; source: string | null }) {
  const u = UI[lang];
  const [answers, setAnswers] = useState<Answers>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const honey = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  const all = useMemo(() => sections.flatMap((s) => s.questions), [sections]);
  const required = all.filter((q) => q.required);
  const done = required.filter((q) => answered(q, answers, other)).length;

  // keep an unsent draft on this device only
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null") as Draft | null;
      if (d && typeof d === "object") { setAnswers(d.answers ?? {}); setOther(d.other ?? {}); }
    } catch { /* no storage */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || state === "done") return;
    try { localStorage.setItem(DRAFT, JSON.stringify({ answers, other })); } catch { /* no storage */ }
  }, [answers, other, state]);

  const set = (id: string, v: Answers[string] | undefined) =>
    setAnswers((a) => { const n = { ...a }; if (v === undefined) delete n[id]; else n[id] = v; return n; });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const miss = required.find((q) => !answered(q, answers, other));
    if (miss) {
      setShowMissing(true);
      setError(u.missing);
      document.getElementById(`q-${miss.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/survey", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, other, consent, contact: consent ? contact : null, locale, source, website: honey.current?.value ?? "" }),
      });
      if (res.ok) {
        setState("done");
        try { localStorage.removeItem(DRAFT); } catch { /* no storage */ }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setError(res.status === 429 ? u.tooMany : u.failed);
    } catch {
      setError(u.failed);
    }
    setState("idle");
  }

  if (state === "done") {
    return (
      <section role="status" className="mt-10 rounded-card border border-line bg-surface p-6 md:p-8">
        <h2 className="font-display text-[26px] font-extrabold">{u.doneTitle}</h2>
        <p className="mt-2 max-w-[55ch] leading-relaxed text-ink-muted">{u.doneBody}</p>
        <Link prefetch={false} href="/experiences" className="btn-press mt-5 inline-flex min-h-11 items-center rounded-control bg-discovery px-4 font-semibold text-white hover:bg-discovery-hover">{u.browse}</Link>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-8">
      <div className="sticky top-0 z-10 -mx-4 bg-ivory/95 px-4 py-2 backdrop-blur dark:bg-surface/95">
        <div className="flex items-center gap-3 text-small font-semibold text-ink-muted">
          <span className="tabular-nums">{u.progress(done, required.length)}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span className="block h-full rounded-full bg-apricot transition-[width] duration-300" style={{ width: `${(done / required.length) * 100}%` }} />
          </span>
        </div>
      </div>

      {sections.map((s) => (
        <fieldset key={s.id} className="min-w-0 flex flex-col gap-6 rounded-card border border-line bg-surface p-5 md:p-7">
          <legend className="float-start mb-1 w-full font-display text-h3 font-extrabold">{s.title[lang]}</legend>
          {s.questions.map((q) => {
            const miss = showMissing && q.required && !answered(q, answers, other);
            return (
              <div key={q.id} id={`q-${q.id}`} className={`scroll-mt-24 flex flex-col gap-3 ${miss ? "rounded-control outline outline-2 outline-offset-8 outline-critical" : ""}`}>
                <div>
                  <p className="font-semibold leading-snug" id={`l-${q.id}`}>{q.q[lang]}</p>
                  <p className={`mt-0.5 text-small ${miss ? "font-semibold text-critical" : "text-ink-muted"}`}>
                    {q.required ? u.required : u.optional}
                    {q.kind === "many" && q.max ? ` · ${u.pickUpTo(q.max)}` : ""}
                    {q.hint ? ` · ${q.hint[lang]}` : ""}
                  </p>
                </div>
                <QuestionInput q={q} lang={lang} value={answers[q.id]} other={other[q.id] ?? ""}
                  onChange={(v) => set(q.id, v)} onOther={(t) => setOther((o) => ({ ...o, [q.id]: t }))} />
              </div>
            );
          })}
        </fieldset>
      ))}

      <fieldset className="min-w-0 flex flex-col gap-3 rounded-card border border-line bg-surface p-5 md:p-7">
        <legend className="float-start mb-1 w-full font-display text-h3 font-extrabold">{u.contactTitle}</legend>
        <p className="max-w-[60ch] text-ink-muted">{u.contactBody}</p>
        <label className={chip(consent)}>
          <input type="checkbox" id="survey-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="size-4 accent-apricot" />
          <span>{u.consent}</span>
        </label>
        {consent && (
          <input id="survey-contact" type="text" inputMode="email" autoComplete="email" maxLength={120} value={contact}
            onChange={(e) => setContact(e.target.value)} placeholder={u.contactPh} aria-label={u.contactPh}
            className="min-h-11 rounded-control border border-field bg-surface px-3" />
        )}
        <Link prefetch={false} href="/privacy" className="text-small font-semibold text-link underline-offset-2 hover:underline">{u.privacy}</Link>
      </fieldset>

      {/* people never see this field; bots fill it */}
      <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
        <label>Website<input ref={honey} id="survey-website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="rounded-card bg-critical-tint p-3 font-semibold text-critical">{error}</p>}
        <button type="submit" disabled={state === "sending"}
          className="btn-press inline-flex min-h-12 items-center justify-center rounded-control bg-apricot px-6 text-[17px] font-bold text-night transition-colors hover:bg-apricot-hover disabled:opacity-60 md:self-start">
          {state === "sending" ? u.sending : u.send}
        </button>
      </div>
    </form>
  );
}

function QuestionInput({ q, lang, value, other, onChange, onOther }: {
  q: Question; lang: Lang; value: Answers[string] | undefined; other: string;
  onChange: (v: Answers[string] | undefined) => void; onOther: (t: string) => void;
}) {
  const u = UI[lang];
  if (q.kind === "text") {
    const common = { id: `a-${q.id}`, "aria-labelledby": `l-${q.id}`, placeholder: u.textPh, value: typeof value === "string" ? value : "",
      className: "rounded-control border border-field bg-surface px-3 py-2.5 leading-relaxed" };
    return q.long
      ? <textarea {...common} rows={3} maxLength={1000} onChange={(e) => onChange(e.target.value || undefined)} />
      : <input {...common} type="text" maxLength={120} onChange={(e) => onChange(e.target.value || undefined)} className={`${common.className} min-h-11`} />;
  }
  if (q.kind === "one") {
    return (
      <div role="radiogroup" aria-labelledby={`l-${q.id}`} className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => (
          <label key={o.id} className={chip(value === o.id)}>
            <input type="radio" name={q.id} id={`a-${q.id}-${o.id}`} checked={value === o.id} onChange={() => onChange(o.id)} className="sr-only" />
            <span>{o[lang]}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.kind === "many") {
    const list = Array.isArray(value) ? value : [];
    const count = list.length + (other.trim() ? 1 : 0);
    const full = !!q.max && count >= q.max;
    const toggle = (id: string) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : full ? list : [...list, id];
      onChange(next.length ? next : undefined);
    };
    return (
      <div role="group" aria-labelledby={`l-${q.id}`} className="flex flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o) => {
            const on = list.includes(o.id);
            return (
              <label key={o.id} className={`${chip(on)} ${!on && full ? "opacity-50" : ""}`}>
                <input type="checkbox" id={`a-${q.id}-${o.id}`} checked={on} disabled={!on && full} onChange={() => toggle(o.id)} className="size-4 shrink-0 accent-apricot" />
                <span>{o[lang]}</span>
              </label>
            );
          })}
        </div>
        {q.other && (
          <input id={`a-${q.id}-other`} type="text" maxLength={200} value={other} disabled={full && !other.trim()}
            onChange={(e) => onOther(e.target.value)} placeholder={`${u.other}: ${u.otherPh}`} aria-label={u.other}
            className="min-h-11 rounded-control border border-field bg-surface px-3 disabled:opacity-50" />
        )}
      </div>
    );
  }
  const m = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return (
    <div className="flex flex-col divide-y divide-line">
      <div className="hidden justify-end gap-1 pb-2 text-[12px] font-semibold text-ink-muted sm:flex">
        <span className="w-[230px] text-center" aria-hidden="true">1 = {u.scaleLow} · 5 = {u.scaleHigh}</span>
      </div>
      {q.rows.map((r) => (
        <div key={r.id} role="radiogroup" aria-label={r[lang]} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="min-w-0 flex-1 leading-snug">{r[lang]}</span>
          <div className="flex gap-1.5" dir="ltr">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = m[r.id] === n;
              return (
                <label key={n} className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-control border font-bold tabular-nums transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link ${
                  on ? "border-ink bg-ink text-surface" : "border-field bg-surface text-ink hover:border-ink"}`}>
                  <input type="radio" name={`${q.id}-${r.id}`} id={`a-${q.id}-${r.id}-${n}`} checked={on} className="sr-only"
                    onChange={() => onChange({ ...m, [r.id]: n })} />
                  <span>{n}</span>
                  <span className="sr-only">{n === 1 ? u.scaleLow : n === 5 ? u.scaleHigh : ""}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
