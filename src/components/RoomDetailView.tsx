import type { BarKind, GridBar } from '../lib/staffTypes';

const BAR: Record<BarKind, string> = {
  checkedIn: 'bg-bark-deep text-sand-card',
  awaiting: 'bg-ochre-chip text-ochre-ink',
  hold: 'border-2 border-dashed border-ochre bg-sand-card text-ochre-ink',
  overdue: 'bg-brick-ink text-sand-card',
  inspect: 'border-2 border-dashed border-brick-ink bg-sand-card text-brick-ink',
};

const INPUT =
  'min-h-10 rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';

interface Props {
  roomName: string;
  roomNumber: number;
  bookings: GridBar[];
  onClose: () => void;
  date?: string;
  onDateChange?: (date: string) => void;
}

export default function RoomDetailView({ roomName, roomNumber, bookings, onClose, date, onDateChange }: Props) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const roomBookings = bookings.filter((b) => b.room === roomNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-sand-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-2xl font-semibold">{roomName}</h3>
            <p className="text-sm text-bark-muted">Hourly schedule</p>
          </div>
          <div className="flex items-center gap-3">
            {onDateChange && (
              <label className="flex items-center gap-2 text-sm text-bark-muted">
                Date:
                <input
                  type="date"
                  value={date || ''}
                  onChange={(e) => onDateChange(e.target.value)}
                  className={INPUT}
                />
              </label>
            )}
            <button
              onClick={onClose}
              className="min-h-10 rounded-xl bg-bark-soft px-4 text-sm font-semibold text-bark hover:bg-bark-off"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {hours.map((hour) => {
            const booking = roomBookings.find(
              (b) => hour >= Math.floor(b.start) && hour < Math.ceil(b.end)
            );
            const isHighlighted = hour === 10 || hour === 12;

            return (
              <div
                key={hour}
                className={`flex items-center gap-3 rounded-lg p-3 ${
                  booking
                    ? BAR[booking.kind]
                    : isHighlighted
                    ? 'bg-ochre-chip'
                    : 'bg-sand'
                }`}
              >
                <span
                  className={`w-16 text-sm font-semibold ${
                    isHighlighted ? 'text-ochre-ink' : ''
                  }`}
                >
                  {hour.toString().padStart(2, '0')}:00
                </span>
                {booking ? (
                  <span className="text-sm">{booking.label}</span>
                ) : (
                  <span className={`text-sm ${isHighlighted ? 'text-ochre-ink' : 'text-bark-muted'}`}>
                    Available
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAR.checkedIn}`}>
            Checked in
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAR.awaiting}`}>
            Awaiting check-in
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAR.hold}`}>
            On hold
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAR.overdue}`}>
            Overdue
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BAR.inspect}`}>
            Needs inspection
          </span>
        </div>
      </div>
    </div>
  );
}
