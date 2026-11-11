const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function bodyAsObject(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pageParameter(value, fallback, maximum) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function eventStream(request, eventBus, { runId = null, researcherId = null } = {}) {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      if (runId) {
        for (const event of eventBus.recent(runId)) if (!researcherId || event.researcherId === researcherId) send(event);
        unsubscribe = eventBus.subscribe(runId, event => { if (!researcherId || event.researcherId === researcherId) send(event); });
      } else {
        unsubscribe = eventBus.subscribeAll(event => { if (!researcherId || event.researcherId === researcherId) send(event); });
      }
      request.signal.addEventListener('abort', () => { unsubscribe(); controller.close(); }, { once: true });
      send({ runId, agent: 'AgentView', phase: 'connected', detail: 'Live agent event stream connected.' });
    },
    cancel() { unsubscribe(); },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' } });
}

export function createTrackerHttpHandler({ tracker, discovery, eventBus, authenticate = async () => null, adminUserIds = new Set() }) {
  return {
    async fetch(request) {
      const principal = await authenticate(request);
      if (!principal) return json({ error: "unauthorized" }, 401);
      const url = new URL(request.url);

      if (url.pathname.startsWith('/v1/discovery') && discovery) {
        try {
          if (request.method === 'GET' && url.pathname === '/v1/discovery/events') {
            const runId = url.searchParams.get('runId');
            if (!eventBus) return json({ error: 'Agent event stream is unavailable.' }, 503);
            return eventStream(request, eventBus, { runId: isUuid(runId) ? runId : null, researcherId: principal.id });
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery/capabilities') return json(discovery.capabilities());
          if (request.method === 'GET' && url.pathname === '/v1/discovery/agents') {
            const projectId = url.searchParams.get('projectId');
            if (!isUuid(projectId)) return json({ error: 'Select a research project.' }, 422);
            return json(discovery.agentControls(projectId, principal.id));
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery/queue') {
            const projectId = url.searchParams.get('projectId');
            if (!isUuid(projectId)) return json({ error: 'Select a research project.' }, 422);
            return json({ projectId, entries: discovery.queueStatus(projectId, principal.id) });
          }
          if (request.method === 'PUT' && url.pathname === '/v1/discovery/agents') {
            const input = await bodyAsObject(request);
            if (!isUuid(input?.projectId) || !Array.isArray(input?.enabledAgents) || input.enabledAgents.some(agent => typeof agent !== 'string')) {
              return json({ error: 'Provide a research project and enabled agent list.' }, 422);
            }
            const controls = discovery.setAgentControls(input.projectId, principal.id, input.enabledAgents);
            if (typeof discovery.resumeStalledRuns === 'function') void discovery.resumeStalledRuns(input.projectId, principal.id).catch(() => {});
            return json(controls);
          }
          if (request.method === 'POST' && url.pathname === '/v1/discovery/discard') {
            const input = await bodyAsObject(request);
            if (!isUuid(input?.runId) || typeof input?.agent !== 'string' || !input.agent.trim()) {
              return json({ error: 'Provide a run and agent to discard.' }, 422);
            }
            return json(await discovery.discardAgent(input.runId, principal.id, input.agent), 200);
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery') {
            if (!isUuid(url.searchParams.get('projectId'))) return json({error:'Select a research project.'},422);
            return json(await discovery.history(url.searchParams.get('projectId'), principal.id));
          }
          if (request.method === 'POST' && url.pathname === '/v1/discovery/search') {
            const input = await bodyAsObject(request);
            if (!isUuid(input?.researchProjectId) || !isUuid(input?.intentId) || !['official_catalogue','exa'].includes(input?.mode) ||
                !['All Oman','Muscat / Barka','Sohar','Duqm','Salalah'].includes(input?.region) ||
                (input?.keywords !== undefined && (typeof input.keywords !== 'string' || input.keywords.length > 300)) ||
                (input?.landCriteria !== undefined && !isObject(input.landCriteria)) ||
                !Number.isFinite(input?.targetItLoadMw) || input.targetItLoadMw < 10 || input.targetItLoadMw > 10000) {
              return json({error:'Select a project, search mode, Oman area and a target IT load of 10–10,000 MW. Keywords must be at most 300 characters.'},422);
            }
            const controls = discovery.agentControls(input.researchProjectId, principal.id);
            return json(await discovery.search({researchProjectId:input.researchProjectId,intentId:input.intentId,mode:input.mode,region:input.region,keywords:typeof input.keywords === 'string' ? input.keywords.trim() : '',landCriteria:input.landCriteria || {targetItLoadMw:input.targetItLoadMw},targetItLoadMw:input.targetItLoadMw,enabledAgents:controls.enabledAgents,waitForControls:true}, principal.id),201);
          }
          if (request.method === 'POST' && url.pathname === '/v1/discovery/promote') {
            const input = await bodyAsObject(request);
            if (!isUuid(input?.runId) || !Number.isInteger(input?.index) || input.index < 0 || input.index > 7 ||
                typeof input?.name !== 'string' || !input.name.trim() || input.name.length>200 ||
                typeof input?.location !== 'string' || input.location.trim().length<5 || input.location.length>1000) {
              return json({error:'Enter a parcel name and a specific location reference (plot number, coordinates or boundary description).'},422);
            }
            return json(await discovery.promote(input,principal.id),201);
          }
          if (request.method === 'POST' && url.pathname === '/v1/discovery/evidence') {
            const input = await bodyAsObject(request);
            if (!isUuid(input?.runId) || !Number.isInteger(input?.index) || input.index < 0 || input.index > 7) {
              return json({error:'Select a discovery result to validate.'},422);
            }
            return json(await discovery.extractEvidence(input, principal.id),201);
          }
          if (request.method === 'POST' && url.pathname === '/v1/discovery/contacts') {
            const input = await bodyAsObject(request);
            if (!isUuid(input?.runId) || !Number.isInteger(input?.index) || input.index < 0 || input.index > 7) {
              return json({error:'Select a discovery result to find authority contacts.'},422);
            }
            if (typeof discovery.discoverContacts !== 'function') return json({error:'Authority contact discovery is not configured.'},409);
            return json(await discovery.discoverContacts(input, principal.id),201);
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery/contacts/reverification-capability') {
            return json({ canForce: adminUserIds.has(principal.id) });
          }
          if (request.method === 'POST' && url.pathname === '/v1/discovery/contacts/reverify') {
            if (!adminUserIds.has(principal.id)) return json({ error: 'Administrator permission is required.' }, 403);
            const input = await bodyAsObject(request);
            if (!isUuid(input?.contactId) || typeof input?.reason !== 'string' || !input.reason.trim() || input.reason.length > 500) {
              return json({ error: 'Provide a contact and a reason for forced re-verification.' }, 422);
            }
            if (typeof discovery.forceReverifyContact !== 'function') return json({ error: 'Contact re-verification is not configured.' }, 409);
            return json(await discovery.forceReverifyContact(input.contactId, principal.id, input.reason.trim()), 202);
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery/contacts') {
            if (typeof discovery.listContacts !== 'function') return json({error:'Contact records are not configured.'},409);
            return json(await discovery.listContacts(principal.id, {
              since: url.searchParams.get('since'),
              limit: url.searchParams.get('limit'),
              offset: url.searchParams.get('offset'),
              sortKey: url.searchParams.get('sortKey'),
              sortDirection: url.searchParams.get('sortDirection'),
            }));
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery/contacts/version') {
            if (typeof discovery.contactsSyncState !== 'function') return json({error:'Contact synchronization is not configured.'},409);
            return json(await discovery.contactsSyncState(principal.id));
          }
        } catch (error) {
          if (error.code === '22023') return json({error:'Check the active Oman project, completed search result and parcel details.'},422);
          if (error.status === 409) return json({error:error.message},409);
          if (error.status === 403) return json({error:error.message},403);
          if (error.status === 422) return json({error:error.message},422);
          if (error.status === 502) return json({error:error.message},502);
          if (request.method === 'GET' && url.pathname === '/v1/discovery/contacts') {
            return json({ error: 'Contacts could not be loaded. Please retry.' }, 503);
          }
          if (request.method === 'GET' && url.pathname === '/v1/discovery/contacts/version') {
            return json({ error: 'Contact synchronization status could not be loaded. Please retry.' }, 503);
          }
          return json({error:'Discovery could not be saved. Please retry.'},503);
        }
      }

      if (request.method === "GET" && url.pathname === "/v1/intents") {
        const researchProjectId = url.searchParams.get("researchProjectId");
        if (!isUuid(researchProjectId)) {
          return json({ error: "Select a research project." }, 422);
        }
        const limit = pageParameter(url.searchParams.get("limit"), 100, 200);
        const offset = pageParameter(url.searchParams.get("offset"), 0, 1000000);
        if (limit === null || offset === null || limit === 0) return json({ error: "Provide a valid intent page size and offset." }, 422);
        return json(await tracker.listIntents(researchProjectId, principal.id, { limit, offset }));
      }

      if (request.method === "POST" && url.pathname === "/v1/intents") {
        const input = await bodyAsObject(request);
        const opportunityKinds = new Set([
          "land_site",
          "investor",
          "buyer",
          "seller",
          "manufacturer_destination",
          "project",
        ]);
        const opportunityKind = input?.opportunityKind ?? "land_site";
        const criteria = input?.criteria && typeof input.criteria === "object" && !Array.isArray(input.criteria)
          ? input.criteria
          : null;
        const targetItLoadMw = Number(criteria?.targetItLoadMw);
        if (!isUuid(input?.researchProjectId) ||
            typeof input?.goal !== "string" || !input.goal.trim() || input.goal.length > 500 ||
            !opportunityKinds.has(opportunityKind) ||
            typeof input?.geography !== "string" || !input.geography.trim() || input.geography.length > 200 ||
            (input?.sector !== undefined && input.sector !== null &&
              (typeof input.sector !== "string" || input.sector.length > 200)) ||
            criteria === null ||
            (input?.exclusions !== undefined && input.exclusions !== null &&
              (typeof input.exclusions !== "string" || input.exclusions.length > 1000)) ||
            !["low", "normal", "high"].includes(input?.priority ?? "normal")) {
          return json({ error: "Provide a goal, opportunity kind, geography, criteria, and valid priority." }, 422);
        }
        if (opportunityKind === "land_site" &&
            (!Number.isFinite(targetItLoadMw) || targetItLoadMw < 10 || targetItLoadMw > 10000)) {
          return json({ error: "land_site intents require a target IT load between 10 and 10,000 MW" }, 422);
        }
        return json(await tracker.createIntent({
          researchProjectId: input.researchProjectId.trim(),
          actorId: principal.id,
          goal: input.goal.trim(),
          opportunityKind,
          geography: input.geography.trim(),
          sector: typeof input.sector === "string" ? input.sector.trim() : null,
          criteria,
          exclusions: typeof input.exclusions === "string" ? input.exclusions.trim() : null,
          priority: input.priority ?? "normal",
        }), 201);
      }

      if (request.method === "GET" && url.pathname === "/v1/dashboard/summary") {
        if (typeof tracker.workspaceSummary !== "function") return json({ error: "Dashboard summary is not configured." }, 503);
        return json(await tracker.workspaceSummary());
      }

      if (request.method === "GET" && url.pathname === "/v1/projects") {
        const limit = pageParameter(url.searchParams.get("limit"), 200, 500);
        const offset = pageParameter(url.searchParams.get("offset"), 0, 1000000);
        const includeBrief = ["1", "true"].includes((url.searchParams.get("includeBrief") || "").toLowerCase());
        if (limit === null || offset === null || limit === 0) return json({ error: "Provide a valid project page size and offset." }, 422);
        return json(await tracker.listProjects({ limit, offset, includeBrief }));
      }

      if (request.method === "GET" && url.pathname === "/v1/accounts") {
        const limit = pageParameter(url.searchParams.get("limit"), 25, 500);
        const offset = pageParameter(url.searchParams.get("offset"), 0, 1000000);
        const search = url.searchParams.get("search");
        const sortKey = url.searchParams.get("sortKey");
        const sortDirection = url.searchParams.get("sortDirection") || "asc";
        const allowedSortKeys = new Set(['id', 'canonicalName', 'legalName', 'displayName', 'companyStatus', 'legalForm', 'countryOfRegistration', 'websiteUrl', 'primaryDomain', 'linkedinUrl', 'description', 'companyType', 'roleType', 'roleStatus', 'roleSourceUrl', 'roleEvidence', 'verificationStatus', 'identityConfidence', 'firecrawlMarkdown', 'firecrawlMarkdownAt', 'firecrawlMarkdownHash', 'firecrawlSourceUrl', 'firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt']);
        if (limit === null || offset === null || limit === 0 || (search !== null && search.length > 200) || (sortKey !== null && !allowedSortKeys.has(sortKey)) || !['asc', 'desc'].includes(sortDirection)) {
          return json({ error: "Provide a valid account page and search term." }, 422);
        }
        if (typeof tracker.listAccounts !== "function") return json({ error: "Account records are not configured." }, 503);
        return json(await tracker.listAccounts({ limit, offset, search: search?.trim() || null, sortKey, sortDirection }));
      }

      if (request.method === "GET" && url.pathname === "/v1/parcels") {
        const limit = pageParameter(url.searchParams.get("limit"), 200, 500);
        const offset = pageParameter(url.searchParams.get("offset"), 0, 1000000);
        const researchProjectId = url.searchParams.get("researchProjectId");
        if (limit === null || offset === null || limit === 0 || (researchProjectId !== null && !isUuid(researchProjectId))) {
          return json({ error: "Provide a valid parcel page and optional research project." }, 422);
        }
        return json(await tracker.listParcels({ limit, offset, researchProjectId }));
      }

      if (request.method === "POST" && url.pathname === "/v1/projects") {
        const input = await bodyAsObject(request);
        if (!input?.name || !input?.countryIso2) {
          return json({ error: "name and countryIso2 are required" }, 422);
        }
        if (input.researchBrief !== undefined &&
            (typeof input.researchBrief !== "string" || input.researchBrief.length > 4000)) {
          return json({ error: "researchBrief must be at most 4000 characters." }, 422);
        }
        const projectInput = { name: input.name, countryIso2: input.countryIso2 };
        if (typeof input.researchBrief === "string" && input.researchBrief.trim()) {
          projectInput.researchBrief = input.researchBrief.trim();
        }
        try {
          return json(await tracker.createProject(projectInput), 201);
        } catch (error) {
          if (error.code === "22023") return json({ error: error.message }, 422);
          if (error.code === "42883") return json({ error: "Project brief storage is not installed yet. Apply migration 057_research_project_semantic_brief.sql before saving a brief." }, 503);
          return json({ error: "Research project could not be created." }, 503);
        }
      }

      const projectIdMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)$/);
      if (projectIdMatch && !isUuid(projectIdMatch[1])) {
        return json({ error: "Provide a valid research project id." }, 422);
      }
      if (projectIdMatch && request.method === "PATCH") {
        const input = await bodyAsObject(request);
        const name = typeof input?.name === "string" ? input.name.trim() : "";
        const countryIso2 = typeof input?.countryIso2 === "string" ? input.countryIso2.trim().toUpperCase() : "";
        if (!name || name.length > 200 || !/^[A-Z]{2}$/.test(countryIso2) ||
            (input?.researchBrief !== undefined &&
              (typeof input.researchBrief !== "string" || input.researchBrief.length > 4000))) {
          return json({ error: "Provide a project name and a two-letter country ISO code." }, 422);
        }
        try {
          const projectInput = { id: projectIdMatch[1], name, countryIso2, actorId: principal.id };
          if (typeof input.researchBrief === "string" && input.researchBrief.trim()) {
            projectInput.researchBrief = input.researchBrief.trim();
          }
          return json(await tracker.updateProject(projectInput));
        } catch (error) {
          if (error.code === "P0002") return json({ error: "Research project was not found." }, 404);
          if (error.code === "22023") return json({ error: error.message }, 422);
          if (error.code === "42883") return json({ error: "Project brief storage is not installed yet. Apply migration 057_research_project_semantic_brief.sql before saving a brief." }, 503);
          return json({ error: "Research project could not be updated." }, 503);
        }
      }
      if (projectIdMatch && request.method === "DELETE") {
        try {
          return json(await tracker.deleteProject({ id: projectIdMatch[1], actorId: principal.id }));
        } catch (error) {
          if (error.code === "P0002") return json({ error: "Research project was not found." }, 404);
          if (error.code === "23514") return json({ error: error.message }, 409);
          return json({ error: "Research project could not be deleted." }, 503);
        }
      }

      if (request.method === "POST" && url.pathname === "/v1/parcels") {
        const input = await bodyAsObject(request);
        const targetItLoadMw = Number(input?.targetItLoadMw);
        if (!Number.isFinite(targetItLoadMw) || targetItLoadMw < 10) {
          return json({ error: "targetItLoadMw must be at least 10 MW" }, 422);
        }
        if (!input?.researchProjectId || !input?.name) {
          return json(
            { error: "researchProjectId and name are required" },
            422,
          );
        }

        return json(
          await tracker.createParcel({
            researchProjectId: input.researchProjectId,
            name: input.name,
            targetItLoadMw,
          }),
          201,
        );
      }

      return json({ error: "not found" }, 404);
    },
  };
}
