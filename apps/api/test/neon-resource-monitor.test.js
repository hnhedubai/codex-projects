import assert from 'node:assert/strict';
import test from 'node:test';

import { createNeonResourceMonitor } from '../src/neon-resource-monitor.js';

test('Neon resource monitor stays disabled without explicit monitoring configuration', async () => {
  let called = false;
  const monitor = createNeonResourceMonitor({ apiKey: '', orgId: '', projectId: '', fetchImpl: async () => { called = true; } });
  assert.equal(monitor.capabilities().enabled, false);
  assert.deepEqual(await monitor.check(), { enabled: false, reason: 'Neon monitoring is not configured.' });
  assert.equal(called, false);
});

test('Neon resource monitor reads project usage without performing writes', async () => {
  const requests = [];
  const monitor = createNeonResourceMonitor({
    apiKey: 'neon-test-key', orgId: 'org-test', projectId: 'project-test',
    fetchImpl: async (url, options) => { requests.push({ url, options }); return Response.json({ project: { status: 'active', usage: { compute: 1 } } }); },
  });
  const result = await monitor.check();
  assert.equal(result.status, 'active');
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/projects\/project-test$/);
  assert.equal(requests[0].options.headers.authorization, 'Bearer neon-test-key');
});
