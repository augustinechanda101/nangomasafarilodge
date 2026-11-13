import { useMemo, useState } from 'react';
import type { BookingRecord } from '../lib/staffTypes';

const FIELD =
  'min-h-10 w-full max-w-sm rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';

const STATUS_CHIP: Record<string, string> = {
  Completed: 'bg-bark-soft text-bark-muted',
  'In house': 'bg-bark-deep text-sand-card',
  Booked: 'bg-ochre-chip text-ochre-ink',
};

export default function RecordsView({ records }: { records: BookingRecord[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((r) =>
      [r.guest, r.phone, r.room, r.location, r.invoice, r.method]
        .some((v) => v.toLowerCase().includes(needle)),
    );
  }, [records, q]);

  const total = filtered.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={FIELD}
          placeholder="Search guest, phone, room, invoice…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-sm text-bark-muted">
          {filtered.length} record{filtered.length === 1 ? '' : 's'} · K{total.toLocaleString()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-bark-muted">
              <th className="py-2 pr-3 font-semibold">Guest</th>
              <th className="py-2 pr-3 font-semibold">Phone</th>
              <th className="py-2 pr-3 font-semibold">Room</th>
              <th className="py-2 pr-3 font-semibold">Location</th>
              <th className="py-2 pr-3 font-semibold">Check-in</th>
              <th className="py-2 pr-3 font-semibold">Nights</th>
              <th className="py-2 pr-3 font-semibold">Amount (K)</th>
              <th className="py-2 pr-3 font-semibold">Method</th>
              <th className="py-2 pr-3 font-semibold">Invoice</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-6 text-center text-bark-muted">
                  No records match “{q}”
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={`${r.invoice}-${r.room}-${i}`} className="border-t border-sand-line">
                  <td className="py-2 pr-3 font-semibold">{r.guest}</td>
                  <td className="py-2 pr-3 text-bark-muted">{r.phone}</td>
                  <td className="py-2 pr-3">{r.room}</td>
                  <td className="py-2 pr-3 text-bark-muted">{r.location}</td>
                  <td className="py-2 pr-3">{r.checkIn}</td>
                  <td className="py-2 pr-3">{r.nights}</td>
                  <td className="py-2 pr-3 font-semibold">{r.amount.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-bark-muted">{r.method}</td>
                  <td className="py-2 pr-3 text-bark-muted">{r.invoice}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[r.status] ?? ''}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
