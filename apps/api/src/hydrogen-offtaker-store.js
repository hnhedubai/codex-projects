import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { checkGeography, BORDER_SOURCE, classifyResult, isLikelyCompanyWebsite } from "./hydrogen-offtaker.js";

function normalize(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function cleanUrl(value) { try { const url = new URL(value); url.hash = ''; return url.toString().replace(/\/$/, ''); } catch { return null; } }
function screenResult(result) {
  const website = isLikelyCompanyWebsite(result);
  if (!website.eligible) return { jevVote: 'Reject', jevChoice: 'No official company website', jevScore: 0, sourceType: website.sourceType, companyWebsiteEligible: false, exclusionReason: website.reason };
  const classification = result.classification || classifyResult(result);
  if (['Hydrogen producer or supplier', 'Infrastructure or enabler', 'Non-relevant', 'Rejected'].includes(classification)) return { jevVote: 'Reject', jevChoice: classification, jevScore: 0, sourceType: website.sourceType, companyWebsiteEligible: true };
  if (classification === 'Strong fuel-switch candidate') return { jevVote: 'Verify', jevChoice: 'Strong fuel-switch signal; verify site, demand, and source', jevScore: 45, sourceType: website.sourceType, companyWebsiteEligible: true };
  return { jevVote: 'Hold', jevChoice: 'Industrial signal found; fuel use and hydrogen fit are unverified', jevScore: 25, sourceType: website.sourceType, companyWebsiteEligible: true };
}

export function createHydrogenCandidateStore({ filePath }) {
  let state = null;
  async function load() {
    if (state) return state;
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'));
      state = Array.isArray(parsed) ? { candidates: parsed, searchRuns: [], searchResults: [], jevRuns: [], jevScreenings: [] } : { candidates: parsed.candidates || [], searchRuns: parsed.searchRuns || [], searchResults: parsed.searchResults || [], jevRuns: parsed.jevRuns || [], jevScreenings: parsed.jevScreenings || [] };
      state.searchResults = state.searchResults.map((result) => ({ ...result, ...(() => { const website = isLikelyCompanyWebsite(result); return { companyWebsiteEligible: result.companyWebsiteEligible ?? website.eligible, sourceType: result.sourceType || website.sourceType }; })() }));
    } catch { state = { candidates: [], searchRuns: [], searchResults: [], jevRuns: [], jevScreenings: [] }; }
    return state;
  }
  async function persist() {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
  }
  return {
    async list() { return [...(await load()).candidates]; },
    async listSearchResults() { return [...(await load()).searchResults]; },
    async listSearchRuns() { return [...(await load()).searchRuns]; },
    async clearSearchHistory() {
      const current = await load();
      const removed = { searchRuns: current.searchRuns.length, searchResults: current.searchResults.length };
      current.searchRuns = [];
      current.searchResults = [];
      await persist();
      return removed;
    },
    async listJevRuns() { return [...(await load()).jevRuns]; },
    async listJevScreenings() { return [...(await load()).jevScreenings]; },
    async saveJevRun(run) {
      const current = await load();
      const jevRun = { ...run, createdAt: run.createdAt || new Date().toISOString(), resultCount: Array.isArray(run.screenings) ? run.screenings.length : 0 };
      current.jevRuns.push(jevRun);
      current.jevScreenings.push(...(Array.isArray(run.screenings) ? run.screenings : []));
      await persist();
      return { jevRun, screenings: run.screenings || [] };
    },
    async saveSearchRun(run) {
      const current = await load();
      const searchRunId = `HSR-${randomUUID()}`;
      const searchedAt = run.searchedAt || new Date().toISOString();
      const rawResponseReference = `${run.provider || 'provider'}:${searchedAt}:${searchRunId}`;
      const searchRun = { searchRunId, provider: run.provider || null, query: run.query || null, searchedAt, rawResponseReference, rawResponse: run.rawResponse ?? null, resultCount: Array.isArray(run.results) ? run.results.length : 0 };
      const results = (Array.isArray(run.results) ? run.results : []).map((result, index) => ({
        ...result,
        searchRunId,
        searchResultId: `HSR-${searchRunId}-${index + 1}`,
        rawResponseReference,
        searchedAt,
        ...screenResult(result),
        screeningStatus: 'screened',
      }));
      current.searchRuns.push(searchRun);
      current.searchResults.push(...results);
      await persist();
      return { searchRun, results };
    },
    async save(result) {
      const current = await load();
      const sourceUrl = cleanUrl(result?.url);
      if (!sourceUrl || !result?.title) { const error = new Error('A result title and valid source URL are required.'); error.status = 422; throw error; }
      const website = isLikelyCompanyWebsite({ ...result, url: sourceUrl });
      if (!website.eligible) { const error = new Error('Only likely official company/operator websites can be promoted to candidates. Preserve this result in search history instead.'); error.status = 422; throw error; }
      const geography = checkGeography({ country: result.country, latitude: result.latitude, longitude: result.longitude });
      if (!geography.eligible) { const error = new Error(geography.reason); error.status = 422; throw error; }
      const duplicate = current.candidates.find((candidate) => cleanUrl(candidate.sourceUrls?.[0]) === sourceUrl || (normalize(candidate.plantSiteName) === normalize(result.title) && candidate.country === result.country));
      if (duplicate) return { created: false, candidate: duplicate };
      const now = new Date().toISOString();
      const candidate = {
        candidateId: `HOF-${randomUUID()}`,
        company: result.company || result.title,
        plantSiteName: result.title,
        operator: null,
        sector: result.sector || null,
        process: null,
        country: result.country || null,
        region: null,
        city: null,
        fullAddress: null,
        latitude: null,
        longitude: null,
        nearestBorderCrossing: null,
        distanceToBorderKm: geography.distanceToBorderKm,
        currentFuel: null,
        annualFuelUse: null,
        annualFuelUseUnit: null,
        co2Emissions: null,
        hydrogenRequirementEstimate: null,
        hydrogenRequirementUnit: 'tonnes/day (estimate)',
        hydrogenRequirementBasis: 'Not estimated; source verification required',
        currentHydrogenUse: null,
        hydrogenPurity: null,
        hydrogenPressure: null,
        deliveryForm: null,
        deliveryRoute: null,
        expectedStartDate: null,
        buyingDepartment: null,
        primaryClassification: result.classification || 'Possible candidate',
        score: 0,
        confidence: 'Low',
        jevVote: 'Hold',
        jevChoice: 'Pending source verification',
        jevScore: null,
        jevEvaluation: { status: 'not_evaluated', version: '1.0', evaluatedAt: null, answers: {}, missingEvidence: ['Credible source verification', 'Industrial process and fuel evidence', 'Hydrogen volume estimate'] },
        latestFuelSwitchSignal: result.snippet || null,
        signalDate: result.publicationDate || null,
        signalSource: result.url,
        sourceUrls: [sourceUrl],
        notes: 'Saved from a live search result. Search snippet only; verify the site and evidence before qualification.',
        researchStatus: 'needs_source_verification',
        rejectionReason: null,
        createdDate: now,
        updatedDate: now,
        evidence: [{ sourceUrl, sourceTitle: result.title, publicationDate: result.publicationDate || null, accessDate: now, summary: result.snippet || 'No snippet supplied.', evidenceType: 'Search snippet only', verificationStatus: 'unverified' }],
        searchHistory: [{ provider: result.provider, query: result.query, searchedAt: result.searchedAt, rank: result.rank, rawResponseReference: result.rawResponseReference }],
        geographyStatus: geography.status,
        geographySource: BORDER_SOURCE,
      };
      current.candidates.push(candidate); await persist(); return { created: true, candidate };
    },
  };
}
