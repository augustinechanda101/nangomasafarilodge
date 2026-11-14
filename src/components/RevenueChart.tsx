import type { RevenuePoint } from '../lib/staffTypes';

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const max = Math.max(...data.map((p) => p.amount), 1);
  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold">Revenue, last 7 days</h3>
        <span className="rounded-full bg-savanna-chip px-2.5 py-1 text-xs font-semibold text-savanna-ink">Real payments</span>
      </div>
      <div className="mt-3 flex h-[210px] items-end gap-2">
        {data.map((p) => (
          <div key={p.day} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs">K{p.amount.toLocaleString()}</span>
            <div
              className={`w-[70%] rounded-t-md ${p.today ? 'bg-ochre' : 'bg-bark-deep'}`}
              style={{ height: `${(p.amount / max) * 150}px` }}
            />
            <span className="text-xs text-bark-muted">{p.day}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
