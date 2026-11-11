export const JEV_FACTOR_WEIGHTS = Object.freeze({
  productMatch: 0.20,
  target: 0.15,
  volumeFit: 0.20,
  offtakeRecord: 0.20,
  binding: 0.10,
  siteFit: 0.10,
  realCompany: 0.05,
});

export const JEV_FACTOR_LABELS = Object.freeze({
  productMatch: 'Product match',
  target: 'Target',
  volumeFit: 'Volume fit',
  offtakeRecord: 'Offtake record',
  binding: 'Binding',
  siteFit: 'Site fit',
  realCompany: 'Real company',
});

export function buildJevQuestions() {
  return {
    vote: {
      type: 'choice',
      instructions: 'Which screening decision best fits this named company/site for a green-hydrogen offtake research pipeline?',
      criteria: {
        Shortlisted: 'A real industrial energy user in scope with strong evidence of hydrogen-compatible process heat or existing hydrogen use, and enough evidence to prioritize now. This is not confirmed demand.',
        Review: 'A potentially relevant industrial company/site, but current fuel, hydrogen use, volume, binding commitment, or exact site evidence is incomplete or ambiguous.',
        Rejected: 'A hydrogen producer/supplier, infrastructure or service enabler, transport project, association, non-relevant company, or a record without an identifiable industrial consuming site.',
      },
    },
    productMatch: { type: 'noul', instructions: 'Does the named company/site appear to be an industrial energy user whose process could potentially use externally supplied green hydrogen as fuel?', criteria: { true: 'A kiln, furnace, boiler, dryer, refinery, paper, glass, metal, chemical, food or similar industrial energy process is identified.', false: 'The record is a hydrogen supplier, producer, infrastructure/service provider, transport project, association, generic park, or no consuming process is identified.' } },
    target: { type: 'noul', instructions: 'Is this company/site within the target industrial sector scope for the Hydrogen Offtaker Finder?', criteria: { true: 'The named activity matches cement/lime, steel/metals, refinery, glass, ceramics, sugar, pulp/paper, food, aluminium/non-ferrous metals, or chemicals/process steam.', false: 'It is outside the target sectors or only a technology, consulting, logistics, infrastructure, association or supplier record.' } },
    volumeFit: { type: 'noul', instructions: 'Does the supplied state contain credible evidence that this site could take approximately 2–10 tonnes of hydrogen per day, alone or in combination?', criteria: { true: 'Fuel use, process scale, hydrogen use, or a project statement supports the target range.', false: 'No demand or fuel evidence is supplied; do not infer volume from company size, sector, or location alone.' } },
    offtakeRecord: { type: 'noul', instructions: 'Does the supplied state contain a credible public record of current hydrogen use, hydrogen blending, hydrogen burners, fuel-switch trials, or replacement of fossil fuel with hydrogen at this site?', criteria: { true: 'A site-specific public signal supports hydrogen use or fuel switching.', false: 'Only generic decarbonisation, a search lead, a supplier claim, or no site-specific hydrogen signal is present.' } },
    binding: { type: 'noul', instructions: 'Is there evidence of a binding or commercially advanced hydrogen, fuel-switch, carbon-contract, Innovation Fund, or equivalent site project?', criteria: { true: 'A contract, award, permit, announced investment, or named project indicates advanced commitment.', false: 'The record is exploratory, generic, historical, planned without commitment, or contains no binding evidence.' } },
    siteFit: { type: 'noul', instructions: 'Is the industrial site geographically suitable for the planned western-Poland hydrogen plant?', criteria: { true: 'The named site is in Poland or Germany and inside the 250 km Polish-German border corridor, with a usable site identity.', false: 'The location is missing, outside scope, only a broad zone without an exact plant, or otherwise cannot be delivery-screened.' } },
    realCompany: { type: 'noul', instructions: 'Is this an identifiable real company and industrial site rather than a generic zone, news item, supplier, association, project label, or ambiguous group?', criteria: { true: 'A named operator/company and site identity are present, with credible company or official source metadata.', false: 'The entry is generic, ambiguous, historical without current confirmation, or an excluded enabler.' } },
  };
}

