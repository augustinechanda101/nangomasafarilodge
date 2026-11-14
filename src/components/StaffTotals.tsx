import type { StaffActions } from '../lib/data';

export default function StaffTotals({ rows }: { rows: StaffActions[] }) {
  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <h3 className="mb-1.5 font-display text-xl font-semibold">Actions by staff, last 7 days</h3>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-bark-muted">No staff activity yet</p>
      ) : (
        rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between border-t border-sand-line py-2.5">
            <span className="flex-[2]">{r.name}</span>
            <b className="flex-1 text-right">{r.actions} action{r.actions > 1 ? 's' : ''}</b>
          </div>
        ))
      )}
    </section>
  );
}
