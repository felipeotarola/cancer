import { routeAuth } from 'eve/channels/auth';
import { put, del } from '@vercel/blob';
import { createRequire } from 'node:module';
import type sharpType from 'sharp';
const runtimeRequire = createRequire(import.meta.url);
import { appAuth } from '../auth.ts';
import { serverDatabase } from '../db.ts';

export async function avatarResponse(request: Request): Promise<Response> {
  const auth = await routeAuth(request, appAuth);
  if (auth instanceof Response) return auth;
  const fail = (error: string, status: number) => Response.json({ error }, { status });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(request.headers.get('content-type') || '')) return fail('Välj en JPG-, PNG- eller WebP-bild.', 415);
  const limit = 3 * 1024 * 1024;
  const reader = request.body?.getReader();
  if (!reader) return fail('Välj en bild.', 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); return fail('Bilden får vara högst 3 MB.', 413); }
    chunks.push(value);
  }
  let image: Buffer;
  try {
    const sharp = runtimeRequire('sharp') as typeof sharpType;
    image = await sharp(Buffer.concat(chunks), { limitInputPixels: 25_000_000 }).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
  } catch { return fail('Bilden kunde inte läsas. Välj en annan bild.', 400); }
  let uploaded: string | undefined;
  try {
    const blob = await put(`cancer/avatars/${auth.principalId}/${crypto.randomUUID()}.webp`, image, { access: 'public', contentType: 'image/webp' });
    uploaded = blob.url;
    const result = await serverDatabase().auth.admin.updateUserById(auth.principalId, { user_metadata: { avatar_url: blob.url } });
    if (result.error) throw result.error;
    return Response.json({ url: blob.url }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    if (uploaded) await del(uploaded).catch(() => {});
    return fail('Kunde inte spara profilbilden. Försök igen.', 503);
  }
}
