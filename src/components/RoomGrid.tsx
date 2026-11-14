import { useState } from 'react';
import type { BarKind, GridBar, GridRoom } from '../lib/staffTypes';
import BookingDetailModal from './BookingDetailModal';
import ActivitySummary from './ActivitySummary';
import Legend from './Legend';

const BAR: Record<BarKind, string> = {
  checkedIn: 'bg-bark-deep text-sand-card',
  awaiting: 'bg-ochre-chip text-ochre-ink',
  hold: 'bg-ochre text-sand-card',
  overdue: 'bg-brick-ink text-sand-card',
  inspect: 'bg-brick-chip text-brick-ink',
};

interface Props { days: string[]; rooms: GridRoom[]; bars: GridBar[]; onRoomClick?: (roomNumber: number) => void; onDateChange?: (date: string) => void; zoomLevel?: number; canAct?: boolean; onAction?: (verb: string, bar: GridBar) => void; summary?: boolean; fill?: boolean }

type Row = { kind: 'header'; label: string } | { kind: 'room'; room: GridRoom; roomIndex: number };

export default function RoomGrid({ days, rooms, bars, onRoomClick, zoomLevel = 1, canAct, onAction, summary = true, fill = false }: Props) {
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

  return (
    <div className={fill ? 'flex h-full flex-col gap-3' : 'flex flex-col gap-3'}>
      <div className={fill ? 'min-h-0 flex-1 overflow-x-auto' : 'overflow-x-auto'}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `170px repeat(${numColumns}, minmax(100px, 1fr))`,
            gridTemplateRows: fill
              ? `40px repeat(${rows.length}, minmax(30px, 1fr))`
              : rowHeights.join(' '),
            height: fill ? '100%' : undefined,
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

          {/* State banners: hold / maintenance / unavailable rooms are visibly not sellable */}
          {rooms.map((r, i) => {
            if (r.state === 'Available') return null;
            const rowIndex = rowIndexByRoom.get(i);
            if (rowIndex === undefined) return null;
            const cls =
              r.state === 'hold' ? 'bg-ochre text-sand-card'
              : r.state === 'maintenance' ? 'bg-brick-chip text-brick-ink'
              : 'bg-bark-soft text-bark';
            const label =
              r.state === 'hold' ? 'On hold — awaiting payment'
              : r.state === 'maintenance' ? 'Maintenance'
              : 'Unavailable';
            return (
              <div
                key={`state-${r.id ?? r.name}`}
                className={`flex items-center px-2 text-xs font-semibold ${cls}`}
                style={{ gridArea: `${rowIndex + 2} / 2 / ${rowIndex + 3} / ${numColumns + 2}` }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {summary && (
        <ActivitySummary
          bars={bars}
          rooms={rooms}
          dayLabels={columnLabels}
          numColumns={numColumns}
          title={`Activities — next ${numColumns} days`}
        />
      )}

      <Legend />

      {activeBar && (
        <BookingDetailModal
          bar={activeBar}
          rooms={rooms}
          mode="days"
          dayLabels={columnLabels}
          allBars={bars}
          onSelectBar={setActiveBar}
          canAct={canAct}
          onAction={onAction}
          onClose={() => setActiveBar(null)}
        />
      )}
    </div>
  );
}
