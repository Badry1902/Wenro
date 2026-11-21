import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import type { LegalDoc } from "@/lib/legal";

/** Plain, readable legal page (privacy policy, terms). Server-rendered, no client JavaScript. */
export function LegalPage({ doc, locale }: { doc: LegalDoc; locale: string }) {
  const fallback = locale !== "ar" && locale !== "en";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10" lang={fallback ? "en" : undefined} dir={locale === "ar" ? "rtl" : "ltr"}>
        <h1 className="text-[30px] font-extrabold leading-tight md:text-[40px]">{doc.title}</h1>
        <p className="mt-1 text-small text-ink-muted">{doc.updated}</p>
        <p className="mt-6 text-[17px] leading-relaxed">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="text-h3 font-bold">{s.h}</h2>
            {s.p.map((p) => <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-ink">{p}</p>)}
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
