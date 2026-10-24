import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { researchTaskSchema, revisionId } from '../shared/research.ts';

process.loadEnvFile('.env');
const workspaceId = z.string().uuid().parse(process.argv[2]);
const token = process.env.KALIBRERA_GITHUB_TOKEN || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
async function github(path: string) {
  const response = await fetch(`https://api.github.com/repos/x3r081/kalibrera/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(20000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}; no data imported`);
  const raw = await response.text();
  if (raw.length > 2_000_000) throw new Error('GitHub response exceeds import limit');
  return JSON.parse(raw);
}
const head = await github('git/ref/heads/main');
const revision = revisionId.parse(head.object.sha);
const entries = z.array(z.object({ name: z.string(), type: z.string() })).max(201).parse(await github(`contents/research/tasks?ref=${revision}`));
const tasks = [];
for (const entry of entries) {
  if (entry.type !== 'file' || !/^rtk_[0-7][0-9A-HJKMNP-TV-Z]{25}\.json$/.test(entry.name)) continue;
  const file = await github(`contents/research/tasks/${entry.name}?ref=${revision}`);
  if (file.encoding !== 'base64' || file.size > 100_000) throw new Error('Unsupported task file');
  const task = researchTaskSchema.parse(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));
  if (`${task.id}.json` !== entry.name) throw new Error('Task filename does not match ID');
  tasks.push(task);
}
if (!tasks.length || tasks.length > 200 || new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error('Invalid task catalog');
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const workspace = await db.from('cancer_workspaces').select('id,name').eq('id', workspaceId).single();
if (workspace.error) throw new Error('Target workspace not found');
const result = await db.from('cancer_research_snapshots').upsert({ workspace_id: workspaceId, revision, tasks }, { onConflict: 'workspace_id,revision', ignoreDuplicates: true });
if (result.error) throw new Error(`Import failed: ${result.error.code}`);
console.log(`Imported ${tasks.length} tasks into ${workspace.data.name} at ${revision}. No upstream changes or task execution.`);
