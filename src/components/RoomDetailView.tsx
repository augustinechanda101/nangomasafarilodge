import type { BarKind, GridBar } from '../lib/staffTypes';

const CHIP: Record<BarKind, string> = {
  checkedIn: 'bg-bark-deep text-sand-card',
  awaiting: 'bg-ochre-chip text-ochre-ink',
  hold: 'bg-ochre text-sand-card',
  overdue: 'bg-brick-ink text-sand-card',
  inspect: 'bg-brick-chip text-brick-ink',
};

const STATUS: Record<BarKind, string> = {
  checkedIn: 'Checked in',
  awaiting: 'Awaiting check-in',
  hold: 'Processing hold',
  overdue: 'Overdue',
  inspect: 'Needs inspection',
};

interface Props {
  roomName: string;
  roomNumber: number;
  bars: GridBar[];
  dayLabels: string[];
  onClose: () => void;
}

export default function RoomDetailView({ roomName, roomNumber, bars, dayLabels, onClose }: Props) {
  const roomBars = bars.filter((b) => b.room === roomNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-auto rounded-2xl bg-sand-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-2xl font-semibold">{roomName}</h3>
          <button
            onClick={onClose}
            className="min-h-10 rounded-xl bg-bark-soft px-4 text-sm font-semibold text-bark hover:bg-bark-off"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {roomBars.length === 0 ? (
            <p className="text-sm text-bark-muted">No bookings in this period</p>
          ) : (
            roomBars.map((b) => {
              const [name, ...rest] = b.label.split('·');
              const detail = rest.join('·').trim();
              const stayLabel = `${dayLabels[b.start] ?? ''} → ${dayLabels[Math.max(0, b.end - 1)] ?? ''}`;
              return (
                <div key={`${b.room}-${b.start}`} className={`rounded-lg px-3 py-2 text-xs ${CHIP[b.kind]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{name.trim()}</span>
                    <span className="text-[10px] opacity-80">{STATUS[b.kind]}</span>
                  </div>
                  <span className="block opacity-80">{stayLabel}</span>
                  {detail && <span className="block text-[10px] opacity-80">{detail}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
