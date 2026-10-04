import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresTrackerStore } from "../src/postgres-tracker-store.js";

test("writes a research project through its controlled database function", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      return {
        rows: [
          {
            id: "project-1",
            name: "Oman data-centre land allocation",
            country_iso2: "OM",
            status: "active",
          },
        ],
      };
    },
  });

  const project = await store.createProject({
    name: "Oman data-centre land allocation",
    countryIso2: "OM",
  });

  assert.deepEqual(project, {
    id: "project-1",
    name: "Oman data-centre land allocation",
    countryIso2: "OM",
    status: "active",
  });
  assert.deepEqual(received, [
    {
      text: "select * from tracker.create_research_project($1, $2)",
      values: ["Oman data-centre land allocation", "OM"],
    },
  ]);
});

test("writes a parcel through its controlled database function", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      return {
        rows: [
          {
            id: "parcel-1",
            research_project_id: "project-1",
            name: "Barka candidate",
            target_it_load_mw: "20.00",
            lifecycle_stage: "identified",
          },
        ],
      };
    },
  });

  const parcel = await store.createParcel({
    researchProjectId: "project-1",
    name: "Barka candidate",
    targetItLoadMw: 20,
  });

  assert.deepEqual(parcel, {
    id: "parcel-1",
    researchProjectId: "project-1",
    name: "Barka candidate",
    targetItLoadMw: 20,
    lifecycleStage: "identified",
  });
  assert.deepEqual(received, [
    {
      text: "select * from tracker.create_parcel($1, $2, $3)",
      values: ["project-1", "Barka candidate", 20],
    },
  ]);
});

test("records a JEV decision as an advisory vote through its controlled function", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      return {
        rows: [
          {
            id: "vote-1",
            subject_type: "contact",
            subject_id: "contact-1",
            checkpoint: "contact_system_rejection",
            outcome: "needs_human_review",
            confidence: "0.82",
            reason: "The source identifies a relevant role.",
          },
        ],
      };
    },
  });

  const vote = await store.recordJevVote({
    subjectType: "contact",
    subjectId: "contact-1",
    checkpoint: "contact_system_rejection",
    outcome: "needs_human_review",
    confidence: 0.82,
    reason: "The source identifies a relevant role.",
  });

  assert.deepEqual(vote, {
    id: "vote-1",
    subjectType: "contact",
    subjectId: "contact-1",
    checkpoint: "contact_system_rejection",
    outcome: "needs_human_review",
    confidence: 0.82,
    reason: "The source identifies a relevant role.",
  });
  assert.deepEqual(received, [
    {
      text: "select * from tracker.record_jev_vote($1, $2, $3, $4, $5, $6)",
      values: [
        "contact",
        "contact-1",
        "contact_system_rejection",
        "needs_human_review",
        0.82,
        "The source identifies a relevant role.",
      ],
    },
  ]);
});
