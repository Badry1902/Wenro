import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SurveyForm } from "@/components/site/SurveyForm";
import { SURVEY, surveyLang } from "@/lib/survey";

const TOP = {
  en: {
    title: "Help us build a better way to book trips",
    lead: "You travel a lot, so you know what makes booking a tour easy or stressful. We're building WENRO, a booking site for tours and activities in Egypt, and we'd love your honest view.",
    facts: ["About 4 minutes", "Anonymous", "No sign-up"],
    other: "عربي",
  },
  ar: {
    title: "ساعدنا نعمل طريقة أحسن لحجز الرحلات",
    lead: "إنت مسافر كتير، فعارف إيه اللي بيخلي حجز رحلة سهل أو متعب. إحنا بنبني WENRO، موقع لحجز الرحلات والأنشطة في مصر، ومحتاجين رأيك بصراحة.",
    facts: ["حوالي 4 دقايق", "من غير اسم", "من غير تسجيل"],
    other: "English",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: `${TOP[surveyLang(locale)].title} · WENRO`,
    description: TOP[surveyLang(locale)].lead,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ src?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { src } = await searchParams;
  const lang = surveyLang(locale);
  const t = TOP[lang];
  const source = typeof src === "string" && /^[a-z0-9_-]{1,30}$/i.test(src) ? src.toLowerCase() : null;

  return (
    <div lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-dvh bg-ivory dark:bg-surface">
      <header className="border-b border-line/70 bg-surface">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <Link prefetch={false} href="/" aria-label="WENRO" className="flex min-h-11 items-center"><Wordmark width={116} priority /></Link>
          <span className="flex-1" />
          <Link prefetch={false} href={source ? `/survey?src=${source}` : "/survey"} locale={lang === "ar" ? "en" : "ar"}
            className="inline-flex min-h-11 items-center rounded-control px-3 font-semibold text-link hover:bg-muted">{t.other}</Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 md:pt-12">
        <h1 className="text-balance font-display text-[30px] font-extrabold leading-tight md:text-[40px]">{t.title}</h1>
        <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-ink-muted">{t.lead}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {t.facts.map((f) => <li key={f} className="rounded-full bg-aqua px-3 py-1 text-small font-semibold text-teal-ink">{f}</li>)}
        </ul>
        <SurveyForm sections={SURVEY} lang={lang} locale={locale} source={source} />
      </main>
    </div>
  );
}
