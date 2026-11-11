import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJevQuestions, composeJevResult, evaluateJevCompany } from '../src/hydrogen-jev.js';

const zone = { id: 'guben-sued', label: 'Guben Sud', country: 'DE', distanceKm: 0.3, gisStatus: 'Representative point in corridor' };
const occupant = { company: 'Example paper mill', industry: 'Paper production and process steam', status: 'Strong paper-process candidate; verify steam and fuel', websiteUrl: 'https://example.com', linkedinUrl: 'https://www.linkedin.com/company/example' };

test('JEV questions contain one choice and seven independent Noul factors', () => {
  const questions = buildJevQuestions();
  assert.equal(questions.vote.type, 'choice');
  assert.deepEqual(Object.keys(questions.vote.criteria), ['Shortlisted', 'Review', 'Rejected']);
  for (const key of ['productMatch', 'target', 'volumeFit', 'offtakeRecord', 'binding', 'siteFit', 'realCompany']) assert.equal(questions[key].type, 'noul');
});

test('JEV composition preserves factors and produces the requested formatted result', () => {
  const result = composeJevResult({ zoneId: zone.id, zoneLabel: zone.label, occupant, mode: 'live', answers: { vote: { choice: 'Review' }, productMatch: { noul: 0.87 }, target: { noul: 0.84 }, volumeFit: { noul: 0.14 }, offtakeRecord: { noul: 0.04 }, binding: { noul: 0.06 }, siteFit: { noul: 0.51 }, realCompany: { noul: 0.91 } }, rawResponse: { model: 'jev-test' } });
  assert.equal(result.jevVote, 'Review');
  assert.equal(result.jevChoice, 'Review');
  assert.equal(result.jevScore, 44);
  assert.match(result.jevSummary, /^JEV: Review · Product match 0\.87 · Target 0\.84 · Volume fit 0\.14 · Offtake record 0\.04 · Binding 0\.06 · Site fit 0\.51 · Real company 0\.91$/);
  assert.deepEqual(result.rawResponse, { model: 'jev-test' });
});

test('mock JEV screening is explicit and does not call the provider', async () => {
  let called = false;
  const result = await evaluateJevCompany({ zone, occupant, apiKey: null, fetchImpl: async () => { called = true; } });
  assert.equal(result.jevMode, 'mock');
  assert.equal(called, false);
  assert.ok(['Shortlisted', 'Review', 'Rejected'].includes(result.jevVote));
});

test('live JEV screening keeps the raw response and server-side authorization', async () => {
  let request;
  const result = await evaluateJevCompany({ zone, occupant, apiKey: 'secret', fetchImpl: async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ model: 'jev-test', answers: { vote: { choice: 'Review' }, productMatch: { noul: 0.8 }, target: { noul: 0.8 }, volumeFit: { noul: 0.2 }, offtakeRecord: { noul: 0.1 }, binding: { noul: 0.1 }, siteFit: { noul: 0.8 }, realCompany: { noul: 0.9 } } }), { status: 200 }); } });
  assert.equal(result.jevMode, 'live');
  assert.equal(request.url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(request.options.headers.authorization, 'Bearer secret');
  assert.equal(result.rawResponse.model, 'jev-test');
});
