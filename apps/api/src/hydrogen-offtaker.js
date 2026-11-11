import borderAsset from './data/gisco-polish-german-border-2024.json' with { type: 'json' };

const LANGUAGES = { en: 'English', pl: 'Polish', de: 'German' };
const SECTORS = ['Cement and lime','Steel and metals','Refinery','Glass','Ceramics and bricks','Sugar mills','Pulp and paper','Food, dairy, malt and breweries','Aluminium and non-ferrous metals','Chemicals and process steam'];
const CLASSIFICATIONS = ['Confirmed industrial consumer','Strong fuel-switch candidate','Possible candidate','Self-supply','Hydrogen producer or supplier','Infrastructure or enabler','Non-relevant','Rejected'];
const SIGNAL_TERMS = {
  en: ['hydrogen fuel switch process heat','hydrogen burner furnace trial','industrial hydrogen use','hydrogen blending trial','fossil fuel replacement hydrogen','EU ETS process heat hydrogen'],
  pl: ['wodór zmiana paliwa ciepło procesowe','palnik wodorowy próba pieca','przemysłowe użycie wodoru','próba mieszania wodoru','zastąpienie paliwa kopalnego wodorem','EU ETS ciepło procesowe wodór'],
  de: ['Wasserstoff Brennstoffwechsel Prozesswärme','Wasserstoffbrenner Ofen Versuch','industrielle Wasserstoffnutzung','Wasserstoff Beimischung Versuch','Ersatz fossiler Brennstoffe durch Wasserstoff','EU ETS Prozesswärme Wasserstoff'],
};
const BORDER_SCOPE = 'within 250 km of the Polish-German border, Poland or Germany';
const OFFTAKER_QUERY_GUARD = 'industrial energy user offtaker 2-10 tonnes hydrogen per day process heat -supplier -electrolyser -electrolyzer -pipeline -association -cluster -consultant -bus -truck -refuelling -refueling -rail -news -newsletter -blog -press -webinar -podcast -conference -research -paper -study -report';
const BRAVE_CONTENT_GOGGLE = '! name: Hydrogen Offtaker Finder\n! description: Discard common editorial, press-distribution, directory, research, and non-company content\n! public: false\n$discard,site=linkedin.com\n$discard,site=facebook.com\n$discard,site=x.com\n$discard,site=reddit.com\n$discard,site=pinterest.com\n$discard,site=quora.com\n$discard,site=crunchbase.com\n$discard,site=wikipedia.org\n$discard,site=medium.com\n$discard,site=wordpress.com\n$discard,site=blogspot.com\n$discard,site=substack.com\n$discard,site=tumblr.com\n$discard,site=ghost.io\n$discard,site=prnewswire.com\n$discard,site=businesswire.com\n$discard,site=globenewswire.com\n$discard,site=newswire.com\n$discard,site=accesswire.com\n$discard,site=einpresswire.com\n$discard,site=prweb.com\n$discard,site=researchgate.net\n$discard,site=academia.edu\n$discard,site=sciencedirect.com\n$discard,site=mdpi.com\n$discard,site=doi.org\n/blog/$discard\n/news/$discard\n/press/$discard\n/press-release/$discard\n/newsletter/$discard\n/webinar/$discard\n/podcast/$discard\n/events/$discard';
const BORDER_POINTS = borderAsset.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
const BORDER_SOURCE = borderAsset.source;
const SECTOR_TERMS = {
  'Cement and lime': { en: 'cement plant kiln', pl: 'cementownia wapiennik', de: 'Zementwerk Ofen' },
  'Steel and metals': { en: 'steel furnace reheating', pl: 'huta piec nagrzewczy', de: 'Stahlwerk Ofen Erwärmung' },
  Refinery: { en: 'refinery process heat', pl: 'rafineria ciepło procesowe', de: 'Raffinerie Prozesswärme' },
  Glass: { en: 'glass furnace', pl: 'hut szkła piec', de: 'Glaswerk Glasschmelzofen' },
  'Ceramics and bricks': { en: 'ceramic brick kiln', pl: 'ceramika cegielnia piec', de: 'Keramik Ziegelwerk Ofen' },
  'Sugar mills': { en: 'sugar mill boiler', pl: 'cukrownia kotłownia', de: 'Zuckerfabrik Kessel' },
  'Pulp and paper': { en: 'paper mill process steam', pl: 'papiernia para technologiczna', de: 'Papierfabrik Prozessdampf' },
  'Food, dairy, malt and breweries': { en: 'food brewery process steam', pl: 'browar para technologiczna', de: 'Brauerei Prozessdampf' },
  'Aluminium and non-ferrous metals': { en: 'aluminium furnace', pl: 'aluminium piec', de: 'Aluminium Ofen' },
  'Chemicals and process steam': { en: 'chemical plant process steam', pl: 'chemia para technologiczna', de: 'Chemiewerk Prozessdampf' },
};

