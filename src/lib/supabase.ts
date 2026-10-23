import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: Promise<SupabaseClient> | undefined;
export function supabase() {
  return client ??= fetch('/api/auth/config').then(async response => {
    if (!response.ok) throw new Error('Kunde inte ansluta till inloggningen. Försök igen.');
    const { url, publishableKey } = await response.json();
    return createClient(url, publishableKey, { auth: { storageKey: `cancer_auth_${new URL(url).hostname}`, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }).catch(error => { client = undefined; throw error; });
}
export async function accessToken() {
  const { data, error } = await (await supabase()).auth.getSession();
  if (error || !data.session) throw new Error('Logga in igen för att fortsätta.');
  return data.session.access_token;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init, redirect: 'error', headers: { 'content-type': 'application/json', ...init.headers, authorization: `Bearer ${await accessToken()}` },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(response.status === 401 ? 'Sessionen har gått ut. Logga in igen.' : result.error ?? 'Kunde inte spara. Försök igen.');
  }
  return response.json();
}
