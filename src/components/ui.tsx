import { Children } from "react";
import { getTranslations } from "next-intl/server";

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
        {sub && <p className="mt-1 text-ink-muted">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, children, className = "", id }: { title?: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-card border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-3 text-[18px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/** WENRO's pin, small: marks the one thing that needs doing now. Used nowhere else in the dashboards. */
export function Pin({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="13" viewBox="0 0 10 13" aria-hidden="true" className={`shrink-0 text-apricot ${className}`}>
      <path d="M5 0a5 5 0 015 5c0 3.4-5 8-5 8S0 8.4 0 5a5 5 0 015-5z" fill="currentColor" /><circle cx="5" cy="5" r="1.8" fill="#fff" />
    </svg>
  );
}

/** A count that leads somewhere: one row of a list. Counts that need action get the pin; zero stays quiet. */
export function Task({ count, label, href, tone = "default" }: { count: number | string; label: string; href?: string; tone?: "default" | "warn" }) {
  const hot = tone === "warn" && Number(count) > 0;
  const zero = Number(count) === 0;
  const inner = (
    <span className="flex min-h-12 items-center gap-3 px-4 py-2">
      <span className="grid w-3 shrink-0 place-items-center">{hot && <Pin />}</span>
      <span className={`flex-1 ${zero ? "text-ink-muted" : "text-ink"}`}>{label}</span>
      <span className={`text-[18px] font-medium tabular-nums ${zero ? "text-ink-muted/70" : "text-ink"}`}>{count}</span>
      {href && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted/60 rtl:-scale-x-100"><path d="M9 6l6 6-6 6" /></svg>}
    </span>
  );
  return href ? <a href={href} className="block transition-colors duration-150 hover:bg-[#F6F5F1]">{inner}</a> : inner;
}

/** A panel of Task rows. */
export function TaskList({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      {title && <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold">{title}</h2>}
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

/** A figure: label, number, and what it means or compares to. */
export function Stat({ label, value, note, pin = false, size = "md" }: { label: string; value: React.ReactNode; note?: React.ReactNode; pin?: boolean; size?: "md" | "lg" }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">{pin && <Pin />}{label}</div>
      <div className={`mt-1 font-medium leading-tight tabular-nums text-ink ${size === "lg" ? "text-[32px]" : "text-[24px]"}`}>{value}</div>
      {note && <div className="mt-1 text-[13px] text-ink-muted">{note}</div>}
    </div>
  );
}

/** Several Stats in one panel, split by hairlines (not a row of look-alike cards). */
export function StatRow({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 4 ? "grid-cols-2 xl:grid-cols-4" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 sm:[&>div:last-child:nth-child(odd)]:col-span-2";
  return (
    <div className={`grid gap-px overflow-hidden rounded-card border border-line bg-line ${c}`}>
      {Children.toArray(children).map((ch, i) => <div key={i} className="bg-surface p-5">{ch}</div>)}
    </div>
  );
}

const tones: Record<string, string> = {
  confirmed: "bg-success-tint text-success", executed: "bg-success-tint text-success", active: "bg-success-tint text-success",
  published: "bg-success-tint text-success", received: "bg-success-tint text-success", paid: "bg-success-tint text-success",
  open: "bg-discovery-tint text-discovery",
  pending_request: "bg-warning-tint text-warning", pending: "bg-warning-tint text-warning", in_review: "bg-warning-tint text-warning",
  sent: "bg-success-tint text-success", draft: "bg-[#F3F4F8] text-ink-muted", closed: "bg-[#F3F4F8] text-ink-muted",
  cancelled: "bg-critical-tint text-critical", expired: "bg-critical-tint text-critical", declined: "bg-critical-tint text-critical",
  no_show: "bg-critical-tint text-critical", suspended: "bg-critical-tint text-critical", not_operated: "bg-critical-tint text-critical",
  hidden: "bg-[#F3F4F8] text-ink-muted", archived: "bg-[#F3F4F8] text-ink-muted", scheduled: "bg-[#F3F4F8] text-ink-muted",
  queued: "bg-discovery-tint text-discovery", sending: "bg-discovery-tint text-discovery", logged: "bg-warning-tint text-warning",
  failed: "bg-critical-tint text-critical", skipped: "bg-[#F3F4F8] text-ink-muted",
};

export async function Badge({ value }: { value: string }) {
  const t = await getTranslations("app.status");
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ${tones[value] ?? "bg-[#F3F4F8] text-ink"}`}>{t.has(value) ? t(value) : value}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card border border-dashed border-line p-6 text-center text-ink-muted">{children}</p>;
}

/** Banner after a dashboard action (?ok=… / ?err=…). */
export async function Flash({ ok, err }: { ok?: string; err?: string }) {
  const t = await getTranslations("app.flash");
  if (!ok && !err) return null;
  const msg = ok ? (t.has(`ok.${ok}`) ? t(`ok.${ok}`) : t("ok.done")) : (t.has(`err.${err}`) ? t(`err.${err}`) : t("err.unexpected_error"));
  return (
    <p role={err ? "alert" : "status"} className={`flash-in mb-5 rounded-card p-3 font-semibold ${err ? "bg-critical-tint text-critical" : "bg-success-tint text-success"}`}>{msg}</p>
  );
}

export const btn = {
  primary: "btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-discovery px-4 font-semibold text-white transition-colors duration-150 hover:bg-discovery-hover",
  secondary: "btn-press inline-flex min-h-11 items-center justify-center rounded-control border border-discovery bg-surface px-4 font-semibold text-discovery transition-colors duration-150 hover:bg-discovery-tint",
  danger: "btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-critical px-4 font-semibold text-white",
  quiet: "btn-press inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 font-medium text-ink transition-colors duration-150 hover:border-ink-muted",
};
export const field = "min-h-11 rounded-control border border-[#8A90A6] bg-surface px-3";