export function generateQueries({ countries = ['PL','DE'], sectors = SECTORS, languages = ['en','pl','de'], signals = ['process heat','fuel switch','decarbonisation'] } = {}) {
  const queries = [];
  for (const country of countries) for (const sector of sectors) for (const language of languages) {
    const term = SECTOR_TERMS[sector]?.[language] || sector;
    const signal = SIGNAL_TERMS[language].find((item) => signals.some((wanted) => item.toLowerCase().includes(wanted.toLowerCase()))) || SIGNAL_TERMS[language][0];
    queries.push({ query: `${term} hydrogen ${signal} ${country === 'PL' ? 'Poland Polska' : 'Germany Deutschland'} industrial site ${OFFTAKER_QUERY_GUARD} ${BORDER_SCOPE}`, language, country, sector, signal, geography: BORDER_SCOPE });
  }
  return queries;
}

function distanceKm(a, b) {
  const latScale = 111.32; const lonScale = 111.32 * Math.cos(((a[0] + b[0]) / 2) * Math.PI / 180);
  return Math.sqrt(((a[0] - b[0]) * latScale) ** 2 + ((a[1] - b[1]) * lonScale) ** 2);
}
function pointToSegmentKm(point, start, end) {
  const latScale = 111.32; const lonScale = 111.32 * Math.cos(point[0] * Math.PI / 180);
  const px = point[1] * lonScale; const py = point[0] * latScale; const ax = start[1] * lonScale; const ay = start[0] * latScale; const bx = end[1] * lonScale; const by = end[0] * latScale;
  const dx = bx - ax; const dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return distanceKm(point, [((ay + t * dy) / latScale), ((ax + t * dx) / lonScale)]);
}
export function distanceToPolishGermanBorderKm(latitude, longitude) {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  const point = [Number(latitude), Number(longitude)];
  return Math.round(Math.min(...BORDER_POINTS.slice(0, -1).map((start, index) => pointToSegmentKm(point, start, BORDER_POINTS[index + 1]))) * 10) / 10;
}
export function checkGeography({ country, latitude, longitude }) {
  if (!['PL','DE'].includes(country)) return { eligible: false, status: 'outside_country', distanceToBorderKm: null, reason: 'Only Poland and Germany are in scope.' };
  const distance = distanceToPolishGermanBorderKm(latitude, longitude);
  if (distance === null) return { eligible: false, status: 'location_required', distanceToBorderKm: null, reason: 'Verified coordinates are required to enforce the 250 km border corridor.' };
  if (distance > 250) return { eligible: false, status: 'outside_radius', distanceToBorderKm: distance, reason: `Site is ${distance} km from the border; the maximum is 250 km.` };
  return { eligible: true, status: 'in_scope', distanceToBorderKm: distance, reason: 'Site is within the 250 km Polish-German border corridor.' };
}

function cleanUrl(value) { try { const url = new URL(value); url.hash = ''; return url.toString().replace(/\/$/, ''); } catch { return null; } }
const NON_COMPANY_CONTENT_HOSTS = /(^|\.)((doi\.org)|(mdpi\.com)|(sciencedirect\.com)|(catf\.us)|(frompollutiontosolution\.org)|(eurometal\.net)|(oecd\.org)|(fchea\.org)|(wikipedia\.org)|(dudkowiak\.com)|(cms\.law)|(think\.ing\.com)|(linkedin\.com)|(crunchbase\.com))$/i;
const NON_COMPANY_PATHS = /\/((resource|research|journal|article|publication|learning-center|expert-guides)(\/|$))/i;
export function isLikelyCompanyWebsite(result = {}) {
  const url = cleanUrl(result.url);
  if (!url) return { eligible: false, sourceType: 'invalid_url', reason: 'A valid URL is required.' };
  const parsed = new URL(url);
  if (NON_COMPANY_CONTENT_HOSTS.test(parsed.hostname) || NON_COMPANY_PATHS.test(parsed.pathname)) return { eligible: false, sourceType: 'non_company_content', reason: 'Publisher, research, consultancy, or generic content domain.' };
  return { eligible: true, sourceType: 'company_website_candidate', reason: 'Domain is not on the non-company content list; operator verification is still required.' };
}
export function normalizeProviderResult({ provider, query, searchDate, language, country, rawResponseReference, result, rank }) {
  return { provider, query, searchedAt: searchDate, rank, title: String(result.title || 'Untitled'), url: cleanUrl(result.url || result.link), snippet: String(result.snippet || result.description || result.text || ''), publicationDate: result.age || result.date || result.published_at || null, language, country, rawResponseReference };
}

export function normalizeBraveResponse(response, context) { return (response?.web?.results || []).map((result, index) => normalizeProviderResult({ ...context, result, rank: index + 1 })); }
export function normalizeSerpApiResponse(response, context) { return (response?.organic_results || []).map((result, index) => normalizeProviderResult({ ...context, result, rank: result.position || index + 1 })); }

