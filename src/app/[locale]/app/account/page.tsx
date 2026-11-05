import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { currentUserId } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Flash, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { saveAccount } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

type Account = { email: string | null; username: string | null; password_set: boolean };
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ first?: string; ok?: string; err?: string }> };

/** My account: the username and password used to sign in (set once after the first email sign-in). */
export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  if (!(await currentUserId())) redirect({ href: "/signin", locale });
  const t = await getTranslations("app.account");
  const me = (await rpc<Account | null>("my_account", {}, "user").catch(() => null)) ?? { email: null, username: null, password_set: false };
  const first = q.first === "1" || !me.username || !me.password_set;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-12">
        <h1 className="text-h2 font-bold">{first ? t("firstTitle") : t("title")}</h1>
        <p className="text-ink-muted">{first ? t("firstSub") : t("sub")}</p>
        <Flash ok={q.ok} err={q.err} />
        {me.email && <p className="rounded-card bg-[#F3F4F8] p-3 text-small">{t("email")}: <b dir="ltr">{me.email}</b></p>}
        <form action={saveAccount} className="flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          {first && <input type="hidden" name="first" value="1" />}
          <label className="flex flex-col gap-1 text-small font-bold">{t("username")}
            <input name="username" defaultValue={me.username ?? ""} required minLength={3} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,29}"
              autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" className={field} />
            <span className="font-normal text-ink-muted">{t("usernameHint")}</span>
          </label>
          <label className="flex flex-col gap-1 text-small font-bold">{me.password_set ? t("newPassword") : t("password")}
            <input name="password" type="password" required={!me.password_set} minLength={10} maxLength={72} autoComplete="new-password" dir="ltr" className={field} />
            <span className="font-normal text-ink-muted">{me.password_set ? t("passwordKeep") : t("passwordHint")}</span>
          </label>
          <label className="flex flex-col gap-1 text-small font-bold">{t("confirm")}
            <input name="confirm" type="password" required={!me.password_set} minLength={10} maxLength={72} autoComplete="new-password" dir="ltr" className={field} />
          </label>
          <Submit className={btn.primary}>{first ? t("saveFirst") : t("save")}</Submit>
        </form>
        {!first && <Link href="/app" className="text-center text-small font-semibold text-discovery hover:underline">{t("toDashboard")}</Link>}
        <p className="text-small text-ink-muted">{t("privacy")}</p>
      </main>
    </>
  );
}
