# PCompany Firecrawl write-path study

**Date:** 2026-10-08  
**Scope:** Firecrawl Markdown retrieval and PCompany updates

## Decision

Firecrawl must not connect directly to Neon or receive database credentials.
The application worker/server should call Firecrawl over HTTPS, validate the
response, and then call a controlled database routine over the existing
database connection. If an HTTP boundary is needed, it should be the
authenticated application API or a server-side function; Firecrawl remains
outside the database trust boundary.

The provider request and database write must be separate operations:

```text
claim short job
  -> release database transaction
  -> call Firecrawl HTTPS
  -> validate Markdown and calculate content hash
  -> short controlled database transaction
       insert immutable source snapshot
       conditionally update latest company projection
       record audit event
```

## About row locks

An update in PostgreSQL necessarily takes a short row-level lock while the
statement changes the row. The safe requirement is therefore **no long-held or
provider-held row lock**, not literally zero database locks.

The Firecrawl request must never occur inside a transaction that has already
locked a company row. The write routine should use a short `INSERT ... ON
CONFLICT`/conditional `UPDATE`, commit immediately, and return.

This differs from Reoon's email identity protection. Reoon deliberately locks
one normalized email identity briefly to make the cache decision and prevent
two workers from submitting the same email. Firecrawl company refreshes do not
need that identity lock.

## Idempotency and concurrency design

The company source history should use an immutable snapshot table with a
deduplication key such as:

```text
(company_id, canonical_source_url, content_hash)
```

The latest projection on `cprofile` should update only when the incoming
retrieval is newer than the stored retrieval, or when the existing projection
is empty. Two concurrent crawls therefore behave safely:

- identical Markdown creates one snapshot;
- a newer snapshot becomes the latest projection;
- an older response cannot replace newer Markdown;
- no provider call is performed while a company row is locked.

Recommended snapshot fields:

```text
cprofile_source_snapshots
  id
  company_id
  source_url
  canonical_url
  provider = 'firecrawl'
  provider_run_id
  content_hash
  markdown
  retrieved_at
  status_code
  metadata jsonb
  created_at
```

Recommended current projection fields on `cprofile`:

```text
firecrawl_markdown
firecrawl_markdown_at
firecrawl_markdown_hash
firecrawl_source_url
```

## Controlled routines

The application should call routines similar to:

1. `tracker.claim_cprofile_firecrawl_job(worker_id)`
   - claims one pending job with `FOR UPDATE SKIP LOCKED` and a short lease;
   - does not call Firecrawl.
2. `tracker.record_cprofile_firecrawl_snapshot(...)`
   - validates the company/job ownership and source URL;
   - inserts the snapshot idempotently;
   - conditionally updates the latest Markdown projection;
   - records audit metadata and completes the job.
3. `tracker.fail_cprofile_firecrawl_job(...)`
   - records a safe error and bounded retry state without exposing the API key.

These routines should be executable by the application role while the base
tables remain protected. Application reads should use a company view and a
bounded snapshot-history view.

## Implemented schema boundary

Migrations `042_cprofile_company_schema.sql` through
`051_firecrawl_operational_telemetry.sql` now provide:

- `tracker.cprofiles` as the canonical company master;
- activity, role, identifier, alias, address, and contact-link tables;
- immutable Firecrawl source snapshots plus the latest Markdown projection;
- pending/processing/completed/failed Firecrawl jobs with short leases;
- a database-enforced serial Firecrawl dispatcher with one active task;
- schedule rows that create one due task at a time;
- provider/database timing telemetry and an optional Neon resource monitor;
- controlled enqueue, claim, complete, and failure routines;
- bounded read views and routine-catalog entries.

The database smoke tests confirmed active-job deduplication, serial claiming,
snapshot recording, completion, and automatic scheduling for a new company
website. Test transactions were rolled back.

## Existing implementation comparison

The current discovery path already calls Firecrawl from
`apps/api/src/evidence-extraction.js` and persists through
`tracker.record_discovery_source_fetch` or `tracker.record_discovery_evidence`.
That path is suitable for discovery-run evidence, but it overwrites one
`(run_id, result_index)` source-fetch row and is not yet a PCompany Markdown
history model.

The existing evidence routine briefly locks its discovery-run row to validate
the selected result. This is not a provider-held lock, but the future PCompany
routine should avoid locking the whole company while it performs validation or
network work.

## Recommendation

Use HTTPS for the Firecrawl provider call, but keep the database write behind
the application server and controlled Postgres routines. Add a short-lived
job lease, immutable Markdown snapshots, a content hash, and a conditional
latest projection. This gives safe concurrent refreshes without introducing a
Reoon-style email identity lock for the company row.

## Repository sources

- `apps/api/src/evidence-extraction.js`: current Firecrawl HTTPS adapter and
  Markdown retrieval.
- `apps/api/src/parcel-discovery.js`: current provider-then-controlled-write
  orchestration.
- `database/migrations/009_discovery_source_fetches.sql`: current bounded source
  persistence routine and upsert behavior.
- `database/migrations/007_discovery_evidence.sql`: current evidence routine and
  short discovery-run validation lock.
- `database/migrations/041_shared_email_identity_lock.sql`: Reoon-specific
  identity lock and active-job uniqueness design.
