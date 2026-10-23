import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveReasoning } from '../../shared/agent-config.ts';
test('reasoning accepts Luna levels and defaults invalid client input safely', () => {
  for (const level of ['none','low','medium','high','xhigh','max']) assert.equal(resolveReasoning(level), level);
  for (const input of ['Auto', 'ultra', 'minimal', '', null, {}, undefined]) assert.equal(resolveReasoning(input), 'medium');
});
