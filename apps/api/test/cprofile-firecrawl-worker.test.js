import assert from 'node:assert/strict';
import test from 'node:test';

import { createCprofileFirecrawlWorker } from '../src/cprofile-firecrawl-worker.js';

test('company Firecrawl worker fetches Markdown and persists through the controlled job routine', async () => {
  const calls = [];
  const worker = createCprofileFirecrawlWorker({
    workerId: 'company-worker',
    query: async (text, values) => {
      calls.push({ text, values });
      if (text.includes('enqueue_due_cprofile')) return { rows: [{ enqueued: 0 }] };
      if (text.includes('claim_cprofile')) return { rows: calls.filter(call => call.text.includes('claim_cprofile')).length === 1 ? [{ id: 'job-1', company_id: 'company-1', source_url: 'https://example.com/company', canonical_url: 'https://example.com/company' }] : [] };
      return { rows: [{ id: 'snapshot-1' }] };
    },
    fetcher: {
      capabilities: () => ({ enabled: true }),
      fetchSource: async ({ url }) => ({ sourceUrl: url, finalUrl: url, content: '# Company Markdown', statusCode: 200, metadata: {} }),
    },
  });

  const result = await worker.runOnce();

  assert.equal(result.length, 1);
  const completion = calls.find(call => call.text.includes('complete_cprofile_firecrawl_job'));
  assert.ok(completion);
  assert.equal(completion.values[0], 'job-1');
  assert.match(completion.values[5], /^[0-9a-f]{64}$/);
});

test('company Firecrawl worker does not query the database without Firecrawl credentials', async () => {
  let called = false;
  const worker = createCprofileFirecrawlWorker({
    query: async () => { called = true; return { rows: [] }; },
    fetcher: { capabilities: () => ({ enabled: false }) },
  });

  assert.equal(await worker.runOnce(), null);
  assert.equal(called, false);
});

test('company Firecrawl worker processes one provider job per run', async () => {
  let claims = 0;
  let active = 0;
  let peak = 0;
  const worker = createCprofileFirecrawlWorker({
    workerId: 'company-worker',
    query: async text => {
      if (text.includes('claim_cprofile')) {
        claims += 1;
        return claims <= 2 ? { rows: [{ id: `job-${claims}`, company_id: `company-${claims}`, source_url: `https://example.com/${claims}`, canonical_url: `https://example.com/${claims}` }] } : { rows: [] };
      }
      if (text.includes('complete_cprofile')) { active -= 1; return { rows: [{ id: 'snapshot' }] }; }
      return { rows: [] };
    },
    fetcher: {
      capabilities: () => ({ enabled: true }),
      fetchSource: async ({ url }) => { active += 1; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); return { sourceUrl: url, finalUrl: url, content: url, statusCode: 200, metadata: {} }; },
    },
  });

  const result = await worker.runOnce();

  assert.equal(result.length, 1);
  assert.equal(peak, 1);
});
