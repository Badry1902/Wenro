import { Link } from "@/i18n/navigation";
import { IconCheck } from "../Icons";

/** Short "first steps" list shown until everything is done. */
export function FirstSteps({ title, sub, steps }: { title: string; sub: string; steps: { label: string; done: boolean; href?: string; cta?: string }[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section aria-labelledby="first-steps" className="mb-8 rounded-card border-2 border-discovery bg-discovery-tint p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="first-steps" className="font-bold">{title}</h2>
        <span className="text-small font-bold tabular-nums text-discovery">{done}/{steps.length}</span>
      </div>
      <p className="mb-3 text-small text-ink-muted">{sub}</p>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-discovery transition-all" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className={`flex flex-wrap items-center justify-between gap-2 rounded-control bg-white p-3 ${s.done ? "opacity-70" : ""}`}>
            <span className="flex items-center gap-3">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-small font-bold ${s.done ? "bg-success text-white" : "border-2 border-discovery text-discovery"}`}>{s.done ? <IconCheck size={14} /> : i + 1}</span>
              <span className={s.done ? "line-through" : "font-semibold"}>{s.label}</span>
            </span>
            {!s.done && s.href && s.cta && <Link href={s.href} className="btn-press inline-flex min-h-10 items-center rounded-control bg-discovery px-3 text-small font-bold text-white">{s.cta}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
