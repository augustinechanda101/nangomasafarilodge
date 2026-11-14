import { useState } from 'react';
import type { RevenuePoint } from '../lib/staffTypes';

interface Props {
  data: RevenuePoint[];
  months: RevenuePoint[];
}

// Revenue bars with a 7 days / 7 months toggle — all real payments
export default function RevenueChart({ data, months }: Props) {
  const [mode, setMode] = useState<'days' | 'months'>('days');
  const points = mode === 'days' ? data : months;
  const max = Math.max(...points.map((p) => p.amount), 1);

  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold">
          Revenue — last 7 {mode === 'days' ? 'days' : 'months'}
        </h3>
        <div className="flex rounded-xl bg-bark-soft p-0.5">
          <button
            type="button"
            onClick={() => setMode('days')}
            className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
              mode === 'days' ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
            }`}
          >
            7 days
          </button>
          <button
            type="button"
            onClick={() => setMode('months')}
            className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
              mode === 'months' ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
            }`}
          >
            7 months
          </button>
        </div>
      </div>
      <div className="mt-3 flex h-[210px] items-end gap-2">
        {points.map((p) => (
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
