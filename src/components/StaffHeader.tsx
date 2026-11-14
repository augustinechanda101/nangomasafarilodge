import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, useProfile } from '../lib/auth';
import { supabase } from '../lib/supabase';

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

  // Change password (own account, via Supabase Auth)
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!pwOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPwOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pwOpen]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1 !== pw2) {
      setPwMsg({ ok: false, text: 'Passwords do not match' });
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setPwBusy(false);
    if (error) {
      setPwMsg({ ok: false, text: error.message });
      return;
    }
    setPwMsg({ ok: true, text: 'Password changed' });
    setPw1(''); setPw2('');
    setTimeout(() => { setPwOpen(false); setPwMsg(null); }, 1500);
  };

  return (
    <header className="sticky top-0 z-30 -mx-4 bg-sand px-4 py-2 shadow-sm lg:-mx-8 lg:px-8">
      <div className="relative flex items-start justify-center gap-3">
      {/* Role tag — top-left corner */}
      <div className="absolute left-0 top-0 flex items-center gap-2">
        <div className="h-[3px] w-10 bg-ochre" />
        <span className="text-[13px] font-semibold text-bark-muted">{role}</span>
      </div>
      {/* Logo — centered, lifted higher */}
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        className="-mt-4 cursor-pointer"
      >
        <img
          src="/nangomalogo.webp"
          alt="Nangoma Safari Lodge"
          className="h-20 w-auto rounded-xl transition-opacity hover:opacity-80"
        />
      </button>
      <div className="absolute right-0 top-0 flex items-center gap-3">
        {action}
        {onLocationChange && location && locations && (
          <select
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="min-h-10 rounded-xl border border-bark-field bg-sand-card px-3 pr-9 text-sm font-semibold text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre"
            aria-label="Location"
          >
            <option value="all">All</option>
            {locations.map((l) => (
              <option key={l.name} value={l.name}>{l.name}</option>
            ))}
          </select>
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
                  onClick={() => { setMenuOpen(false); setPwOpen(true); setPwMsg(null); }}
                  className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-bark hover:bg-sand-line"
                >
                  Change password
                </button>
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
      </div>

      {/* Change password modal */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/40 p-4" onClick={() => setPwOpen(false)}>
          <form
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-sand-line bg-sand-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={changePassword}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-sans text-xl font-semibold">Change password</h3>
              <button type="button" onClick={() => setPwOpen(false)} aria-label="Close"
                className="min-h-10 w-10 rounded-xl bg-bark-soft text-bark hover:bg-bark-off">✕</button>
            </div>
            <label className="flex flex-col gap-1 text-[13px] text-bark-muted">
              New password (min 6 characters)
              <input type="password" autoComplete="new-password" required minLength={6} value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                className="min-h-10 w-full rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-bark-muted">
              Confirm new password
              <input type="password" autoComplete="new-password" required value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="min-h-10 w-full rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark" />
            </label>
            {pwMsg && (
              <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                pwMsg.ok ? 'bg-savanna-chip text-savanna-ink' : 'bg-brick-chip text-brick-ink'
              }`}>{pwMsg.text}</p>
            )}
            <button
              type="submit"
              disabled={pwBusy}
              className="min-h-11 rounded-xl bg-bark-deep text-sm font-semibold text-sand-card hover:bg-bark disabled:opacity-60"
            >
              {pwBusy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
