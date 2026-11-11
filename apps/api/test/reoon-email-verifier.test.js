import assert from 'node:assert/strict';
import test from 'node:test';

import { createReoonEmailVerifier } from '../src/reoon-email-verifier.js';

const powerResponse = {
  email: 'jhon123@gmail.com',
  status: 'safe',
  overall_score: 98,
  username: 'jhon123',
  domain: 'gmail.com',
  is_safe_to_send: true,
  is_valid_syntax: true,
  is_disposable: false,
  is_role_account: false,
  can_connect_smtp: true,
  has_inbox_full: false,
  is_catch_all: false,
  is_deliverable: true,
  is_disabled: false,
  is_spamtrap: false,
  is_free_email: true,
  mx_accepts_mail: true,
  mx_records: ['gmail-smtp-in.l.google.com'],
  verification_mode: 'power',
};

test('Power verification calls Reoon over HTTPS and normalizes the full result', async () => {
  const requests = [];
  const verifier = createReoonEmailVerifier({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return Response.json(powerResponse);
    },
  });

  const result = await verifier.verifyPower('jhon123@gmail.com');

  assert.equal(requests.length, 1);
  const requestUrl = new URL(requests[0].url);
  assert.equal(requestUrl.protocol, 'https:');
  assert.equal(requestUrl.hostname, 'emailverifier.reoon.com');
  assert.equal(requestUrl.pathname, '/api/v1/verify');
  assert.equal(requestUrl.searchParams.get('email'), 'jhon123@gmail.com');
  assert.equal(requestUrl.searchParams.get('key'), 'test-key');
  assert.equal(requestUrl.searchParams.get('mode'), 'power');
  assert.equal(requests[0].options.method, 'GET');
  assert.deepEqual(result, {
    email: 'jhon123@gmail.com',
    status: 'safe',
    overallScore: 98,
    username: 'jhon123',
    domain: 'gmail.com',
    isSafeToSend: true,
    isValidSyntax: true,
    isDisposable: false,
    isRoleAccount: false,
    canConnectSmtp: true,
    hasInboxFull: false,
    isCatchAll: false,
    isDeliverable: true,
    isDisabled: false,
    isSpamtrap: false,
    isFreeEmail: true,
    mxAcceptsMail: true,
    mxRecords: ['gmail-smtp-in.l.google.com'],
    verificationMode: 'power',
    raw: powerResponse,
  });
});

test('account balance returns provider health without exposing the key in the result', async () => {
  const verifier = createReoonEmailVerifier({
    apiKey: 'test-key',
    fetchImpl: async () => Response.json({
      api_status: 'active',
      remaining_daily_credits: 150,
      remaining_instant_credits: 5000,
      status: 'success',
    }),
  });

  assert.deepEqual(await verifier.accountBalance(), {
    apiStatus: 'active',
    remainingDailyCredits: 150,
    remainingInstantCredits: 5000,
    status: 'success',
  });
});

test('provider calls fail before network access when credentials are missing', async () => {
  let called = false;
  const verifier = createReoonEmailVerifier({
    apiKey: '',
    fetchImpl: async () => {
      called = true;
      return Response.json({});
    },
  });

  await assert.rejects(verifier.verifyPower('jhon123@gmail.com'), { status: 409 });
  await assert.rejects(verifier.accountBalance(), { status: 409 });
  assert.equal(called, false);
});

test('provider failures are sanitized and do not expose credentials', async () => {
  const verifier = createReoonEmailVerifier({
    apiKey: 'secret-key',
    fetchImpl: async () => new Response('provider secret-key detail', { status: 429 }),
  });

  await assert.rejects(verifier.verifyPower('jhon123@gmail.com'), error => {
    assert.equal(error.status, 502);
    assert.equal(error.message, 'Reoon email verification could not complete.');
    assert.doesNotMatch(error.message, /secret-key/);
    return true;
  });
});

