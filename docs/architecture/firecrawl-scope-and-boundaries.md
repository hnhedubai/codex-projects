# Firecrawl scope and SQL/agent boundaries

## Purpose

Firecrawl is the bounded official-web evidence collector for the tracker. It
retrieves public pages as Markdown and, when requested, returns structured
facts from the same scrape request. It is not the company master, a buyer
qualification engine, an email verifier, or an approval authority.

## Firecrawl scope

Firecrawl may:

- fetch one explicitly selected public HTTPS page per job;
- use an allowlisted official company, authority, project, or publisher URL;
- return page Markdown for preservation and later review;
- return structured facts that are explicitly stated on the page;
- identify page-linked social, registry, and external account URLs;
- identify named people and explicitly stated job titles;
- identify stated company type, activities, sectors, business lines, roles,
  projects, markets, and highlights;
- provide page metadata and retrieval time.

Firecrawl must not:

- crawl an entire domain or download the full web;
- access authenticated pages, forms, private data, or credentials;
- infer that a company is an authorized buyer, seller, or decision-maker;
- infer an employee's authority from a name or generic title;
- verify email syntax, MX, SMTP, deliverability, or mailbox status;
- approve a role, transaction, project, or commercial claim;
- overwrite historical evidence;
- call Neon directly or receive database credentials.

Test-mode operational limit: the current dispatcher processes exactly one
Firecrawl task at a time. The schedule/task claim routine enforces serial
dispatch; the provider request itself runs after the claim transaction has
ended. This is deliberately stricter than the provider's two-call maximum.

## Agent/worker responsibilities

The Firecrawl adapter and worker own network and interpretation work:

1. Claim a short-lived job through
   `tracker.claim_cprofile_firecrawl_job`.
2. Call Firecrawl over HTTPS with Markdown plus the bounded four-field company
   business schema when company cleaning is explicitly requested, or
   Markdown-only for a basic source fetch.
3. Validate the provider response and reject empty or malformed Markdown.
4. Compute a content hash and normalize bounded extracted arrays.
5. Omit empty or placeholder company-cleaning values, including an unstated
   future direction; do not manufacture a replacement value.
6. Call controlled SQL routines to persist the snapshot and extracted facts.
7. Retry provider failures through
   `tracker.fail_cprofile_firecrawl_job`.
8. Emit operational events without exposing API keys or raw provider secrets.

Current modules:

- `apps/api/src/evidence-extraction.js`: Firecrawl HTTPS adapter.
- `apps/api/src/cprofile-firecrawl-worker.js`: serial worker and extraction
  hand-off. It runs one provider task per cycle.
- `apps/api/src/parcel-discovery.js`: bounded discovery-source fetching for
  land evidence.

## SQL/database responsibilities

SQL owns durable state, integrity, concurrency, and controlled DML:

| Database responsibility | Controlled object |
|---|---|
| Company master | `tracker.cprofiles` |
| Company type | `cprofiles.company_type` |
| Sector hierarchy | `tracker.sector_taxonomy` |
| Company sector/business-line links | `tracker.cprofile_business_lines` |
| Commercial activities | `tracker.cprofile_activities` |
| Company roles | `tracker.cprofile_roles` |
| Named employee observations | `tracker.cprofile_people` |
| Website/social/registry links | `tracker.cprofile_external_links` |
| Highlights | `tracker.cprofile_highlights` |
| Raw Markdown history | `tracker.cprofile_source_snapshots` |
| Latest Markdown projection | `cprofiles.firecrawl_markdown` |
| Firecrawl queue and lease | `tracker.cprofile_firecrawl_jobs` |
| Company read model | `tracker_read.v_cprofiles` and child views |

SQL routines validate required fields, enforce enums and uniqueness, preserve
source references, deduplicate content, update the latest projection only for
newer retrievals, and record audit events.

SQL must not:

- call Firecrawl, Reoon, Exa, or JEV over the network;
- hold a company row lock while a provider request is running;
- decide that a source-backed role is verified;
- merge companies solely from a similar name;
- delete old Markdown or source evidence.

## Provider separation

```text
Exa       = bounded discovery and candidate/source finding
Firecrawl = official-page retrieval and source-backed extraction
Reoon     = real email/MX/SMTP deliverability verification
JEV       = advisory review of roles, evidence, duplicates, and rejection claims
Human     = final authority for identity, commercial status, outreach, and deals
```

For an employee email discovered by Firecrawl, the agent stores the named
person and evidence first. The email then goes through the shared Reoon email
identity cache; the same normalized email must never be submitted once per
employee or company.

## Status semantics

Firecrawl output is initially an observation:

- company type: `observed` until reviewed where material;
- sector/business line: `observed` or `claimed` unless independently confirmed;
- company role: `observed`, `claimed`, or `needs_human_review`;
- employee title: `observed` only when named and explicitly stated;
- external link: `officially_linked` when linked from the official page;
- highlight: source-backed summary, not an approval.

JEV may confirm, reject, or request more evidence, but it cannot approve a
transaction, authorize outreach, or replace human decision-making.

## Current implementation evidence

- Migrations `042`–`048` define the company, activity, role, taxonomy,
  Markdown, people, highlight, external-link, and Firecrawl-job schema.
- `tracker.claim_cprofile_firecrawl_job` enforces the single-active-task cap.
- `tracker.enqueue_due_cprofile_firecrawl_jobs` converts one due schedule into
  one task, and the serial claim routine allows only one active provider task.
- `tracker.cprofile_firecrawl_task_metrics` records provider latency, database
  write latency, total latency, status, and safe error metadata.
- `apps/api/src/neon-resource-monitor.js` optionally reads Neon project usage
  without performing writes when explicit monitoring configuration exists.
- `tracker.complete_cprofile_firecrawl_job` stores Markdown snapshots and the
  latest projection.
- `tracker.record_cprofile_person_observation` stores named employee roles with
  source evidence.
- Reoon remains the provider for real MX and deliverability verification.
