import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getWorkspaces, homeOf, type Workspace } from "@/lib/workspaces";
import { signOut } from "@/app/[locale]/signin/actions";
import { NavLink } from "./NavLink";

/**
 * Dashboard frame from the design guide: Deep Ink side menu on desktop,
 * a scrollable tab row on phones. Same brand, calmer than the public site.
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
  const all = await getWorkspaces(locale);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-ink text-white md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 print:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:py-6">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-control bg-white px-2 md:mb-6">
            <Image src="/brand/logo-horizontal-temp.png" alt="WENRO" width={110} height={21} />
          </Link>
          <div className="min-w-0 md:mb-4">
            <div className="truncate text-small font-bold">{current.name}</div>
            <div className="text-[12px] text-white/70">{t(`types.${current.type}`)} · {t(`roles.${current.role}`)}</div>
          </div>
        </div>
        <nav aria-label={t("menu")} className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
          {nav.map((n) => <NavLink key={n.href} href={n.href} exact={n.exact}>{n.label}</NavLink>)}
        </nav>
        {all.length > 1 && (
          <div className="hidden px-5 pt-6 md:block">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/60">{t("switch")}</div>
            <ul className="flex flex-col gap-1">
              {all.filter((w) => w.org_id !== current.org_id).map((w) => (
                <li key={w.org_id}><Link href={homeOf(w)} className="block min-h-9 rounded-control px-2 py-1.5 text-small text-white/85 hover:bg-white/10">{w.name}</Link></li>
              ))}
            </ul>
          </div>
        )}
        <form action={signOut} className="hidden px-5 pt-6 md:block">
          <input type="hidden" name="locale" value={locale} />
          <button className="min-h-11 text-small font-semibold text-white/80 underline-offset-4 hover:underline">{t("signin.signOut")}</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 bg-surface px-4 py-6 md:px-10 md:py-8">
        {current.status === "pending" && (
          <p role="status" className="mb-6 rounded-card bg-warning-tint p-4 text-warning">{t("pendingNotice")}</p>
        )}
        {children}
      </main>
    </div>
  );
}
