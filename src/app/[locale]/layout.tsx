import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/env";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
// Fonts are self-hosted (no request to Google from the visitor's browser — better for privacy/GDPR).
import "@fontsource-variable/manrope";
import "@fontsource-variable/nunito/wght.css";
import "@fontsource-variable/baloo-bhaijaan-2/wght.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import { routing, isRtl } from "@/i18n/routing";
import { VisitBeacon } from "@/components/site/VisitBeacon";
import "../globals.css";

// Coast Club type: rounded Nunito (Latin, Cyrillic) and Baloo Bhaijaan 2 (Arabic) for headings, echoing the
// rounded wordmark; Manrope and IBM Plex Sans Arabic for reading text.

// Only the texts that client components use are sent to the browser. Server-only texts (dashboards,
// emails, vouchers, WhatsApp) stay on the server: this cut each page's HTML and every RSC payload by ~70%.
const SERVER_ONLY = new Set(["app", "email", "voucher", "whatsapp", "meta", "footer", "catBlurb", "dev"]);
const CLIENT_APP = ["editor", "push"] as const;

function clientMessages(all: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(all)) if (!SERVER_ONLY.has(k)) out[k] = v;
  const app = all.app as Record<string, unknown> | undefined;
  if (app) out.app = Object.fromEntries(CLIENT_APP.filter((k) => k in app).map((k) => [k, app[k]]));
  return out;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#19244E" };

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
  const messages = clientMessages((await getMessages()) as Record<string, unknown>);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
    >
      <body>
        {preview && (
          <p role="note" className="bg-ink px-4 py-2 text-center text-small font-semibold text-white print:hidden">{t("previewBanner")}</p>
        )}
        <NextIntlClientProvider messages={messages}>{children}<VisitBeacon /></NextIntlClientProvider>
      </body>
    </html>
  );
}
