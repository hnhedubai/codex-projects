import assert from 'node:assert/strict';
import test from 'node:test';

import { createReoonVerificationWorker } from '../src/reoon-verification-worker.js';

test('worker claims one job, uses Power Mode, and records the normalized result', async () => {
  const calls = [];
  const worker = createReoonVerificationWorker({
    workerId: 'worker-1',
    query: async (text, values) => {
      calls.push({ text, values });
      if (text.includes('enqueue_due_contact')) return { rows: [{ enqueued: 0 }] };
      if (text.includes('claim_contact')) return { rows: [{ id: 'job-1', contact_id: 'contact-1', email_snapshot: 'a@example.com' }] };
      return { rows: [{ id: 'contact-1' }] };
    },
    verifier: {
      capabilities: () => ({ enabled: true, verificationMode: 'power' }),
      verifyPower: async email => ({ email, status: 'safe', verificationMode: 'power' }),
    },
  });

  const result = await worker.runOnce();

  assert.equal(result.result.status, 'safe');
  assert.equal(calls[0].text, 'select tracker.enqueue_due_contact_email_verifications($1) as enqueued');
  assert.equal(calls[1].text, 'select * from tracker.claim_contact_email_verification($1, $2)');
  assert.deepEqual(calls[1].values, ['worker-1', 180]);
  assert.equal(calls[2].text, 'select * from tracker.record_contact_email_verification($1, $2, $3)');
  assert.equal(JSON.parse(calls[2].values[2]).verificationMode, 'power');
});

test('worker does not query the database when Reoon is not configured', async () => {
  let called = false;
  const worker = createReoonVerificationWorker({
    query: async () => { called = true; return { rows: [] }; },
    verifier: { capabilities: () => ({ enabled: false }) },
  });

  assert.equal(await worker.runOnce(), null);
  assert.equal(called, false);
});

test('worker records provider failure for retry without exposing provider details to the caller', async () => {
  const calls = [];
  const worker = createReoonVerificationWorker({
    workerId: 'worker-1',
    query: async (text, values) => {
      calls.push({ text, values });
      if (text.includes('enqueue_due_contact')) return { rows: [{ enqueued: 0 }] };
      if (text.includes('claim_contact')) return { rows: [{ id: 'job-1', contact_id: 'contact-1', email_snapshot: 'a@example.com' }] };
      return { rows: [{ id: 'job-1' }] };
    },
    verifier: {
      capabilities: () => ({ enabled: true, verificationMode: 'power' }),
      verifyPower: async () => { throw new Error('Reoon verification could not complete.'); },
    },
  });

  const result = await worker.runOnce();

  assert.equal(result.error.message, 'Reoon verification could not complete.');
  assert.equal(calls[2].text, 'select * from tracker.fail_contact_email_verification($1, $2, $3)');
});
