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

const LEGEND: [BarKind, string][] = [
  ['checkedIn', 'Checked in'],
  ['awaiting', 'Awaiting check-in'],
  ['hold', 'Processing hold'],
  ['overdue', 'Overdue'],
  ['inspect', 'Needs inspection'],
];

interface Props { days: string[]; rooms: GridRoom[]; bars: GridBar[]; onRoomClick?: (roomNumber: number) => void; onDateChange?: (date: string) => void; zoomLevel?: number; canAct?: boolean }

type Row = { kind: 'header'; label: string } | { kind: 'room'; room: GridRoom; roomIndex: number };

export default function RoomGrid({ days, rooms, bars, onRoomClick, zoomLevel = 1, canAct }: Props) {
  const [activeBar, setActiveBar] = useState<GridBar | null>(null);

  // Zoom levels: 1 = 7 days, 2 = 4 days, 3 = 2 days
  const numColumns = zoomLevel === 1 ? 7 : zoomLevel === 2 ? 4 : 2;
  const columnLabels = days.slice(0, numColumns);

  // Build rows: insert a section header whenever the room's location changes
  const rows: Row[] = [];
  const rowIndexByRoom = new Map<number, number>(); // rooms[] index -> row position
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

  // Filter and sort bookings based on visible period
  const sortedBars = [...bars]
    .filter((b) => b.start < numColumns)
    .sort((a, b) => a.start - b.start);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `170px repeat(${numColumns}, minmax(100px, 1fr))`,
            gridTemplateRows: rowHeights.join(' '),
          }}
        >
          {/* Top-left empty cell */}
          <div className="bg-bark-soft rounded-tl-lg" />

          {/* Column headers (top row) */}
          {columnLabels.map((label, i) => {
            const isHighlighted = i === 0;
            return (
              <div
                key={label}
                className={`flex items-center justify-center border-t border-r text-xs ${
                  isHighlighted ? 'bg-ochre-chip text-ochre-ink font-semibold' : 'border-sand-line text-bark-muted'
                }`}
              >
                {label}
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
                  style={{ gridArea: `${rowIndex + 2} / 1 / ${rowIndex + 2} / ${numColumns + 2}` }}
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
                  className={`flex flex-col items-start justify-center px-2 border-t border-l cursor-pointer hover:bg-sand-line transition-colors ${
                    isHighlighted ? 'bg-bark-soft text-bark' : 'bg-sand-card text-bark-muted'
                  }`}
                  style={{ gridArea: `${rowIndex + 2} / 1` }}
                  onClick={() => onRoomClick?.(roomIndex + 1)}
                >
                  <b className="text-sm">{r.name}</b>
                  <span className="text-[11px] text-bark-muted">
                    {r.type}
                    {r.rate ? ` · K${r.rate.toLocaleString()}` : ''}
                  </span>
                </div>
                {/* Column cells for this room */}
                {columnLabels.map((_, colIndex) => (
                  <div
                    key={`${r.name}-${colIndex}`}
                    className={`border-t border-r ${
                      isHighlighted ? 'bg-bark-soft' : 'bg-sand-card'
                    }`}
                    style={{ gridArea: `${rowIndex + 2} / ${colIndex + 2}` }}
                  />
                ))}
              </div>
            );
          })}

          {bars.map((b) => {
            const roomIndex = b.room - 1;
            const rowIndex = rowIndexByRoom.get(roomIndex);
            if (rowIndex === undefined || roomIndex < 0 || roomIndex >= rooms.length) return null;

            const startCol = Math.min(b.start, numColumns - 1);
            const endCol = Math.min(b.end, numColumns);

            if (startCol >= numColumns) return null;
            if (startCol >= endCol) return null;

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
          Activities — next {numColumns} days
        </h4>
        <div className="max-h-72 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {sortedBars.length === 0 ? (
            <p className="text-sm text-bark-muted">No activities scheduled</p>
          ) : (
            sortedBars.map((b) => {
              const startLabel = columnLabels[b.start] ?? `Day ${b.start}`;
              const outDay = Math.min(b.end, numColumns) - 1;
              const endLabel = columnLabels[outDay] ?? `Day ${outDay}`;
              const nights = b.end - b.start;
              const room = rooms[b.room - 1];
              const [name, ...rest] = b.label.split('·');
              const detail = rest.join('·').trim();
              return (
                <div
                  key={`${b.room}-${b.start}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${BAR[b.kind]}`}
                >
                  <span className="font-semibold w-28">
                    {startLabel} → {endLabel}
                  </span>
                  <span className="w-16 text-[11px]">
                    {nights} {nights === 1 ? 'night' : 'nights'}
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

      <div className="flex flex-wrap gap-2">
        {LEGEND.map(([kind, label]) => (
          <span key={kind} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAR[kind]}`}>
            {label}
          </span>
        ))}
      </div>

      {activeBar && (
        <BookingDetailModal
          bar={activeBar}
          rooms={rooms}
          mode="days"
          dayLabels={columnLabels}
          allBars={bars}
          onSelectBar={setActiveBar}
          canAct={canAct}
          onAction={(verb, b) => console.log('POST /api/bookings/action', { verb, invoice: b.invoice, room: b.room })}
          onClose={() => setActiveBar(null)}
        />
      )}
    </div>
  );
}
