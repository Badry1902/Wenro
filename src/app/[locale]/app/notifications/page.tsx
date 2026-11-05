import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { currentUserId } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/SiteHeader";
import { Empty } from "@/components/ui";
import { TYPE_STYLE } from "@/components/WorkspaceShell";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

type Item = { id: number; kind: string; params: Record<string, string | number | null>; link: string | null; org: string | null;
  org_type: "platform" | "operator" | "agency" | "marketer" | null; created_at: string; read: boolean };

/** Everything that happened in the person's workspaces, newest first. Opening the page marks it as read. */
export default async function Notifications({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await currentUserId())) redirect({ href: "/signin", locale });
  const t = await getTranslations("app.notify");
  const format = await getFormatter();
  const data = await rpc<{ unread: number; items: Item[] } | null>("my_notifications", { p_limit: 60 }, "user").catch(() => null);
  const items = data?.items ?? [];
  if (data?.unread) await rpc("mark_notifications_read", { p_ids: null }, "user").catch(() => undefined);

  const money = (p: Item["params"], k: string) => p[k] != null && p.currency ? formatMoney({ minor: Number(p[k]), currency: String(p.currency) as "EUR" }, locale) : "";
  const when = (iso: unknown) => typeof iso === "string" ? format.dateTime(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso), { day: "numeric", month: "short", hour: iso.length === 10 ? undefined : "2-digit", minute: iso.length === 10 ? undefined : "2-digit" }) : "";
  const text = (n: Item) => {
    const p = n.params ?? {};
    const vals = {
      title: String(p.title ?? ""), ref: String(p.ref ?? ""), when: when(p.starts_at), seats: Number(p.seats ?? 0), rating: Number(p.rating ?? 0),
      name: String(p.name ?? ""), amount: money(p, p.amount_minor != null ? "amount_minor" : p.due_minor != null ? "due_minor" : "commission_minor"),
      month: typeof p.month === "string" ? format.dateTime(new Date(`${p.month.slice(0, 10)}T12:00:00Z`), { month: "long", year: "numeric" }) : "",
    };
    return t.has(`kinds.${n.kind}`) ? t(`kinds.${n.kind}` as "kinds.booking_new", vals) : n.kind;
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div><h1 className="text-h2 font-bold">{t("title")}</h1><p className="text-ink-muted">{t("sub")}</p></div>
          <Link href="/app" className="text-small font-semibold text-discovery hover:underline">{t("toDashboard")}</Link>
        </div>
        {items.length === 0 ? <Empty>{t("none")}</Empty> : (
          <ul className="flex flex-col gap-2">
            {items.map((n) => {
              const body = (
                <span className="flex items-start gap-3">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read ? "bg-line" : "bg-apricot"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block ${n.read ? "" : "font-bold"}`}>{text(n)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
                      {n.org && n.org_type && <span className={`rounded-full px-2 py-0.5 font-bold ${TYPE_STYLE[n.org_type].pill}`}>{n.org}</span>}
                      {format.relativeTime(new Date(n.created_at))}
                    </span>
                  </span>
                  {!n.read && <span className="sr-only">{t("new")}</span>}
                </span>
              );
              return (
                <li key={n.id} className={`rounded-card border p-4 ${n.read ? "border-line" : "border-apricot bg-apricot-tint"}`}>
                  {n.link && /^\/app(\/|$)/.test(n.link) ? <Link href={n.link} className="block hover:opacity-90">{body}</Link> : body}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