function number(value) { return Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : 0; }
function answerNoul(answers, key) { return number(answers?.[key]?.noul); }

export function composeJevResult({ answers = {}, rawResponse = null, mode = 'live', evaluatedAt, runId, zoneId, zoneLabel, occupant }) {
  const factors = Object.fromEntries(Object.keys(JEV_FACTOR_WEIGHTS).map((key) => [key, answerNoul(answers, key)]));
  const weightedScore = Math.round(Object.entries(JEV_FACTOR_WEIGHTS).reduce((total, [key, weight]) => total + factors[key] * weight, 0) * 100);
  const answerChoice = answers?.vote?.choice;
  const jevChoice = ['Shortlisted', 'Review', 'Rejected'].includes(answerChoice) ? answerChoice : (weightedScore >= 70 ? 'Shortlisted' : weightedScore < 35 ? 'Rejected' : 'Review');
  const summary = `JEV: ${jevChoice} · ${Object.entries(factors).map(([key, value]) => `${JEV_FACTOR_LABELS[key]} ${value.toFixed(2)}`).join(' · ')}`;
  return { runId, zoneId, zoneLabel, company: occupant.company, industry: occupant.industry, websiteUrl: occupant.websiteUrl || null, linkedinUrl: occupant.linkedinUrl || null, jevVote: jevChoice, jevChoice, jevScore: weightedScore, jevFactors: factors, jevSummary: summary, jevMode: mode, jevModel: mode === 'live' ? (rawResponse?.model || 'jev-latest') : 'mock', evaluatedAt: evaluatedAt || new Date().toISOString(), rawResponse };
}

function mockAnswers(occupant, zone) {
  const text = `${occupant.company} ${occupant.industry} ${occupant.status}`;
  const excluded = /exclude|supplier|enabler|logistics|transport|service|association|producer\/supplier/i.test(text);
  const target = /paper|pulp|chemical|refin|glass|steel|metal|furnace|kiln|boiler|dryer|food|cement|gypsum|lithium|fibre|fiber|rubber|soda|fertil|alumin|biomethanol|power generation/i.test(text);
  const strong = /strong|process-industry|paper-process|high-temperature|industrial lead/i.test(occupant.status);
  const factors = {
    productMatch: excluded ? 0.04 : strong ? 0.78 : target ? 0.55 : 0.20,
    target: excluded ? 0.03 : target ? 0.82 : 0.18,
    volumeFit: /2-10|demand|fuel use|steam/i.test(text) ? 0.36 : 0.14,
    offtakeRecord: /hydrogen|fuel-switch|trial|blending/i.test(text) ? 0.28 : 0.04,
    binding: /contract|award|committed|investment/i.test(text) ? 0.25 : 0.06,
    siteFit: zone?.distanceKm <= 250 ? 0.84 : 0.10,
    realCompany: /tenants|production tenants|area|utilities|facilities/i.test(occupant.company) ? 0.45 : 0.91,
  };
  const vote = excluded ? 'Rejected' : factors.offtakeRecord >= 0.65 && factors.volumeFit >= 0.50 ? 'Shortlisted' : 'Review';
  return { vote: { choice: vote }, ...Object.fromEntries(Object.entries(factors).map(([key, value]) => [key, { noul: value }])) };
}

export async function evaluateJevCompany({ occupant, zone, apiKey, fetchImpl = fetch, runId, evaluatedAt = new Date().toISOString() }) {
  const state = { zone: { id: zone.id, label: zone.label, country: zone.country, distanceKm: zone.distanceKm, gisStatus: zone.gisStatus }, company: occupant };
  if (!apiKey) return composeJevResult({ answers: mockAnswers(occupant, zone), mode: 'mock', evaluatedAt, runId, zoneId: zone.id, zoneLabel: zone.label, occupant });
  const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ state, model: 'jev-latest', questions: buildJevQuestions() }) });
  if (!response.ok) throw new Error(`TypeSafe JEV failed (${response.status})`);
  const rawResponse = await response.json();
  return composeJevResult({ answers: rawResponse.answers, rawResponse, mode: 'live', evaluatedAt, runId, zoneId: zone.id, zoneLabel: zone.label, occupant });
}

