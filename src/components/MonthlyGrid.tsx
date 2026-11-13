import { useMemo, useState } from 'react';
import type { GridRoom } from '../lib/staffTypes';

interface Props {
  rooms: GridRoom[];
  onDateSelect?: (date: string) => void;
  selected?: string | null;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Format a Date as YYYY-MM-DD using local components (toISOString would shift to UTC)
function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Deterministic sample occupancy until real booking data exists
function occupancyFor(year: number, month: number, day: number, total: number, seedOffset = 0): number {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  const weekend = dow === 0 || dow === 5 || dow === 6;
  const base = weekend ? 0.75 : 0.45;
  const jitter = ((day * 31 + month * 7 + year + seedOffset) % 6) / 20;
  return Math.min(total, Math.round(total * Math.min(1, base + jitter)));
}

const seedOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

function occColor(pct: number): string {
  if (pct === 0) return 'bg-sand-line';
  if (pct < 50) return 'bg-ochre-chip';
  if (pct < 100) return 'bg-ochre';
  return 'bg-brick-ink';
}

export default function MonthlyGrid({ rooms, onDateSelect, selected }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [internalSelected, setInternalSelected] = useState<string | null>(localISO(today));
  const sel = selected !== undefined ? selected : internalSelected;

  const total = daysInMonth(year, month);
  // Day of week of the 1st, converted to Monday-based index (Mon=0 … Sun=6)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  // Group rooms by location
  const groups = useMemo(() => {
    const map = new Map<string, GridRoom[]>();
    rooms.forEach((r) => {
      const loc = r.location ?? 'Rooms';
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push(r);
    });
    return [...map.entries()];
  }, [rooms]);

  const totalRooms = rooms.length;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = localISO(today);

  return (
    <div className="flex flex-col gap-3">
      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevMonth}
          className="min-h-10 w-10 rounded-xl bg-bark-soft text-bark hover:bg-bark-off"
        >
          ‹
        </button>
        <h4 className="font-display text-lg font-semibold">
          {MONTHS[month]} {year}
        </h4>
        <button
          onClick={nextMonth}
          className="min-h-10 w-10 rounded-xl bg-bark-soft text-bark hover:bg-bark-off"
        >
          ›
        </button>
        <button
          onClick={goToday}
          className="ml-2 min-h-10 rounded-xl bg-ochre px-4 text-sm font-semibold text-sand-card hover:bg-bark-deep"
        >
          This Month
        </button>
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="flex items-center justify-center py-1 text-xs font-semibold text-bark-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dateStr = localISO(date);
          // Per-location occupancy for this day
          const locOccs = groups.map(([loc, locRooms]) => ({
            loc,
            occ: occupancyFor(date.getFullYear(), date.getMonth(), date.getDate(), locRooms.length, seedOf(loc)),
            n: locRooms.length,
          }));
          const occ = locOccs.reduce((a, s) => a + s.occ, 0);
          const pct = (occ / totalRooms) * 100;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === sel;
          const isPast = dateStr < todayStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => {
                setInternalSelected(dateStr);
                onDateSelect?.(dateStr);
              }}
              className={`flex min-h-[96px] flex-col items-start gap-1 rounded-xl border p-2 text-left transition-colors ${
                isSelected
                  ? 'border-ochre bg-ochre-chip'
                  : isToday
                  ? 'border-ochre bg-sand-card'
                  : 'border-sand-line bg-sand-card hover:border-ochre'
              } ${isPast ? 'opacity-60' : ''}`}
            >
              <span
                className={`text-sm font-semibold ${
                  isToday ? 'text-ochre-ink' : 'text-bark'
                }`}
              >
                {date.getDate()}
                {isToday && <span className="ml-1 text-[10px] font-normal">today</span>}
              </span>
              {/* Occupancy bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-line">
                <div
                  className={`h-full rounded-full ${occColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {locOccs.map((s) => (
                <span key={s.loc} className="text-[10px] leading-tight text-bark-muted">
                  {s.loc} {s.occ}/{s.n}
                </span>
              ))}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-bark-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sand-line" /> Empty
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-ochre-chip" /> Under 50%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-ochre" /> 50–99%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brick-ink" /> Full
        </span>
      </div>
    </div>
  );
}
