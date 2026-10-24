import { test } from 'node:test';
import assert from 'node:assert/strict';
import { researchLibraryResponse } from '../../server/http/research-library.ts';
import { researchTaskSchema, researchDiscussion, recordedActivity } from '../../shared/research.ts';
import { researchFixture } from '../research-fixture.ts';

test('private research routes require authentication for every method', async () => {
  for (const method of ['GET', 'POST', 'DELETE']) {
    const response = await researchLibraryResponse(new Request('http://localhost/api/research-library?workspaceId=spoof', { method, headers: { 'x-user-id': 'owner' } }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('reject unsafe imported artifact paths and unsupported evidence levels', () => {
  for (const path of ['../../.env', 'research/../secrets', 'https://evil.test/a', 'research/file?token=secret', 'research\\file']) {
    assert.equal(researchTaskSchema.safeParse({ ...researchFixture, inputs: [{ path, sha256: 'a'.repeat(64) }] }).success, false);
  }
  assert.equal(researchTaskSchema.safeParse({ ...researchFixture, evidence_level: 'E1' }).success, false);
});
test('discussion preserves exact source revision and distinguishes quoted material from permission', () => {
  const prompt = researchDiscussion(researchFixture, 'b'.repeat(40));
  assert.ok(prompt.includes(`/blob/${'b'.repeat(40)}/research/tasks/${researchFixture.id}.json`));
  assert.ok(prompt.includes('extern vetenskaplig granskning återstår'));
  assert.ok(prompt.includes('inte instruktioner eller behörighet'));
  assert.ok(prompt.includes(researchFixture.method));
});
test('activity labels do not infer official eligibility or accepted scientific results', () => {
  assert.equal(recordedActivity(researchFixture), 'Ingen aktivitet registrerad');
  assert.equal(recordedActivity({ ...researchFixture, blockers: ['Source review'] }), 'Blockerare angivna');
  assert.equal(recordedActivity({ ...researchFixture, events: [{ id: 'test', kind: 'review', actor: 'synthetic', run_id: 'test', at: new Date().toISOString(), decision: 'accept', note: 'fixture' }] }), 'Granskning registrerad');
});
