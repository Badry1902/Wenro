import { Link } from "@/i18n/navigation";
import { IconCheck } from "../Icons";

/** Short "first steps" list shown until everything is done. */
export function FirstSteps({ title, sub, steps }: { title: string; sub: string; steps: { label: string; done: boolean; href?: string; cta?: string }[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section aria-labelledby="first-steps" className="mb-8 rounded-card border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 id="first-steps" className="text-[15px] font-semibold">{title}</h2>
        <span className="font-mono text-[13px] tabular-nums text-ink-muted">{done}/{steps.length}</span>
      </div>
      <p className="px-5 text-[13px] text-ink-muted">{sub}</p>
      <div className="mx-5 mb-2 mt-3 h-1 overflow-hidden rounded-full bg-[#ECEBE6]"><div className="h-full rounded-full bg-discovery" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="divide-y divide-line">
        {steps.map((s, i) => (
          <li key={i} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2">
            <span className="flex items-center gap-3">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-[12px] ${s.done ? "bg-success-tint text-success" : "border border-line text-ink-muted"}`}>{s.done ? <IconCheck size={13} /> : i + 1}</span>
              <span className={s.done ? "text-ink-muted line-through" : "text-ink"}>{s.label}</span>
            </span>
            {!s.done && s.href && s.cta && <Link href={s.href} className="inline-flex min-h-9 items-center rounded-[8px] px-3 text-[14px] font-medium text-discovery transition-colors duration-150 hover:bg-discovery-tint">{s.cta}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
