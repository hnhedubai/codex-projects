# Company data-structure study

**Date:** 2026-10-08  
**Scope:** Oman tracker and reusable buyer/seller transaction model

**Status:** implemented through migrations 042–051; application UI and future
transaction tables remain separate follow-up work.

## Finding

The repository now contains a database-backed PCompany/company master. Earlier
discovery data still appears in three forms, and the canonical company model
is now the source of truth for new company records:

1. `tracker.discovery_contacts.organisation` is a free-text field attached to
   a discovered contact. It is useful for discovery, but it cannot safely act
   as the canonical company record.
2. `apps/web/public/en590-companies.json` is a static/import-oriented dataset
   with `company`, `type`, `country`, `batch`, `notes`, `website`, and `sources`.
   It is not a normalized transaction or CRM table.
3. `tracker.cprofiles` is the reusable organisation master, with controlled
   routines, read views, Firecrawl snapshots, roles, activities, people,
   external links, and business-line classifications.

The current contact table already preserves provenance through `website_url`,
`source_url`, `evidence_excerpt`, `confidence`, discovery run ownership, and
timestamps. The company model should reuse that provenance pattern rather than
copying a company name into every contact or activity.

## Recommended model

Use a canonical company profile plus append-only or history-aware child tables:

```text
cprofile                         one canonical organisation
  ├── cprofile_names              aliases, former names, trading names
  ├── cprofile_identifiers        registration/tax/LEI/external IDs
  ├── cprofile_addresses          registered, operating, billing locations
  ├── cprofile_roles              buyer, seller, investor, operator, etc.
  ├── cprofile_activities         commercial activities and sectors
  ├── cprofile_relationships      parent, subsidiary, partner, agent, broker
  ├── cprofile_contacts           links canonical companies to contacts
  ├── cprofile_sources            source observations and freshness
  └── cprofile_reviews             merge, verification, rejection decisions
```

The company should not have a single `role` value. A company may be a buyer in
one opportunity, a seller in another, and an operator or adviser in a third.
Roles belong in `cprofile_roles`, with optional project/opportunity/transaction
scope.

## Core company table

```text
cprofile
  id uuid primary key
  canonical_name text not null
  legal_name text
  display_name text
  company_status text                 active, inactive, dissolved, unknown
  legal_form text                     LLC, SA, government entity, etc.
  country_of_registration char(2)
  incorporation_date date
  website_url text
  primary_domain text
  linkedin_url text
  firecrawl_markdown text          latest official-page markdown snapshot
  firecrawl_markdown_at timestamptz
  description text
  identity_confidence numeric
  verification_status text
  first_seen_at timestamptz
  last_seen_at timestamptz
  created_at timestamptz
  updated_at timestamptz
```

Recommended uniqueness is based on verified identifiers or a reviewed
normalized domain/name match. A normalized name alone must not automatically
merge companies because trading names and subsidiaries can collide.

## Commercial activities

```text
cprofile_activities
  id uuid primary key
  company_id uuid not null references cprofile(id)
  activity_type text                 manufacturing, trading, logistics, etc.
  activity_name text not null
  product_or_service text
  sector text
  geography text
  activity_status text               active, historical, planned, unknown
  role_context text                  own_account, intermediary, unclear
  description text
  confidence numeric
  first_seen_at timestamptz
  last_seen_at timestamptz
  created_at timestamptz
  updated_at timestamptz
```

This is the table that Exa, Firecrawl, official websites, registries, and
analyst review can continuously enrich. New observations should update the
current projection and append a source observation; they should not erase the
previous claim or its source.

## Company roles

```text
cprofile_roles
  id uuid primary key
  company_id uuid not null references cprofile(id)
  role_type text not null             buyer, seller, investor, operator, etc.
  scope_type text                     global, project, opportunity, transaction
  scope_id uuid
  role_status text                    claimed, observed, verified, rejected
  confidence numeric
  evidence_id uuid
  valid_from date
  valid_to date
  first_seen_at timestamptz
  last_seen_at timestamptz
  created_at timestamptz
  updated_at timestamptz
```

`role_status` is important: a marketplace listing saying “buyer” is not the
same as an independently verified principal buyer. The system should preserve
the observation while distinguishing claimed, observed, verified, and rejected
roles.

## Transaction readiness

Company identity, commercial activity, role, opportunity, and transaction
terms should remain separate:

```text
cprofile ──< cprofile_roles
cprofile ──< cprofile_activities
cprofile ──< cprofile_contacts
cprofile ──< opportunities ──< transactions
```

An eventual transaction table can reference buyer and seller company IDs,
while contacts remain the people or public routing channels associated with
those companies. This avoids treating a contact name or a discovery listing as
proof of transaction authority.

## Continuous agent updates

Agents should use controlled routines, not direct table writes:

- `upsert_cprofile_observation`: create or suggest a company match.
- `record_cprofile_activity_observation`: add or refresh one activity claim.
- `record_cprofile_role_observation`: add or refresh a scoped company role.
- `record_cprofile_source`: preserve URL, retrieval time, excerpt, and source
  strength.
- `review_cprofile_match`: approve, reject, or merge a possible duplicate.
- `refresh_cprofile_rollups`: maintain counts and current summaries for fast
  dashboard reads.

Exa should primarily discover candidates and intent signals. Firecrawl should
validate bounded official pages and populate the latest
`cprofile.firecrawl_markdown` projection. Each run should also create a source
snapshot containing the URL, retrieval time, Firecrawl run ID, content hash,
and extracted markdown so historical evidence is not lost. Neither should silently promote a company to
verified buyer, seller, or transaction counterparty without evidence and human
review.

## Direct answer

PCompany now has an independent `company_type`, separate sector/business-line
classifications, and a `cprofile_roles` child table. Roles are not stored as a
single column because a company can be a buyer, seller, investor, operator, or
adviser in different scopes. Commercial activities retain source history and
freshness fields.

## Repository sources

- `docs/specs/oman-data-centre-land-mini-crm.md`: defines `cprofile` as the
  reusable organisation master and separates organisations from contacts.
- `database/migrations/010_discovery_contacts.sql`: current free-text
  organisation/contact structure and provenance fields.
- `database/migrations/007_discovery_evidence.sql`: current source-backed
  evidence and audit pattern.
- `database/migrations/005_intent_requests.sql`: current buyer/seller and
  opportunity scope values.
- `apps/web/public/en590-companies.json`: current static company dataset shape.
