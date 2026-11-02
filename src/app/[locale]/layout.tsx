import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/env";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
// Fonts are self-hosted (no request to Google from the visitor's browser — better for privacy/GDPR).
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import { routing, isRtl } from "@/i18n/routing";
import "../globals.css";

// Font choices follow the design guide's proposals (DM Serif Display / Manrope).
// IBM Plex Sans Arabic covers Arabic, which Manrope does not support.

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#3046d9" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  // Test sites (NEXT_PUBLIC_SITE_MODE=preview) are hidden from search engines.
  const preview = process.env.NEXT_PUBLIC_SITE_MODE === "preview";
  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL(siteUrl()),
    applicationName: "WENRO",
    icons: { apple: "/icons/apple-touch-icon.png" },
    openGraph: { siteName: "WENRO", type: "website", locale },
    ...(preview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const preview = process.env.NEXT_PUBLIC_SITE_MODE === "preview";
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
    >
      <body>
        {preview && (
          <p role="note" className="bg-ink px-4 py-2 text-center text-small font-semibold text-white print:hidden">{t("previewBanner")}</p>
        )}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
