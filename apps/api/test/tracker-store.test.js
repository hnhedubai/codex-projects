import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresTrackerStore } from "../src/postgres-tracker-store.js";

test("reads dashboard counts from the workspace rollup", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text) {
      received.push(text);
      return { rows: [{
        project_count: "3",
        active_oman_project_count: "2",
        parcel_count: "1",
        discovery_run_count: "14",
        completed_discovery_run_count: "12",
        contact_count: "719",
        refreshed_at: "2026-10-08T00:00:00.000Z",
      }] };
    },
  });

  assert.deepEqual(await store.workspaceSummary(), {
    projectCount: 3,
    activeOmanProjectCount: 2,
    parcelCount: 1,
    discoveryRunCount: 14,
    completedDiscoveryRunCount: 12,
    contactCount: 719,
    refreshedAt: "2026-10-08T00:00:00.000Z",
  });
  assert.equal(received[0], "select project_count, active_oman_project_count, parcel_count, discovery_run_count, completed_discovery_run_count, contact_count, refreshed_at from tracker_read.v_workspace_rollups where rollup_key = 'global'");
});

test("reads project and parcel pages through bounded database functions", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      if (text.includes("list_research_projects")) return { rows: [{ id: "project-1", name: "Oman", country_iso2: "OM", status: "active" }] };
      return { rows: [{ id: "parcel-1", research_project_id: "project-1", name: "Parcel", target_it_load_mw: "20", lifecycle_stage: "identified" }] };
    },
  });

  assert.deepEqual(await store.listProjects({ limit: 25, offset: 50 }), [{ id: "project-1", name: "Oman", countryIso2: "OM", status: "active" }]);
  assert.deepEqual(await store.listParcels({ limit: 25, offset: 50, researchProjectId: "project-1" }), [{ id: "parcel-1", researchProjectId: "project-1", name: "Parcel", targetItLoadMw: 20, lifecycleStage: "identified" }]);
  assert.deepEqual(received, [
    { text: "select id, name, country_iso2, status from tracker_read.list_research_projects($1, $2)", values: [25, 50] },
    { text: "select id, research_project_id, name, target_it_load_mw, lifecycle_stage from tracker_read.list_parcels($1, $2, $3)", values: [25, 50, "project-1"] },
  ]);
});

test("reads bounded account pages through the PCompany read model", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      if (text.includes("tracker_read.v_cprofile_roles")) {
        return { rows: [{
          id: "role-1",
          company_id: "account-1",
          role_type: "buyer",
          scope_type: "intent",
          scope_id: "intent-1",
          role_status: "observed",
          confidence: "0.65",
          source_url: "https://example.com/tender",
          evidence_excerpt: "Named buyer in a diesel tender.",
          valid_from: null,
          valid_to: null,
          first_seen_at: "2026-10-08T00:00:00.000Z",
          last_seen_at: "2026-10-08T00:00:00.000Z",
          created_at: "2026-10-08T00:00:00.000Z",
          updated_at: "2026-10-08T00:00:00.000Z",
        }] };
      }
      return { rows: [{
        id: "account-1",
        canonical_name: "Example Company",
        legal_name: "Example Legal",
        display_name: "Example",
        company_status: "active",
        legal_form: "LLC",
        country_of_registration: "OM",
        website_url: "https://example.om",
        primary_domain: "example.om",
        linkedin_url: "https://linkedin.com/company/example",
        description: "Example description",
        firecrawl_markdown: "# Example",
        firecrawl_markdown_at: "2026-10-08T00:00:00.000Z",
        firecrawl_markdown_hash: "hash",
        firecrawl_source_url: "https://example.om",
        identity_confidence: "0.90",
        verification_status: "observed",
        company_type: "Private company",
        first_seen_at: "2026-10-07T00:00:00.000Z",
        last_seen_at: "2026-10-08T00:00:00.000Z",
        created_at: "2026-10-07T00:00:00.000Z",
        updated_at: "2026-10-08T00:00:00.000Z",
      }] };
    },
  });
  assert.deepEqual(await store.listAccounts({ limit: 25, offset: 50, search: "example" }), [{
    id: "account-1",
    canonicalName: "Example Company",
    legalName: "Example Legal",
    displayName: "Example",
    companyStatus: "active",
    legalForm: "LLC",
    countryOfRegistration: "OM",
    websiteUrl: "https://example.om",
    primaryDomain: "example.om",
    linkedinUrl: "https://linkedin.com/company/example",
    description: "Example description",
    firecrawlMarkdown: "# Example",
    firecrawlMarkdownAt: "2026-10-08T00:00:00.000Z",
    firecrawlMarkdownHash: "hash",
    firecrawlSourceUrl: "https://example.om",
    identityConfidence: 0.9,
    verificationStatus: "observed",
    companyType: "Private company",
    firstSeenAt: "2026-10-07T00:00:00.000Z",
    lastSeenAt: "2026-10-08T00:00:00.000Z",
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-08T00:00:00.000Z",
    roles: [{
      id: "role-1",
      companyId: "account-1",
      roleType: "buyer",
      scopeType: "intent",
      scopeId: "intent-1",
      roleStatus: "observed",
      confidence: 0.65,
      sourceUrl: "https://example.com/tender",
      evidenceExcerpt: "Named buyer in a diesel tender.",
      validFrom: null,
      validTo: null,
      firstSeenAt: "2026-10-08T00:00:00.000Z",
      lastSeenAt: "2026-10-08T00:00:00.000Z",
      createdAt: "2026-10-08T00:00:00.000Z",
      updatedAt: "2026-10-08T00:00:00.000Z",
    }],
  }]);
  assert.deepEqual(received, [
    {
      text: "select * from tracker_read.list_cprofiles($1, $2, $3, $4, $5)",
      values: [25, 50, "example", null, "asc"],
    },
    {
      text: "select id, company_id, role_type, scope_type, scope_id, role_status, confidence, source_url, evidence_excerpt, valid_from, valid_to, first_seen_at, last_seen_at, created_at, updated_at from tracker_read.v_cprofile_roles where company_id = any($1::uuid[]) order by company_id, role_type, scope_type, id",
      values: [["account-1"]],
    },
  ]);
});

