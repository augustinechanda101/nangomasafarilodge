import type { Kpi } from '../lib/staffTypes';

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex-1 rounded-2xl border border-sand-line bg-sand-card px-4 py-3.5">
      <p className="text-[13px] text-bark-muted">{kpi.label}</p>
      <p className="my-1 font-display text-3xl font-semibold">{kpi.value}</p>
      {kpi.columns && (
        <div className="mt-1 grid grid-cols-2 gap-2">
          {kpi.columns.map((c) => (
            <div key={c.label} className="rounded-xl bg-bark-soft px-2.5 py-2">
              <p className="text-[11px] text-bark-muted">{c.label}</p>
              <p className="text-sm font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-[13px] text-bark-muted">{kpi.note}</p>
    </div>
  );
}
