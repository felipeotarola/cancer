import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
import { saveSessionMessage, sessionWorkspace } from '../server/services/workspace.ts';
process.loadEnvFile('.env');
if (!process.env.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY is required');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const base = 'http://127.0.0.1:5173';
const users = [0, 1].map(() => ({ id: undefined, email: `cancer-qa-${randomUUID()}@example.invalid`, password: `Qa!${randomUUID()}` }));
async function messageCount(role) { const r = await admin.from('cancer_messages').select('id').eq('owner_id', users[0].id).eq('role', role); assert.equal(r.error, null); return r.data.length; }
let browser;
const request = async (token, path, method = 'GET', body, headers = {}) => fetch(base + path, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});
try {
  // Disposable, confirmed fixture identities; no confirmation email is sent.
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
    assert.equal(error, null, error?.message); u.id = data.user.id;
  }
  for (const u of users) {
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
    assert.equal(error, null, error?.message);
    u.token = data.session.access_token;
    u.client = client;
  }
  console.log('PASS real Supabase password sign-in for two temporary users');
  assert.equal((await request(null, '/api/workspaces')).status, 401);
  assert.equal((await request(null, '/eve/v1/session', 'POST', {})).status, 401);
  const result = await request(users[0].token, '/api/workspaces');
  assert.equal(result.status, 200, await result.clone().text());
  const workspaces = await result.json();
  assert.equal(workspaces.length, 1);
  const workspace = workspaces[0];
  const chatResponse = await request(users[0].token, '/api/chats', 'POST', { workspaceId: workspace.id });
  assert.equal(chatResponse.status, 201);
  const chat = await chatResponse.json();
  const sessions = await Promise.all([0, 1].map(() => request(users[0].token, '/eve/v1/session', 'POST', {}, { 'x-cancer-chat-id': chat.id }).then(async r => { assert.equal(r.status, 200, await r.clone().text()); return r.json(); })));
  assert.equal(sessions[0].sessionId, sessions[1].sessionId);
  const sessionId = sessions[0].sessionId;
  for (const suffix of ['', '/cancel', '/clear', '/reset', '/compact']) assert.equal((await request(users[1].token, `/eve/v1/session/${sessionId}${suffix}`, 'POST', {})).status, 403);
  assert.equal((await request(users[1].token, `/eve/v1/session/${sessionId}/stream`)).status, 403);
  assert.equal((await request(users[1].token, '/api/chats', 'POST', { workspaceId: workspace.id })).status, 404);
  assert.deepEqual(await (await request(users[1].token, `/api/chats?workspaceId=${workspace.id}`)).json(), []);
  console.log('PASS API ownership, session controls/stream isolation, and concurrent session binding');
  const foreignWorkspace = await users[1].client.from('cancer_workspaces').select('id').eq('id', workspace.id);
  assert.equal(foreignWorkspace.error, null); assert.deepEqual(foreignWorkspace.data, []);
  const foreignSession = await users[1].client.from('cancer_sessions').select('session_id').eq('session_id', sessionId);
  assert.equal(foreignSession.error, null); assert.deepEqual(foreignSession.data, []);
  assert.ok((await users[0].client.from('cancer_sessions').insert({ session_id: 'forged', chat_id: chat.id, owner_id: users[0].id })).error);
  assert.ok((await users[0].client.rpc('cancer_bind_session', { p_owner: users[0].id, p_chat: chat.id, p_session: 'forged' })).error);
  assert.ok((await users[0].client.rpc('cancer_save_message', { p_owner: users[0].id, p_session: sessionId, p_id: 'forged', p_role: 'assistant', p_content: 'forged' })).error);
  console.log('PASS database RLS and denied client session binding');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel('E-post', { exact: true }).fill(users[0].email);
  await page.getByLabel('Lösenord', { exact: true }).fill(users[0].password);
  await page.getByRole('button', { name: 'Logga in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Logga ut', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Ditt meddelande' })).toBeEnabled({ timeout: 30000 });
  if (process.env.CANCER_TEST_MODEL === '1') {
    await page.getByRole('combobox', { name: 'Resonemangsnivå' }).click();
    await page.getByRole('option', { name: /^Max/ }).click();
  }
  await page.getByRole('textbox', { name: 'Ditt meddelande' }).fill('Svara endast med ordet OK.');
  await page.getByRole('button', { name: 'Skicka meddelande' }).click();
  await expect.poll(() => messageCount('user'), { timeout: 30000 }).toBe(1);
  if (process.env.CANCER_TEST_MODEL === '1') {
    await expect.poll(() => messageCount('assistant'), { timeout: 60000 }).toBeGreaterThan(0);
  } else {
    const stop = page.getByRole('button', { name: 'Stoppa svar' });
    if (await stop.isVisible()) await stop.click();
  }
  await page.reload();
  await expect(page.getByRole('article', { name: 'Du', exact: true })).toContainText('Svara endast med ordet OK.', { timeout: 30000 });
  if (process.env.CANCER_TEST_MODEL === '1') await expect(page.getByRole('article', { name: 'OpenCancer', exact: true })).toContainText('OK');
  await page.getByRole('button', { name: 'Ny chatt', exact: true }).click();
  await page.getByRole('button', { name: 'Skapa nytt workspace', exact: true }).click();
  await page.getByLabel('Namn', { exact: true }).fill('QA cancerforskning');
  await page.getByRole('button', { name: 'Skapa workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Välkommen till QA cancerforskning' })).toBeVisible();
  await page.getByRole('button', { name: 'Starta chatt', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Ditt meddelande' })).toBeEnabled();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/cancer-workspace.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Öppna navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Logga ut', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Välkommen tillbaka' })).toBeVisible();
  await page.screenshot({ path: 'test-results/cancer-auth-mobile.png' });
  assert.deepEqual(errors, []);
  assert.equal((await sessionWorkspace(users[0].id, sessionId)).id, workspace.id);
  await assert.rejects(sessionWorkspace(users[1].id, sessionId));
  await saveSessionMessage(users[0].id, sessionId, { id: 'persistence-fixture', role: 'assistant', content: 'Server persistence fixture, not an AI response.' });
  const saved = await (await request(users[0].token, `/api/chats?workspaceId=${workspace.id}`)).json();
  assert.ok(saved.find(c => c.id === chat.id).messages.some(m => m.id === 'persistence-fixture'));
  const foreignMessages = await users[1].client.from('cancer_messages').select('id').eq('chat_id', chat.id);
  assert.equal(foreignMessages.error, null); assert.deepEqual(foreignMessages.data, []);
  await assert.rejects(saveSessionMessage(users[1].id, sessionId, { id: 'bad-owner', role: 'assistant', content: 'forged' }));
  console.log('PASS server assistant persistence and agent workspace ownership (fixture, not model inference)');
  console.log('PASS browser login, user message saved to Supabase, reload, new workspace/chat, mobile, logout');
  if (process.env.CANCER_TEST_MODEL === '1') console.log('PASS real model response persisted to Supabase');
} catch (error) {
  console.error('FAILED', error instanceof assert.AssertionError ? error.message : (error.code ?? error.message));
  process.exitCode = 1;
} finally {
  await browser?.close();
  for (const u of users) if (u.id) { const { error } = await admin.auth.admin.deleteUser(u.id); assert.equal(error, null); }
  console.log('Temporary users and their cancer_* rows removed');
}
