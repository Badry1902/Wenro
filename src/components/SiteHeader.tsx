import Image from "next/image";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES } from "@/lib/catalog";
import { HeaderMenus } from "./site/HeaderMenus";
import { AccountButton } from "./site/AccountButton";
import { WishCount } from "./site/Recent";
import { IconHeart } from "./Icons";

/**
 * Site header: logo, catalogue links, language and the account button. Signed-in people see a
 * "Dashboard" button that takes them to their workspace; everyone else sees "Sign in" (checked in the
 * browser, so the public pages stay cacheable).
 */
export async function SiteHeader() {
  const t = await getTranslations();
  const cats = CATEGORIES.map((c) => ({ slug: c, name: t(`categories.${c}` as "categories.sea"), blurb: t(`catBlurb.${c}` as "catBlurb.sea") }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md print:static print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" aria-label="WENRO" className="flex min-h-11 shrink-0 items-center">
          {/* Temporary PNG export of the original logo. Replace with the SVG master before launch. */}
          <Image src="/brand/logo-horizontal-temp.png" alt="WENRO" width={132} height={25} priority />
        </Link>

        <Suspense fallback={<div className="flex-1" />}>
          <HeaderMenus
            categories={cats}
            labels={{
              allTrips: t("nav.allTrips"), categories: t("nav.categories"), menu: t("nav.menu"), language: t("nav.language"),
              close: t("gallery.close"), partners: t("nav.partners"), explore: t("nav.explore"), plan: t("nav.plan"),
            }}
            account={{ signIn: t("nav.signIn"), dashboard: t("nav.dashboard") }}
          />
        </Suspense>

        <Link href="/wishlist" aria-label={t("wishlist.title")} title={t("wishlist.title")}
          className="btn-press relative grid size-11 shrink-0 place-items-center rounded-full hover:bg-discovery-tint">
          <IconHeart size={21} /><WishCount />
        </Link>
        <AccountButton labels={{ signIn: t("nav.signIn"), dashboard: t("nav.dashboard") }} className="hidden sm:inline-flex" />
      </div>
    </header>
  );
}
