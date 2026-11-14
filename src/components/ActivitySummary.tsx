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

// Chronological activity list for the visible window, plus room-state rows
// (hold / maintenance / unavailable) using the same colors as the grid banners
export default function ActivitySummary({ bars, rooms, dayLabels, numColumns, title }: Props) {
  const sortedBars = [...bars]
    .filter((b) => b.start < numColumns)
    .sort((a, b) => a.start - b.start);

  const stateRows = rooms
    .filter((r) => r.state !== 'Available')
    .map((r) => ({
      key: `state-${r.id ?? r.name}`,
      cls:
        r.state === 'hold' ? 'bg-ochre text-sand-card'
        : r.state === 'maintenance' ? 'bg-brick-chip text-brick-ink'
        : 'bg-bark-soft text-bark',
      label:
        r.state === 'hold' ? 'On hold — awaiting payment'
        : r.state === 'maintenance' ? 'Maintenance'
        : 'Unavailable',
      room: r,
    }));

  return (
    <div className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <h4 className="mb-3 text-sm font-semibold text-bark">{title}</h4>
      <div className="max-h-72 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {sortedBars.length === 0 && stateRows.length === 0 ? (
            <p className="text-sm text-bark-muted">No activities scheduled</p>
          ) : (
            <>
              {sortedBars.map((b) => {
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
            })}
              {stateRows.map((s) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${s.cls}`}
                >
                  <span className="font-semibold w-28">—</span>
                  <span className="w-16 text-[11px]" />
                  <span className="font-semibold w-20">{s.room.name}</span>
                  <span className="flex-1 font-semibold">{s.label}</span>
                  {s.room.location && (
                    <span className="text-[11px] text-sand-card">{s.room.location}</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
