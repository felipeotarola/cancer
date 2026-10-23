import { useEffect, useState } from 'react';
import { api } from '../lib/supabase';
import type { Thread } from '../lib/chat';
import { Chat } from './Chat';
import { Button } from './ui/Button';
export function LiveChat({ thread, onChange }: { thread: Thread; onChange: (thread: Thread) => void }) {
  const [sessionId, setSessionId] = useState(thread.sessionId);
  const [history, setHistory] = useState<Thread['messages']>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (sessionId) return;
    let active = true;
    void api<{ sessionId: string }>('/eve/v1/session', { method: 'POST', body: '{}', headers: { 'x-cancer-chat-id': thread.id } }).then(result => {
      if (active) setSessionId(result.sessionId);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [thread.id, sessionId, retry]);
  async function reconnect() {
    setReconnecting(true);
    try {
      const result = await api<{ sessionId: string }>('/eve/v1/session', { method: 'POST', body: '{}', headers: { 'x-cancer-chat-id': thread.id, 'x-cancer-replace-session': sessionId! } });
      const saved = await api<Thread[]>(`/api/chats?workspaceId=${encodeURIComponent(thread.workspaceId!)}`);
      const messages = saved.find(chat => chat.id === thread.id)?.messages ?? thread.messages;
      setHistory(messages); setSessionId(result.sessionId);
      onChange({ ...thread, messages, sessionId: result.sessionId });
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte återansluta.'); }
    finally { setReconnecting(false); }
  }
  if (error) return <div className="page-loading" role="alert">{error}<Button onClick={() => { setError(''); setRetry(n => n + 1); }}>Försök igen</Button></div>;
  if (!sessionId) return <p className="page-loading" role="status">Öppnar chatten…</p>;
  return <Chat previousMessages={history} onReconnect={() => void reconnect()} reconnecting={reconnecting} key={sessionId} thread={{ ...thread, sessionId }} onChange={onChange} />;
}
