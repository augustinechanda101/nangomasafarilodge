import type { BarKind, GridBar, GridRoom } from '../lib/staffTypes';

const BAR: Record<BarKind, string> = {
  checkedIn: 'bg-bark-deep text-sand-card',
  awaiting: 'bg-ochre-chip text-ochre-ink',
  hold: 'bg-ochre text-sand-card',
  overdue: 'bg-brick-ink text-sand-card',
  inspect: 'bg-brick-chip text-brick-ink',
};

interface Props {
  bars: GridBar[];
  rooms: GridRoom[];
  dayLabels: string[];
  numColumns: number;
  title: string;
}

// Chronological booking activities for the visible window.
// Booking activities only — room states live on the grid banners and in Logs.
export default function ActivitySummary({ bars, rooms, dayLabels, numColumns, title }: Props) {
  const sortedBars = [...bars]
    .filter((b) => b.start < numColumns)
    .sort((a, b) => a.start - b.start);

  return (
    <div className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <h4 className="mb-3 text-sm font-semibold text-bark">{title}</h4>
      <div className="max-h-72 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {sortedBars.length === 0 ? (
            <p className="text-sm text-bark-muted">No booking activities</p>
          ) : (
            sortedBars.map((b) => {
              const startLabel = dayLabels[b.start] ?? `Day ${b.start}`;
              const outDay = Math.min(b.end, numColumns) - 1;
              const endLabel = dayLabels[outDay] ?? `Day ${outDay}`;
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
  );
}
