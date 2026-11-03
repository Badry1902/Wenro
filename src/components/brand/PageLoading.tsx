"use client";

import { useTranslations } from "next-intl";
import { BrandLoader } from "./BrandMotion";

/** Loading sign while a page is on its way: the WENRO journey loop, centred. */
export function PageLoading({ inShell = false }: { inShell?: boolean }) {
  const t = useTranslations("common");
  return (
    <div aria-busy="true" className={`grid place-items-center ${inShell ? "min-h-[55dvh]" : "min-h-[75dvh]"}`}>
      <BrandLoader label={t("loading")} size={inShell ? 88 : 112} />
    </div>
  );
}
