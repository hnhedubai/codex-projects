import assert from "node:assert/strict";
import test from "node:test";

import { createTrackerDatabaseQuery } from "../src/tracker-db-query.js";

test("configures each pooled client once and releases it after a tracker query", async () => {
  const calls = [];
  const client = {
    async query(text, values) {
      calls.push({ text, values });
      return { rows: [] };
    },
    release() {
      calls.push({ released: true });
    },
  };
  const query = createTrackerDatabaseQuery({
    pool: { connect: async () => client },
    role: "tracker_runtime",
  });

  await query("select 1", ["first"]);
  await query("select 2", ["second"]);

  assert.deepEqual(calls, [
    { text: 'set role "tracker_runtime"', values: undefined },
    { text: "select 1", values: ["first"] },
    { released: true },
    { text: "select 2", values: ["second"] },
    { released: true },
  ]);
});

test("quotes a configured role identifier before issuing SET ROLE", async () => {
  const calls = [];
  const client = {
    async query(text) {
      calls.push(text);
      return { rows: [] };
    },
    release() {},
  };
  const query = createTrackerDatabaseQuery({
    pool: { connect: async () => client },
    role: 'tracker"runtime',
  });

  await query("select 1");

  assert.equal(calls[0], 'set role "tracker""runtime"');
});
