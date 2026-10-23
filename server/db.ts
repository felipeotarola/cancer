import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let admin: SupabaseClient | undefined;
function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return { url, key };
}
export function userDatabase(token: string) {
  const { url, key } = config();
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}
export function serverDatabase() {
  const { url } = config();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is required on the server');
  return admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function checked<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error('Record not found');
  return data;
}
