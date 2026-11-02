import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { getWorkspaces, homeOf } from "@/lib/workspaces";
import { SiteHeader } from "@/components/SiteHeader";
import { Flash, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { applyOrganization, claimOwner } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function Join({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ok, err } = await searchParams;
  const t = await getTranslations("app.join");
  const ws = await getWorkspaces(locale);
  const hasOwner = await rpc<boolean>("platform_has_owner", {}, "user");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
        <h1 className="text-h2 font-bold">{t("title")}</h1>
        <Flash ok={ok} err={err} />

        {ws.length > 0 && (
          <ul className="flex flex-col gap-2">
            {ws.map((w) => (
              <li key={w.org_id}><Link href={homeOf(w)} className={`${btn.secondary} w-full justify-between`}>{w.name}<span>→</span></Link></li>
            ))}
          </ul>
        )}

        {!hasOwner && (
          <form action={claimOwner} className="flex flex-col gap-3 rounded-card border-2 border-discovery bg-discovery-tint p-5">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="back" value="/app/join" />
            <h2 className="font-bold">{t("claimTitle")}</h2>
            <p className="text-[14px]">{t("claimBody")}</p>
            <Submit className={btn.primary}>{t("claimButton")}</Submit>
          </form>
        )}

        <form action={applyOrganization} className="flex flex-col gap-4 rounded-card border border-line p-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="back" value="/app/join" />
          <h2 className="text-h3 font-bold">{t("applyTitle")}</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-small font-bold">{t("type")}</legend>
            {(["operator", "marketer", "agency"] as const).map((type, i) => (
              <label key={type} className="flex min-h-11 items-start gap-3 rounded-control border border-line p-3">
                <input type="radio" name="type" value={type} defaultChecked={i === 0} className="mt-1 h-5 w-5 accent-discovery" />
                <span><span className="font-semibold">{t(`types.${type}.title`)}</span><br /><span className="text-small text-ink-muted">{t(`types.${type}.body`)}</span></span>
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("name")}<input name="name" required className={field} /></label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("phone")}<input name="phone" type="tel" required dir="ltr" className={field} /></label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("email")}<input name="email" type="email" required dir="ltr" className={field} /></label>
          <p className="text-small text-ink-muted">{t("review")}</p>
          <Submit className={btn.primary}>{t("submit")}</Submit>
        </form>
      </main>
    </>
  );
}
