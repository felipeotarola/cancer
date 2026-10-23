import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const user = { id: '10000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const workspaces = [{ id: '20000000-0000-4000-8000-000000000001', name: 'OpenCancer' }];
  await page.route('**/api/auth/config', route => route.fulfill({ json: { url: 'https://auth.opencancer.test', publishableKey: 'sb_publishable_ui_fixture' } }));
  await page.route('https://auth.opencancer.test/**', route => {
    if (route.request().url().includes('/token')) return route.fulfill({ json: { access_token: 'ui-fixture-only', refresh_token: 'ui-fixture-only', token_type: 'bearer', expires_in: 3600, user } });
    return route.fulfill({ json: {} });
  });
  await page.route('**/api/workspaces', async route => {
    if (route.request().method() === 'POST') {
      const next = { id: '20000000-0000-4000-8000-000000000002', name: route.request().postDataJSON().name };
      workspaces.push(next); return route.fulfill({ status: 201, json: next });
    }
    return route.fulfill({ json: workspaces });
  });
  await page.route('**/api/chats?*', route => route.fulfill({ json: [] }));
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('E-post', { exact: true }).fill(user.email);
  await page.getByLabel('Lösenord', { exact: true }).fill('not-a-real-password');
  await page.getByRole('button', { name: 'Logga in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Välkommen till OpenCancer' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Välj workspace' }).click();
  await page.getByRole('option', { name: 'Nytt workspace' }).click();
  await page.getByLabel('Namn', { exact: true }).fill('Immunterapi');
  await page.getByRole('button', { name: 'Skapa workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Välkommen till Immunterapi' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Välj workspace' }).click();
  await page.getByRole('option', { name: 'OpenCancer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Välkommen till OpenCancer' })).toBeVisible();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/cancer-workspace-ui.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'test-results/cancer-workspace-mobile-ui.png' });
  await page.getByRole('button', { name: 'Öppna navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Öppna profilmeny', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Logga ut', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Välkommen tillbaka' })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS login/workspace creation/logout UI and mobile layout with intercepted test responses (not cloud integration)');
} finally { await browser.close(); }
