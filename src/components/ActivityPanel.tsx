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
// Scrolls within itself; the expand button opens it near-fullscreen.
export default function ActivityPanel() {
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(localISO(new Date(Date.now() - 6 * 86_400_000)));
  const [customTo, setCustomTo] = useState(localISO(new Date()));
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const periodLabel =
    period === 'custom'
      ? customValid ? `${customFrom} – ${customTo}` : 'custom (pick dates)'
      : PERIODS.find((p) => p.id === period)!.label.toLowerCase();

  const periodControls = (
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
  );

  const list = (tall: boolean) => (
    <div className={`overflow-y-auto ${tall ? 'mt-4 flex-1' : 'mt-3 max-h-[28rem]'}`}>
      {entries === null ? (
        <div className="flex justify-center py-8">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-3 text-sm text-bark-muted">No activity in this period</p>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => {
            const m = e.text.match(/ — by (.+)$/);
            const text = m ? e.text.replace(/ — by .+$/, '') : e.text;
            const who = e.who ?? m?.[1];
            return (
              <div key={e.id} className="flex items-baseline gap-3 border-t border-sand-line py-2.5 first:border-t-0">
                <span className="w-24 shrink-0 text-[13px] font-semibold text-bark-muted">
                  {e.date === today ? 'Today' : e.date.slice(5)} {e.time}
                </span>
                <span className="text-sm">{text}</span>
                {who && (
                  <span className="ml-auto shrink-0 rounded-full bg-ochre-chip px-2.5 py-0.5 text-[11px] font-semibold text-ochre-ink">
                    by {who}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">Activity — {periodLabel}</h3>
          <div className="flex items-center gap-2">
            {periodControls}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Expand"
              className="flex min-h-9 w-9 items-center justify-center rounded-lg bg-bark-soft text-bark hover:bg-sand-line"
            >
              ⤢
            </button>
          </div>
        </div>
        {list(false)}
      </section>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bark/40 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-sand-line bg-sand-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-semibold">Activity — {periodLabel}</h3>
              <div className="flex items-center gap-2">
                {periodControls}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Close"
                  className="flex min-h-9 w-9 items-center justify-center rounded-lg bg-bark-soft text-bark hover:bg-sand-line"
                >
                  ✕
                </button>
              </div>
            </div>
            {list(true)}
          </div>
        </div>
      )}
    </>
  );
}
