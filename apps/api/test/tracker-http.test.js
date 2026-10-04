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
