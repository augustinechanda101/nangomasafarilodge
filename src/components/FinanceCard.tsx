interface Props {
  // Anything with optional amount/method — GridBar[], BookingRecord[], etc.
  items: { amount?: number; method?: string }[];
  title: string;
}

const METHODS = ['Mobile money', 'Cash', 'Bank transfer'] as const;

// Period financials: total collected + breakdown by payment method
export default function FinanceCard({ items, title }: Props) {
  const paid = items.filter((b) => b.amount !== undefined);
  const total = paid.reduce((a, b) => a + (b.amount ?? 0), 0);
  const byMethod = METHODS.map((m) => ({
    method: m,
    sum: paid.filter((b) => b.method === m).reduce((a, b) => a + (b.amount ?? 0), 0),
    count: paid.filter((b) => b.method === m).length,
  })).filter((m) => m.count > 0);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sand-line bg-sand-card p-4">
      <h4 className="text-sm font-semibold text-bark">{title}</h4>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex flex-col">
          <span className="text-xs text-bark-muted">Collected</span>
          <span className="font-display text-2xl font-semibold">K{total.toLocaleString()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-bark-muted">Payments</span>
          <span className="font-display text-2xl font-semibold">{paid.length}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {byMethod.map((m) => (
          <span
            key={m.method}
            className="rounded-full bg-bark-soft px-3 py-1.5 text-xs font-semibold text-bark"
          >
            {m.method} · K{m.sum.toLocaleString()} ({m.count})
          </span>
        ))}
        {byMethod.length === 0 && (
          <span className="text-xs text-bark-muted">No payments recorded in this period</span>
        )}
      </div>
    </div>
  );
}
