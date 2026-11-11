# Oman Tracker agent registry

**Updated:** 2026-10-06  
**Purpose:** Keep agent names, single-purpose activities, implementation status and hand-off boundaries explicit.

## Current agents

There are three agents in the current Oman Tracker workflow. Defined means the responsibility and contract are documented; implemented means the port-9500 application can execute that responsibility today.

| Agent | Single activity | Input | Output | Status | Next hand-off |
|---|---|---|---|---|---|
| `ExaSearchAgent` | Run one bounded Exa discovery search for the saved intent and preserve raw result provenance. | Project, intent, geography, keywords, target MW | Query, rank, title, URL, publisher, excerpt, dates, retrieval time, run ID | **Implemented** in `apps/api/src/parcel-discovery.js`; direct Exa REST adapter | `EvidenceExtractionAgent` receives selected official URLs |
| `EvidenceExtractionAgent` | Scrape one selected official page with a bounded Firecrawl JSON schema and preserve source-backed evidence; it does not discover broadly, rank or promote parcels. | Completed run ID, result index, selected official URL | Canonical URL, page type, structured evidence fields, exact excerpt, document links, extraction time | **Implemented** in `apps/api/src/evidence-extraction.js`; persisted through `tracker.record_discovery_evidence` | Human review receives the extracted observation |

## Current execution boundary

1. `ExaSearchAgent` runs from the tracker's discovery request. It returns at most eight official-domain results and stores the search query, result payload and retrieval metadata.
2. A result is a lead, not a confirmed parcel, allocation, power connection or investment approval.
3. `EvidenceExtractionAgent` is invoked only for an explicitly selected URL and a bounded schema. It preserves the original page evidence and extraction time; the Firecrawl adapter is kept inside this single-purpose agent rather than creating a second orchestration layer.
4. Human review remains required before a result is promoted to a candidate parcel or treated as a cleared hard gate.

## Planned agents (not counted as active)

These names are reserved in the Agent-Activation design document but are not currently autonomous services:

- `WebsiteUrlAgent` - validate the official website URL and canonical redirects.
- `LinkedInCompanyAgent` - validate a public organisation LinkedIn URL.
- `DomainMxAgent` - verify domain and mail-exchange records.
- `SourceAuthorityAgent` - classify publisher authority for the claim type.
- `FirecrawlValidationAgent` - reserved for a future separate validation adapter if validation becomes independently reusable; the current bounded Firecrawl call is owned by `EvidenceExtractionAgent`.
- `CandidateScoringAgent` - rank candidates against the saved intent and hard gates.
- `JEVAdvisoryAgent` - record append-only advisory review; never approve a deal or clear a gate.

These agents must remain single-purpose. They should be activated only after their input/output contract, persistence location, failure state and provenance fields are implemented and tested.

## Documentation rule

Every new agent or material responsibility change must be added here before implementation. Each entry must name one activity, its input, output, status and next hand-off. Research notes remain source-specific; this registry is the cross-agent index.
