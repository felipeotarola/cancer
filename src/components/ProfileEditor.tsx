import { useState, type FormEvent } from 'react';
import { Camera } from 'lucide-react';
import { accessToken, supabase } from '../lib/supabase';
import { Button } from './ui/Button';

export function ProfileEditor({ displayName, avatarUrl }: { displayName?: string; avatarUrl?: string }) {
  const [name, setName] = useState(displayName || '');
  const [image, setImage] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const { error } = await (await supabase()).auth.updateUser({ data: { display_name: name.trim() } });
      if (error) throw error;
      setNotice('Profilen har sparats.');
    } catch { setError('Kunde inte spara namnet. Försök igen.'); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setError(''); setNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) { setError('Välj JPG, PNG eller WebP, högst 3 MB.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/profile/avatar', { method: 'POST', headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': file.type }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setImage(result.url);
      await (await supabase()).auth.refreshSession();
      setNotice('Profilbilden har sparats.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte spara bilden.'); }
    finally { setBusy(false); }
  }
  return <form className="account-form profile-editor" onSubmit={event => void save(event)}>
    <div className="profile-photo-row"><span className="avatar profile-photo">{image ? <img src={image} alt="Din profilbild" /> : <Camera size={24} />}</span><div><div className="profile-file-control"><label className="profile-upload" htmlFor="profile-photo">{busy ? 'Sparar…' : 'Byt profilbild'}</label><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></div><p className="account-help">JPG, PNG eller WebP · högst 3 MB.<br />Bilden lagras med en offentlig bildlänk.</p></div></div>
    <label htmlFor="display-name">Visningsnamn</label>
    <input id="display-name" className="ui-field" autoComplete="nickname" maxLength={80} required value={name} onChange={e => setName(e.target.value)} disabled={busy} data-autofocus />
    {error && <p className="account-error" role="alert">{error}</p>}
    {notice && <p className="account-notice" role="status">{notice}</p>}
    <Button type="submit" variant="primary" disabled={busy || !name.trim()}>{busy ? 'Sparar…' : 'Spara profil'}</Button>
  </form>;
}
