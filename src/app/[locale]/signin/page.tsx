import { getTranslations, setRequestLocale } from "next-intl/server";
import { dataMode } from "@/lib/env";
import { SiteHeader } from "@/components/SiteHeader";
import { devSignIn, sendSignInLink } from "./actions";

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

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ sent?: string; error?: string }> };

export default async function SignIn({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { sent, error } = await searchParams;
  const t = await getTranslations("app.signin");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-14">
        <h1 className="text-h2 font-bold">{t("title")}</h1>
        <p className="text-ink-muted">{t("subtitle")}</p>

        {error && <p role="alert" className="rounded-card bg-critical-tint p-3 font-semibold text-critical">{error === "link" ? t("linkError") : error === "rate" ? t("rateError") : t("sendError")}</p>}

        {dataMode() === "localpg" ? (
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
        ) : sent ? (
          <p role="status" className="rounded-card bg-success-tint p-4 font-semibold text-success">{t("sent", { email: sent })}</p>
        ) : (
          <form action={sendSignInLink} className="flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor="email" className="text-small font-bold">{t("email")}</label>
            <input id="email" name="email" type="email" required autoComplete="email" dir="ltr"
              className="min-h-12 rounded-control border border-[#8A90A6] px-3.5" />
            <button className="min-h-12 rounded-control bg-discovery font-bold text-white hover:bg-discovery-hover">{t("send")}</button>
          </form>
        )}
      </main>
    </>
  );
}
