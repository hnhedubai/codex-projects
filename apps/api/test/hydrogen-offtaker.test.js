import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQueries, normalizeBraveResponse, normalizeSerpApiResponse, deduplicateResults, classifyResult, scoreCandidate, exportCandidates, providerFromEnvironment, checkGeography, isLikelyCompanyWebsite } from '../src/hydrogen-offtaker.js';
import { INDUSTRIAL_ZONES, buildIndustrialZoneQueryTerm, zonesForCountry, zoneOptionLabel, zoneById } from '../../web/public/hydrogen-zones.js';

test('industrial zone catalog contains researched Polish and German zones and produces a scoped query term', () => {
  assert.equal(INDUSTRIAL_ZONES.length, 41);
  assert.equal(zonesForCountry('PL').length, 24);
  assert.equal(zonesForCountry('DE').length, 17);
  assert.ok(INDUSTRIAL_ZONES.some((zone) => zone.id === 'guben-sued'));
  assert.match(buildIndustrialZoneQueryTerm('guben-sued'), /Guben S(?:ü|u)d/);
  assert.equal(buildIndustrialZoneQueryTerm(''), '');
  assert.ok(zonesForCountry('PL').every((zone) => zone.country === 'PL'));
  assert.ok(zonesForCountry('DE').every((zone) => zone.country === 'DE'));
  assert.match(zoneOptionLabel(INDUSTRIAL_ZONES.find((zone) => zone.id === 'kedzierzyn-kozle')), /Borderline/);
  assert.equal(zoneById('guben-sued').occupants.length, 10);
  assert.equal(zoneById('schwedt').occupants.length, 7);
  assert.equal(zoneById('schwarze-pumpe').occupants.length, 14);
  assert.ok(zoneById('schwarze-pumpe').occupants.some((occupant) => /Hamburger Rieger/.test(occupant.company)));
  assert.ok(INDUSTRIAL_ZONES.every((zone) => Array.isArray(zone.occupants) && zone.occupants.length > 0));
  const zoneLinks = INDUSTRIAL_ZONES.flatMap((zone) => zone.occupants);
  assert.ok(zoneLinks.every((occupant) => occupant.linkEvidenceStatus));
  assert.ok(zoneLinks.some((occupant) => occupant.websiteUrl && occupant.linkedinUrl));
});

