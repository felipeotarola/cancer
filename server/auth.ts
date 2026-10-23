import { createClient } from '@supabase/supabase-js';
import { type AuthFn, ForbiddenError } from 'eve/channels/auth';
import { userDatabase } from './db.ts';
export function publicAuthConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Supabase is not configured');
  return { url, publishableKey };
}
export const supabaseAuth: AuthFn<Request> = async request => {
  const match = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  const { url, publishableKey } = publicAuthConfig();
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return { principalId: data.user.id, principalType: 'user', authenticator: 'supabase', issuer: url, attributes: {} };
};
export const appAuth = [supabaseAuth];
// Eve authenticates requests but does not implement session ownership.
export const eveAuth: AuthFn<Request> = async request => {
  const auth = await supabaseAuth(request);
  if (!auth) return null;
  const session = /^\/eve\/v1\/session\/([^/]+)/.exec(new URL(request.url).pathname);
  if (session) {
    const token = request.headers.get('authorization')!.slice(7);
    const { data, error } = await userDatabase(token).from('cancer_sessions').select('session_id').eq('session_id', decodeURIComponent(session[1])).maybeSingle();
    if (error || !data) throw new ForbiddenError({ message: 'Du har inte tillgång till chatten.' });
  }
  return auth;
};
