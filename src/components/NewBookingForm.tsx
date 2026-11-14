import { useState } from 'react';
import type { BookingDraft } from '../lib/staffTypes';

interface Props {
  locations: { name: string; rooms: string[] }[];
  initialLocation?: string;
  initialRoom?: string;
  onSave: (draft: BookingDraft) => void;
  onHold: (draft: BookingDraft) => void;
}

const FIELD =
  'min-h-10 w-full rounded-xl border border-bark-field bg-sand-card px-2.5 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';
const LABEL = 'flex flex-col gap-1 text-[13px] text-bark-muted';

// Checkout is always 10:00 AM on the last morning, whatever time the guest arrives.
function checkoutOf(arrival: string, nights: number): string {
  if (!arrival || nights < 1) return '';
  const d = new Date(arrival);
  d.setDate(d.getDate() + nights);
  d.setHours(10, 0, 0, 0);
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NewBookingForm({ locations, initialLocation, initialRoom, onSave, onHold }: Props) {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [d, setD] = useState<BookingDraft>({
    location: initialLocation ?? locations[0]?.name ?? '',
    guestName: '', phone: '', rooms: initialRoom ? [initialRoom] : [], nights: 1,
    arrival: '', arrivalTime: '', amount: '', method: 'Mobile money', reference: '', invoice: '',
  });
  const set = <K extends keyof BookingDraft>(k: K, v: BookingDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const locationRooms = locations.find((l) => l.name === d.location)?.rooms ?? [];

  const toggleRoom = (name: string) =>
    set('rooms', d.rooms.includes(name) ? d.rooms.filter((r) => r !== name) : [...d.rooms, name]);

  const checkout = checkoutOf(d.arrival, d.nights);
  const canHold = d.guestName.trim() !== '' && d.arrival !== '' && d.nights >= 1 && d.rooms.length > 0;
  const canSave = canHold && d.phone.trim() !== '' && Number(d.amount) > 0;
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setD((p) => ({
      ...p,
      guestName: '', phone: '', rooms: [], nights: 1,
      arrival: '', arrivalTime: '', amount: '', reference: '', invoice: '',
    }));
  };

  return (
    <form
      className="grid w-full grid-cols-1 gap-x-4 gap-y-2.5 rounded-2xl border border-sand-line bg-sand-card p-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) {
          onSave(d);
          reset();
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }
      }}
    >
      <h3 className="col-span-full font-sans text-xl font-semibold">New booking</h3>
      {saved && (
        <p className="col-span-full rounded-xl bg-savanna-chip px-3 py-2 text-sm font-semibold text-savanna-ink">
          Booking saved — ready for the next one
        </p>
      )}

      <label className={`${LABEL} sm:col-span-2`}>Location
        <select
          className={FIELD}
          value={d.location}
          onChange={(e) => {
            set('location', e.target.value);
            set('rooms', []);
          }}
        >
          {locations.map((l) => (
            <option key={l.name} value={l.name}>{l.name}</option>
          ))}
        </select>
      </label>

      <label className={LABEL}>Guest name
        <input className={FIELD} value={d.guestName} onChange={(e) => set('guestName', e.target.value)} />
      </label>
      <label className={LABEL}>Phone / WhatsApp
        <input className={FIELD} inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} />
      </label>

      <div className={`${LABEL} sm:col-span-2`}>
        <div className="flex items-center justify-between gap-2">
          <span>
            {mode === 'single' ? 'Room' : 'Rooms'}
            {mode === 'multiple' && <span className="font-normal"> — tap to select, one booking per room</span>}
          </span>
          <div className="flex rounded-xl bg-bark-soft p-0.5">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`min-h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                mode === 'single' ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode('multiple')}
              className={`min-h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                mode === 'multiple' ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
              }`}
            >
              Multiple
            </button>
          </div>
        </div>
        {mode === 'single' ? (
          <select
            className={FIELD}
            value={d.rooms[0] ?? ''}
            onChange={(e) => set('rooms', e.target.value ? [e.target.value] : [])}
          >
            <option value="" disabled>Select a room</option>
            {locationRooms.map((r) => <option key={r}>{r}</option>)}
          </select>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {locationRooms.map((r) => {
              const on = d.rooms.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRoom(r)}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${
                    on
                      ? 'bg-bark-deep text-sand-card'
                      : 'border border-bark-field bg-sand-card text-bark hover:bg-bark-soft'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <label className={LABEL}>Nights
        <input className={FIELD} type="number" min={1} value={d.nights} onChange={(e) => set('nights', Number(e.target.value))} />
      </label>
      <label className={LABEL}>Arrival date
        <input className={FIELD} type="date" value={d.arrival} onChange={(e) => set('arrival', e.target.value)} />
      </label>

      <label className={LABEL}>Arrival time (optional)
        <input className={FIELD} type="time" value={d.arrivalTime ?? ''} onChange={(e) => set('arrivalTime', e.target.value)} />
      </label>
      <div className={LABEL}>Check-out
        <div className="flex min-h-10 items-center rounded-xl bg-bark-soft px-2.5 text-sm font-semibold text-bark">
          {checkout || '10:00 AM on the last morning'}
        </div>
      </div>

      <label className={LABEL}>Amount (K)
        <input className={FIELD} inputMode="decimal" value={d.amount} onChange={(e) => set('amount', e.target.value)} />
      </label>
      <label className={LABEL}>Method
        <select className={FIELD} value={d.method} onChange={(e) => set('method', e.target.value)}>
          <option>Mobile money</option><option>Cash</option><option>Bank transfer</option>
        </select>
      </label>

      <label className={LABEL}>Payment reference
        <input className={FIELD} value={d.reference} onChange={(e) => set('reference', e.target.value)} />
      </label>
      <label className={LABEL}>Invoice number
        <input className={FIELD} value={d.invoice} onChange={(e) => set('invoice', e.target.value)} />
      </label>

      <div className="col-span-full flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={!canSave}
          className="min-h-11 flex-1 rounded-xl bg-bark-deep px-3.5 text-sm font-semibold text-sand-card hover:bg-bark disabled:cursor-not-allowed disabled:bg-bark-off disabled:text-bark-offink"
        >
          Save booking{d.rooms.length > 1 ? `s (${d.rooms.length} rooms)` : ''}
        </button>
        <button
          type="button"
          disabled={!canHold}
          onClick={() => onHold(d)}
          className="min-h-11 flex-1 rounded-xl bg-bark-soft px-3.5 text-sm font-semibold text-bark disabled:cursor-not-allowed disabled:bg-bark-off disabled:text-bark-offink"
        >
          Hold room{d.rooms.length > 1 ? 's' : ''} for 3 hours
        </button>
      </div>
    </form>
  );
}
