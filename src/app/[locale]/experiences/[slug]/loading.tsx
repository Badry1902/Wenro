/** Shown while an experience page loads: same layout as the page, so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-6xl px-4 pb-16 pt-20">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-3 h-10 w-2/3" />
      <div className="mt-6 grid h-64 grid-cols-[1fr_1.25fr_1fr] gap-2 md:h-96">
        <div className="skeleton rounded-image" /><div className="skeleton rounded-image" /><div className="skeleton rounded-image" />
      </div>
      <div className="mt-8 flex flex-wrap gap-8">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-5" />)}</div>
        <div className="skeleton h-[480px] w-full flex-[1_1_360px] md:max-w-[400px]" />
      </div>
    </div>
  );
}
