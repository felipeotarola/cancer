import { useState, type FormEvent } from 'react';
import { LockKeyhole, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProfileEditor } from './ProfileEditor';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
export function AccountDialog({ email, displayName, avatarUrl, onClose }: { displayName?: string; avatarUrl?: string; email?: string; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [nonce, setNonce] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function changePassword(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    if (password !== confirmation) { setError('Lösenorden matchar inte.'); return; }
    if (password === current) { setError('Välj ett annat lösenord än ditt nuvarande.'); return; }
    setBusy(true);
    try {
      const client = await supabase();
      const result = await client.auth.updateUser({ password, current_password: current, ...(nonce ? { nonce } : {}) });
      if (result.error) {
        if (result.error.code === 'reauthentication_needed' || result.error.code === 'reauthentication_not_valid') {
          setNeedsCode(true); setError('Bekräfta lösenordsbytet med en verifieringskod.');
        } else if (result.error.code === 'current_password_mismatch' || result.error.code === 'current_password_required') setError('Kontrollera ditt nuvarande lösenord.');
        else if (result.error.code === 'weak_password') setError('Lösenordet uppfyller inte säkerhetskraven. Välj ett längre, unikt lösenord.');
        else if (result.error.code === 'same_password') setError('Välj ett annat lösenord än ditt nuvarande.');
        else setError('Kunde inte byta lösenord. Försök igen eller logga in på nytt.');
        return;
      }
      setCurrent(''); setPassword(''); setConfirmation(''); setNonce(''); setNeedsCode(false);
      setNotice('Ditt lösenord har uppdaterats.');
    } catch { setError('Kunde inte ansluta. Kontrollera anslutningen och försök igen.'); }
    finally { setBusy(false); }
  }
  async function sendCode() {
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: failure } = await (await supabase()).auth.reauthenticate();
      if (failure) setError('Kunde inte skicka koden. Försök igen om en stund.');
      else setNotice('En verifieringskod har skickats till din e-post.');
    } catch { setError('Kunde inte skicka verifieringskoden.'); }
    finally { setBusy(false); }
  }
  return <Dialog open onClose={onClose} title="Mitt konto" description="Din profil och dina inloggningsuppgifter.">
    <div className="account-identity"><span className="avatar"><UserRound size={20} /></span><div><strong>E-postadress</strong><p>{email}</p></div></div>
    <ProfileEditor displayName={displayName} avatarUrl={avatarUrl} />
    <form className="account-form" onSubmit={event => void changePassword(event)}>
      <h3><LockKeyhole size={18} />Byt lösenord</h3>
      <p className="account-help" id="password-help">Använd minst 8 tecken och ett unikt lösenord.</p>
      <label htmlFor="current-password">Nuvarande lösenord</label>
      <input id="current-password" className="ui-field" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} disabled={busy} />
      <label htmlFor="new-password">Nytt lösenord</label>
      <input id="new-password" className="ui-field" type="password" autoComplete="new-password" aria-describedby="password-help" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
      <label htmlFor="confirm-password">Bekräfta nytt lösenord</label>
      <input id="confirm-password" className="ui-field" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />
      {needsCode && <><Button disabled={busy} onClick={() => void sendCode()}>Skicka verifieringskod</Button><label htmlFor="password-code">Verifieringskod</label><input id="password-code" className="ui-field" autoComplete="one-time-code" value={nonce} onChange={e => setNonce(e.target.value)} disabled={busy} required /></>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {notice && <p className="account-notice" role="status">{notice}</p>}
      <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Sparar…' : 'Uppdatera lösenord'}</Button>
    </form>
  </Dialog>;
}
