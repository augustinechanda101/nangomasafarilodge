import type { GridBar, GridRoom } from '../lib/staffTypes';

interface Props {
  rooms: GridRoom[];
  bars: GridBar[];
  mode: 'hours' | 'days';
  dayLabels?: string[];
}

// Full-page vacancy list — swaps in for the grid. Grouped by location, 2-line rows.
export default function VacancyView({ rooms, bars, mode, dayLabels }: Props) {
  const numColumns = dayLabels?.length ?? 0;

  const groups = (() => {
    const m = new Map<string, { room: GridRoom; freeDays: number[] }[]>();
    rooms.forEach((r, i) => {
      if (r.state !== 'Available') return; // hold/maintenance/unavailable rooms are not bookable
      const freeDays: number[] = [];
      if (mode === 'hours') {
        if (!bars.some((b) => b.room - 1 === i)) freeDays.push(0);
      } else {
        for (let d = 0; d < numColumns; d++) {
          if (!bars.some((b) => b.room - 1 === i && b.start <= d && d < b.end)) freeDays.push(d);
        }
      }
      if (freeDays.length === 0) return;
      const loc = r.location ?? 'Rooms';
      if (!m.has(loc)) m.set(loc, []);
      m.get(loc)!.push({ room: r, freeDays });
    });
    return [...m.entries()];
  })();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {groups.map(([loc, list]) => (
        <div key={loc} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-bark-muted">{loc}</span>
          {list.map(({ room: r, freeDays }) => {
            const freeLabel =
              mode === 'hours'
                ? 'Free'
                : freeDays.length === numColumns
                ? `Free all ${numColumns} days`
                : `Free: ${freeDays.map((d) => dayLabels?.[d]).join(', ')}`;
            return (
              <div key={r.name} className="rounded-lg bg-savanna-chip px-3 py-2 text-xs text-savanna-ink">
                <span className="block font-semibold">
                  {r.name} <span className="font-normal opacity-80">· {freeLabel}</span>
                </span>
                <span className="block truncate opacity-80">
                  {r.type}
                  {r.rate ? ` · K${r.rate.toLocaleString()}/night` : ''}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      {groups.length === 0 && (
        <p className="text-sm text-bark-muted">All rooms occupied in this period</p>
      )}
    </div>
  );
}
