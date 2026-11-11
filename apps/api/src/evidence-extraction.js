import { officialDomains, safeOfficialUrl } from './parcel-discovery.js';

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/scrape';
const FIRECRAWL_V2_URL = 'https://api.firecrawl.dev/v2/scrape';
const evidenceSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    pageType: { type: 'string', enum: ['opportunity', 'tender', 'service', 'regulation', 'news', 'project', 'zone', 'other'] },
    projectOrAssetName: { type: 'string' },
    locationText: { type: 'string' },
    landUseLanguage: { type: 'string' },
    tenureLanguage: { type: 'string' },
    areaOrCapacity: { type: 'string' },
    infrastructureLanguage: { type: 'string' },
    statusText: { type: 'string' },
    deadlineText: { type: 'string' },
    eligibilityOrAction: { type: 'string' },
    contactOrganisation: { type: 'string' },
    documentUrls: { type: 'array', items: { type: 'string' } },
    evidenceExcerpt: { type: 'string' },
  },
  required: ['pageType', 'evidenceExcerpt'],
  additionalProperties: false,
};

const extractionPrompt = `Extract only source-backed facts relevant to an Oman land opportunity. Preserve the exact short evidence excerpt supporting the fields. Do not infer plot availability, allocation, ownership, power capacity, approval, or investment readiness. Use empty strings or an empty array when the page does not state a value. This is evidence extraction, not ranking or approval.`;
const companySchema = {
  type: 'object',
  properties: {
    business_category: { type: 'string', description: 'The page-stated industry or business category; use an empty string when absent.' },
    business_summary: { type: 'string', description: 'A brief page-stated description of what the organisation does; use an empty string when absent.' },
    business_intent: { type: 'string', description: 'The page-stated purpose or main customer offering; use an empty string when absent.' },
    future_direction: { type: 'string', description: 'Future plans or goals explicitly stated on the page; use an empty string when absent. Do not use a placeholder.' },
  },
  required: ['business_category', 'business_summary', 'business_intent', 'future_direction'],
  additionalProperties: false,
};

const omittedCompanyValues = new Set(['not explicitly stated', 'not stated', 'not available', 'unknown', 'n/a', 'na', 'none', 'null']);

function isOmittedCompanyValue(key, value) {
  const normalized = value.toLowerCase().replace(/[.!?]+$/, '').trim();
  if (omittedCompanyValues.has(normalized)) return true;
  return key === 'future_direction' && /\bnot (?:explicitly )?stated\b/i.test(normalized);
}

export function normalizeCompanyProfile(input) {
  const normalized = {};
  for (const key of ['business_category', 'business_summary', 'business_intent', 'future_direction']) {
    const value = clean(input?.[key], 5000);
    if (value && !isOmittedCompanyValue(key, value)) normalized[key] = value;
  }
  return normalized;
}

function clean(value, limit = 2000) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function markdown(value) {
  return typeof value === 'string' ? value.trim().slice(0, 500000) : '';
}

function jsonFromResponse(body) {
  if (body?.json && typeof body.json === 'object') return body.json;
  if (body?.data?.json && typeof body.data.json === 'object') return body.data.json;
  return {};
}

export function normalizeEvidence(body, sourceUrl) {
  const url = safeOfficialUrl(sourceUrl);
  if (!url) throw Object.assign(new Error('Evidence source must be an allowlisted HTTPS publisher URL.'), { status: 422 });
  const extracted = jsonFromResponse(body);
  const evidenceExcerpt = clean(extracted.evidenceExcerpt, 1000);
  if (!evidenceExcerpt) throw Object.assign(new Error('Evidence extraction returned no supporting excerpt.'), { status: 502 });
  return {
    sourceUrl: url,
    sourceDomain: new URL(url).hostname,
    title: clean(extracted.title, 300),
    pageType: clean(extracted.pageType, 50) || 'other',
    projectOrAssetName: clean(extracted.projectOrAssetName),
    locationText: clean(extracted.locationText),
    landUseLanguage: clean(extracted.landUseLanguage),
    tenureLanguage: clean(extracted.tenureLanguage),
    areaOrCapacity: clean(extracted.areaOrCapacity),
    infrastructureLanguage: clean(extracted.infrastructureLanguage),
    statusText: clean(extracted.statusText),
    deadlineText: clean(extracted.deadlineText),
    eligibilityOrAction: clean(extracted.eligibilityOrAction),
    contactOrganisation: clean(extracted.contactOrganisation),
    documentUrls: Array.isArray(extracted.documentUrls) ? extracted.documentUrls.filter(value => typeof value === 'string').slice(0, 20) : [],
    evidenceExcerpt,
    evidenceStrength: 'official_authority',
    validationStatus: 'validated_source_observation',
    extractedAt: new Date().toISOString(),
  };
}

export function createEvidenceExtractionAgent({ apiKey = process.env.FIRECRAWL_API_KEY, fetchImpl = fetch } = {}) {
  return {
    capabilities() { return { enabled: Boolean(apiKey), provider: 'firecrawl', maxPagesPerRequest: 1, allowedDomains: officialDomains }; },
    async fetchSource({ url, mode = 'markdown' }) {
      const safeUrl = safeOfficialUrl(url);
      if (!safeUrl) throw Object.assign(new Error('Source must be an allowlisted HTTPS publisher URL.'), { status: 422 });
      if (!apiKey) throw Object.assign(new Error('Source fetching needs FIRECRAWL_API_KEY on the server.'), { status: 409 });
      const companyMode = mode === 'company';
      const response = await fetchImpl(companyMode ? FIRECRAWL_V2_URL : FIRECRAWL_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          url: safeUrl,
          formats: companyMode ? ['markdown', { type: 'json', schema: companySchema }] : ['markdown'],
          onlyMainContent: true,
        }),
      });
      if (!response.ok) throw Object.assign(new Error('Official source fetch could not complete.'), { status: 502 });
      const body = await response.json();
      const data = body?.data && typeof body.data === 'object' ? body.data : body;
      const content = markdown(data?.markdown || data?.html || data?.content);
      if (!content) throw Object.assign(new Error('Official source fetch returned no page content.'), { status: 502 });
      return {
        sourceUrl: safeUrl,
        finalUrl: clean(data?.metadata?.url || data?.metadata?.sourceURL || safeUrl, 2000),
        statusCode: Number(data?.metadata?.statusCode || response.status || 200),
        contentType: 'text/markdown',
        content,
        extracted: companyMode ? normalizeCompanyProfile(jsonFromResponse(body)) : {},
        metadata: data?.metadata && typeof data.metadata === 'object' ? data.metadata : {},
        fetchedAt: new Date().toISOString(),
      };
    },
    async extract({ url }) {
      const safeUrl = safeOfficialUrl(url);
      if (!safeUrl) throw Object.assign(new Error('Evidence source must be an allowlisted HTTPS publisher URL.'), { status: 422 });
      if (!apiKey) throw Object.assign(new Error('Evidence extraction needs FIRECRAWL_API_KEY on the server.'), { status: 409 });
      const response = await fetchImpl(FIRECRAWL_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ url: safeUrl, formats: ['json'], onlyMainContent: true, jsonOptions: { prompt: extractionPrompt, schema: evidenceSchema } }),
      });
      if (!response.ok) throw Object.assign(new Error('Firecrawl validation could not complete.'), { status: 502 });
      return normalizeEvidence(await response.json(), safeUrl);
    },
  };
}
