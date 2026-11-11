import assert from "node:assert/strict";
import test from "node:test";

import { createTrackerHttpHandler } from "../src/tracker-http.js";

function request(path, options) {
  return new Request(`http://tracker.local${path}`, options);
}

function handlerFor(tracker) {
  return createTrackerHttpHandler({ tracker, authenticate: async () => ({ id: "test-user" }) });
}

test("rejects an unauthenticated request before tracker storage is called", async () => {
  let called = false;
  const handler = createTrackerHttpHandler({ tracker: { async listProjects() { called = true; } } });
  const response = await handler.fetch(request("/v1/projects"));
  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("serves dashboard counts from the rollup-backed store", async () => {
  const handler = handlerFor({
    async workspaceSummary() {
      return { projectCount: 3, parcelCount: 1, contactCount: 719, refreshedAt: "2026-10-08T00:00:00.000Z" };
    },
  });
  const response = await handler.fetch(request("/v1/dashboard/summary"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    projectCount: 3,
    parcelCount: 1,
    contactCount: 719,
    refreshedAt: "2026-10-08T00:00:00.000Z",
  });
});

test("rejects an invalid project page before storage", async () => {
  let called = false;
  const handler = handlerFor({ async listProjects() { called = true; } });
  const response = await handler.fetch(request("/v1/projects?limit=0"));
  assert.equal(response.status, 422);
  assert.equal(called, false);
});

test("rejects an invalid intent page before storage", async () => {
  let called = false;
  const handler = handlerFor({ async listIntents() { called = true; } });
  const response = await handler.fetch(request("/v1/intents?researchProjectId=00000000-0000-0000-0000-000000000001&limit=0"));
  assert.equal(response.status, 422);
  assert.equal(called, false);
});

test("serves contact synchronization state from the rollup path", async () => {
  const handler = createTrackerHttpHandler({
    tracker: {},
    discovery: { async contactsSyncState(researcherId) { return { researcherId, totalCount: 719, syncToken: "2026-10-08T00:00:00.000Z" }; } },
    authenticate: async () => ({ id: "researcher-1" }),
  });
  const response = await handler.fetch(request("/v1/discovery/contacts/version"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { researcherId: "researcher-1", totalCount: 719, syncToken: "2026-10-08T00:00:00.000Z" });
});

test("only an allowlisted administrator can force contact email re-verification", async () => {
  const calls = [];
  const contactId = "00000000-0000-0000-0000-000000000001";
  const handler = createTrackerHttpHandler({
    tracker: {},
    discovery: { async forceReverifyContact(...args) { calls.push(args); return { id: "job-1", contact_id: args[0], status: "pending" }; } },
    authenticate: async () => ({ id: "admin-1" }),
    adminUserIds: new Set(["admin-1"]),
  });
  const capability = await handler.fetch(request("/v1/discovery/contacts/reverification-capability"));
  assert.deepEqual(await capability.json(), { canForce: true });
  const response = await handler.fetch(request("/v1/discovery/contacts/reverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contactId, reason: "Manual deliverability review" }),
  }));
  assert.equal(response.status, 202);
  assert.deepEqual(calls, [[contactId, "admin-1", "Manual deliverability review"]]);

  const denied = createTrackerHttpHandler({
    tracker: {},
    discovery: { async forceReverifyContact() { throw new Error("must not call"); } },
    authenticate: async () => ({ id: "researcher-1" }),
    adminUserIds: new Set(["admin-1"]),
  });
  const deniedResponse = await denied.fetch(request("/v1/discovery/contacts/reverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contactId, reason: "Not permitted" }),
  }));
  assert.equal(deniedResponse.status, 403);
});

test("creates an Oman research project through the HTTP interface", async () => {
  const calls = [];
  const handler = handlerFor({
      async createProject(input) {
        calls.push(input);
        return {
          id: "project-1",
          name: input.name,
          countryIso2: input.countryIso2,
          status: "active",
        };
      },
  });

  const response = await handler.fetch(
    request("/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Oman data-centre land allocation",
        countryIso2: "OM",
      }),
    }),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    id: "project-1",
    name: "Oman data-centre land allocation",
    countryIso2: "OM",
    status: "active",
  });
  assert.deepEqual(calls, [
    { name: "Oman data-centre land allocation", countryIso2: "OM" },
  ]);
});

test("lists research projects through the read-model interface", async () => {
  const handler = handlerFor({
      async listProjects() {
        return [
          {
            id: "project-1",
            name: "Oman data-centre land allocation",
            countryIso2: "OM",
            status: "active",
          },
        ];
      },
  });

  const response = await handler.fetch(request("/v1/projects"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    {
      id: "project-1",
      name: "Oman data-centre land allocation",
      countryIso2: "OM",
      status: "active",
    },
  ]);
});

test("lists Accounts through the bounded PCompany read-model interface", async () => {
  const calls = [];
  const handler = handlerFor({
    async listAccounts(input) {
      calls.push(input);
      return [{ id: "account-1", canonicalName: "Example Company", primaryDomain: "example.om" }];
    },
  });
  const response = await handler.fetch(request("/v1/accounts?limit=25&offset=50&search=example"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: "account-1", canonicalName: "Example Company", primaryDomain: "example.om" }]);
  assert.deepEqual(calls, [{ limit: 25, offset: 50, search: "example", sortKey: null, sortDirection: "asc" }]);
});

