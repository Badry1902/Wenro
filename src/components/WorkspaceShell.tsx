import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getWorkspaces, homeOf, type Workspace } from "@/lib/workspaces";
import { signOut } from "@/app/[locale]/signin/actions";
import { NavLink } from "./NavLink";
import { PushSetup } from "./PushSetup";
import { rpc } from "@/lib/data/rpc";
import { Suspense } from "react";
import { Wordmark } from "./brand/Logo";
import { LanguageMenu } from "./LanguageMenu";

/** One colour per kind of workspace, so it is always clear whose dashboard you are in. */
export const TYPE_STYLE: Record<Workspace["type"], { dot: string; pill: string; bar: string }> = {
  platform: { dot: "bg-white", pill: "bg-white text-ink", bar: "bg-discovery" },
  operator: { dot: "bg-aqua", pill: "bg-aqua text-ink", bar: "bg-aqua" },
  agency: { dot: "bg-[#3fbf86]", pill: "bg-success text-white", bar: "bg-success" },
  marketer: { dot: "bg-apricot", pill: "bg-apricot text-ink", bar: "bg-apricot" },
};
const ORDER: Workspace["type"][] = ["platform", "operator", "agency", "marketer"];

/**
 * Dashboard frame: Deep Ink side menu on desktop, a compact header on phones.
 * The workspace kind (WENRO admin, trip operator, agency, marketing partner) is shown with its own
 * colour and a one-line description; the switcher groups workspaces by kind.
 */
export async function WorkspaceShell({
  current,
  nav,
  children,
}: {
  current: Workspace;
  nav: { href: string; label: string; exact?: boolean }[];
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = await getTranslations("app");
  const [all, unread] = await Promise.all([
    getWorkspaces(locale),
    rpc<number>("unread_notifications", {}, "user").catch(() => 0),
  ]);
  const others = all.filter((w) => w.org_id !== current.org_id);
  const groups = ORDER.map((type) => ({ type, items: others.filter((w) => w.type === type) })).filter((g) => g.items.length);
  const style = TYPE_STYLE[current.type];

  const Switcher = ({ open }: { open?: boolean }) => (
    <details className="group/sw" open={open}>
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded-[8px] px-2.5 text-[14px] font-medium text-white/70 hover:bg-white/[0.05] [&::-webkit-details-marker]:hidden">
        {t("switch")} <span className="text-white/50">({others.length})</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="transition-transform group-open/sw:rotate-180"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      <div className="mt-1 flex flex-col gap-3 pb-2">
        {groups.map((g) => (
          <div key={g.type}>
            <div className="mb-1 flex items-center gap-2 px-2 text-[12px] font-medium text-white/50">
              <span className={`size-2 rounded-full ${TYPE_STYLE[g.type].dot}`} />{t(`typeGroups.${g.type}`)}
            </div>
            <ul className="flex flex-col">
              {g.items.map((w) => (
                <li key={w.org_id}>
                  <Link href={homeOf(w)} className="block truncate rounded-[8px] px-2.5 py-1.5 text-[14px] text-white/75 hover:bg-white/[0.05] hover:text-white">{w.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );

  const SignOut = ({ className }: { className: string }) => (
    <form action={signOut} className={className}>
      <input type="hidden" name="locale" value={locale} />
      <button className="py-2 text-[14px] text-white/60 hover:text-white">{t("signin.signOut")}</button>
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="relative bg-ink text-white md:sticky md:top-0 md:flex md:h-dvh md:w-72 md:shrink-0 md:flex-col md:overflow-y-auto print:hidden">
        <div className="relative flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:pt-6">
          <Link href="/" className="flex min-h-11 items-center gap-2 md:mb-6 md:me-14" aria-label={t("toSite")}>
            <Wordmark tone="reverse" width={118} />
          </Link>
          <div className="order-last md:hidden"><Suspense><LanguageMenu label={t("language")} tone="dark" compact /></Suspense></div>
          <Link href="/app/notifications" aria-label={t("notify.bell", { n: unread })} title={t("notify.bell", { n: unread })}
            className="relative order-last grid size-11 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/10 md:absolute md:end-4 md:top-7">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0" /></svg>
            {unread > 0 && <span className="absolute end-1 top-1 grid min-w-5 place-items-center rounded-full bg-apricot px-1 text-[11px] font-bold leading-5 text-ink">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <div className="min-w-0 md:mb-5">
            <span className="inline-flex items-center gap-2 text-[12px] font-medium text-white/60">
              <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />{t(`types.${current.type}`)}
            </span>
            <div className="mt-1 truncate text-[16px] font-semibold">{current.name}</div>
            <div className="mt-0.5 text-[12px] text-white/50">{t("youAre", { role: t(`roles.${current.role}`) })}</div>
          </div>
        </div>
        <nav aria-label={t("menu")} className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-0.5">
          {nav.map((n) => <NavLink key={n.href} href={n.href} exact={n.exact}>{n.label}</NavLink>)}
        </nav>
        {others.length > 0 && (
          <>
            <div className="border-t border-white/10 px-3 py-2 md:hidden"><Switcher /></div>
            <div className="hidden px-3 pt-4 md:block"><Switcher open={others.length <= 6} /></div>
          </>
        )}
        <div className="hidden px-3 pt-4 md:block"><PushSetup dark /></div>
        <div className="mt-auto hidden border-t border-white/[0.08] px-5 pb-5 pt-4 md:block">
          <div className="-ms-2.5 mb-1"><Suspense><LanguageMenu label={t("language")} tone="dark" align="start" up /></Suspense></div>
          <Link href="/app/account" className="block py-2 text-[14px] text-white/60 hover:text-white">{t("account.menu")}</Link>
          <Link href="/" className="block py-2 text-[14px] text-white/60 hover:text-white">{t("toSite")}</Link>
          <SignOut className="" />
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-ivory px-4 py-6 md:px-8 md:py-8">
        {current.status === "pending" && (
          <p role="status" className="mb-6 rounded-card bg-warning-tint p-4 text-warning">{t("pendingNotice")}</p>
        )}
        {children}
        <div className="mt-10 flex items-center justify-between border-t border-line pt-4 md:hidden">
          <Link href="/app/account" className="min-h-11 content-center text-small font-semibold text-ink-muted hover:underline">{t("account.menu")}</Link>
          <SignOut className="[&_button]:text-ink-muted" />
        </div>
      </main>
    </div>
  );
}