export function deduplicateResults(results) {
  const seen = new Set(); const output = [];
  for (const result of results) {
    const url = cleanUrl(result.url || '') || '';
    const key = `${(result.title || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}|${url}`;
    if (!key || seen.has(key)) continue; seen.add(key); output.push(result);
  }
  return output.map((result, index) => ({ ...result, rank: index + 1 }));
}

const exclusions = [
  [/electrolyser|electrolyzer|fuel cell manufacturer|hydrogen producer|hydrogen supplier/i, 'Hydrogen producer or supplier'],
  [/pipeline|hydrogen core network|grid developer|infrastructure/i, 'Infrastructure or enabler'],
  [/association|cluster|consultant|consulting/i, 'Non-relevant'],
  [/bus|truck|refuelling|refueling|rail/i, 'Non-relevant'],
];
export function classifyResult(result) {
  const text = `${result.title} ${result.snippet}`;
  for (const [pattern, classification] of exclusions) if (pattern.test(text)) return classification;
  if (/hydrogen burner|fuel switch|hydrogen kiln|hydrogen furnace|Wasserstoffbrenner|Brennstoffwechsel/i.test(text)) return 'Strong fuel-switch candidate';
  if (/cement|steel|glass|refinery|sugar|paper|brewery|aluminium|chemical|ceramic|brick/i.test(text)) return 'Possible candidate';
  return 'Non-relevant';
}

export function scoreCandidate(candidate) {
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
  const text = `${candidate.process || ''} ${candidate.currentFuel || ''} ${candidate.latestFuelSwitchSignal || ''}`;
  const recent = candidate.signalDate && (Date.now() - Date.parse(candidate.signalDate)) <= 1000 * 60 * 60 * 24 * 730;
  const points = [
    [/cement|steel|furnace|kiln|boiler|refinery|glass|chemical|process heat/i,20], [/gas|coal|oil|fossil/i,15], [/hydrogen|fuel switch|decarbon/i,15], [recent ? /./ : /$^/,10], [candidate.hydrogenRequirementEstimate ? /./ : /$^/,10], [candidate.distanceToBorderKm != null ? /./ : /$^/,10], [candidate.operator && evidence.some((item) => item.evidenceType === 'Official company source') ? /./ : /$^/,10], [candidate.buyingDepartment ? /./ : /$^/,5], [candidate.expectedStartDate ? /./ : /$^/,5],
  ];
  const score = points.reduce((total, [pattern, value]) => total + (pattern.test(text) ? value : 0), 0);
  return { score: Math.min(100, score), confidence: score >= 70 && evidence.some((item) => item.verificationStatus === 'verified') ? 'High' : score >= 40 ? 'Medium' : 'Low' };
}

export function exportCandidates(candidates, format = 'json') {
  if (format === 'json') return JSON.stringify(candidates, null, 2);
  if (format === 'csv') { const fields = ['candidateId','company','plantSiteName','sector','country','primaryClassification','score','confidence','signalDate','sourceUrls']; return [fields.join(','), ...candidates.map((row) => fields.map((field) => JSON.stringify(Array.isArray(row[field]) ? row[field].join(' | ') : row[field] ?? '')).join(','))].join('\n'); }
  return candidates.map((row) => `## ${row.company} — ${row.plantSiteName}\n- Sector: ${row.sector}\n- Classification: ${row.primaryClassification}\n- Score: ${row.score}/100 (${row.confidence})\n- Evidence: ${(row.evidence || []).map((item) => item.summary).join(' | ') || 'Not yet verified'}\n- Sources: ${(row.sourceUrls || []).join(', ')}`).join('\n\n');
}

export function providerFromEnvironment(env = process.env, fetchImpl = fetch) {
  return {
    brave: env.BRAVE_SEARCH_API_KEY ? async (query) => { const url = new URL('https://api.search.brave.com/res/v1/web/search'); url.searchParams.set('q', String(query.query || '').slice(0, 600)); url.searchParams.set('count', '20'); url.searchParams.set('result_filter', 'web'); url.searchParams.set('operators', 'true'); url.searchParams.set('search_lang', query.language || 'en'); url.searchParams.set('country', query.country || 'DE'); url.searchParams.set('goggles', BRAVE_CONTENT_GOGGLE); const response = await fetchImpl(String(url), { headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY } }); if (!response.ok) throw new Error(`Brave Search failed (${response.status})`); return response.json(); } : null,
    serpapi: env.SERPAPI_API_KEY ? async (query) => { const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query.query)}&api_key=${encodeURIComponent(env.SERPAPI_API_KEY)}`; const response = await fetchImpl(url); if (!response.ok) throw new Error(`SerpApi failed (${response.status})`); return response.json(); } : null,
  };
}

export { LANGUAGES, SECTORS, CLASSIFICATIONS, BORDER_SCOPE, BORDER_SOURCE, OFFTAKER_QUERY_GUARD };