test('query generation covers language and country filters', () => {
  const rows = generateQueries({ countries: ['PL','DE'], sectors: ['Glass'], languages: ['en','pl','de'] });
  assert.equal(rows.length, 6);
  assert.deepEqual(new Set(rows.map(x => x.country)), new Set(['PL','DE']));
  assert.deepEqual(new Set(rows.map(x => x.language)), new Set(['en','pl','de']));
  assert.ok(rows.some(x => /Wasserstoff|hydrogen|wodór/i.test(x.query)));
  assert.ok(rows.every(x => /250 km/i.test(x.query)));
});
test('geography gate enforces Poland/Germany and the 250 km border corridor', () => {
  assert.equal(checkGeography({ country:'DE', latitude:52.4, longitude:14.7 }).eligible, true);
  assert.equal(checkGeography({ country:'DE', latitude:52.4, longitude:14.7 }).status, 'in_scope');
  assert.equal(checkGeography({ country:'DE', latitude:50.0, longitude:10.0 }).status, 'outside_radius');
  assert.equal(checkGeography({ country:'FR', latitude:52.4, longitude:14.7 }).status, 'outside_country');
  assert.equal(checkGeography({ country:'DE' }).status, 'location_required');
});
test('Brave and SerpApi responses normalize into the same provenance contract', () => {
  const context = { provider:'brave', query:'glass hydrogen', searchDate:'2026-10-13T00:00:00Z', language:'en', country:'DE', rawResponseReference:'brave:1' };
  const brave = normalizeBraveResponse({ web:{ results:[{ title:'Glass', url:'https://example.com/a', description:'snippet' }] } }, context);
  const serp = normalizeSerpApiResponse({ organic_results:[{ title:'Glass', link:'https://example.com/a', snippet:'snippet', position:1 }] }, { ...context, provider:'serpapi', rawResponseReference:'serpapi:1' });
  for (const row of [brave[0], serp[0]]) assert.deepEqual(Object.keys(row).sort(), ['country','language','provider','publicationDate','query','rank','rawResponseReference','searchedAt','snippet','title','url']);
  assert.equal(serp[0].url, brave[0].url);
});
test('deduplication removes exact title and normalized URL duplicates', () => {
  const rows = deduplicateResults([{title:'Plant',url:'https://example.com/a#x'},{title:'Plant',url:'https://example.com/a'},{title:'Other',url:'https://example.com/b'}]);
  assert.equal(rows.length,2); assert.deepEqual(rows.map(x=>x.rank),[1,2]);
});
test('exclusion rules classify suppliers infrastructure and transport', () => {
  assert.equal(classifyResult({title:'Electrolyser manufacturer',snippet:''}), 'Hydrogen producer or supplier');
  assert.equal(classifyResult({title:'H2 pipeline developer',snippet:''}), 'Infrastructure or enabler');
  assert.equal(classifyResult({title:'Hydrogen bus fleet',snippet:''}), 'Non-relevant');
  assert.equal(classifyResult({title:'Glass furnace hydrogen burner',snippet:''}), 'Strong fuel-switch candidate');
});
test('company website gate rejects publishers studies and generic content', () => {
  assert.equal(isLikelyCompanyWebsite({ title:'Ovako hydrogen steel heating', url:'https://www.ovako.com/en/about-ovako/hydrogen' }).eligible, true);
  assert.equal(isLikelyCompanyWebsite({ title:'Hydrogen in industry', url:'https://www.catf.us/resource/hydrogen' }).eligible, false);
  assert.equal(isLikelyCompanyWebsite({ title:'Hydrogen furnace study', url:'https://doi.org/10.3390/en17184733' }).eligible, false);
});
test('score is transparent and confidence does not imply demand confirmation', () => {
  const result = scoreCandidate({ process:'Glass melting furnace', currentFuel:'Natural gas', latestFuelSwitchSignal:'Hydrogen burner fuel switch', signalDate:'2026-04-15', hydrogenRequirementEstimate:'2-5', distanceToBorderKm:120, operator:'Glass Co', buyingDepartment:'Energy', expectedStartDate:'2028-01-01', evidence:[{evidenceType:'Official company source',verificationStatus:'verified'}] });
  assert.ok(result.score >= 70); assert.equal(result.confidence, 'High');
});
test('exports preserve source URLs in CSV JSON and Markdown', () => {
  const row = { candidateId:'HOF-1', company:'A', plantSiteName:'Site', sector:'Glass', country:'DE', primaryClassification:'Possible candidate', score:40, confidence:'Low', signalDate:'2026-01-01', sourceUrls:['https://example.com'], evidence:[{summary:'mock'}] };
  assert.match(exportCandidates([row],'csv'), /https:\/\/example.com/);
  assert.match(exportCandidates([row],'json'), /candidateId/);
  assert.match(exportCandidates([row],'markdown'), /## A — Site/);
});
test('provider adapters do not activate without environment keys', () => {
  const providers = providerFromEnvironment({}, async()=>{ throw new Error('must not fetch'); });
  assert.equal(providers.brave, null); assert.equal(providers.serpapi, null);
});
test('Brave adapter requests web-only results with operators and a content-filtering Goggle', async () => {
  let requestedUrl = '';
  const providers = providerFromEnvironment({ BRAVE_SEARCH_API_KEY:'secret' }, async (url) => { requestedUrl = url; return new Response(JSON.stringify({ web: { results: [] } }), { status: 200 }); });
  await providers.brave({ query:'steel hydrogen', language:'de', country:'DE' });
  assert.match(requestedUrl, /result_filter=web/);
  assert.match(requestedUrl, /operators=true/);
  assert.match(requestedUrl, /search_lang=de/);
  assert.match(requestedUrl, /country=DE/);
  assert.match(requestedUrl, /goggles=/);
  assert.match(decodeURIComponent(requestedUrl), /prnewswire\.com/);
  assert.match(decodeURIComponent(requestedUrl), /businesswire\.com/);
  assert.match(decodeURIComponent(requestedUrl), /globenewswire\.com/);
});
test('provider adapters retain rate-limit failures without leaking keys', async () => {
  const providers = providerFromEnvironment({ BRAVE_SEARCH_API_KEY:'secret' }, async()=>new Response('secret', {status:429}));
  await assert.rejects(providers.brave({query:'x'}), /Brave Search failed \(429\)/);
});
test('malformed provider responses normalize to an empty result set', () => {
  assert.deepEqual(normalizeBraveResponse({}, {provider:'brave',query:'x',searchDate:'now',language:'en',country:'PL',rawResponseReference:'x'}), []);
  assert.deepEqual(normalizeSerpApiResponse({organic_results:null}, {provider:'serpapi',query:'x',searchDate:'now',language:'en',country:'PL',rawResponseReference:'x'}), []);
});

