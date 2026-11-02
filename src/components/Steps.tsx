import { useTranslations } from "next-intl";

/** Booking progress: 1 Select · 2 Details · 3 Review · 4 Confirmed */
export function Steps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const t = useTranslations("booking");
  const labels = [t("stepSelect"), t("stepDetails"), t("stepReview"), t("stepConfirmed")];
  return (
    <ol aria-label={t("steps")} className="grid grid-cols-4 gap-1.5 text-[12px] font-semibold">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current || current === 4;
        const active = n === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex flex-col gap-1.5 ${done ? "text-success" : active ? "text-discovery" : "text-ink-muted"}`}
          >
            <span aria-hidden="true" className={`step-bar h-1 rounded bg-line ${done ? "text-success" : "text-discovery"}`}
              style={{ "--fill": done || active ? 1 : 0 } as React.CSSProperties} />
            {label}
          </li>
        );
      })}
    </ol>
  );
}
