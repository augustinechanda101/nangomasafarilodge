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

interface Props {
  rooms: GridRoom[];
  bars: GridBar[];
  canAct?: boolean;
  onAction?: (verb: string, bar: GridBar) => void;
  onRoomClick?: (roomNumber: number) => void;
}

// Compact one-day view: two rooms per row, each with its day bar
export default function CompactDayGrid({ rooms, bars, canAct, onAction, onRoomClick }: Props) {
  const [activeBar, setActiveBar] = useState<GridBar | null>(null);

  const barForRoom = (roomNumber: number) =>
    bars.find((b) => b.room === roomNumber);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rooms.map((r, i) => {
          const bar = barForRoom(i + 1);
          return (
            <div
              key={r.name}
              className="flex items-center gap-2 rounded-lg border border-sand-line bg-sand-card p-1.5"
            >
              <button
                type="button"
                onClick={() => onRoomClick?.(i + 1)}
                className="w-20 shrink-0 text-left hover:underline"
              >
                <span className="block text-xs font-semibold text-bark">{r.name}</span>
                <span className="block text-[9px] leading-tight text-bark-muted">{r.type}</span>
              </button>
              {bar ? (
                <button
                  type="button"
                  onClick={() => setActiveBar(bar)}
                  className={`flex-1 truncate rounded px-2 py-1.5 text-left text-xs font-semibold ${BAR[bar.kind]}`}
                  title={bar.label}
                >
                  {bar.label}
                </button>
              ) : (
                <div className="flex-1 truncate rounded bg-savanna-chip px-2 py-1.5 text-xs font-semibold text-savanna-ink">
                  Free
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeBar && (
        <BookingDetailModal
          bar={activeBar}
          rooms={rooms}
          mode="days"
          dayLabels={['Today']}
          allBars={bars}
          onSelectBar={setActiveBar}
          canAct={canAct}
          onAction={onAction}
          onClose={() => setActiveBar(null)}
        />
      )}
    </>
  );
}
