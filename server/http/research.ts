import { routeAuth } from 'eve/channels/auth';
import { z } from 'zod';
import { appAuth, publicAuthConfig } from '../auth.ts';
import { checked, userDatabase } from '../db.ts';
import { getWorkspaceSummary } from '../services/workspace.ts';
const uuid = z.string().uuid();
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
export async function configResponse() {
  try { return json(publicAuthConfig()); }
  catch { return json({ error: 'Supabase är inte konfigurerat på servern.' }, 503); }
}
export async function researchResponse(request: Request): Promise<Response> {
  const auth = await routeAuth(request, appAuth);
  if (auth instanceof Response) return auth;
  const db = userDatabase(request.headers.get('authorization')!.slice(7));
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/workspaces') {
      if (request.method === 'POST') {
        const { name } = z.object({ name: z.string().trim().min(1).max(100) }).strict().parse(await request.json());
        return json(checked(await db.from('cancer_workspaces').insert({ owner_id: auth.principalId, name }).select('id,name,owner_id').single()), 201);
      }
      await getWorkspaceSummary(db);
      return json(checked(await db.from('cancer_workspaces').select('id,name,owner_id').order('created_at').order('id')));
    }
    if (url.pathname === '/api/workspace-shares') {
      const body = request.method === 'POST' ? await request.json() : null;
      const workspaceId = uuid.parse(body?.workspaceId ?? url.searchParams.get('workspaceId'));
      const owned = checked(await db.from('cancer_workspaces').select('id').eq('id', workspaceId).eq('owner_id', auth.principalId));
      if (!owned.length) return json({ error: 'Bara ägaren kan hantera delning.' }, 403);
      if (request.method === 'POST') {
        const { email } = z.object({ workspaceId: uuid, email: z.string().trim().toLowerCase().email().max(254) }).strict().parse(body);
        const existing = checked(await db.from('cancer_workspace_shares').select('id,email').eq('workspace_id', workspaceId).eq('email', email));
        if (existing.length) return json(existing[0]);
        const result = await db.from('cancer_workspace_shares').insert({ workspace_id: workspaceId, email }).select('id,email').single();
        if (result.error?.code === '23505') return json({ error: 'Adressen har redan åtkomst.' }, 409);
        return json(checked(result), 201);
      }
      if (request.method === 'DELETE') {
        const id = uuid.parse(url.searchParams.get('id'));
        checked(await db.from('cancer_workspace_shares').delete().eq('workspace_id', workspaceId).eq('id', id).select('id'));
        return json({ ok: true });
      }
      return json(checked(await db.from('cancer_workspace_shares').select('id,email').eq('workspace_id', workspaceId).order('created_at')));
    }
    if (url.pathname === '/api/chats') {
      if (request.method === 'DELETE') {
        const id = uuid.parse(url.searchParams.get('id'));
        const deleted = checked(await db.from('cancer_chats').delete().eq('id', id).eq('owner_id', auth.principalId).select('id'));
        return deleted.length ? json({ ok: true }) : json({ error: 'Chatten saknas eller kan inte tas bort.' }, 404);
      }
      if (request.method === 'POST') {
        const { workspaceId } = z.object({ workspaceId: uuid }).strict().parse(await request.json());
        const workspace = checked(await db.from('cancer_workspaces').select('id').eq('id', workspaceId));
        if (!workspace.length) return json({ error: 'Workspace saknas.' }, 404);
        const chat = checked(await db.from('cancer_chats').insert({ workspace_id: workspaceId, owner_id: auth.principalId }).select('id,title,workspace_id').single());
        return json({ id: chat.id, title: chat.title, workspaceId: chat.workspace_id, messages: [] }, 201);
      }
      const workspaceId = uuid.parse(url.searchParams.get('workspaceId'));
      const chats = checked(await db.from('cancer_chats').select('id,title,workspace_id,cancer_messages(id,role,content,sequence)').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }));
      const sessions = chats.length ? checked(await db.from('cancer_sessions').select('chat_id,session_id').in('chat_id', chats.map(c => c.id))) : [];
      const sessionIds = new Map(sessions.map(s => [s.chat_id, s.session_id]));
      return json(chats.map(chat => ({ id: chat.id, title: chat.title, workspaceId: chat.workspace_id,
        sessionId: sessionIds.get(chat.id),
        messages: (chat.cancer_messages ?? []).sort((a, b) => a.sequence - b.sequence).map(({ id, role, content }) => ({ id, role, content })),
      })));
    }
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Ogiltiga uppgifter.' }, 400);
    console.error('Research API failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Kunde inte läsa eller spara. Försök igen.' }, 503);
  }
}
