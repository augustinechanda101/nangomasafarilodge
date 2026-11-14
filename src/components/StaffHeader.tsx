import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  role: string;
  who: string;
  onLogout?: () => void;
  locations?: { name: string }[];
  location?: string;
  onLocationChange?: (location: string) => void;
  action?: ReactNode;
}

export default function StaffHeader({ role, who, onLogout, locations, location, onLocationChange, action }: Props) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <Link to="/" aria-label="Back to home" className="self-start">
          <img
            src="/nangomalogo.webp"
            alt="Nangoma Safari Lodge"
            className="h-20 w-auto rounded-xl transition-opacity hover:opacity-80"
          />
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-[3px] w-10 bg-ochre" />
          <span className="text-[13px] font-semibold text-bark-muted">{role}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {action}
        {onLocationChange && location && locations && (
          <label className="flex items-center gap-2 text-[13px] text-bark-muted">
            Location:
            <select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="min-h-10 rounded-xl border border-bark-field bg-sand-card px-3 text-sm font-semibold text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre"
            >
              <option value="all">All Locations</option>
              {locations.map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </select>
          </label>
        )}
        <span className="hidden text-[13px] text-bark-muted sm:inline">{who}</span>
        <button type="button" onClick={onLogout} className="min-h-10 rounded-xl bg-bark-soft px-3.5 text-sm font-semibold text-bark">
          Log out
        </button>
      </div>
    </header>
  );
}
