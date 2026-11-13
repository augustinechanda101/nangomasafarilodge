import type { Kpi } from '../lib/staffTypes';

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex-1 rounded-2xl border border-sand-line bg-sand-card px-4 py-3.5">
      <p className="text-[13px] text-bark-muted">{kpi.label}</p>
      <p className="my-1 font-display text-3xl font-semibold">{kpi.value}</p>
      <p className="text-[13px] text-bark-muted">{kpi.note}</p>
    </div>
  );
}
