import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { legalDoc } from "@/lib/legal";
import { LegalPage } from "@/components/site/LegalPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${legalDoc("terms", locale).title} · WENRO` };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage doc={legalDoc("terms", locale)} locale={locale} />;
}
