import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CATEGORIES } from "@/lib/catalog";
import { IconCar, IconCash, IconCheck } from "./Icons";

const LANG: Record<string, string> = { en: "English", de: "Deutsch", ru: "Русский", fr: "Français", ar: "العربية" };

/** Site footer: brand, catalogue links, partner entry points, booking promises, languages. */
export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();
  const col = "flex flex-col gap-2.5";
  const head = "mb-1 text-small font-bold uppercase tracking-[0.14em] text-white/60";
  const link = "w-fit text-white/85 transition-colors hover:text-apricot";

  return (
    <footer className="mt-24 bg-ink text-white print:hidden">
      <div className="h-1.5 bg-[linear-gradient(90deg,var(--color-discovery)_0%,var(--color-discovery)_60%,var(--color-apricot)_60%)]" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-control bg-white px-3 py-2">
            <Image src="/brand/logo-horizontal-temp.png" alt="WENRO" width={132} height={25} />
          </span>
          <p className="max-w-xs text-white/75">{t("footer.tagline")}</p>
          <ul className="flex flex-col gap-2 text-small text-white/80">
            <li className="flex items-center gap-2"><IconCash size={18} className="text-apricot" />{t("footer.pay")}</li>
            <li className="flex items-center gap-2"><IconCheck size={18} className="text-apricot" />{t("footer.cancel")}</li>
            <li className="flex items-center gap-2"><IconCar size={18} className="text-apricot" />{t("footer.pickup")}</li>
          </ul>
        </div>

        <nav aria-label={t("footer.explore")} className={col}>
          <p className={head}>{t("footer.explore")}</p>
          <Link href="/experiences" className={link}>{t("nav.allTrips")}</Link>
          {CATEGORIES.map((c) => (
            <Link key={c} href={{ pathname: "/experiences", query: { cat: c } }} className={link}>{t(`categories.${c}` as "categories.sea")}</Link>
          ))}
        </nav>

        <nav aria-label={t("footer.partners")} className={col}>
          <p className={head}>{t("footer.partners")}</p>
          <Link href="/signin" className={link}>{t("footer.operators")}</Link>
          <Link href="/signin" className={link}>{t("footer.agencies")}</Link>
          <Link href="/signin" className={link}>{t("footer.creators")}</Link>
          <Link href="/app" className={link}>{t("nav.dashboard")}</Link>
        </nav>

        <nav aria-label={t("nav.language")} className={col}>
          <p className={head}>{t("nav.language")}</p>
          {routing.locales.map((l) => (
            <Link key={l} href="/" locale={l} lang={l} className={link}>{LANG[l]}</Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-small text-white/60 md:flex-row md:items-center md:justify-between">
          <span>{t("footer.rights", { year })}</span>
          <span>{t("footer.demoNote")}</span>
        </div>
      </div>
    </footer>
  );
}
