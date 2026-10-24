import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
import { researchFixture } from '../tests/research-fixture.ts';

process.loadEnvFile('.env');
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, options);
const users: { email: string; password: string; id?: string; token?: string; client?: ReturnType<typeof createClient> }[] = Array.from({ length: 3 }, () => ({ email: `cancer-research-${randomUUID()}@example.invalid`, password: `Qa!${randomUUID()}` }));
const revision = 'a'.repeat(40), nextRevision = 'b'.repeat(40);
const req = (u: typeof users[number], path: string, method = 'GET', body?: unknown) => fetch(base + path, { method, headers: { authorization: `Bearer ${u.token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
async function data(response: Response) { assert.equal(response.ok, true, `HTTP ${response.status}: ${await response.clone().text()}`); return response.json(); }
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (const u of users) {
    const created = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
    assert.equal(created.error, null); u.id = created.data.user!.id;
    u.client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, options);
    const login = await u.client.auth.signInWithPassword(u); assert.equal(login.error, null); u.token = login.data.session!.access_token;
  }
  const [owner, member, outsider] = users;
  const [workspace] = await data(await req(owner, '/api/workspaces'));
  const path = `/api/research-library?workspaceId=${workspace.id}`;
  assert.equal((await fetch(base + path)).status, 401);
  assert.deepEqual(await data(await req(owner, path)), { snapshot: null, saved: [] });
  const inserted = await admin.from('cancer_research_snapshots').insert({ workspace_id: workspace.id, revision, tasks: [researchFixture] });
  assert.equal(inserted.error, null);
  await data(await req(owner, '/api/workspace-shares', 'POST', { workspaceId: workspace.id, email: member.email }));
  assert.equal((await data(await req(member, path))).snapshot.tasks[0].id, researchFixture.id);
  assert.equal((await req(outsider, path)).status, 404);
  assert.deepEqual((await outsider.client!.from('cancer_research_snapshots').select('*').eq('workspace_id', workspace.id)).data, []);
  assert.ok((await member.client!.from('cancer_research_snapshots').insert({ workspace_id: workspace.id, revision: nextRevision, tasks: [researchFixture] })).error);
  assert.ok((await member.client!.from('cancer_research_links').insert({ workspace_id: workspace.id, revision, task_id: researchFixture.id, added_by: owner.id })).error);
  assert.equal((await req(owner, '/api/research-library', 'POST', { workspaceId: workspace.id, taskId: 'rtk_01K8A000000000000000000099', revision })).status, 404);
  assert.ok((await member.client!.from('cancer_research_links').insert({ workspace_id: workspace.id, revision, task_id: 'rtk_01K8A000000000000000000099', added_by: member.id })).error);
  const save = { workspaceId: workspace.id, taskId: researchFixture.id, revision };
  await Promise.all([req(owner, '/api/research-library', 'POST', save).then(data), req(member, '/api/research-library', 'POST', save).then(data)]);
  assert.equal((await data(await req(member, path))).saved.length, 1);
  assert.equal((await req(outsider, '/api/research-library', 'POST', save)).status, 404);
  const updated = { ...researchFixture, title: 'Nyare syntetisk version' };
  assert.equal((await admin.from('cancer_research_snapshots').insert({ workspace_id: workspace.id, revision: nextRevision, tasks: [updated] })).error, null);
  const catalog = await data(await req(owner, path));
  assert.equal(catalog.snapshot.revision, nextRevision);
  assert.equal(catalog.saved[0].revision, revision);
  assert.equal(catalog.saved[0].task.title, researchFixture.title);
  await data(await req(owner, path + `&taskId=${researchFixture.id}`, 'DELETE'));
  assert.equal((await data(await req(member, path))).saved.length, 0);
  console.log('PASS authenticated API, shared reads, unauthorized reads/writes, forged references, concurrent saves, pinned versions, shared removal');

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel('E-post', { exact: true }).fill(owner.email);
  await page.getByLabel('Lösenord', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Logga in', exact: true }).click();
  await page.locator('.desktop-sidebar').getByRole('button', { name: 'Forskning', exact: true }).click();
  const library = page.getByRole('region', { name: 'Forskningsbibliotek' });
  await library.getByRole('button', { name: /Nyare syntetisk version/ }).click();
  await expect(library.getByText('E0 · extern granskning återstår', { exact: true })).toBeVisible();
  await library.getByRole('button', { name: 'Lägg till i workspace', exact: true }).click();
  await expect(library.getByRole('button', { name: 'Sparad i workspace', exact: true })).toBeDisabled();
  assert.equal((await data(await req(member, path))).saved[0].revision, nextRevision);
  await page.reload();
  await page.locator('.desktop-sidebar').getByRole('button', { name: 'Forskning', exact: true }).click();
  await library.getByRole('button', { name: /Sparade/ }).click();
  await library.getByRole('button', { name: /Nyare syntetisk version/ }).click();
  await mkdir('verification.local', { recursive: true });
  await page.screenshot({ path: 'verification.local/research-desktop.png' });
  await library.getByRole('button', { name: 'Diskutera med Luna', exact: true }).click();
  const composer = page.getByRole('textbox', { name: 'Ditt meddelande' });
  await expect(composer).toHaveValue(/Nyare syntetisk version/, { timeout: 60000 });
  await expect(composer).toHaveValue(/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/);
  const chatsBefore = await data(await req(owner, `/api/chats?workspaceId=${workspace.id}`));
  assert.equal(chatsBefore.length, 1); assert.equal(chatsBefore[0].messages.length, 0);
  if (process.env.TEST_LIVE_MODEL === '1') {
    await composer.fill((await composer.inputValue()) + '\nSvara mycket kort: vad är det förväntade kontrollresultatet och vilken evidensnivå har underlaget?');
    await page.getByRole('button', { name: 'Skicka meddelande', exact: true }).click();
    await expect(page.getByRole('article', { name: 'OpenCancer', exact: true })).toContainText('10', { timeout: 90000 });
    await expect(page.getByRole('article', { name: 'OpenCancer', exact: true })).toContainText('E0');
    await expect(page.getByRole('button', { name: 'Stoppa svar', exact: true })).toHaveCount(0, { timeout: 30000 });
    console.log('PASS real Luna response grounded in synthetic task context');
  }
  await page.getByRole('button', { name: 'Byt färgtema', exact: true }).first().click();
  await page.screenshot({ path: 'verification.local/research-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Workspace', exact: true }).click();
  await expect(library.getByRole('heading', { name: 'Nyare syntetisk version', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'verification.local/research-mobile.png' });
  // Empty, failed and retry paths remain distinguishable from a successful catalog.
  let failures = true;
  await page.route('**/api/research-library?*', route => failures ? route.fulfill({ status: 503, json: { error: 'Tillfälligt testfel' } }) : route.fulfill({ json: { snapshot: null, saved: [] } }));
  await library.getByRole('button', { name: 'Läs om forskningsbiblioteket', exact: true }).click();
  await expect(library.getByRole('alert')).toContainText('Tillfälligt testfel');
  failures = false;
  await library.getByRole('button', { name: 'Försök igen', exact: true }).click();
  await expect(library.getByRole('heading', { name: 'Här börjar forskningsarbetet' })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS live UI save/reload, draft handoff without auto-send, dark/mobile/reduced-motion layout, empty/error/retry');
  const shares = await data(await req(owner, `/api/workspace-shares?workspaceId=${workspace.id}`));
  await data(await req(owner, `/api/workspace-shares?workspaceId=${workspace.id}&id=${shares[0].id}`, 'DELETE'));
  assert.equal((await req(member, path)).status, 404);
  assert.deepEqual((await member.client!.from('cancer_research_links').select('*').eq('workspace_id', workspace.id)).data, []);
  assert.ok((await member.client!.from('cancer_research_links').insert({ workspace_id: workspace.id, revision, task_id: researchFixture.id, added_by: member.id })).error);
  console.log('PASS revocation removes catalog and saved-reference access');
} finally {
  await browser?.close();
  for (const u of users) if (u.id) assert.equal((await admin.auth.admin.deleteUser(u.id)).error, null);
  console.log('Removed temporary research test accounts and cascading test data');
}
