import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from '../lib/auth';
import { supabase } from '../lib/supabase';

const FIELD =
  'min-h-10 w-full rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';
const LABEL = 'flex flex-col gap-1 text-[13px] text-bark-muted';

// Where the reset email's link lands. Supabase exchanges the recovery code
// in the URL automatically; the user then sets a new password.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'checking' | 'form' | 'invalid' | 'done'>('checking');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Live catch when the URL exchange completes
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setStage('form');
    });
    // Fallback: decide shortly after mount
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        setStage((s) => (s === 'checking' ? (data.session ? 'form' : 'invalid') : s));
      });
    }, 800);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1 !== pw2) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage('done');
    await signOut();
    setTimeout(() => navigate('/login', { replace: true }), 2000);
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
        <h1 className="font-sans text-xl font-semibold">Set a new password</h1>

        {stage === 'checking' && (
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
        )}

        {stage === 'invalid' && (
          <>
            <p className="rounded-xl bg-brick-chip px-3 py-2 text-center text-sm font-semibold text-brick-ink">
              This reset link is invalid or has expired.
            </p>
            <Link to="/login" className="text-sm text-bark-muted hover:underline">← Back to sign in</Link>
          </>
        )}

        {stage === 'form' && (
          <form className="flex w-full flex-col gap-3" onSubmit={submit}>
            <label className={LABEL}>New password (min 6 characters)
              <input className={FIELD} type="password" autoComplete="new-password" required minLength={6}
                value={pw1} onChange={(e) => setPw1(e.target.value)} />
            </label>
            <label className={LABEL}>Confirm new password
              <input className={FIELD} type="password" autoComplete="new-password" required
                value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </label>
            {error && (
              <p className="rounded-xl bg-brick-chip px-3 py-2 text-sm font-semibold text-brick-ink">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-bark-deep text-sm font-semibold text-sand-card hover:bg-bark disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}

        {stage === 'done' && (
          <p className="rounded-xl bg-savanna-chip px-3 py-2 text-center text-sm font-semibold text-savanna-ink">
            Password updated — taking you to sign in…
          </p>
        )}
      </div>
    </div>
  );
}
