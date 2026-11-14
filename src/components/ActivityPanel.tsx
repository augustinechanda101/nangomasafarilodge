import { useEffect, useState } from 'react';
import { fetchActivityRange, type ActivityEntry } from '../lib/data';

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type Period = 'today' | 'week' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'custom', label: 'Custom' },
];

// Desk activities with period tabs (Today / Last 7 days / Custom).
// Scrolls within itself — never grows the page endlessly.
export default function ActivityPanel() {
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(localISO(new Date(Date.now() - 6 * 86_400_000)));
  const [customTo, setCustomTo] = useState(localISO(new Date()));
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);

  const today = localISO(new Date());
  const weekStart = localISO(new Date(Date.now() - 6 * 86_400_000));
  const customValid = customFrom !== '' && customTo !== '' && customFrom <= customTo;

  const from = period === 'today' ? today : period === 'week' ? weekStart : customValid ? customFrom : '';
  const to = period === 'today' ? today : period === 'week' ? today : customValid ? customTo : '';

  useEffect(() => {
    if (!from || !to) {
      setEntries([]);
      return;
    }
    setEntries(null);
    fetchActivityRange(from, to, 'reception')
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [from, to]);

  const periodLabel =
    period === 'custom'
      ? customValid ? `${customFrom} – ${customTo}` : 'custom (pick dates)'
      : PERIODS.find((p) => p.id === period)!.label.toLowerCase();

  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold">Activity — {periodLabel}</h3>
        <div className="flex w-fit flex-wrap items-center gap-2 rounded-xl bg-bark-soft p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                period === p.id ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
              }`}
            >
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <span className="flex items-center gap-2 px-2 text-sm text-bark">
              <input
                type="date"
                value={customFrom}
                max={today}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="min-h-9 rounded-lg border border-bark-field bg-sand-card px-2 text-sm"
                aria-label="From date"
              />
              →
              <input
                type="date"
                value={customTo}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                className="min-h-9 rounded-lg border border-bark-field bg-sand-card px-2 text-sm"
                aria-label="To date"
              />
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 max-h-[28rem] overflow-y-auto">
        {entries === null ? (
          <div className="flex justify-center py-8">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-3 text-sm text-bark-muted">No activity in this period</p>
        ) : (
          <div className="flex flex-col">
            {entries.map((e) => (
              <div key={e.id} className="flex items-baseline gap-3 border-t border-sand-line py-2.5 first:border-t-0">
                <span className="w-24 shrink-0 text-[13px] font-semibold text-bark-muted">
                  {e.date === today ? 'Today' : e.date.slice(5)} {e.time}
                </span>
                <span className="text-sm">{e.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
