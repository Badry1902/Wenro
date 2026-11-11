"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ExperienceCard } from "@/lib/data/types";
import { AutoPlan } from "./AutoPlan";
import { PlanWeek } from "./PlanWeek";

/** Plan my week: "Plan it for me" (questions) or "I'll pick" (choose trips, we find the days). */
export function PlanTabs({ cards }: { cards: ExperienceCard[] }) {
  const t = useTranslations("planner");
  const [tab, setTab] = useState<"auto" | "manual">("auto");
  const tabCls = (on: boolean) => `btn-press inline-flex min-h-11 items-center rounded-full px-5 font-bold ${on ? "bg-ink text-white" : "text-ink hover:bg-discovery-tint"}`;
  return (
    <>
      <div role="tablist" aria-label={t("tabsLabel")} className="mb-6 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
        <button type="button" role="tab" aria-selected={tab === "auto"} onClick={() => setTab("auto")} className={tabCls(tab === "auto")}>{t("tabAuto")}</button>
        <button type="button" role="tab" aria-selected={tab === "manual"} onClick={() => setTab("manual")} className={tabCls(tab === "manual")}>{t("tabManual")}</button>
      </div>
      <div role="tabpanel">{tab === "auto" ? <div className="max-w-3xl"><AutoPlan cards={cards} /></div> : <PlanWeek cards={cards} />}</div>
    </>
  );
}
