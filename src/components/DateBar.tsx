import { nightsBetween } from '../lib/rooms';

interface Props {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

const INPUT =
  'min-h-11 rounded-xl border border-bark-field bg-sand-card px-3 text-[15px] text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';

export default function DateBar({ checkIn, checkOut, onChange }: Props) {
  const nights = nightsBetween(checkIn, checkOut);
  const valid = nights >= 1;

  return (
    <div className="grid gap-3 md:grid-cols-3 md:items-end">
      <label className="flex flex-col gap-1 text-[13px] text-bark-muted">
        Check-in
        <input type="date" className={INPUT} value={checkIn} onChange={(e) => onChange(e.target.value, checkOut)} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-bark-muted">
        Check-out
        <input
          type="date"
          className={INPUT}
          value={checkOut}
          min={checkIn}
          onChange={(e) => onChange(checkIn, e.target.value)}
        />
      </label>
      <div className="flex flex-col gap-1 text-[13px] text-bark-muted">
        Your stay
        <p className="flex min-h-11 items-center text-[15px] font-semibold text-bark" aria-live="polite">
          {valid
            ? `${nights} night${nights > 1 ? 's' : ''} · check-out 10:00 AM`
            : 'Check-out must be after check-in'}
        </p>
      </div>
    </div>
  );
}
