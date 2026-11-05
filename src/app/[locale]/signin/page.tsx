import { getTranslations, setRequestLocale } from "next-intl/server";
import { dataMode } from "@/lib/env";
import { SiteHeader } from "@/components/SiteHeader";
import { LogoLoop } from "@/components/brand/BrandMotion";
import { cookies } from "next/headers";
import { Link } from "@/i18n/navigation";
import { PASSWORD_HINT_COOKIE } from "@/lib/auth";
import { devSignIn, sendSignInCode, signInWithPassword, verifySignInCode } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const DEMO_USERS = [
  ["00000000-0000-0000-0000-0000000000a1", "WENRO owner (platform)"],
  ["00000000-0000-0000-0000-0000000000b1", "[DEMO] Red Sea Boats — owner"],
  ["00000000-0000-0000-0000-0000000000b2", "[DEMO] Red Sea Boats — staff"],
  ["00000000-0000-0000-0000-0000000000d1", "[DEMO] Travel Blogger — marketer"],
  ["00000000-0000-0000-0000-0000000000e1", "[DEMO] Sun Agency — manager"],
  ["00000000-0000-0000-0000-0000000000e2", "[DEMO] Sun Agency — staff"],
  ["00000000-0000-0000-0000-0000000000c1", "[DEMO] Desert Riders — owner"],
  ["00000000-0000-0000-0000-0000000000f9", "New user (no workspace yet)"],
] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sent?: string; error?: string; m?: string }> };

export default async function SignIn({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { sent, error, m } = await searchParams;
  const t = await getTranslations("app.signin");
  // Password first for people who used one on this browser before; email code otherwise (first sign-in)
  const mode = m === "password" || m === "code" ? m : (await cookies()).get(PASSWORD_HINT_COOKIE) ? "password" : "code";
  const errText: Record<string, string> = {
    link: t("linkError"), rate: t("rateError"), send: t("sendError"), email: t("emailError"), code: t("codeError"), creds: t("credsError"),
  };
  const field = "min-h-12 rounded-control border border-[#8A90A6] bg-white px-3.5";
  const primary = "btn-press min-h-12 rounded-control bg-discovery font-bold text-white hover:bg-discovery-hover";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-14">
        <LogoLoop width={180} className="self-center" />
        <h1 className="text-center text-h2 font-bold">{t("title")}</h1>
        <p className="text-center text-ink-muted">{t("subtitle")}</p>

        {error && <p role="alert" className="rounded-card bg-critical-tint p-3 font-semibold text-critical">{errText[error] ?? t("sendError")}</p>}

        {dataMode() === "localpg" && (
          <section className="flex flex-col gap-2 rounded-card border border-line p-4">
            <h2 className="font-bold">{t("devTitle")}</h2>
            {DEMO_USERS.map(([uid, label]) => (
              <form key={uid} action={devSignIn}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="uid" value={uid} />
                <button className="min-h-11 w-full rounded-control border border-line px-3 text-start hover:border-discovery">{label}</button>
              </form>
            ))}
          </section>
        )}
        {/* Real sign-in (on a developer machine it is shown for layout checks only) */}
        {(
          <>
            <nav className="grid grid-cols-2 gap-1 rounded-full bg-[#EEF0F6] p-1" aria-label={t("how")}>
              {(["code", "password"] as const).map((k) => (
                <Link key={k} href={{ pathname: "/signin", query: { m: k } }} aria-current={mode === k ? "page" : undefined}
                  className={`min-h-11 content-center rounded-full text-center text-small font-bold ${mode === k ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}>
                  {k === "code" ? t("tabCode") : t("tabPassword")}
                </Link>
              ))}
            </nav>

            {mode === "password" ? (
              <form action={signInWithPassword} className="flex flex-col gap-3">
                <input type="hidden" name="locale" value={locale} />
                <label htmlFor="identifier" className="text-small font-bold">{t("identifier")}</label>
                <input id="identifier" name="identifier" required autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" className={field} />
                <label htmlFor="password" className="text-small font-bold">{t("password")}</label>
                <input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" className={field} />
                <button className={primary}>{t("signInButton")}</button>
                <Link href={{ pathname: "/signin", query: { m: "code" } }} className="text-center text-small font-semibold text-discovery hover:underline">{t("forgot")}</Link>
              </form>
            ) : sent ? (
              <>
                <p role="status" className="rounded-card bg-success-tint p-4 font-semibold text-success">{t("codeSent", { email: sent })}</p>
                <form action={verifySignInCode} className="flex flex-col gap-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="email" value={sent} />
                  <label htmlFor="code" className="text-small font-bold">{t("code")}</label>
                  <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" maxLength={12} dir="ltr"
                    placeholder="••••••" className={`${field} text-center text-[24px] font-bold tracking-[0.4em]`} />
                  <button className={primary}>{t("codeButton")}</button>
                  <p className="text-small text-ink-muted">{t("codeHint")}</p>
                </form>
                <div className="flex flex-wrap justify-between gap-2 text-small">
                  <form action={sendSignInCode}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="email" value={sent} />
                    <button className="min-h-11 font-semibold text-discovery hover:underline">{t("resend")}</button></form>
                  <Link href={{ pathname: "/signin", query: { m: "code" } }} className="min-h-11 content-center font-semibold text-ink-muted hover:underline">{t("otherEmail")}</Link>
                </div>
              </>
            ) : (
              <form action={sendSignInCode} className="flex flex-col gap-3">
                <input type="hidden" name="locale" value={locale} />
                <label htmlFor="email" className="text-small font-bold">{t("email")}</label>
                <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className={field} />
                <button className={primary}>{t("sendCode")}</button>
                <p className="text-small text-ink-muted">{t("codeIntro")}</p>
              </form>
            )}
          </>
        )}
      </main>
    </>
  );
}
