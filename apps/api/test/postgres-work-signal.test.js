import assert from 'node:assert/strict';
import test from 'node:test';

import { createPostgresWorkSignal } from '../src/postgres-work-signal.js';

test('work signal listens on the tracker channel and forwards notifications', async () => {
  const listeners = new Map();
  let released = false;
  const client = {
    on(event, handler) { listeners.set(event, handler); },
    async query(sql) { assert.equal(sql, 'LISTEN tracker_work_available'); },
    removeAllListeners(event) { listeners.delete(event); },
    release() { released = true; },
  };
  const received = [];
  const signal = createPostgresWorkSignal({
    pool: { connect: async () => client },
    onSignal: payload => received.push(payload),
  });

  await signal.start();
  listeners.get('notification')({ channel: 'tracker_work_available', payload: 'cprofile_firecrawl_jobs' });
  listeners.get('notification')({ channel: 'other_channel', payload: 'ignored' });
  signal.stop();

  assert.deepEqual(received, ['cprofile_firecrawl_jobs']);
  assert.equal(released, true);
});

test('work signal reconnects after a listener connection failure', async () => {
  let attempts = 0;
  const signal = createPostgresWorkSignal({
    reconnectDelayMs: 1,
    pool: { connect: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary connection failure');
      return { on() {}, async query() {}, removeAllListeners() {}, release() {} };
    } },
  });

  await signal.start();
  await new Promise(resolve => setTimeout(resolve, 10));
  signal.stop();

  assert.equal(attempts, 2);
});