test("reads intents through a bounded database function", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      return { rows: [{ id: "intent-1", research_project_id: "project-1", goal: "Find land", opportunity_kind: "land_site", geography: "Oman", sector: null, criteria: {}, exclusions: null, priority: "normal", status: "active" }] };
    },
  });
  assert.deepEqual(await store.listIntents("project-1", "researcher-1", { limit: 25, offset: 50 }), [{ id: "intent-1", researchProjectId: "project-1", goal: "Find land", opportunityKind: "land_site", geography: "Oman", sector: null, criteria: {}, exclusions: null, priority: "normal", status: "active" }]);
  assert.deepEqual(received, [{ text: "select id, research_project_id, goal, opportunity_kind, geography, sector, criteria, exclusions, priority, status from tracker_read.list_intent_requests($1, $2, $3, $4)", values: ["project-1", "researcher-1", 25, 50] }]);
});

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

test("updates and deletes projects through controlled database functions", async () => {
  const received = [];
  const store = createPostgresTrackerStore({ async query(text, values) {
    received.push({ text, values });
    if (text.includes("update_research_project")) return { rows: [{ id: "project-1", name: "Updated", country_iso2: "OM", status: "active" }] };
    return { rows: [{ id: "project-1", reference_code: "RP-OM-2026-0001", deleted: true }] };
  } });
  assert.deepEqual(await store.updateProject({ id: "project-1", name: "Updated", countryIso2: "OM", actorId: "user-1" }), { id: "project-1", name: "Updated", countryIso2: "OM", status: "active" });
  assert.deepEqual(await store.deleteProject({ id: "project-1", actorId: "user-1" }), { id: "project-1", reference_code: "RP-OM-2026-0001", deleted: true });
  assert.deepEqual(received, [
    { text: "select * from tracker.update_research_project($1, $2, $3, $4)", values: ["project-1", "Updated", "OM", "user-1"] },
    { text: "select * from tracker.delete_research_project($1, $2)", values: ["project-1", "user-1"] },
  ]);
});

test("writes an intent through its controlled database function", async () => {
  const received = [];
  const store = createPostgresTrackerStore({
    async query(text, values) {
      received.push({ text, values });
      return {
        rows: [
          {
            id: "intent-1",
            research_project_id: "project-1",
            goal: "Find allocation-ready land for a data centre",
            opportunity_kind: "land_site",
            geography: "Oman",
            sector: "Data centres",
            criteria: { targetItLoadMw: 20 },
            exclusions: "No residential zoning",
            priority: "high",
            status: "active",
          },
        ],
      };
    },
  });

  const intent = await store.createIntent({
    researchProjectId: "project-1",
    actorId: "researcher-1",
    goal: "Find allocation-ready land for a data centre",
    opportunityKind: "land_site",
    geography: "Oman",
    sector: "Data centres",
    criteria: { targetItLoadMw: 20 },
    exclusions: "No residential zoning",
    priority: "high",
  });

  assert.deepEqual(intent, {
    id: "intent-1",
    researchProjectId: "project-1",
    goal: "Find allocation-ready land for a data centre",
    opportunityKind: "land_site",
    geography: "Oman",
    sector: "Data centres",
    criteria: { targetItLoadMw: 20 },
    exclusions: "No residential zoning",
    priority: "high",
    status: "active",
  });
  assert.deepEqual(received, [
    {
      text: "select * from tracker.create_intent_request($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      values: [
        "project-1",
        "researcher-1",
        "Find allocation-ready land for a data centre",
        "land_site",
        "Oman",
        "Data centres",
        JSON.stringify({ targetItLoadMw: 20 }),
        "No residential zoning",
        "high",
      ],
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
