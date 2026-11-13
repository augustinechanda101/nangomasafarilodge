import { useEffect } from 'react';
import type { BarKind, GridBar, GridRoom } from '../lib/staffTypes';

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

// Desk actions available per booking status
const ACTIONS: Partial<Record<BarKind, { label: string; verb: string }[]>> = {
  checkedIn: [{ label: 'Check out', verb: 'checkout' }],
  awaiting: [{ label: 'Check in', verb: 'checkin' }],
  hold: [
    { label: 'Check in', verb: 'checkin' },
    { label: 'Release hold', verb: 'release' },
  ],
  overdue: [{ label: 'Check out', verb: 'checkout' }],
  inspect: [{ label: 'Mark ready', verb: 'mark-ready' }],
};

interface Props {
  bar: GridBar;
  rooms: GridRoom[];
  mode: 'hours' | 'days';
  dayLabels?: string[];
  allBars?: GridBar[];
  onSelectBar?: (bar: GridBar) => void;
  canAct?: boolean;
  onAction?: (verb: string, bar: GridBar) => void;
  onClose: () => void;
}

export default function BookingDetailModal({
  bar, rooms, mode, dayLabels, allBars, onSelectBar, canAct, onAction, onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [name, ...rest] = bar.label.split('·');
  const detail = rest.join('·').trim();
  const room = rooms[bar.room - 1];

  // Sibling bookings sharing this invoice (group booking)
  const siblings = bar.invoice
    ? (allBars ?? []).filter((x) => x.invoice === bar.invoice && x !== bar)
    : [];

  const when =
    mode === 'hours'
      ? `${Math.floor(bar.start).toString().padStart(2, '0')}:00 – ${Math.ceil(bar.end).toString().padStart(2, '0')}:00`
      : `${dayLabels?.[bar.start] ?? `Day ${bar.start + 1}`} → ${
          dayLabels?.[Math.min(bar.end, dayLabels?.length ?? 0) - 1] ?? `Day ${bar.end}`
        } (${bar.end - bar.start} ${bar.end - bar.start === 1 ? 'night' : 'nights'})`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bark/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-sand-line bg-sand-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-sans text-xl font-semibold">{name.trim()}</h3>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[bar.kind]}`}>
              {STATUS[bar.kind]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 w-10 rounded-xl bg-bark-soft text-bark hover:bg-bark-off"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-bark-muted">Room</dt>
            <dd className="font-semibold">{room?.name ?? `Room ${bar.room}`}</dd>
          </div>
          {room?.type && (
            <div className="flex justify-between gap-3">
              <dt className="text-bark-muted">Type</dt>
              <dd>
                {room.type}
                {room.rate ? ` · K${room.rate.toLocaleString()}/night` : ''}
              </dd>
            </div>
          )}
          {room?.location && (
            <div className="flex justify-between gap-3">
              <dt className="text-bark-muted">Location</dt>
              <dd>{room.location}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-bark-muted">{mode === 'hours' ? 'Time' : 'Stay'}</dt>
            <dd className="font-semibold">{when}</dd>
          </div>
          {detail && (
            <div className="flex justify-between gap-3">
              <dt className="text-bark-muted">Details</dt>
              <dd className="text-right">{detail}</dd>
            </div>
          )}
        </dl>

        {siblings.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-bark-soft p-3">
            <span className="text-xs font-semibold text-bark">
              Group booking · {bar.invoice} · {siblings.length + 1} rooms
            </span>
            <div className="flex flex-wrap gap-1.5">
              {siblings.map((s) => (
                <button
                  key={`${s.room}-${s.start}`}
                  type="button"
                  onClick={() => onSelectBar?.(s)}
                  className="min-h-8 rounded-full bg-sand-card px-2.5 text-xs font-semibold text-bark hover:bg-sand-line"
                >
                  {rooms[s.room - 1]?.name ?? `Room ${s.room}`} →
                </button>
              ))}
            </div>
          </div>
        )}

        {canAct && (ACTIONS[bar.kind]?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {ACTIONS[bar.kind]!.map((a) => (
              <button
                key={a.verb}
                type="button"
                onClick={() => onAction?.(a.verb, bar)}
                className={`min-h-11 flex-1 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                  a.verb === 'release'
                    ? 'bg-bark-soft text-bark hover:bg-bark-off'
                    : 'bg-ochre text-sand-card hover:bg-bark-deep'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-bark-muted">
          Full guest record, payment info and actions arrive with the backend.
        </p>
      </div>
    </div>
  );
}
