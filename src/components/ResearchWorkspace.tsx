import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import App from '../App';
import { api, supabase } from '../lib/supabase';
import type { Thread } from '../lib/chat';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { AccountDialog } from './AccountDialog';
import { ShareWorkspace } from './ShareWorkspace';
type Workspace = { id: string; name: string; owner_id: string };
export function ResearchWorkspace({ user }: { user: User }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [loaded, setLoaded] = useState<{ workspaceId: string; threads: Thread[] } | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [name, setName] = useState('');
  const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void api<Workspace[]>('/api/workspaces').then(rows => {
      if (active) { setWorkspaces(rows); setWorkspaceId(current => current || rows[0].id); setError(''); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    void api<Thread[]>(`/api/chats?workspaceId=${workspaceId}`).then(threads => {
      if (active) { setLoaded({ workspaceId, threads }); setError(''); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [workspaceId, retry]);
  async function createChat(): Promise<Thread> {
    return api<Thread>('/api/chats', { method: 'POST', body: JSON.stringify({ workspaceId }) });
  }
  async function createWorkspace() {
    setCreating(true); setError('');
    try {
      const workspace = await api<Workspace>('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) });
      if (!alive.current) return;
      setWorkspaces(prev => [...prev, workspace]); setWorkspaceId(workspace.id); setDialog(false); setName('');
    } catch (e) { if (alive.current) setError((e as Error).message); }
    finally { if (alive.current) setCreating(false); }
  }
  async function logout() {
    const { error: signOutError } = await (await supabase()).auth.signOut({ scope: 'local' });
    if (signOutError) setError('Kunde inte logga ut. Försök igen.');
  }
  const workspace = workspaces.find(w => w.id === workspaceId);
  return <div className="research-root">
    {error && <div className="research-error" role="alert">{error} <Button size="sm" onClick={() => setRetry(n => n + 1)}>Försök igen</Button></div>}
    {loaded && loaded.workspaceId === workspaceId ?
      <App deleteRemoteChat={id => api('/api/chats?id=' + encodeURIComponent(id), { method: 'DELETE' }).then(() => {})} onAccount={() => setAccountOpen(true)} onShareWorkspace={workspace?.owner_id === user.id ? () => setSharing(true) : undefined} workspaces={workspaces} workspaceId={workspaceId} onWorkspaceChange={id => { setError(''); setWorkspaceId(id); }} displayName={user.user_metadata.display_name} avatarUrl={user.user_metadata.avatar_url} accountEmail={user.email} onLogout={() => void logout()} onCreateWorkspace={() => setDialog(true)} key={workspaceId} initialThreads={loaded.threads} createRemoteChat={createChat} workspaceName={workspace?.name} /> :
      <p className="page-loading" role="status">{error ? 'Workspacet kunde inte laddas.' : 'Laddar dina workspaces…'}</p>}
    {accountOpen && <AccountDialog displayName={user.user_metadata.display_name} avatarUrl={user.user_metadata.avatar_url} email={user.email} onClose={() => setAccountOpen(false)} />}
    {sharing && workspace && <ShareWorkspace key={workspace.id} workspaceId={workspace.id} name={workspace.name} onClose={() => setSharing(false)} />}
    <Dialog open={dialog} onClose={() => setDialog(false)} title="Nytt workspace" description="Samla chattar kring ett forskningsområde.">
      <form onSubmit={event => { event.preventDefault(); void createWorkspace(); }}>
        <label htmlFor="workspace-name">Namn</label>
        <input className="ui-field" id="workspace-name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} data-autofocus disabled={creating} />
        <Button type="submit" variant="primary" disabled={creating || !name.trim()}>{creating ? 'Skapar…' : 'Skapa workspace'}</Button>
      </form>
    </Dialog>
  </div>;
}
