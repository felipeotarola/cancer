import { routeAuth } from 'eve/channels/auth';
import { z } from 'zod';
import { appAuth } from '../auth.ts';
import { checked, userDatabase } from '../db.ts';
import { researchId, researchTaskSchema, revisionId, type ResearchSnapshot } from '../../shared/research.ts';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
const uuid = z.string().uuid();

export async function researchLibraryResponse(request: Request) {
  const auth = await routeAuth(request, appAuth);
  if (auth instanceof Response) return auth;
  const db = userDatabase(request.headers.get('authorization')!.slice(7));
  try {
    const url = new URL(request.url);
    const body = request.method === 'POST' ? z.object({ workspaceId: uuid, taskId: researchId, revision: revisionId }).strict().parse(await request.json()) : null;
    const workspaceId = uuid.parse(body?.workspaceId ?? url.searchParams.get('workspaceId'));
    const workspace = checked(await db.from('cancer_workspaces').select('id').eq('id', workspaceId));
    if (!workspace.length) return json({ error: 'Workspacet saknas eller är inte tillgängligt.' }, 404);
    if (body) {
      const snapshot = checked(await db.from('cancer_research_snapshots').select('tasks').eq('workspace_id', workspaceId).eq('revision', body.revision));
      if (!snapshot.length || !z.array(researchTaskSchema).parse(snapshot[0].tasks).some(t => t.id === body.taskId)) return json({ error: 'Uppgiften saknas i den importerade versionen.' }, 404);
      // A saved task keeps its original revision. Concurrent saves are idempotent.
      const result = await db.from('cancer_research_links').insert({ workspace_id: workspaceId, task_id: body.taskId, revision: body.revision, added_by: auth.principalId });
      if (result.error && result.error.code !== '23505') checked(result);
      return json({ ok: true });
    }
    if (request.method === 'DELETE') {
      const taskId = researchId.parse(url.searchParams.get('taskId'));
      checked(await db.from('cancer_research_links').delete().eq('workspace_id', workspaceId).eq('task_id', taskId).select('task_id'));
      return json({ ok: true });
    }
    const [latestResult, linksResult] = await Promise.all([
      db.from('cancer_research_snapshots').select('revision,imported_at,tasks').eq('workspace_id', workspaceId).order('imported_at', { ascending: false }).limit(1),
      db.from('cancer_research_links').select('task_id,revision,added_by,created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    ]);
    const latest = checked(latestResult)[0];
    const links = checked(linksResult);
    const snapshots: ResearchSnapshot[] = links.length ? checked(await db.from('cancer_research_snapshots').select('revision,imported_at,tasks').eq('workspace_id', workspaceId).in('revision', [...new Set(links.map(l => l.revision))])) : [];
    return json({
      snapshot: latest ? { ...latest, tasks: z.array(researchTaskSchema).parse(latest.tasks) } : null,
      saved: links.map(link => {
        const snapshot = snapshots.find(s => s.revision === link.revision)!;
        const task = z.array(researchTaskSchema).parse(snapshot.tasks).find(t => t.id === link.task_id);
        if (!task) throw new Error('Invalid saved research reference');
        return { ...link, task, imported_at: snapshot.imported_at };
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Ogiltiga forskningsuppgifter.' }, 400);
    console.error('Research library failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Forskningsbiblioteket kunde inte läsas eller sparas. Försök igen.' }, 503);
  }
}
