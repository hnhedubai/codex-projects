import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceExtractionAgent, normalizeCompanyProfile, normalizeEvidence } from '../src/evidence-extraction.js';

const source = 'https://soharportandfreezone.om/sohar-freezone-land/';

test('normalizes a source-backed evidence observation without inferring gates', () => {
  const result = normalizeEvidence({ json: { pageType: 'zone', title: 'SOHAR Freezone', locationText: 'Sohar', evidenceExcerpt: 'Industrial land leases with utility connections.' } }, source);
  assert.equal(result.sourceUrl, source);
  assert.equal(result.sourceDomain, 'soharportandfreezone.om');
  assert.equal(result.evidenceStrength, 'official_authority');
  assert.equal(result.validationStatus, 'validated_source_observation');
  assert.equal(result.evidenceExcerpt, 'Industrial land leases with utility connections.');
});

test('rejects a non-allowlisted source', () => {
  assert.throws(() => normalizeEvidence({ json: { evidenceExcerpt: 'x' } }, 'https://evil.example/'), /allowlisted/);
});

test('omits unstated company facts and placeholders', () => {
  assert.deepEqual(normalizeCompanyProfile({
    business_category: 'Telecommunications',
    business_summary: 'Provides connectivity services.',
    business_intent: 'Connects people and businesses.',
    future_direction: 'Future plans or goals are not explicitly stated on the website.',
  }), {
    business_category: 'Telecommunications',
    business_summary: 'Provides connectivity services.',
    business_intent: 'Connects people and businesses.',
  });
});

test('calls Firecrawl once with a bounded JSON extraction contract', async () => {
  let request;
  const agent = createEvidenceExtractionAgent({ apiKey: 'firecrawl-test-key', fetchImpl: async (url, options) => {
    request = {url, options};
    return Response.json({ json: { pageType: 'opportunity', evidenceExcerpt: 'A specific official land opportunity.' } });
  }});
  const result = await agent.extract({url: source});
  assert.equal(result.evidenceExcerpt, 'A specific official land opportunity.');
  assert.equal(request.url, 'https://api.firecrawl.dev/v1/scrape');
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.formats, ['json']);
  assert.equal(body.onlyMainContent, true);
  assert.match(body.jsonOptions.prompt, /source-backed facts/);
  assert.equal(request.options.headers.authorization, 'Bearer firecrawl-test-key');
});

test('does not call Firecrawl without credentials', async () => {
  let called = false;
  const agent = createEvidenceExtractionAgent({ apiKey: '', fetchImpl: async () => { called = true; } });
  await assert.rejects(agent.extract({url: source}), {status: 409});
  assert.equal(called, false);
});

test('company Markdown retrieval requests only the bounded four-field JSON contract', async () => {
  let request;
  const agent = createEvidenceExtractionAgent({ apiKey: 'firecrawl-test-key', fetchImpl: async (url, options) => {
    request = { url, options };
    return Response.json({ data: {
      markdown: '# Omantel',
      json: {
        business_category: 'Telecommunications',
        business_summary: 'Connectivity services.',
        business_intent: 'Serve customers.',
        future_direction: 'Not explicitly stated',
      },
      metadata: { statusCode: 200 },
    }});
  }});
  const result = await agent.fetchSource({ url: 'https://omantel.om/', mode: 'company' });
  assert.equal(request.url, 'https://api.firecrawl.dev/v2/scrape');
  const body = JSON.parse(request.options.body);
  assert.equal(body.onlyMainContent, true);
  assert.equal(body.formats[0], 'markdown');
  assert.equal(body.formats[1].type, 'json');
  assert.deepEqual(result.extracted, {
    business_category: 'Telecommunications',
    business_summary: 'Connectivity services.',
    business_intent: 'Serve customers.',
  });
  assert.equal(result.content, '# Omantel');
});
