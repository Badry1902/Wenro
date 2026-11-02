import Image from "next/image";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function SiteHeader() {
  const t = await getTranslations();
  return (
    <header className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-2">
        <Link href="/" aria-label="WENRO" className="flex min-h-11 items-center">
          {/* Temporary PNG export of the original logo. Replace with the SVG master before launch. */}
          <Image src="/brand/logo-horizontal-temp.png" alt="WENRO" width={140} height={27} priority />
        </Link>
        <Suspense fallback={null}>
          <LocaleSwitcher />
        </Suspense>
      </div>
      <div className="bg-warning-tint px-4 py-1 text-center text-small text-warning">{t("dev.badge")}</div>
    </header>
  );
}
