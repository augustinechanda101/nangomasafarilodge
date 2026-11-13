import { useState } from 'react';
import type { BarKind, GridBar, GridRoom } from '../lib/staffTypes';
import BookingDetailModal from './BookingDetailModal';

const BAR: Record<BarKind, string> = {
  checkedIn: 'bg-bark-deep text-sand-card',
  awaiting: 'bg-ochre-chip text-ochre-ink',
  hold: 'bg-ochre text-sand-card',
  overdue: 'bg-brick-ink text-sand-card',
  inspect: 'bg-brick-chip text-brick-ink',
};

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

interface Props {
  date: string;
  rooms: GridRoom[];
  bookings: GridBar[];
  onDateChange?: (date: string) => void;
  canAct?: boolean;
}

type Row = { kind: 'header'; label: string } | { kind: 'room'; room: GridRoom; roomIndex: number };

export default function HourlyGrid({ date, rooms, bookings, onDateChange, canAct }: Props) {
  const [condensed, setCondensed] = useState(true);
  const [overnight, setOvernight] = useState(false);
  const [activeBar, setActiveBar] = useState<GridBar | null>(null);
  const rangeStart = overnight ? 0 : 6;
  const step = condensed ? 2 : 1;
  const hours = Array.from(
    { length: Math.floor((24 - rangeStart) / step) },
    (_, i) => rangeStart + i * step,
  );

  // Build rows: insert a section header whenever the room's location changes
  const rows: Row[] = [];
  const rowIndexByRoom = new Map<number, number>();
  let lastLoc: string | undefined;
  rooms.forEach((r, i) => {
    if (r.location !== lastLoc && rooms.some((x) => x.location !== r.location)) {
      rows.push({ kind: 'header', label: r.location ?? 'Rooms' });
      lastLoc = r.location;
    }
    rowIndexByRoom.set(i, rows.length);
    rows.push({ kind: 'room', room: r, roomIndex: i });
  });
  const rowHeights = ['40px', ...rows.map((r) => (r.kind === 'header' ? '30px' : '54px'))];

  // Filter bookings for the selected date and sort by start time
  const sortedBookings = [...bookings]
    .filter(() => {
      // In a real app, bookings would have date fields. For now, show all
      // since sample data doesn't have dates
      return true;
    })
    .sort((a, b) => a.start - b.start);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-bark-muted">
          Select date:
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange?.(e.target.value)}
            className="min-h-10 rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre"
          />
        </label>
        <button
          onClick={() => setCondensed(!condensed)}
          className="min-h-10 rounded-xl px-4 text-sm font-semibold bg-bark-soft text-bark hover:bg-bark-off"
        >
          {condensed ? 'Show All Hours' : 'Condensed View'}
        </button>
        <button
          onClick={() => setOvernight(!overnight)}
          className="min-h-10 rounded-xl px-4 text-sm font-semibold bg-bark-soft text-bark hover:bg-bark-off"
        >
          {overnight ? 'Hide Overnight (00–06)' : 'Show Overnight (00–06)'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `170px repeat(${hours.length}, minmax(80px, 1fr))`,
            gridTemplateRows: rowHeights.join(' '),
          }}
        >
          {/* Top-left empty cell */}
          <div className="bg-bark-soft rounded-tl-lg" />

          {/* Hour headers (top row) */}
          {hours.map((hour) => {
            const isHighlighted = hour === 10 || hour === 12;
            return (
              <div
                key={hour}
                className={`flex items-center justify-center border-t border-r text-xs ${
                  isHighlighted ? 'bg-ochre-chip text-ochre-ink font-semibold' : 'border-sand-line text-bark-muted'
                }`}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            );
          })}

          {/* Rows: location headers + room rows */}
          {rows.map((row, rowIndex) => {
            if (row.kind === 'header') {
              return (
                <div
                  key={`header-${row.label}`}
                  className="flex items-center px-2 text-[11px] font-semibold uppercase tracking-wide text-ochre-ink bg-ochre-chip border-t border-l border-r border-sand-line"
                  style={{ gridArea: `${rowIndex + 2} / 1 / ${rowIndex + 2} / ${hours.length + 2}` }}
                >
                  {row.label}
                </div>
              );
            }
            const r = row.room;
            const roomIndex = row.roomIndex;
            const isHighlighted = roomIndex % 2 === 0;
            return (
              <div key={r.name + (r.location ?? '')} style={{ display: 'contents' }}>
                {/* Room name cell */}
                <div
                  className={`flex flex-col items-start justify-center px-2 border-t border-l ${
                    isHighlighted ? 'bg-bark-soft text-bark' : 'bg-sand-card text-bark-muted'
                  }`}
                  style={{ gridArea: `${rowIndex + 2} / 1` }}
                >
                  <b className="text-sm">{r.name}</b>
                  <span className="text-[11px] font-normal text-bark-muted">
                    {r.type}
                    {r.rate ? ` · K${r.rate.toLocaleString()}` : ''}
                  </span>
                </div>
                {/* Hour cells for this room */}
                {hours.map((hour, hourIndex) => (
                  <div
                    key={`${r.name}-${hour}`}
                    className={`border-t border-r ${
                      isHighlighted ? 'bg-bark-soft' : 'bg-sand-card'
                    }`}
                    style={{ gridArea: `${rowIndex + 2} / ${hourIndex + 2}` }}
                  />
                ))}
              </div>
            );
          })}

          {/* Bookings */}
          {bookings.map((b) => {
            const roomIndex = b.room - 1;
            const rowIndex =
              roomIndex < 0 || roomIndex >= rooms.length ? undefined : rowIndexByRoom.get(roomIndex);
            if (rowIndex === undefined) return null;

            const startHour = Math.floor(b.start);
            const endHour = Math.ceil(b.end);

            // Map hours to visible columns (range offset + step), clamped to the range
            const startCol = Math.max(0, Math.floor((startHour - rangeStart) / step));
            const endCol = Math.min(hours.length, Math.ceil((endHour - rangeStart) / step));
            if (endCol <= startCol) return null;

            const [name, ...rest] = b.label.split('·');
            const detail = rest.join('·').trim();
            return (
              <div
                key={`${b.room}-${b.start}`}
                onClick={() => setActiveBar(b)}
                className={`flex cursor-pointer flex-col justify-center overflow-hidden whitespace-nowrap px-2 leading-tight ${BAR[b.kind]}`}
                style={{
                  gridArea: `${rowIndex + 2} / ${startCol + 2} / ${rowIndex + 3} / ${endCol + 2}`,
                }}
                title={b.label}
              >
                <span className="text-xs font-semibold truncate">{name.trim()}</span>
                <span className="text-[9px] opacity-80 truncate">{detail}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Summary */}
      <div className="rounded-2xl border border-sand-line bg-sand-card p-4">
        <h4 className="mb-3 text-sm font-semibold text-bark">
          {date === localISO(new Date())
            ? "Today's Activities"
            : `${new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — Activities`}
        </h4>
        <div className="max-h-72 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {sortedBookings.length === 0 ? (
            <p className="text-sm text-bark-muted">No activities scheduled for this date</p>
          ) : (
            sortedBookings.map((b) => {
              const startHour = Math.floor(b.start);
              const endHour = Math.ceil(b.end);
              const startTime = `${startHour.toString().padStart(2, '0')}:00`;
              const endTime = `${endHour.toString().padStart(2, '0')}:00`;
              const room = rooms[b.room - 1];
              const [name, ...rest] = b.label.split('·');
              const detail = rest.join('·').trim();
              return (
                <div
                  key={`${b.room}-${b.start}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${BAR[b.kind]}`}
                >
                  <span className="font-semibold w-24">
                    {startTime} - {endTime}
                  </span>
                  <span className="font-semibold w-20">{room?.name ?? `Room ${b.room}`}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{name.trim()}</span>
                    <span className="block text-[10px] opacity-80">{detail}</span>
                  </span>
                  {room?.location && (
                    <span className="text-[11px] text-sand-card">{room.location}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-bark-muted">
          Showing {hours[0].toString().padStart(2, '0')}:00 – 23:00
          {overnight ? ' (full 24h)' : ''} · Scroll horizontally to see all hours
        </span>
      </div>

      {activeBar && (
        <BookingDetailModal
          bar={activeBar}
          rooms={rooms}
          mode="hours"
          allBars={bookings}
          onSelectBar={setActiveBar}
          canAct={canAct}
          onAction={(verb, b) => console.log('POST /api/bookings/action', { verb, invoice: b.invoice, room: b.room })}
          onClose={() => setActiveBar(null)}
        />
      )}
    </div>
  );
}
