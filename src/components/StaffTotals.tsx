import type { StaffTotal } from '../lib/staffTypes';

export default function StaffTotals({ rows }: { rows: StaffTotal[] }) {
  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <h3 className="mb-1.5 font-display text-xl font-semibold">Revenue by staff, this week</h3>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between border-t border-sand-line py-2.5">
          <span className="flex-[2]">{r.name}</span>
          <span className="flex-1 text-[13px] text-bark-muted">{r.bookings} booking{r.bookings > 1 ? 's' : ''}</span>
          <b className="flex-1 text-right">K{r.amount.toLocaleString()}</b>
        </div>
      ))}
    </section>
  );
}
