import { getTranslations } from "next-intl/server";

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-h2 font-bold leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-ink-muted">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, children, className = "", id }: { title?: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-card border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-3 text-h3 font-bold">{title}</h2>}
      {children}
    </section>
  );
}

/** A count that leads somewhere: dashboards show what needs doing, not decoration. */
export function Task({ count, label, href, tone = "default" }: { count: number | string; label: string; href?: string; tone?: "default" | "warn" }) {
  const inner = (
    <div className={`flex h-full items-center justify-between gap-4 rounded-card border p-4 ${tone === "warn" && Number(count) > 0 ? "border-apricot bg-apricot-tint" : "border-line bg-surface"}`}>
      <span className="font-semibold">{label}</span>
      <span className="text-h2 font-bold tabular-nums">{count}</span>
    </div>
  );
  return href ? <a href={href} className="block hover:opacity-90">{inner}</a> : inner;
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
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold ${tones[value] ?? "bg-[#F3F4F8] text-ink"}`}>{t.has(value) ? t(value) : value}</span>;
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
  primary: "btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-discovery px-4 font-bold text-white hover:bg-discovery-hover",
  secondary: "btn-press inline-flex min-h-11 items-center justify-center rounded-control border border-discovery bg-surface px-4 font-bold text-discovery hover:bg-discovery-tint",
  danger: "btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-critical px-4 font-bold text-white",
  quiet: "btn-press inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 font-semibold text-ink hover:border-ink-muted",
};
export const field = "min-h-11 rounded-control border border-[#8A90A6] bg-surface px-3";
