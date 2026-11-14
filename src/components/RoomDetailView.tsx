import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BarKind, GridBar, GridRoom } from '../lib/staffTypes';

const SPINNER = <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;

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

const STATE_CHIP: Record<string, string> = {
  Available: 'bg-savanna-chip text-savanna-ink',
  hold: 'bg-ochre text-sand-card',
  maintenance: 'bg-brick-chip text-brick-ink',
  unavailable: 'bg-bark-soft text-bark',
};

const STATE_LABEL: Record<string, string> = {
  Available: 'Available',
  hold: 'On hold — awaiting payment',
  maintenance: 'Maintenance',
  unavailable: 'Unavailable',
};

interface Props {
  roomName: string;
  roomNumber: number;
  room?: GridRoom;
  bars: GridBar[];
  dayLabels: string[];
  onSetState?: (state: string) => void;
  canBook?: boolean;
  onClose: () => void;
}

export default function RoomDetailView({
  roomName, roomNumber, room, bars, dayLabels, onSetState, canBook, onClose,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const roomBars = bars.filter((b) => b.room === roomNumber);
  const state = room?.state ?? 'Available';
  const canAct = !!onSetState && !!room?.id;
  const isOff = state !== 'Available';

  const applyState = async (next: string) => {
    setBusy(next);
    await onSetState?.(next);
    setBusy(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-auto rounded-2xl bg-sand-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-sans text-2xl font-semibold">{roomName}</h3>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_CHIP[state] ?? 'bg-bark-soft text-bark'}`}>
              {STATE_LABEL[state] ?? state}
            </span>
          </div>
          <button
            onClick={onClose}
            className="min-h-10 rounded-xl bg-bark-soft px-4 text-sm font-semibold text-bark hover:bg-bark-off"
          >
            Close
          </button>
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          {room?.type && (
            <div className="flex justify-between gap-3">
              <dt className="text-bark-muted">Type</dt>
              <dd className="font-semibold">{room.type}</dd>
            </div>
          )}
          {room?.rate && (
            <div className="flex justify-between gap-3">
              <dt className="text-bark-muted">Rate</dt>
              <dd className="font-semibold">K{room.rate.toLocaleString()}/night</dd>
            </div>
          )}
          {room?.location && (
            <div className="flex justify-between gap-3">
              <dt className="text-bark-muted">Location</dt>
              <dd>{room.location}</dd>
            </div>
          )}
        </dl>

        {/* Room state actions */}
        {canAct && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-muted">Room state</span>
            {isOff ? (
              <button
                type="button"
                onClick={() => applyState('ready')}
                disabled={busy !== null}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-savanna-chip px-3.5 text-sm font-semibold text-savanna-ink hover:brightness-95 disabled:opacity-70"
              >
                {busy === 'ready' ? SPINNER : null}
                Mark Available
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyState('hold')}
                  disabled={busy !== null}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ochre px-3.5 text-sm font-semibold text-sand-card hover:bg-bark-deep disabled:opacity-70"
                >
                  {busy === 'hold' ? SPINNER : null}
                  Hold
                </button>
                <button
                  type="button"
                  onClick={() => applyState('maintenance')}
                  disabled={busy !== null}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brick-ink px-3.5 text-sm font-semibold text-sand-card hover:brightness-110 disabled:opacity-70"
                >
                  {busy === 'maintenance' ? SPINNER : null}
                  Maintenance
                </button>
                <button
                  type="button"
                  onClick={() => applyState('unavailable')}
                  disabled={busy !== null}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-bark-deep px-3.5 text-sm font-semibold text-sand-card hover:bg-bark disabled:opacity-70"
                >
                  {busy === 'unavailable' ? SPINNER : null}
                  Unavailable
                </button>
              </div>
            )}
          </div>
        )}

        {/* Book this room now */}
        {canBook && room?.state === 'Available' && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/reception/booking?room=${encodeURIComponent(roomName)}&location=${encodeURIComponent(room?.location ?? '')}`,
              )
            }
            className="min-h-11 rounded-xl bg-bark-deep px-3.5 text-sm font-semibold text-sand-card hover:bg-bark"
          >
            Book Now
          </button>
        )}

        {/* Bookings in the visible window */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-bark-muted">Bookings</span>
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
