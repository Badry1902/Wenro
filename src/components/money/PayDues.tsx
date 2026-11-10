"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { CopyButton } from "../CopyButton";
import { Submit } from "../Submit";
import { submitOperatorPayment } from "@/app/[locale]/app/payment-actions";

export type DueStatement = { id: string; currency: "EUR" | "USD" | "EGP"; period: string; trips: number; due_minor: number; in_review: boolean };
export type PayMethod = { id: string; kind: "instapay" | "bank" | "wallet" | "link"; label: string; account_name: string | null; value: string; extra: string | null; pay_url: string | null };
type L = Record<"choose" | "total" | "payNow" | "methodTitle" | "methodHint" | "accountName" | "copy" | "copied" | "open" | "paidConfirm" | "confirmTitle" | "confirmHint"
  | "reference" | "referenceHint" | "proof" | "proofHint" | "note" | "submit" | "back" | "inReview" | "noMethods" | "valueLabel" | "extra", string>;

const PATHS: Record<PayMethod["kind"], string> = {
  instapay: "M13 2L4 14h7l-1 8 9-12h-7z",
  bank: "M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z",
  wallet: "M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
};
const MethodIcon = ({ kind }: { kind: PayMethod["kind"] }) => (
  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${kind === "instapay" ? "bg-apricot text-ink" : "bg-discovery-tint text-discovery"}`} aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[kind]} /></svg>
  </span>
);

/**
 * Operator pays WENRO in three steps: pick the statements → pick a method (copy the details or open the app)
 * → confirm with a receipt. The payment then waits for WENRO's finance team to check it.
 */
export function PayDues({ org, locale, statements, methods, labels }: { org: string; locale: string; statements: DueStatement[]; methods: PayMethod[]; labels: L }) {
  const open = statements.filter((s) => !s.in_review);
  const currencies = [...new Set(open.map((s) => s.currency))];
  const [cur, setCur] = useState(currencies[0] ?? "EUR");
  const [picked, setPicked] = useState<string[]>(open.filter((s) => s.currency === (currencies[0] ?? "EUR")).map((s) => s.id));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<string | null>(methods[0]?.id ?? null);
  const total = useMemo(() => open.filter((s) => picked.includes(s.id)).reduce((a, s) => a + Number(s.due_minor), 0), [open, picked]);
  const m = (minor: number) => formatMoney({ minor, currency: cur as "EUR" }, locale);
  const chosen = methods.find((x) => x.id === method) ?? null;
  const box = "rounded-card border border-line bg-surface p-4";

  return (
    <div className="flex flex-col gap-4">
      {statements.some((s) => s.in_review) && <p className="rounded-card bg-warning-tint p-3 text-small text-warning">{labels.inReview}</p>}

      {step === 1 && open.length > 0 && (
        <div className={box}>
          <p className="mb-3 font-bold">{labels.choose}</p>
          {currencies.length > 1 && (
            <div className="mb-3 flex gap-2">{currencies.map((c) => (
              <button key={c} type="button" onClick={() => { setCur(c); setPicked(open.filter((s) => s.currency === c).map((s) => s.id)); }}
                className={`min-h-10 rounded-full border px-4 text-small font-bold ${c === cur ? "border-ink bg-ink text-white" : "border-line"}`}>{c}</button>
            ))}</div>
          )}
          <ul className="flex flex-col divide-y divide-line">
            {open.filter((s) => s.currency === cur).map((s) => (
              <li key={s.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                  <input type="checkbox" className="size-5 accent-[var(--color-discovery)]" checked={picked.includes(s.id)}
                    onChange={() => setPicked((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])} />
                  <span className="flex-1">{s.period} <span className="text-small text-ink-muted">· {s.trips}</span></span>
                  <b className="tabular-nums">{m(Number(s.due_minor))}</b>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <span>{labels.total}: <b className="text-h3 tabular-nums">{m(total)}</b></span>
            <button type="button" disabled={!picked.length} onClick={() => setStep(2)}
              className="btn-press inline-flex min-h-12 items-center rounded-control bg-apricot px-6 font-extrabold text-ink hover:bg-apricot-hover disabled:opacity-50">{labels.payNow}</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={box}>
          <p className="font-bold">{labels.methodTitle} · <span className="tabular-nums">{m(total)}</span></p>
          <p className="mb-3 text-small text-ink-muted">{labels.methodHint}</p>
          {methods.length === 0 ? <p className="text-ink-muted">{labels.noMethods}</p> : (
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {methods.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={method === x.id} onClick={() => setMethod(x.id)}
                  className={`flex min-h-14 items-center gap-3 rounded-card border-2 p-3 text-start ${method === x.id ? "border-discovery bg-discovery-tint" : "border-line"}`}>
                  <MethodIcon kind={x.kind} />
                  <span className="font-bold">{x.label}</span>
                  {x.kind === "instapay" && <span className="ms-auto rounded-full bg-apricot px-2 py-0.5 text-[11px] font-extrabold text-ink">★</span>}
                </button>
              ))}
            </div>
          )}
          {chosen && (
            <div className="mt-4 flex flex-col gap-3 rounded-card bg-ivory p-4">
              {chosen.account_name && <div><div className="text-small text-ink-muted">{labels.accountName}</div><div className="font-bold">{chosen.account_name}</div></div>}
              <div>
                <div className="text-small text-ink-muted">{labels.valueLabel}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <code dir="ltr" className="select-all break-all rounded-control bg-surface px-3 py-2 font-mono text-[15px] font-bold">{chosen.value}</code>
                  <CopyButton text={chosen.value} label={labels.copy} done={labels.copied} />
                </div>
              </div>
              {chosen.extra && <div><div className="text-small text-ink-muted">{labels.extra}</div><p className="whitespace-pre-line text-small">{chosen.extra}</p></div>}
              <div className="flex flex-wrap gap-2">
                {chosen.pay_url && <a href={chosen.pay_url} target="_blank" rel="noopener noreferrer" className="btn-press inline-flex min-h-11 items-center rounded-control bg-discovery px-4 font-bold text-white hover:bg-discovery-hover">{labels.open.replace("{name}", chosen.label)}</a>}
                <CopyButton text={`${chosen.label}: ${chosen.value} · ${m(total)}`} label={`${labels.copy} + ${m(total)}`} done={labels.copied} />
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button type="button" onClick={() => setStep(1)} className="min-h-11 px-2 font-semibold text-ink-muted hover:underline">{labels.back}</button>
            <button type="button" disabled={!chosen} onClick={() => setStep(3)} className="btn-press inline-flex min-h-12 items-center rounded-control bg-success px-6 font-bold text-white disabled:opacity-50">{labels.paidConfirm}</button>
          </div>
        </div>
      )}

      {step === 3 && chosen && (
        <form action={submitOperatorPayment} encType="multipart/form-data" className={`${box} flex flex-col gap-3`}>
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="org" value={org} /><input type="hidden" name="method" value={chosen.id} />
          {picked.map((p) => <input key={p} type="hidden" name="statement" value={p} />)}
          <p className="font-bold">{labels.confirmTitle} · {chosen.label} · <span className="tabular-nums">{m(total)}</span></p>
          <p className="text-small text-ink-muted">{labels.confirmHint}</p>
          <label className="flex flex-col gap-1 text-small font-bold">{labels.proof}
            <input type="file" name="proof" required accept="image/jpeg,image/png,image/webp,application/pdf" className="rounded-control border border-dashed border-ink-muted p-3 font-normal file:me-3 file:rounded-control file:border-0 file:bg-discovery-tint file:px-3 file:py-2 file:font-bold file:text-discovery" />
            <span className="font-normal text-ink-muted">{labels.proofHint}</span>
          </label>
          <label className="flex flex-col gap-1 text-small font-bold">{labels.reference}
            <input name="reference" maxLength={80} dir="ltr" className="min-h-11 rounded-control border border-[#8A90A6] px-3 font-normal" />
            <span className="font-normal text-ink-muted">{labels.referenceHint}</span>
          </label>
          <label className="flex flex-col gap-1 text-small font-bold">{labels.note}
            <textarea name="note" maxLength={500} rows={2} className="rounded-control border border-[#8A90A6] p-3 font-normal" />
          </label>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" onClick={() => setStep(2)} className="min-h-11 px-2 font-semibold text-ink-muted hover:underline">{labels.back}</button>
            <Submit className="btn-press inline-flex min-h-12 items-center rounded-control bg-success px-6 font-bold text-white">{labels.submit}</Submit>
          </div>
        </form>
      )}
    </div>
  );
}
