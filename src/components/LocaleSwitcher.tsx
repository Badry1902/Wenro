"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const short: Record<string, string> = { en: "EN", de: "DE", ru: "RU", fr: "FR", ar: "ع" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const t = useTranslations();
  const query = Object.fromEntries(search.entries());

  return (
    <nav aria-label={t("nav.language")} className="flex flex-wrap gap-1">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={{ pathname, query }}
          locale={l}
          lang={l}
          aria-label={t(`languages.${l}`)}
          aria-current={l === locale ? "true" : undefined}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-small font-bold ${
            l === locale ? "bg-discovery text-white" : "text-ink hover:bg-discovery-tint"
          }`}
        >
          {short[l]}
        </Link>
      ))}
    </nav>
  );
}
