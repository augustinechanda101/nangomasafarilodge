import { useState } from 'react';
import FinanceCard from './FinanceCard';
import RecordsView from './RecordsView';
import type { BookingRecord } from '../lib/staffTypes';

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type Period = 'today' | 'week' | 'month' | 'lastmonth' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastmonth', label: 'Last month' },
  { id: 'custom', label: 'Custom' },
];

// The full finance report: period tabs, figures, payments, per-day ledger.
// Used by the Reception Finance page and the GM Finance tab.
export default function FinanceView({ records }: { records: BookingRecord[] }) {
  const [daysOpen, setDaysOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(localISO(new Date(Date.now() - 6 * 86_400_000)));
  const [customTo, setCustomTo] = useState(localISO(new Date()));

  const now = new Date();
  const today = localISO(now);
  const weekStart = localISO(new Date(Date.now() - 6 * 86_400_000));
  const monthPrefix = today.slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = localISO(lastMonthDate).slice(0, 7);

  const customValid = customFrom !== '' && customTo !== '' && customFrom <= customTo;
  const periodRecords =
    period === 'today'
      ? records.filter((r) => r.checkIn === today)
      : period === 'week'
      ? records.filter((r) => r.checkIn >= weekStart && r.checkIn <= today)
      : period === 'month'
      ? records.filter((r) => r.checkIn.slice(0, 7) === monthPrefix)
      : period === 'lastmonth'
      ? records.filter((r) => r.checkIn.slice(0, 7) === lastMonthPrefix)
      : customValid
      ? records.filter((r) => r.checkIn >= customFrom && r.checkIn <= customTo)
      : [];
  const periodLabel =
    period === 'custom'
      ? customValid
        ? `${customFrom} – ${customTo}`
        : 'custom (pick dates)'
      : PERIODS.find((p) => p.id === period)!.label;

  // The days belonging to the selected period
  const customDays = customValid
    ? Math.min(
        92,
        Math.round(
          (new Date(customTo + 'T00:00:00').getTime() - new Date(customFrom + 'T00:00:00').getTime()) / 86_400_000,
        ) + 1,
      )
    : 0;
  const dayCount =
    period === 'today'
      ? 1
      : period === 'week'
      ? 7
      : period === 'month'
      ? now.getDate()
      : period === 'lastmonth'
      ? Number(localISO(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0)).slice(8))
      : customDays;
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d =
      period === 'lastmonth'
        ? new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), i + 1)
        : period === 'custom' && customValid
        ? new Date(new Date(customFrom + 'T00:00:00').getTime() + i * 86_400_000)
        : new Date(Date.now() - (dayCount - 1 - i) * 86_400_000);
    const dateStr = localISO(d);
    const rs = records.filter((r) => r.checkIn === dateStr);
    const byMethod = (m: string) => rs.filter((r) => r.method === m).reduce((a, r) => a + r.amount, 0);
    return {
      date: dateStr,
      count: rs.length,
      mobile: byMethod('Mobile money'),
      cash: byMethod('Cash'),
      bank: byMethod('Bank transfer'),
      total: rs.reduce((a, r) => a + r.amount, 0),
    };
  });

  return (
    <>
      {/* Period selector */}
      <div className="flex w-fit flex-wrap items-center gap-3 rounded-xl bg-bark-soft p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
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

      <FinanceCard items={periodRecords} title={`Financials — ${periodLabel.toLowerCase()}`} />

      {/* The period's payments */}
      <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
        <RecordsView records={periodRecords} />
      </section>

      {/* Per-day records for the period — collapsible */}
      <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
        <button
          type="button"
          onClick={() => setDaysOpen(!daysOpen)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <h4 className="text-sm font-semibold text-bark">
            Each day's record — {periodLabel.toLowerCase()}
          </h4>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg bg-bark-soft text-bark transition-transform ${
              daysOpen ? 'rotate-180' : ''
            }`}
          >
            ▾
          </span>
        </button>
        <div className={`overflow-x-auto ${daysOpen ? 'mt-3' : ''}`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-bark-muted">
                <th className="py-2 pr-3 font-semibold">Date</th>
                <th className="py-2 pr-3 font-semibold">Payments</th>
                <th className="py-2 pr-3 font-semibold">Mobile money</th>
                <th className="py-2 pr-3 font-semibold">Cash</th>
                <th className="py-2 pr-3 font-semibold">Bank transfer</th>
                <th className="py-2 font-semibold">Total (K)</th>
              </tr>
            </thead>
            <tbody>
              {(daysOpen ? days : days.slice(0, 3)).map((d) => (
                <tr key={d.date} className={`border-t border-sand-line ${d.date === today ? 'bg-ochre-chip' : ''}`}>
                  <td className="py-2 pr-3 font-semibold">
                    {d.date}
                    {d.date === today && <span className="ml-2 text-[10px] text-ochre-ink">today</span>}
                  </td>
                  <td className="py-2 pr-3">{d.count}</td>
                  <td className="py-2 pr-3 text-bark-muted">K{d.mobile.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-bark-muted">K{d.cash.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-bark-muted">K{d.bank.toLocaleString()}</td>
                  <td className="py-2 font-semibold">{d.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
