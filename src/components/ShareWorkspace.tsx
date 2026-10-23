import { useEffect, useState } from 'react';
import { api } from '../lib/supabase';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
type Share = { id: string; email: string };
export function ShareWorkspace({ workspaceId, name, onClose }: { workspaceId: string; name: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    void api<Share[]>(`/api/workspace-shares?workspaceId=${workspaceId}`).then(rows => { if (active) setShares(rows); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId]);
  async function add() {
    setBusy(true); setError(''); setStatus('');
    try {
      const share = await api<Share>('/api/workspace-shares', { method: 'POST', body: JSON.stringify({ workspaceId, email }) });
      setShares(previous => [...previous.filter(row => row.id !== share.id), share]);
      setEmail(''); setStatus('Åtkomst sparad. Personen ser workspacet efter inloggning med den verifierade adressen.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(share: Share) {
    setBusy(true); setError(''); setStatus('');
    try {
      await api(`/api/workspace-shares?workspaceId=${workspaceId}&id=${share.id}`, { method: 'DELETE' });
      setShares(previous => previous.filter(row => row.id !== share.id)); setStatus('Åtkomsten har tagits bort.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Dialog open onClose={onClose} title="Dela workspace" description={`Ge någon tillgång till ${name}. Dina chattar är privata.`}>
    <form className="share-form" onSubmit={event => { event.preventDefault(); void add(); }}>
      <label htmlFor="share-email">E-postadress</label>
      <input id="share-email" className="ui-field" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="namn@exempel.se" required maxLength={254} data-autofocus disabled={busy || loading} />
      <Button variant="primary" type="submit" disabled={busy || loading || !email.trim()}>{busy ? 'Sparar…' : 'Ge åtkomst'}</Button>
    </form>
    <p className="share-hint">Personen behöver ett konto med verifierad e-postadress. Inget mejl skickas. Filer i det lokala filområdet delas inte ännu.</p>
    {error && <p role="alert" className="research-error">{error}</p>}
    {status && <p role="status">{status}</p>}
    <h3>Personer med åtkomst</h3>
    {loading ? <p role="status">Laddar…</p> : shares.length ? <ul className="share-list">{shares.map(share => <li key={share.id}>
      <span>{share.email}</span><Button size="sm" disabled={busy} aria-label={`Ta bort åtkomst för ${share.email}`} onClick={() => void remove(share)}>Ta bort</Button>
    </li>)}</ul> : <p>Workspacet är inte delat med någon ännu.</p>}
  </Dialog>;
}
