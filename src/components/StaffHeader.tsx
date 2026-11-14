import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, useProfile } from '../lib/auth';

interface Props {
  role: string;
  who?: string;
  locations?: { name: string }[];
  location?: string;
  onLocationChange?: (location: string) => void;
  action?: ReactNode;
  menuItems?: ReactNode;
}

export default function StaffHeader({ role, who, locations, location, onLocationChange, action, menuItems }: Props) {
  const navigate = useNavigate();
  const profile = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const route = useLocation();

  // Close the menu whenever the route changes (e.g. a menu link was clicked)
  useEffect(() => setMenuOpen(false), [route.pathname]);

  const logout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="self-start cursor-pointer"
        >
          <img
            src="/nangomalogo.webp"
            alt="Nangoma Safari Lodge"
            className="h-20 w-auto rounded-xl transition-opacity hover:opacity-80"
          />
        </button>
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
        <span className="hidden text-[13px] text-bark-muted sm:inline">
          {profile?.name ?? who}
        </span>

        {/* Hamburger menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            className="flex min-h-10 w-10 items-center justify-center rounded-xl bg-bark-soft text-bark hover:bg-bark-off"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-50 flex w-44 flex-col rounded-xl border border-sand-line bg-sand-card p-1.5 shadow-lg">
                {menuItems}
                <div className="my-1 h-px bg-sand-line" />
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-brick-ink hover:bg-brick-chip"
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
