import { defineRouting } from "next-intl/routing";

export const locales = ["en", "de", "ru", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: readonly Locale[] = ["ar"];
export const isRtl = (locale: string) => rtlLocales.includes(locale as Locale);

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});
