import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'reception' | 'gm';
  status: string;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function useSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { loading, session };
}

export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: row } = await supabase
        .from('users')
        .select('id, name, email, role, status')
        .eq('id', data.session.user.id)
        .maybeSingle();
      setProfile((row as Profile) ?? null);
    });
  }, []);
  return profile;
}

// Redirects to /login when there is no session
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate('/login', { replace: true });
  }, [loading, session, navigate]);
  if (loading) return <div className="min-h-screen bg-sand" />;
  if (!session) return null;
  return <>{children}</>;
}
