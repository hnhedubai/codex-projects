import fs from 'node:fs';
import { INDUSTRIAL_ZONES } from '../../web/public/hydrogen-zones.js';

for (const line of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
}

const excludedHosts = /(^|\.)(linkedin\.com|facebook\.com|instagram\.com|youtube\.com|wikipedia\.org|x\.com|reddit\.com|quora\.com|pinterest\.com|medium\.com|wordpress\.com|blogspot\.com|newswire\.com|prnewswire\.com|businesswire\.com|globenewswire\.com)$/i;

function isLinkedIn(url) { return /(^|\.)linkedin\.com\/company\//i.test(url); }
function isWebsite(url) {
  try { return /^https?:$/i.test(new URL(url).protocol) && !excludedHosts.test(new URL(url).hostname) && !/\/company\//i.test(url); } catch { return false; }
}

async function lookup(company) {
  const query = `${company} official website LinkedIn company`;
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('result_filter', 'web');
  url.searchParams.set('count', '10');
  try {
    const response = await fetch(url, { headers: { accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { company, websiteUrl: '', linkedinUrl: '', linkEvidenceStatus: `Brave lookup failed (${response.status})` };
    const payload = await response.json();
    const links = (payload.web?.results || []).map((result) => result.url).filter(Boolean);
    const linkedinUrl = links.find(isLinkedIn) || '';
    const websiteUrl = links.find(isWebsite) || '';
    return { company, websiteUrl, linkedinUrl, linkEvidenceStatus: websiteUrl || linkedinUrl ? 'Brave public result; verify exact legal entity and site' : 'No reliable public match found' };
  } catch (error) {
    return { company, websiteUrl: '', linkedinUrl: '', linkEvidenceStatus: `Brave lookup error: ${error.message}` };
  }
}

const companies = [...new Set(INDUSTRIAL_ZONES.flatMap((zone) => (zone.occupants || []).map((occupant) => occupant.company)))];
const results = [];
for (let index = 0; index < companies.length; index += 6) {
  results.push(...await Promise.all(companies.slice(index, index + 6).map(lookup)));
}
process.stdout.write(JSON.stringify(results));
