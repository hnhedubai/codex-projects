import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHydrogenCandidateStore } from '../src/hydrogen-offtaker-store.js';

const result = { title:'Glass Furnace', url:'https://example.com/furnace#source', country:'DE', latitude:52.4, longitude:14.7, sector:'Glass', classification:'Strong fuel-switch candidate', snippet:'Hydrogen burner trial', provider:'brave', query:'glass hydrogen', searchedAt:'2026-10-13T00:00:00Z', rank:1, rawResponseReference:'brave:test' };
test('saving a live result persists an unverified candidate and reloads it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hydrogen-offtaker-'));
  const store = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  const saved = await store.save(result);
  assert.equal(saved.created, true); assert.equal(saved.candidate.researchStatus, 'needs_source_verification'); assert.equal(saved.candidate.evidence[0].evidenceType, 'Search snippet only');
  assert.equal(saved.candidate.jevVote, 'Hold'); assert.equal(saved.candidate.jevChoice, 'Pending source verification'); assert.equal(saved.candidate.jevScore, null);
  const reloaded = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  assert.equal((await reloaded.list()).length, 1); assert.equal((await reloaded.list())[0].sourceUrls[0], 'https://example.com/furnace');
  assert.match(await readFile(join(dir, 'candidates.json'), 'utf8'), /rawResponseReference/);
});
test('saving the same normalized URL is idempotent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hydrogen-offtaker-')); const store = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  const first = await store.save(result); const second = await store.save({ ...result, url:'https://example.com/furnace' });
  assert.equal(first.created, true); assert.equal(second.created, false); assert.equal((await store.list()).length, 1);
});
test('search runs preserve every result and its screening fields after reload', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hydrogen-offtaker-'));
  const store = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  const saved = await store.saveSearchRun({ provider: 'brave', query: 'steel hydrogen', searchedAt: '2026-10-13T10:00:00Z', rawResponse: { web: { results: [{ title: 'A' }, { title: 'B' }] } }, results: [
    { title: 'Steel plant', url: 'https://example.com/steel', snippet: 'Hydrogen furnace trial', classification: 'Strong fuel-switch candidate', rank: 1, country: 'DE' },
    { title: 'Pipeline developer', url: 'https://example.com/pipeline', snippet: 'Hydrogen pipeline', classification: 'Infrastructure or enabler', rank: 2, country: 'DE' },
  ] });
  assert.equal(saved.results.length, 2);
  assert.equal(saved.results[0].jevVote, 'Verify');
  assert.equal(saved.results[1].jevVote, 'Reject');
  const reloaded = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  const history = await reloaded.listSearchResults();
  assert.equal(history.length, 2);
  assert.equal(history[0].rawResponseReference, saved.results[0].rawResponseReference);
  assert.deepEqual((await reloaded.listSearchRuns())[0].rawResponse, { web: { results: [{ title: 'A' }, { title: 'B' }] } });
});
test('JEV screening runs append and preserve every raw result after reload', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hydrogen-offtaker-'));
  const store = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  const screening = { runId: 'JEV-1', zoneId: 'guben-sued', company: 'Example paper mill', jevVote: 'Review', jevChoice: 'Review', jevScore: 44, jevFactors: { productMatch: 0.87 }, rawResponse: { model: 'jev-test' } };
  await store.saveJevRun({ runId: 'JEV-1', mode: 'live', screenings: [screening] });
  await store.saveJevRun({ runId: 'JEV-2', mode: 'mock', screenings: [{ ...screening, runId: 'JEV-2', jevScore: 25 }] });
  const reloaded = createHydrogenCandidateStore({ filePath: join(dir, 'candidates.json') });
  assert.equal((await reloaded.listJevRuns()).length, 2);
  assert.equal((await reloaded.listJevScreenings()).length, 2);
  assert.deepEqual((await reloaded.listJevScreenings())[0].rawResponse, { model: 'jev-test' });
});
