"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoLoop } from "@/components/brand/BrandMotion";

/**
 * Page not found. A client component on purpose: it can then appear inside cached (static) pages such as a
 * trip page whose address no longer exists, without making those pages dynamic.
 */
export default function NotFound() {
  const t = useTranslations("common");
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Link href="/" aria-label="WENRO" className="flex min-h-11 items-center">
            <Image src="/brand/logo-horizontal-temp.png" alt="WENRO" width={132} height={25} />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <LogoLoop width={220} />
        <h1 className="text-h2 font-bold">{t("notFoundTitle")}</h1>
        <p className="text-ink-muted">{t("notFoundText")}</p>
        <Link href="/experiences" className="btn-press inline-flex min-h-11 items-center justify-center rounded-control bg-discovery px-5 font-bold text-white hover:bg-discovery-hover">{t("notFoundCta")}</Link>
      </main>
    </>
  );
}
