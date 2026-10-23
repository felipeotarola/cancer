import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { ResearchWorkspace } from './ResearchWorkspace';
import './auth.css';

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void supabase().then(async client => {
      const { data } = client.auth.onAuthStateChange((_event, next) => {
        if (active) { setSession(next); setLoading(false); }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      if (!active) { unsubscribe(); return; }
      const initial = await client.auth.getSession();
      if (initial.error) throw initial.error;
      if (active) { setSession(initial.data.session); setLoading(false); }
    }).catch(() => { if (active) { setError('Kunde inte ladda inloggningen. Ladda om sidan och försök igen.'); setLoading(false); } });
    return () => { active = false; unsubscribe?.(); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    try {
      const client = await supabase();
      const credentials = { email: String(form.get('email')).trim(), password: String(form.get('password')) };
      const result = mode === 'login'
        ? await client.auth.signInWithPassword(credentials)
        : await client.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/` } });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) setNotice('Kontrollera din e-post och bekräfta kontot innan du loggar in.');
    } catch { setError(mode === 'login' ? 'Kunde inte logga in. Kontrollera e-post, lösenord och att kontot är bekräftat.' : 'Kunde inte skapa kontot. Kontrollera uppgifterna och försök igen.'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="auth-shell"><p role="status">Laddar OpenCancer…</p></main>;
  if (session) return <ResearchWorkspace key={session.user.id} user={session.user} />;
  return <main className="auth-shell"><section className="auth-card" aria-labelledby="auth-title">
    <span className="auth-mark" aria-hidden="true">OC</span>
    <p className="auth-eyebrow">OpenCancer · Forskningsworkspace</p>
    <h1 id="auth-title">{mode === 'login' ? 'Välkommen tillbaka' : 'Skapa ditt konto'}</h1>
    <p>Samla dina frågor, workspaces och samtal på ett ställe.</p>
    <form onSubmit={submit}>
      <label htmlFor="auth-email">E-post</label>
      <input id="auth-email" className="ui-field" name="email" type="email" autoComplete="email" required disabled={busy} />
      <label htmlFor="auth-password">Lösenord</label>
      <input id="auth-password" className="ui-field" name="password" type="password" minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required disabled={busy} />
      {error && <p role="alert" className="auth-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Vänta…' : mode === 'login' ? 'Logga in' : 'Skapa konto'}</Button>
    </form>
    <Button className="auth-switch" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice(''); }}>
      {mode === 'login' ? 'Ny här? Skapa konto' : 'Har du redan ett konto? Logga in'}
    </Button>
  </section></main>;
}
