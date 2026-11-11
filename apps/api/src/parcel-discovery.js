// These are area leads, not advertised plots or evidence of power availability.
const catalogue = [
  { title: 'Khazaen Economic City', region: 'Muscat / Barka', url: 'https://www.opaz.gov.om/en/zones/khazaen-economic-city', summary: 'OPAZ identifies Khazaen in Barka and describes a plot-allocation application process.' },
  { title: 'Sohar Free Zone', region: 'Sohar', url: 'https://www.opaz.gov.om/en/zones/sohar-free-zone', summary: 'Official OPAZ zone profile. Start here to request a specific plot and confirm permitted use.' },
  { title: 'Special Economic Zone at Duqm', region: 'Duqm', url: 'https://www.opaz.gov.om/en/zones/special-economic-zone-at-duqm', summary: 'Official OPAZ zone profile. Start here to request a specific plot and utility feasibility.' },
].map(row => ({ ...row, publisher: 'OPAZ', sourceCheckedAt: '2026-10-05', kind: 'area_lead' }));

// Keep the country-code domains explicit: this permits the current Oman SOHAR
// public site while avoiding an unsafe wildcard that would trust any .om host.
export const officialDomains = ['opaz.gov.om', 'duqm.gov.om', 'khazaen.om', 'soharportandfreezone.com', 'soharportandfreezone.om', 'madayn.om', 'mtcit.gov.om', 'ita.gov.om', 'omandatapark.com', 'omantel.om'];
export const discoveryAgents = ['IntentAgent', 'ExaSearchAgent', 'UniquenessAgent', 'SourceFetchAgent', 'EvidenceExtractionAgent', 'SiteIdentificationAgent', 'AllocationAgent', 'UtilityEvidenceAgent', 'AuthorityContactAgent', 'ConflictAgent', 'OpportunityAssemblerAgent', 'RankingAgent'];
export function safeOfficialUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    if (!officialDomains.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function normalizedEvidence(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
}

function contactCandidates(body, sourceUrl) {
  const rows = Array.isArray(body?.results) ? body.results : [];
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
  const phonePattern = /(?:\+968|00968)\s?[2679]\d{3}\s?\d{4}|(?:\+?\d[\d\s().-]{7,}\d)/g;
  const linkedinPattern = /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/ig;
  const hostname = new URL(sourceUrl).hostname;
  const unique = new Map();
  for (const row of rows) {
    const text = `${row.title || ''} ${row.text || ''} ${(row.highlights || []).join(' ')}`.replace(/\s+/g, ' ').trim();
    const emails = [...new Set((text.match(emailPattern) || []).map(value => value.toLowerCase()))];
    const phones = [...new Set((text.match(phonePattern) || []).map(value => value.replace(/\s+/g, ' ').trim()).filter(value => value.replace(/\D/g, '').length >= 8))];
    const linkedinUrl = (text.match(linkedinPattern) || [])[0] || '';
    const resultUrl = safeOfficialUrl(row.url) || sourceUrl;
    const role = /investment|investor|business development/i.test(text) ? 'Investment / business development' : /land|allocation|plot|lease|usufruct/i.test(text) ? 'Land allocation / leasing route' : /contact|customer|support|service/i.test(text) ? 'Public contact route' : 'Authority route';
    const organisation = hostname.replace(/^www\./, '');
    const contacts = emails.length || phones.length ? [...emails.map(email => ({ email, phone: phones[0] || '', linkedinUrl })), ...phones.slice(1).map(phone => ({ email: emails[0] || '', phone, linkedinUrl }))] : [{ email: '', phone: '', linkedinUrl }];
    for (const contact of contacts) {
      const key = `${contact.email}|${contact.phone}|${resultUrl}`;
      if (!unique.has(key)) unique.set(key, { ...contact, organisation, role, sourceUrl: resultUrl, evidenceExcerpt: text.slice(0, 1000), confidence: contact.email || contact.phone ? 0.85 : 0.55 });
    }
  }
  return [...unique.values()].slice(0, 20).map((contact, index) => ({ ...contact, rank: index + 1 }));
}

export function deduplicateDiscoveryResults(results) {
  const seenUrls = new Set();
  const seenContent = new Set();
  return results.filter((row) => {
    const url = safeOfficialUrl(row.url);
    if (!url || seenUrls.has(url)) return false;
    seenUrls.add(url);
    const title = normalizedEvidence(row.title);
    const excerpt = normalizedEvidence(row.evidenceExcerpt || row.summary);
    // A long identical title + excerpt is the same source content even when
    // a publisher exposes it through more than one attachment or route.
    if (title && excerpt.length >= 120) {
      const contentKey = `${new URL(url).hostname}|${title}|${excerpt}`;
      if (seenContent.has(contentKey)) return false;
      seenContent.add(contentKey);
    }
    return true;
  });
}

export function buildLandSearchQuery(input) {
  const criteria = input.landCriteria && typeof input.landCriteria === 'object' ? input.landCriteria : {};
  const landUse = criteria.landUse || input.keywords || 'data centre';
  const tokens = ['Oman', input.region, landUse, criteria.zone, criteria.plotAreaMinSqm ? `${criteria.plotAreaMinSqm} square metre plot` : '', criteria.tenureRoute && criteria.tenureRoute !== 'any' ? criteria.tenureRoute : ''];
  if (Array.isArray(criteria.utilities)) tokens.push(...criteria.utilities.map(value => `${value} infrastructure`));
  tokens.push('land plot site');
  return tokens.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function createParcelDiscovery({ query, apiKey = process.env.EXA_API_KEY, fetchImpl = fetch, evidenceAgent = null, sourceFetcher = null, eventBus = null, contactVerificationWorker = null }) {
  const queueTails = new Map();
  const queues = new Map();
  let queueSequence = 0;
  const liveRuns = new Set();
  const controlState = new Map();
  const discardedState = new Set();
  const operationControllers = new Map();
  const contactsCache = new Map();
  const contactCacheLimit = 256;
  const controlKey = (projectId, researcherId) => `${researcherId}:${projectId}`;
  const discardKey = (runId, researcherId, agent) => `${researcherId}:${runId}:${agent}`;
  const queueKey = (projectId, researcherId) => `${researcherId}:${projectId}`;
  const cachedContactPage = (cacheKey) => {
    const cached = contactsCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      contactsCache.delete(cacheKey);
      return null;
    }
    contactsCache.delete(cacheKey);
    contactsCache.set(cacheKey, cached);
    return cached.value;
  };
  const cacheContactPage = (cacheKey, value) => {
    const now = Date.now();
    for (const [key, cached] of contactsCache) {
      if (cached.expiresAt <= now) contactsCache.delete(key);
    }
    contactsCache.delete(cacheKey);
    while (contactsCache.size >= contactCacheLimit) contactsCache.delete(contactsCache.keys().next().value);
    contactsCache.set(cacheKey, { value, expiresAt: now + 15000 });
  };
  const normalizedControls = (enabledAgents) => discoveryAgents.filter(agent => Array.isArray(enabledAgents) && enabledAgents.includes(agent));
  const configuredSourceFetcher = sourceFetcher || (evidenceAgent?.capabilities?.()?.enabled && typeof evidenceAgent.fetchSource === 'function'
    ? evidenceAgent.fetchSource.bind(evidenceAgent)
    : null);
  const runContactAgent = async (runId, index, candidate, researcherId) => {
    if (!apiKey) throw Object.assign(new Error('Contact discovery needs EXA_API_KEY on the server.'), { status: 409 });
    const safeUrl = safeOfficialUrl(candidate.url);
    if (!safeUrl) throw Object.assign(new Error('Contact discovery requires an allowlisted official source.'), { status: 422 });
    const domain = new URL(safeUrl).hostname;
    const queryText = `${candidate.title || domain} Oman land allocation authority contact email phone`;
    emit(runId, 'AuthorityContactAgent', 'working', `Collecting public contacts for ${domain}.`, { researcherId, action: 'search_contacts', operation: 'exa.search', target: domain, next: 'Persist deduplicated contact profiles.' });
    const response = await fetchImpl('https://api.exa.ai/search', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ query: queryText, type: 'auto', numResults: 10, includeDomains: [domain], contents: { text: { maxCharacters: 2000 } } }) });
    if (!response.ok) throw Object.assign(new Error('Authority contact search could not complete.'), { status: 502 });
    const contacts = contactCandidates(await response.json(), safeUrl);
    const batch = contacts.map(contact => ({
      resultIndex: index,
      contactType: 'authority_route',
      organisation: contact.organisation,
      department: '',
      personName: '',
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      websiteUrl: safeUrl,
      linkedinUrl: contact.linkedinUrl,
      sourceUrl: contact.sourceUrl,
      evidenceExcerpt: contact.evidenceExcerpt,
      confidence: contact.confidence,
      verificationStatus: 'official_source_observation',
      rank: contact.rank,
    }));
    const { rows: saved } = await query(
      'select * from tracker.record_discovery_contacts($1,$2,$3)',
      [runId, researcherId, JSON.stringify(batch)],
    );
    const verificationKick = contactVerificationWorker?.kick?.();
    if (verificationKick) void verificationKick.catch(() => {});
    emit(runId, 'AuthorityContactAgent', 'output_saved', `${saved.length || contacts.length} public contact routes recorded.`, { researcherId, action: 'save_output', operation: 'db.record_discovery_contacts', target: runId, resultIndex: index, recordCount: saved.length || contacts.length, changedRecordIds: saved.map(row => row.id).filter(Boolean), next: 'Continue with the next lead.' });
    return saved.length ? saved : contacts;
  };
  const waitForGate = async ({ projectId, researcherId, runId, agent, enabledAgents, waitForControls }) => {
    if (discardedState.has(discardKey(runId, researcherId, agent))) return false;
    const enabled = () => waitForControls
      ? (controlState.get(controlKey(projectId, researcherId)) || []).includes(agent)
      : enabledAgents.includes(agent);
    if (enabled()) return true;
    emit(runId, agent, 'blocked', `${agent} is paused. Enable it to continue this run.`, { researcherId, action: 'paused', operation: 'agent.control', target: projectId, next: `Enable ${agent}.` });
    if (!waitForControls) return false;
    while (waitForControls) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (discardedState.has(discardKey(runId, researcherId, agent))) return false;
      if (enabled()) {
        emit(runId, agent, 'woke', `${agent} enabled; continuing the run.`, { researcherId, action: 'resume', operation: 'agent.control', target: projectId, next: 'Perform the agent task.' });
        return true;
      }
    }
    return false;
  };
  const emit = (runId, agent, phase, detail, metadata = {}) => eventBus?.publish({ runId, agent, phase, detail, ...metadata });
  const queueStatus = (projectId, researcherId) => (queues.get(queueKey(projectId, researcherId)) || []).map((entry, index) => ({ queueId: entry.queueId, position: index + 1, status: entry.status, runId: entry.runId || null, intentId: entry.intentId, mode: entry.mode, region: entry.region, targetItLoadMw: entry.targetItLoadMw, createdAt: entry.createdAt }));
  const criteriaObject = value => value && typeof value === 'object' ? value : (() => { try { return JSON.parse(value || '{}'); } catch { return {}; } })();
  return {
    capabilities() { return { liveSearch: Boolean(apiKey), evidenceExtraction: Boolean(evidenceAgent?.capabilities?.().enabled), catalogueCount: catalogue.length }; },
    async contactsSyncState(researcherId) {
      const { rows: [rollup] } = await query(`select total_count, latest_created_at, refreshed_at
        from tracker_read.v_discovery_contact_rollups where researcher_id=$1`, [researcherId]);
      return {
        totalCount: Number(rollup?.total_count || 0),
        snapshotAt: rollup?.latest_created_at || null,
        syncToken: rollup?.refreshed_at || null,
      };
    },
    async listContacts(researcherId, { since = null, limit = null, offset = null, sortKey = null, sortDirection = 'asc' } = {}) {
      const sinceDate = since && Number.isFinite(Date.parse(since)) ? new Date(since).toISOString() : null;
      const requestedLimit = limit === null || limit === undefined || limit === '' ? 25 : Number(limit);
      if (![25, 50, 100].includes(requestedLimit)) {
        throw Object.assign(new Error('Contact page size must be 25, 50, or 100.'), { status: 422 });
      }
      const pageLimit = requestedLimit;
      const pageOffset = Number.isInteger(Number(offset)) ? Math.min(1000000, Math.max(0, Number(offset))) : 0;
      const sortColumns = { organisation: 'organisation', person_name: 'person_name', role: 'role', department: 'department', email: 'email', phone: 'phone', contact_type: 'contact_type', confidence: 'confidence', verification_status: 'verification_status', email_verification_status: 'email_verification_status', email_verification_score: 'email_verification_score', email_verification_checked_at: 'email_verification_checked_at', email_next_verification_at: 'email_next_verification_at', evidence_excerpt: 'evidence_excerpt', website_url: 'website_url', linkedin_url: 'linkedin_url', source_url: 'source_url', rank: 'rank', created_at: 'created_at' };
      const orderColumn = sortColumns[sortKey] || 'created_at';
      const orderDirection = sortDirection === 'desc' ? 'desc' : 'asc';
      const { rows: [rollup] } = await query(`select total_count, latest_created_at,
        contact_type_counts, organisation_counts, verification_status_counts, refreshed_at
        from tracker_read.v_discovery_contact_rollups where researcher_id=$1`, [researcherId]);
      const rollupToken = rollup?.refreshed_at ? new Date(rollup.refreshed_at).toISOString() : 'empty';
      const cacheKey = `${researcherId}:${rollupToken}:${sinceDate || 'full'}:${pageLimit || 'all'}:${pageOffset}:${orderColumn}:${orderDirection}`;
      const cached = cachedContactPage(cacheKey);
      if (cached) return cached;
      const { rows } = await query(
        'select * from tracker_read.list_discovery_contacts($1,$2,$3,$4,$5,$6)',
        [researcherId, pageLimit, pageOffset, sinceDate, orderColumn, orderDirection],
      );
      const value = {
        contacts: rows,
        totalCount: Number(rollup?.total_count || 0),
        summary: rollup ? {
          contactTypeCounts: rollup.contact_type_counts || {},
          organisationCounts: rollup.organisation_counts || {},
          verificationStatusCounts: rollup.verification_status_counts || {},
        } : null,
        offset: pageOffset,
        limit: pageLimit,
        snapshotAt: rollup?.latest_created_at || sinceDate || new Date().toISOString(),
        syncToken: rollup?.refreshed_at || null,
        delta: Boolean(sinceDate),
      };
      cacheContactPage(cacheKey, value);
      return value;
    },
    agentControls(projectId, researcherId) {
      const enabledAgents = controlState.get(controlKey(projectId, researcherId)) || [];
      return { projectId, agents: discoveryAgents.map(name => ({ name, enabled: enabledAgents.includes(name) })), enabledAgents };
    },
    queueStatus,
    async discardAgent(runId, researcherId, agent) {
      if (!discoveryAgents.includes(agent)) throw Object.assign(new Error('Unknown agent.'), { status: 422 });
      const { rows: [run] } = await query('select id, research_project_id from tracker_read.v_discovery_runs where id=$1 and researcher_id=$2', [runId, researcherId]);
      if (!run) throw Object.assign(new Error('Select a run you own.'), { status: 422 });
      discardedState.add(discardKey(runId, researcherId, agent));
      operationControllers.get(discardKey(runId, researcherId, agent))?.abort();
      emit(runId, agent, 'discarded', `${agent} operation discarded for this run.`, { researcherId, action: 'discard', operation: 'agent.control', target: runId, next: 'No output will be handed to the next agent.' });
      return { runId, agent, discarded: true };
    },
    setAgentControls(projectId, researcherId, enabledAgents) {
      const normalized = normalizedControls(enabledAgents);
      controlState.set(controlKey(projectId, researcherId), normalized);
      return this.agentControls(projectId, researcherId);
    },
    async resumeStalledRuns(projectId, researcherId) {
      const { rows } = await query('select * from tracker_read.v_discovery_runs where research_project_id=$1 and researcher_id=$2 and status=\'running\' order by created_at asc', [projectId, researcherId]);
      const key = queueKey(projectId, researcherId);
      const queue = queues.get(key) || [];
      for (const run of rows) {
        if (liveRuns.has(run.id) || queue.some(entry => entry.runId === run.id)) continue;
        const criteria = criteriaObject(run.criteria);
        const input = { ...criteria, researchProjectId: run.research_project_id, intentId: run.intent_id, mode: run.tool, region: criteria.region || 'All Oman', keywords: criteria.keywords || '', targetItLoadMw: Number(criteria.targetItLoadMw), enabledAgents: controlState.get(key) || [], waitForControls: true };
        const entry = { queueId: `resume-${run.id}`, projectId, researcherId, intentId: run.intent_id, mode: run.tool, region: input.region, targetItLoadMw: input.targetItLoadMw, status: 'queued', runId: run.id, createdAt: run.created_at };
        queue.push(entry);
        const previous = queueTails.get(key) || Promise.resolve();
        const task = previous.catch(() => {}).then(() => { entry.status = 'running'; return this.executeSearch(input, researcherId, entry, run); }).finally(() => {
          const current = queues.get(key) || [];
          queues.set(key, current.filter(item => item !== entry));
          if (queueTails.get(key) === task) queueTails.delete(key);
          liveRuns.delete(run.id);
        });
        queueTails.set(key, task);
      }
      queues.set(key, queue);
      return queueStatus(projectId, researcherId);
    },
    async history(projectId, researcherId) {
      const runs = await query('select * from tracker_read.list_discovery_runs($1,$2,$3,$4)', [projectId, researcherId, 30, 0]);
      const promotions = await query('select * from tracker_read.list_discovery_promotions($1,$2,$3,$4)', [projectId, researcherId, 200, 0]);
      const evidence = await query('select * from tracker_read.list_discovery_evidence($1,$2,$3,$4)', [projectId, researcherId, 200, 0]);
      return { runs: runs.rows, promotions: promotions.rows, evidence: evidence.rows };
    },
    async search(input, researcherId) {
      const key = queueKey(input.researchProjectId, researcherId);
      const entry = { queueId: `q-${++queueSequence}`, projectId: input.researchProjectId, researcherId, intentId: input.intentId, mode: input.mode, region: input.region, targetItLoadMw: input.targetItLoadMw, status: 'queued', createdAt: new Date().toISOString() };
      const queue = queues.get(key) || [];
      queue.push(entry);
      queues.set(key, queue);
      const previous = queueTails.get(key) || Promise.resolve();
      const task = previous.catch(() => {}).then(() => { entry.status = 'running'; return this.executeSearch(input, researcherId, entry); }).finally(() => {
        const current = queues.get(key) || [];
        queues.set(key, current.filter(item => item !== entry));
        if (entry.runId) liveRuns.delete(entry.runId);
        if (queueTails.get(key) === task) queueTails.delete(key);
      });
      queueTails.set(key, task);
      return task;
    },
    async executeSearch(input, researcherId, queueEntry, existingRun = null) {
      if (input.mode === 'exa' && !apiKey) throw Object.assign(new Error('Live web search needs EXA_API_KEY in this app’s server environment. Saved official sources remain available.'), { status: 409 });
        const waitForControls = input.waitForControls === true;
        const enabledAgents = Array.isArray(input.enabledAgents)
          ? normalizedControls(input.enabledAgents)
          : discoveryAgents.slice();
        const searchQuery = buildLandSearchQuery(input);
        const { rows: [run] } = existingRun
          ? { rows: [existingRun] }
          : await query('select * from tracker.start_discovery($1,$2,$3,$4,$5,$6)', [input.researchProjectId,input.intentId,researcherId,input.mode,searchQuery,JSON.stringify(input)]);
        queueEntry.runId = run.id;
        liveRuns.add(run.id);
        const intentReady = await waitForGate({ projectId: input.researchProjectId, researcherId, runId: run.id, agent: 'IntentAgent', enabledAgents, waitForControls });
        if (!intentReady) {
          const blocked = 'IntentAgent is paused. Enable it before starting a search.';
          const { rows: [finished] } = await query('select * from tracker.finish_discovery($1,$2,$3)', [run.id, JSON.stringify([]), blocked]);
          return finished;
        }
        const { rows: [savedIntent] } = await query('select id, research_project_id, created_by, goal, opportunity_kind, geography, sector, criteria, exclusions, priority from tracker_read.v_intent_requests where id=$1 and research_project_id=$2 and created_by=$3 and status=\'active\'', [input.intentId, input.researchProjectId, researcherId]);
        if (!savedIntent) {
          const blocked = 'IntentAgent could not retrieve the saved intent.';
          const { rows: [finished] } = await query('select * from tracker.finish_discovery($1,$2,$3)', [run.id, JSON.stringify([]), blocked]);
          return finished;
        }
        const savedCriteria = criteriaObject(savedIntent.criteria);
        const normalized = { goal: String(savedIntent.goal || '').trim(), geography: String(savedIntent.geography || '').trim(), opportunityKind: savedIntent.opportunity_kind, sector: savedIntent.sector || null, criteria: savedCriteria, exclusions: savedIntent.exclusions || null, priority: savedIntent.priority || 'normal' };
        emit(run.id, 'IntentAgent', 'woke', 'Loaded the saved research requirement.', { researcherId, action: 'load_intent', operation: 'db.retrieve_intent', target: input.intentId, next: 'Normalize the saved requirement.' });
        emit(run.id, 'IntentAgent', 'working', 'Normalizing geography, land use and target IT load.', { researcherId, action: 'normalize_requirement', operation: 'schema.intent', target: input.intentId, next: 'Wake ExaSearchAgent.' });
        emit(run.id, 'IntentAgent', 'output_saved', 'Normalized requirement is ready for source search.', { researcherId, action: 'save_output', operation: 'schema.normalized_intent', target: input.intentId, normalized, next: 'Wake ExaSearchAgent.' });
        emit(run.id, 'IntentAgent', 'sleeping', 'Waiting for the next research run.', { researcherId, action: 'sleep', next: 'New research run.' });
        const exaReady = await waitForGate({ projectId: input.researchProjectId, researcherId, runId: run.id, agent: 'ExaSearchAgent', enabledAgents, waitForControls });
        if (!exaReady) {
          const blocked = 'ExaSearchAgent is paused. Enable it before starting a search.';
          const { rows: [finished] } = await query('select * from tracker.finish_discovery($1,$2,$3)', [run.id, JSON.stringify([]), blocked]);
          return finished;
        }
        emit(run.id, 'ExaSearchAgent', 'woke', 'Accepted the saved Oman land intent.', { researcherId, action: 'load_intent', operation: 'db.retrieve_intent', target: input.researchProjectId, next: 'Build the bounded official-source query.' });
        emit(run.id, 'ExaSearchAgent', 'working', `Searching official sources for ${input.targetItLoadMw} MW.`, { researcherId, action: 'build_query', operation: 'query_builder', target: input.region, next: 'Call Exa with the saved criteria.' });
        let results = [], error = null, activeControllerKey = null;
        try {
          if (input.mode === 'official_catalogue') {
            results = catalogue.filter(row => input.region === 'All Oman' || row.region === input.region);
            if (input.keywords) results = results.filter(row => `${row.title} ${row.summary} ${row.region}`.toLowerCase().includes(input.keywords.toLowerCase()));
          } else {
            const controllerKey = discardKey(run.id, researcherId, 'ExaSearchAgent');
            activeControllerKey = controllerKey;
            const controller = new AbortController(); operationControllers.set(controllerKey, controller);
            const response = await fetchImpl('https://api.exa.ai/search', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]), body: JSON.stringify({query: searchQuery, type: 'auto', numResults: 8, includeDomains: officialDomains, contents: { text: { maxCharacters: 1000 } }}) });
            if (!response.ok) throw new Error('provider');
            const body = await response.json();
            emit(run.id, 'ExaSearchAgent', 'provider_called', 'Exa response received.', { researcherId, action: 'receive_provider_response', operation: 'exa.search', recordCount: body.results.length, next: 'Normalize and deduplicate source records.' });
            if (!Array.isArray(body.results)) throw new Error('shape');
            for (const row of body.results.slice(0,8)) {
              const url = safeOfficialUrl(row.url);
              if (!url) continue;
              const excerpt = String(row.text || row.highlights?.[0] || '').replace(/\\s+/g, ' ').trim().slice(0, 500);
              results.push({ title: String(row.title || new URL(url).hostname).slice(0,200), url, region: input.region, publisher: new URL(url).hostname, kind: 'unreviewed_source', summary: excerpt || 'Search result only. Open and review the source before identifying a physical parcel.', evidenceExcerpt: excerpt || null, publishedDate: row.publishedDate || null, author: row.author || null, rank: results.length + 1, retrievedAt: new Date().toISOString() });
            }
          }
        } catch { error = discardedState.has(discardKey(run.id, researcherId, 'ExaSearchAgent')) ? 'ExaSearchAgent operation discarded.' : 'Live search could not complete. Check the provider configuration or try again. No results were fabricated.'; }
        finally { if (activeControllerKey) operationControllers.delete(activeControllerKey); }
        if (!error) emit(run.id, 'ExaSearchAgent', 'output_staged', `${results.length} raw source records staged for the uniqueness checkpoint.`, { researcherId, action: 'stage_output', operation: 'db.stage_discovery_output', recordCount: results.length, next: 'Wake UniquenessAgent.' });
        const uniquenessReady = error ? false : await waitForGate({ projectId: input.researchProjectId, researcherId, runId: run.id, agent: 'UniquenessAgent', enabledAgents, waitForControls });
        if (!error && !uniquenessReady) error = 'UniquenessAgent is paused. Source results were not handed over.';
        const uniqueResults = error ? [] : deduplicateDiscoveryResults(results).map((result, index) => ({ ...result, rank: index + 1 }));
        if (!error) {
          emit(run.id, 'UniquenessAgent', 'woke', 'Received the staged ExaSearchAgent output.', { researcherId, action: 'load_previous_output', operation: 'db.retrieve_staged_output', target: run.id, next: 'Check URL and content uniqueness.' });
          emit(run.id, 'UniquenessAgent', 'working', 'Checking duplicate URLs and source content.', { researcherId, action: 'deduplicate', operation: 'query_builder', target: run.id, next: 'Persist the unique source set.' });
          emit(run.id, 'UniquenessAgent', 'output_saved', `${uniqueResults.length} unique source records confirmed.`, { researcherId, action: 'save_output', operation: 'db.finish_discovery', target: run.id, recordCount: uniqueResults.length, next: 'Wake the next enabled agent.' });
          emit(run.id, 'UniquenessAgent', 'sleeping', 'Waiting for the next hand-off.', { researcherId, action: 'sleep', next: 'Next enabled research agent.' });
        }
        if (!error && uniqueResults.length && configuredSourceFetcher) {
          const sourceReady = await waitForGate({ projectId: input.researchProjectId, researcherId, runId: run.id, agent: 'SourceFetchAgent', enabledAgents, waitForControls });
          if (!sourceReady) {
            error = 'SourceFetchAgent is paused. Unique sources were not handed over.';
          } else {
            emit(run.id, 'SourceFetchAgent', 'woke', `Received ${uniqueResults.length} unique source${uniqueResults.length === 1 ? '' : 's'}.`, { researcherId, action: 'load_previous_output', operation: 'db.retrieve_staged_output', target: run.id, recordCount: uniqueResults.length, next: 'Fetch each official source.' });
            for (const [index, candidate] of uniqueResults.entries()) {
              if (discardedState.has(discardKey(run.id, researcherId, 'SourceFetchAgent'))) {
                error = 'SourceFetchAgent operation discarded.';
                break;
              }
              emit(run.id, 'SourceFetchAgent', 'working', `Fetching source ${index + 1} of ${uniqueResults.length}.`, { researcherId, action: 'fetch_source', operation: 'firecrawl.scrape', target: candidate.url, resultIndex: index, next: 'Persist the fetched source and hand it to EvidenceExtractionAgent.' });
              try {
                const fetched = await configuredSourceFetcher({ url: candidate.url });
                const { rows: [saved] } = await query('select * from tracker.record_discovery_source_fetch($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [run.id, index, researcherId, fetched.sourceUrl || candidate.url, fetched.finalUrl || candidate.url, fetched.statusCode || 200, fetched.contentType || 'text/markdown', fetched.content || '', JSON.stringify({ ...(fetched.metadata || {}), fetchedAt: fetched.fetchedAt || new Date().toISOString() }), null]);
                emit(run.id, 'SourceFetchAgent', 'output_saved', `Source ${index + 1} fetched and persisted.`, { researcherId, action: 'save_output', operation: 'db.record_discovery_source_fetch', target: saved?.id || candidate.url, resultIndex: index, next: 'Wake EvidenceExtractionAgent.' });
              } catch (fetchError) {
                const detail = fetchError?.message || 'Official source fetch failed.';
                await query('select * from tracker.record_discovery_source_fetch($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [run.id, index, researcherId, candidate.url, candidate.url, null, null, '', JSON.stringify({ fetchedAt: new Date().toISOString() }), detail]).catch(() => {});
                emit(run.id, 'SourceFetchAgent', 'failed', detail, { researcherId, action: 'record_failure', operation: 'db.record_discovery_source_fetch', target: candidate.url, resultIndex: index, next: 'Continue with the next unique source.' });
              }
            }
            emit(run.id, 'SourceFetchAgent', 'sleeping', 'Waiting for the next unique source set.', { researcherId, action: 'sleep', next: 'New research run.' });
          }
        } else if (!error) {
          emit(run.id, 'SourceFetchAgent', 'skipped', 'Source fetching is not configured on this server; unique sources remain available for manual review.', { researcherId, action: 'not_configured', operation: 'agent.capabilities', target: run.id, next: 'Configure FIRECRAWL_API_KEY to enable source fetching.' });
        }
        if (!error && uniqueResults.length && apiKey) {
          const contactsReady = await waitForGate({ projectId: input.researchProjectId, researcherId, runId: run.id, agent: 'AuthorityContactAgent', enabledAgents, waitForControls });
          if (!contactsReady) error = 'AuthorityContactAgent is paused. Contact records were not populated.';
          else {
            emit(run.id, 'AuthorityContactAgent', 'woke', `Received ${uniqueResults.length} leads for contact discovery.`, { researcherId, action: 'load_previous_output', operation: 'db.retrieve_staged_output', target: run.id, recordCount: uniqueResults.length, next: 'Find public authority contacts.' });
            for (const [index, candidate] of uniqueResults.entries()) {
              try { await runContactAgent(run.id, index, candidate, researcherId); }
              catch (contactError) { emit(run.id, 'AuthorityContactAgent', 'failed', contactError?.message || 'Contact search failed.', { researcherId, action: 'record_failure', operation: 'db.record_discovery_contact', target: candidate.url, resultIndex: index, next: 'Continue with the next lead.' }); }
            }
            emit(run.id, 'AuthorityContactAgent', 'sleeping', 'All discovered leads have been processed.', { researcherId, action: 'sleep', next: 'New research run.' });
          }
        }
        const { rows: [finished] } = await query('select * from tracker.finish_discovery($1,$2,$3)', [run.id,JSON.stringify(error ? [] : uniqueResults),error]);
        if (error) emit(run.id, 'ExaSearchAgent', 'failed', error, { researcherId, action: 'record_failure', operation: 'db.finish_discovery', recordCount: 0, next: 'Retry the run after configuration is fixed.' });
        emit(run.id, 'ExaSearchAgent', 'sleeping', 'Waiting for the next run.', { researcherId, action: 'sleep', next: 'New research run.' });
        return finished;
    },
    async promote(input, researcherId) {
      const { rows: [row] } = await query('select tracker.promote_discovery($1,$2,$3,$4,$5) as id', [input.runId,input.index,input.name,input.location,researcherId]);
      return row;
    },
    async discoverContacts(input, researcherId) {
      const { rows: [run] } = await query('select id, output, status from tracker_read.v_discovery_runs where id=$1 and researcher_id=$2', [input.runId, researcherId]);
      const output = Array.isArray(run?.output) ? run.output : (() => { try { return JSON.parse(run?.output || '[]'); } catch { return []; } })();
      if (!run || run.status !== 'completed' || !output[input.index]) throw Object.assign(new Error('Select a completed discovery result you own.'), { status: 422 });
      const contacts = await runContactAgent(input.runId, input.index, output[input.index], researcherId);
      for (const key of contactsCache.keys()) if (key.startsWith(`${researcherId}:`)) contactsCache.delete(key);
      emit(input.runId, 'AuthorityContactAgent', 'sleeping', 'Waiting for the next official lead.', { researcherId, action: 'sleep', next: 'Next selected source.' });
      return { runId: input.runId, resultIndex: input.index, contacts };
    },
    async forceReverifyContact(contactId, actorId, reason) {
      const { rows: [job] } = await query(
        'select * from tracker.force_contact_email_reverification($1, $2, $3)',
        [contactId, actorId, reason],
      );
      if (!job) throw Object.assign(new Error('Contact has no email available for re-verification.'), { status: 422 });
      return job;
    },
    async extractEvidence(input, researcherId) {
      if (!evidenceAgent) throw Object.assign(new Error('Evidence extraction is not configured.'), { status: 409 });
      const { rows: [run] } = await query('select id, output, status from tracker_read.v_discovery_runs where id=$1 and researcher_id=$2', [input.runId, researcherId]);
      const output = Array.isArray(run?.output) ? run.output : (() => { try { return JSON.parse(run?.output || '[]'); } catch { return []; } })();
      if (!run || run.status !== 'completed' || !output[input.index]) throw Object.assign(new Error('Select a completed discovery result you own.'), { status: 422 });
      const candidate = output[input.index];
      emit(input.runId, 'EvidenceExtractionAgent', 'woke', `Accepted source ${input.index + 1}.`, { researcherId, action: 'load_source', operation: 'db.retrieve_source', target: candidate.url, next: 'Validate the official URL and extraction contract.' });
      emit(input.runId, 'EvidenceExtractionAgent', 'working', 'Extracting location, allocation, utility and contact evidence.', { researcherId, action: 'validate_and_extract', operation: 'schema.evidenceExtraction', target: candidate.url, next: 'Call Firecrawl.' });
      const evidence = await evidenceAgent.extract({ url: candidate.url });
      emit(input.runId, 'EvidenceExtractionAgent', 'provider_called', 'Firecrawl response received.', { researcherId, action: 'receive_provider_response', operation: 'firecrawl.scrape', target: candidate.url, next: 'Persist the source-backed evidence.' });
      const { rows: [saved] } = await query('select * from tracker.record_discovery_evidence($1,$2,$3,$4,$5)', [input.runId, input.index, researcherId, candidate.url, JSON.stringify(evidence)]);
      emit(input.runId, 'EvidenceExtractionAgent', 'output_saved', 'Evidence bundle persisted for the run.', { researcherId, action: 'save_output', operation: 'db.record_discovery_evidence', target: saved.id, recordCount: 1, next: 'Wake SiteIdentificationAgent.' });
      emit(input.runId, 'EvidenceExtractionAgent', 'sleeping', 'Waiting for the next selected source.', { researcherId, action: 'sleep', next: 'Next selected source.' });
      return { ...evidence, id: saved.id, runId: input.runId, resultIndex: input.index };
    },
  };
}
