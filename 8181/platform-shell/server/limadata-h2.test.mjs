import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractWorkEmail, findLimaWorkEmail, saveH2ContactImport, findStoredH2ContactImport, normalizeDomain, allowedH2LookupDomains, enrichH2Contact } from './limadata-h2.mjs';

test('extracts the returned work email from LimaData response', () => {
  assert.equal(extractWorkEmail({ data: { work_email: 'John.Thomas@greenhillenergy.com.au' } }), 'john.thomas@greenhillenergy.com.au');
});

test('uses the corrected LimaData endpoint and persists the response shape', async () => {
  let request;
  const result = await findLimaWorkEmail({
    fullName: 'Dr John Thomas',
    companyDomain: 'greenhillenergy.com.au',
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ work_email: 'john.thomas@greenhillenergy.com.au' }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(request.url, 'https://api.limadata.com/api/v1/find/email_work');
  assert.equal(request.options.headers['x-api-key'], 'test-key');
  assert.deepEqual(JSON.parse(request.options.body), { full_name: 'Dr John Thomas', company_domain: 'greenhillenergy.com.au' });
  assert.equal(result.email, 'john.thomas@greenhillenergy.com.au');
});

test('fails closed on missing input, missing key, HTTP errors, malformed JSON and timeouts', async () => {
  await assert.rejects(() => findLimaWorkEmail({ fullName: '', companyDomain: 'example.com', apiKey: 'x' }), { status: 422 });
  await assert.rejects(() => findLimaWorkEmail({ fullName: 'A Person', companyDomain: 'example.com' }), { status: 503 });
  await assert.rejects(() => findLimaWorkEmail({ fullName: 'A Person', companyDomain: 'example.com', apiKey: 'x', fetchImpl: async () => new Response(JSON.stringify({ error: 'bad key' }), { status: 401 }) }), { status: 401 });
  await assert.rejects(() => findLimaWorkEmail({ fullName: 'A Person', companyDomain: 'example.com', apiKey: 'x', fetchImpl: async () => new Response('<html>login</html>', { status: 200 }) }), { status: 502 });
  await assert.rejects(() => findLimaWorkEmail({ fullName: 'A Person', companyDomain: 'example.com', apiKey: 'x', timeoutMs: 1, fetchImpl: async (_url, options) => await new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) }), { status: 502 });
});

test('classifies a provider 404 HTML response as a no-result without throwing', async () => {
  const result = await findLimaWorkEmail({
    fullName: 'A Person',
    companyDomain: 'example.com',
    apiKey: 'x',
    fetchImpl: async () => new Response('<html>not found</html>', { status: 404 }),
  });
  assert.equal(result.email, '');
  assert.equal(result.status, 404);
  assert.equal(result.notFound, true);
});

test('persists a returned email and refuses to overwrite a corrupt import store', async () => {
  const root = await mkdtemp(join(tmpdir(), 'h2-lima-'));
  const dataDir = join(root, 'modules', 'h2-projects', 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'contact-imports.json'), '{}');
  const saved = await saveH2ContactImport({ root, recordId: 'riverbend-energy-hub', name: 'Dr John Thomas', email: 'john.thomas@example.com' });
  assert.equal(saved.email, 'john.thomas@example.com');
  assert.equal(JSON.parse(await readFile(join(dataDir, 'contact-imports.json'), 'utf8'))['riverbend-energy-hub'][0].email, 'john.thomas@example.com');
  await writeFile(join(dataDir, 'contact-imports.json'), '{broken');
  await assert.rejects(() => saveH2ContactImport({ root, recordId: 'riverbend-energy-hub', name: 'Other Person', email: 'other@example.com' }), { status: 503 });
});

test('a failed save does not poison later saves', async () => {
  const root = await mkdtemp(join(tmpdir(), 'h2-lima-queue-'));
  const dataDir = join(root, 'modules', 'h2-projects', 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'contact-imports.json'), '{broken');
  await assert.rejects(() => saveH2ContactImport({ root, recordId: 'one', name: 'First Person', email: 'first@example.com' }), { status: 503 });
  await writeFile(join(dataDir, 'contact-imports.json'), '{}');
  const saved = await saveH2ContactImport({ root, recordId: 'two', name: 'Second Person', email: 'second@example.com' });
  assert.equal(saved.email, 'second@example.com');
});

test('normalizes only valid domains and returns cached lookups by project, person and domain', async () => {
  assert.equal(normalizeDomain('https://www.greenhillenergy.com.au/path'), 'greenhillenergy.com.au');
  assert.equal(normalizeDomain('greenhillenergy.com.au:443'), '');
  assert.equal(normalizeDomain('not a domain'), '');
  const root = await mkdtemp(join(tmpdir(), 'h2-lima-cache-'));
  await mkdir(join(root, 'modules', 'h2-projects', 'data'), { recursive: true });
  await writeFile(join(root, 'modules', 'h2-projects', 'data', 'contact-imports.json'), '{}');
  await saveH2ContactImport({ root, recordId: 'riverbend-energy-hub', name: 'Dr John Thomas', companyDomain: 'greenhillenergy.com.au', email: 'john@example.com' });
  assert.equal((await findStoredH2ContactImport({ root, recordId: 'riverbend-energy-hub', name: 'Dr John Thomas', companyDomain: 'greenhillenergy.com.au' })).email, 'john@example.com');
  assert.equal(await findStoredH2ContactImport({ root, recordId: 'riverbend-energy-hub', name: 'Dr John Thomas', companyDomain: 'other.example.com' }), null);
  const domains = allowedH2LookupDomains({ domainUrl: 'https://greenhillenergy.com.au/', sources: [{ url: 'https://example.org/research' }], contacts: [{ email: 'person@greenhillenergy.com.au' }] });
  assert.equal(domains.has('greenhillenergy.com.au'), true);
});

test('enriches only the attached contact and caches the provider result', async () => {
  const root = await mkdtemp(join(tmpdir(), 'h2-lima-route-'));
  await mkdir(join(root, 'modules', 'h2-projects', 'data'), { recursive: true });
  await writeFile(join(root, 'modules', 'h2-projects', 'data', 'contact-imports.json'), '{}');
  const records = [{ id: 'project-1', domainUrl: 'https://example.com', contacts: [{ name: 'Jane Doe', role: 'Director' }] }];
  let lookups = 0;
  let registrations = 0;
  const lookup = async () => { lookups += 1; return { email: 'jane.doe@example.com', status: 200, endpoint: 'test' }; };
  const register = async () => { registrations += 1; };
  const first = await enrichH2Contact({ input: { recordId: 'project-1', name: 'Jane Doe', companyDomain: 'example.com' }, records, root, lookup, register });
  const second = await enrichH2Contact({ input: { recordId: 'project-1', name: 'Jane Doe', companyDomain: 'example.com' }, records, root, lookup, register });
  assert.equal(first.email, 'jane.doe@example.com');
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(lookups, 1);
  assert.equal(registrations, 2);
  assert.equal(records[0].contacts[0].email, 'jane.doe@example.com');
  await assert.rejects(() => enrichH2Contact({ input: { recordId: 'project-1', name: 'Unknown Person', companyDomain: 'example.com' }, records, root, lookup }), { status: 422 });
  await assert.rejects(() => enrichH2Contact({ input: { recordId: 'project-1', name: 'Jane Doe', companyDomain: 'other.example.com' }, records, root, lookup }), { status: 422 });
  assert.equal(lookups, 1);
});
