import { useEffect, useState } from 'react';
import { api } from '../lib/supabase';
import type { Thread } from '../lib/chat';
import { Chat } from './Chat';
import { Button } from './ui/Button';
export function LiveChat({ thread, onChange, onCreateWorkspace }: { onCreateWorkspace?: () => void; thread: Thread; onChange: (thread: Thread) => void }) {
  const [sessionId, setSessionId] = useState(thread.sessionId);
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
  if (error) return <div className="page-loading" role="alert">{error}<Button onClick={() => { setError(''); setRetry(n => n + 1); }}>Försök igen</Button></div>;
  if (!sessionId) return <p className="page-loading" role="status">Öppnar chatten…</p>;
  return <Chat key={sessionId} thread={{ ...thread, sessionId }} onChange={onChange} onCreateWorkspace={onCreateWorkspace} />;
}