test("updates a research project through the controlled HTTP interface", async () => {
  const calls = [];
  const id = "00000000-0000-0000-0000-000000000001";
  const handler = handlerFor({
    async updateProject(input) { calls.push(input); return { id, name: input.name, countryIso2: input.countryIso2, status: "active" }; },
  });
  const response = await handler.fetch(request(`/v1/projects/${id}`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Updated workspace", countryIso2: "om" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ id, name: "Updated workspace", countryIso2: "OM", actorId: "test-user" }]);
});

test("deletes an empty research project through the controlled HTTP interface", async () => {
  const calls = [];
  const id = "00000000-0000-0000-0000-000000000001";
  const handler = handlerFor({ async deleteProject(input) { calls.push(input); return { id, reference_code: "RP-OM-2026-0001", deleted: true }; } });
  const response = await handler.fetch(request(`/v1/projects/${id}`, { method: "DELETE" }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ id, actorId: "test-user" }]);
});

test("rejects malformed project update before storage", async () => {
  let called = false;
  const handler = handlerFor({ async updateProject() { called = true; } });
  const response = await handler.fetch(request("/v1/projects/not-a-uuid", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" }));
  assert.equal(response.status, 422);
  assert.equal(called, false);
});

test("creates an Oman land-search intent through the HTTP interface", async () => {
  const calls = [];
  const handler = createTrackerHttpHandler({ tracker: {
    async createIntent(input) {
      calls.push(input);
      return { id: "intent-1", ...input, status: "active" };
    },
  }, authenticate: async () => ({ id: "researcher-1" }) });

  const response = await handler.fetch(
    request("/v1/intents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        researchProjectId: "00000000-0000-0000-0000-000000000001",
        goal: "Find allocation-ready land for a data centre",
        opportunityKind: "land_site",
        geography: "Oman",
        sector: "Data centres",
        criteria: { targetItLoadMw: 20 },
        exclusions: "No residential zoning",
        priority: "high",
      }),
    }),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    id: "intent-1",
    researchProjectId: "00000000-0000-0000-0000-000000000001",
    actorId: "researcher-1",
    goal: "Find allocation-ready land for a data centre",
    opportunityKind: "land_site",
    geography: "Oman",
    sector: "Data centres",
    criteria: { targetItLoadMw: 20 },
    exclusions: "No residential zoning",
    priority: "high",
    status: "active",
  });
  assert.deepEqual(calls, [{
    researchProjectId: "00000000-0000-0000-0000-000000000001",
    actorId: "researcher-1",
    goal: "Find allocation-ready land for a data centre",
    opportunityKind: "land_site",
    geography: "Oman",
    sector: "Data centres",
    criteria: { targetItLoadMw: 20 },
    exclusions: "No residential zoning",
    priority: "high",
  }]);
});

test("lists project intents through the read-model interface", async () => {
  const handler = createTrackerHttpHandler({ tracker: {
    async listIntents(projectId, actorId) {
      assert.equal(actorId, "researcher-1");
      return [{ id: "intent-1", researchProjectId: projectId, goal: "Find land", status: "active" }];
    },
  }, authenticate: async () => ({ id: "researcher-1" }) });
  const response = await handler.fetch(request("/v1/intents?researchProjectId=00000000-0000-0000-0000-000000000001"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{
    id: "intent-1",
    researchProjectId: "00000000-0000-0000-0000-000000000001",
    goal: "Find land",
    status: "active",
  }]);
});

test("rejects a malformed project id before reading intents", async () => {
  let wasCalled = false;
  const handler = createTrackerHttpHandler({
    tracker: { async listIntents() { wasCalled = true; } },
    authenticate: async () => ({ id: "researcher-1" }),
  });
  const response = await handler.fetch(request("/v1/intents?researchProjectId=not-a-uuid"));
  assert.equal(response.status, 422);
  assert.equal(wasCalled, false);
});

test("rejects an Oman land intent below the 10 MW requirement before storage", async () => {
  let wasCalled = false;
  const handler = handlerFor({ async createIntent() { wasCalled = true; } });
  const response = await handler.fetch(request("/v1/intents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      researchProjectId: "00000000-0000-0000-0000-000000000001",
      goal: "Find land",
      opportunityKind: "land_site",
      geography: "Oman",
      criteria: { targetItLoadMw: 9 },
    }),
  }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, "land_site intents require a target IT load between 10 and 10,000 MW");
  assert.equal(wasCalled, false);
});

test("rejects a parcel below the 10 MW IT-load floor before it reaches storage", async () => {
  let wasCalled = false;
  const handler = handlerFor({
      async createParcel() {
        wasCalled = true;
      },
  });

  const response = await handler.fetch(
    request("/v1/parcels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        researchProjectId: "project-1",
        name: "Undersized parcel",
        targetItLoadMw: 9.9,
      }),
    }),
  );

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: "targetItLoadMw must be at least 10 MW",
  });
  assert.equal(wasCalled, false);
});

test("lists parcels through the read-model interface", async () => {
  const handler = handlerFor({
      async listParcels() {
        return [
          {
            id: "parcel-1",
            researchProjectId: "project-1",
            name: "Barka candidate",
            targetItLoadMw: 20,
            lifecycleStage: "identified",
          },
        ];
      },
  });

  const response = await handler.fetch(request("/v1/parcels"));

  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].targetItLoadMw, 20);
});

test("extracts evidence for one selected discovery result", async () => {
  const calls = [];
  const handler = createTrackerHttpHandler({
    tracker: {},
    discovery: {
      async extractEvidence(input, researcherId) {
        calls.push({ input, researcherId });
        return { id: "evidence-1", evidenceExcerpt: "Land is available in Duqm." };
      },
    },
    authenticate: async () => ({ id: "researcher-1" }),
  });

  const response = await handler.fetch(request("/v1/discovery/evidence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runId: "11111111-1111-4111-8111-111111111111", index: 2 }),
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: "evidence-1", evidenceExcerpt: "Land is available in Duqm." });
  assert.deepEqual(calls, [{
    input: { runId: "11111111-1111-4111-8111-111111111111", index: 2 },
    researcherId: "researcher-1",
  }]);
});
