import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPulseClient } from '../../wind-projects/pulse.mjs';
import { createSendStore } from '../../wind-projects/send-store.mjs';
import { validateHydrogenSend, isTrustedLocalCall, createHydrogenPulse } from '../src/hydrogen-pulse.js';

const base = { candidateId: 'zone-x-acme', mode: 'separate', subject: 'Hello', body: 'Dear Project Team,\n\nBody text.', recipients: [{ name: 'Mubashir Test', email: 'Me@Example.com', field: 'to' }] };
const local = 'http://localhost:9400';
const req = (method, pathAndQuery, body, headers = {}) => new Request(local + pathAndQuery, { method, headers: { host: 'localhost:9400', 'x-hydrogen-send': '1', 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const fakeFetch = (handler) => async (url, init) => { const payload = JSON.parse(init.body); const out = handler(payload, init); return new Response(JSON.stringify(out.body), { status: out.status ?? 200 }); };

async function setup(handler) {
  const dir = await mkdtemp(path.join(tmpdir(), 'hyd-pulse-'));
  const file = path.join(dir, 'sends.json');
  const calls = [];
  const pulse = createPulseClient({ key: 'pulse_test_key', fetchImpl: fakeFetch((payload, init) => { calls.push({ payload, auth: init.headers.Authorization }); return handler(payload); }) });
  const service = createHydrogenPulse({ pulsePromise: Promise.resolve(pulse), sendStorePromise: createSendStore(file) });
  return { service, calls, file };
}

test('validation normalises addresses, forces To for one-by-one and rejects bad input', () => {
  const ok = validateHydrogenSend({ ...base, recipients: [{ name: 'A', email: ' Me@Example.com ', field: 'cc' }, { name: 'A', email: 'me@example.com' }] });
  assert.equal(ok.projectId, 'hydrogen:zone-x-acme');
  assert.deepEqual(ok.recipients.map((r) => [r.email, r.field]), [['me@example.com', 'to']]);
  assert.throws(() => validateHydrogenSend({ ...base, mode: 'x' }), /Pulse send mode/);
  assert.throws(() => validateHydrogenSend({ ...base, subject: '' }), /subject/);
  assert.throws(() => validateHydrogenSend({ ...base, body: 'Dear X,\n\n[placeholder]' }), /placeholder/);
  assert.throws(() => validateHydrogenSend({ ...base, recipients: [{ email: 'not-an-email' }] }), /invalid email/);
  assert.throws(() => validateHydrogenSend({ ...base, recipients: [] }), /at least one recipient/);
  assert.throws(() => validateHydrogenSend({ ...base, mode: 'together', recipients: [{ email: 'a@example.com', field: 'cc' }] }), /at least one To/);
  assert.throws(() => validateHydrogenSend({ ...base, candidateId: '' }), /record/);
  assert.throws(() => validateHydrogenSend({ ...base, recipients: Array.from({ length: 11 }, (_, i) => ({ email: `p${i}@example.com` })) }), /up to 10/);
});

test('only this machine\'s own page may call the send routes', () => {
  const url = new URL(local + '/api/hydrogen/send');
  assert.equal(isTrustedLocalCall(req('POST', '/api/hydrogen/send', base), url), true);
  assert.equal(isTrustedLocalCall(req('POST', '/api/hydrogen/send', base, { 'x-hydrogen-send': '0' }), url), false);
  assert.equal(isTrustedLocalCall(req('POST', '/api/hydrogen/send', base, { origin: 'https://evil.example' }), url), false);
  assert.equal(isTrustedLocalCall(req('POST', '/api/hydrogen/send', base, { origin: local }), url), true);
  assert.equal(isTrustedLocalCall(req('POST', '/api/hydrogen/send', base), new URL('http://evil.example:9400/api/hydrogen/send')), false);
});

test('other routes are ignored and a foreign page gets 403 without sending', async () => {
  const { service, calls } = await setup(() => ({ body: { sent: true } }));
  assert.equal(await service.handle(req('GET', '/api/hydrogen/bootstrap'), new URL(local + '/api/hydrogen/bootstrap')), null);
  const res = await service.handle(req('POST', '/api/hydrogen/send', base, { origin: 'https://evil.example' }), new URL(local + '/api/hydrogen/send'));
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test('one-by-one send personalises, uses an idempotency key, records history and keeps the key off the wire body', async () => {
  const { service, calls, file } = await setup(() => ({ body: { sent: true, emailMessageId: 'm1' } }));
  const url = new URL(local + '/api/hydrogen/send');
  const res = await service.handle(req('POST', '/api/hydrogen/send', { ...base, recipients: [{ name: 'Anna Kowalska', email: 'anna@example.com' }, { name: 'Jan Nowak', email: 'jan@example.com' }] }), url);
  const out = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(out.summary, { sent: 2, blocked: 0, failed: 0 });
  assert.deepEqual(out.workflowUpdate, { emailStatus: 'sent', workflow: 'Contacted' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].auth, 'Bearer pulse_test_key');
  assert.match(calls[0].payload.body_text, /^Dear Anna,/);
  assert.match(calls[1].payload.body_text, /^Dear Jan,/);
  assert.notEqual(calls[0].payload.idempotency_key, calls[1].payload.idempotency_key);
  assert.ok(!JSON.stringify(calls[0].payload).includes('pulse_test_key'));
  const history = await (await service.handle(req('GET', '/api/hydrogen/sends?candidateId=zone-x-acme'), new URL(local + '/api/hydrogen/sends?candidateId=zone-x-acme'))).json();
  assert.equal(history.enabled, true);
  assert.equal(history.sends.length, 1);
  assert.equal(history.sends[0].summary.sent, 2);
  const other = await (await service.handle(req('GET', '/api/hydrogen/sends?candidateId=other'), new URL(local + '/api/hydrogen/sends?candidateId=other'))).json();
  assert.deepEqual(other.sends, []);
  assert.ok((await readFile(file, 'utf8')).includes('anna@example.com'));
});

test('re-sending the identical draft reuses the same idempotency key so Pulse can de-duplicate', async () => {
  const { service, calls } = await setup(() => ({ body: { sent: true } }));
  const url = new URL(local + '/api/hydrogen/send');
  await service.handle(req('POST', '/api/hydrogen/send', base), url);
  await service.handle(req('POST', '/api/hydrogen/send', base), url);
  assert.equal(calls[0].payload.idempotency_key, calls[1].payload.idempotency_key);
});

test('a blocked recipient keeps Pulse\'s reason and the workflow is not advanced', async () => {
  const { service } = await setup(() => ({ status: 422, body: { code: 'recipients_blocked', error: 'Recipient blocked by Pulse.', verification: { reason: 'catch_all' } } }));
  const res = await service.handle(req('POST', '/api/hydrogen/send', base), new URL(local + '/api/hydrogen/send'));
  const out = await res.json();
  assert.equal(out.summary.blocked, 1);
  assert.equal(out.workflowUpdate, null);
  assert.deepEqual(out.results[0].verification, { reason: 'catch_all' });
  const history = await (await service.handle(req('GET', '/api/hydrogen/sends?candidateId=zone-x-acme'), new URL(local + '/api/hydrogen/sends?candidateId=zone-x-acme'))).json();
  assert.deepEqual(history.sends[0].results[0].verification, { reason: 'catch_all' });
});

test('unconfigured Pulse returns 503 and validation errors return 422 without calling Pulse', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hyd-pulse-'));
  const service = createHydrogenPulse({ pulsePromise: Promise.resolve(createPulseClient({ key: '' })), sendStorePromise: createSendStore(path.join(dir, 's.json')) });
  const url = new URL(local + '/api/hydrogen/send');
  assert.equal((await service.handle(req('POST', '/api/hydrogen/send', base), url)).status, 503);
  assert.equal((await service.handle(req('POST', '/api/hydrogen/send', { ...base, subject: '' }), url)).status, 422);
});

test('[Name] is a merge field in one-by-one mode: each person gets their own greeting, any other [placeholder] is still blocked', async () => {
  const template = { ...base, subject: 'Hydrogen offtake', body: 'Dear [Name],\n\nHelping Acme secure hydrogen. [Name], could you forward this?\n\nBest Regards,' };
  const { service, calls } = await setup(() => ({ body: { sent: true } }));
  const url = new URL(local + '/api/hydrogen/send');
  const res = await service.handle(req('POST', '/api/hydrogen/send', { ...template, recipients: [{ name: 'Anna Kowalska', email: 'anna@example.com' }, { name: 'Dr. Jan Nowak', email: 'jan@example.com' }] }), url);
  const out = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(out.summary, { sent: 2, blocked: 0, failed: 0 });
  assert.match(calls[0].payload.body_text, /^Dear Anna,/);
  assert.match(calls[0].payload.body_text, /Anna, could you forward this\?/);
  assert.match(calls[1].payload.body_text, /^Dear Dr\. Nowak,/);
  assert.ok(!calls.some((c) => /\[name\]/i.test(c.payload.body_text + c.payload.body_html)));
  const bad = await service.handle(req('POST', '/api/hydrogen/send', { ...template, body: template.body + '\n[Your title]' }), url);
  assert.equal(bad.status, 422);
  assert.match((await bad.json()).error, /\[Your title\]/);
});

test('[Name] left in a one-email send is blocked (the page fills it in before sending) and a recipient without a name gets a neutral greeting', async () => {
  const { service, calls } = await setup(() => ({ body: { sent: true } }));
  const url = new URL(local + '/api/hydrogen/send');
  const together = await service.handle(req('POST', '/api/hydrogen/send', { ...base, mode: 'together', body: 'Dear [Name],\n\nText.', recipients: [{ email: 'a@example.com', field: 'to' }] }), url);
  assert.equal(together.status, 422);
  const nameless = await service.handle(req('POST', '/api/hydrogen/send', { ...base, body: 'Dear [Name],\n\nText.', recipients: [{ name: '', email: 'a@example.com' }] }), url);
  assert.equal(nameless.status, 200);
  assert.match(calls[0].payload.body_text, /^Dear colleague,/);
});
