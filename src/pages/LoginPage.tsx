import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signIn, signOut } from '../lib/auth';
import { supabase } from '../lib/supabase';

const FIELD =
  'min-h-10 w-full rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';
const LABEL = 'flex flex-col gap-1 text-[13px] text-bark-muted';

const PORTALS = {
  staff: { title: 'Staff Login', label: 'Staff', home: '/staff' },
  reception: { title: 'Reception Login', label: 'Reception', home: '/reception' },
  gm: { title: 'Management Login', label: 'Management', home: '/gm' },
} as const;

type PortalKey = keyof typeof PORTALS;

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const portalParam = params.get('portal');
  const portal: PortalKey | null =
    portalParam === 'staff' || portalParam === 'reception' || portalParam === 'gm' ? portalParam : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    if (err) {
      setError(err);
      setBusy(false);
      return;
    }
    // Account's role: users table first, auth metadata as fallback
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata as { role?: string } | undefined;
    const { data: row } = await supabase
      .from('users')
      .select('role')
      .eq('email', email.trim())
      .maybeSingle();
    const role = (row as { role: string } | null)?.role ?? meta?.role ?? null;

    // Portal logins only accept their own role's accounts
    if (portal && role !== portal) {
      await signOut();
      setError(
        role
          ? `This is the ${PORTALS[portal].label} portal — your account signs in to the ${PORTALS[role as PortalKey]?.label ?? role} portal.`
          : 'Could not verify your account role. Contact management.'
      );
      setBusy(false);
      return;
    }
    navigate(role === 'gm' ? '/gm' : role === 'staff' ? '/staff' : '/reception', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand font-sans text-bark px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-sand-line bg-sand-card p-8">
        <img
          src="/nangomalogo.webp"
          alt="Nangoma Safari Lodge"
          className="h-16 w-auto rounded-xl"
          style={{ transform: 'translateX(10px)' }}
        />
        <div className="flex flex-col items-center gap-1">
          <h1 className="font-sans text-xl font-semibold">
            {portal ? PORTALS[portal].title : 'Staff Login'}
          </h1>
          {portal && (
            <p className="text-[13px] text-bark-muted">{PORTALS[portal].label} accounts only</p>
          )}
        </div>
        <form className="flex w-full flex-col gap-3" onSubmit={submit}>
          <label className={LABEL}>Email
            <input
              className={FIELD}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className={LABEL}>Password
            <input
              className={FIELD}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="rounded-xl bg-brick-chip px-3 py-2 text-sm font-semibold text-brick-ink">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-xl bg-bark-deep text-sm font-semibold text-sand-card hover:bg-bark disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link to="/" className="text-sm text-bark-muted hover:underline">← Back to Home</Link>
      </div>
    </div>
  );
}
