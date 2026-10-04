## Problem Statement

The team needs a private, reusable land-allocation mini CRM that identifies viable data-centre parcels and the verified decision-makers needed to progress each opportunity to a signed land allocation, usufruct, or lease agreement. The first project is Oman; future countries and project types must reuse the same system without redesigning the data model.

## Solution

Provide an authenticated research and evaluation application backed by Neon. It manages projects, land parcels, requirements, evidence, organisations, contacts, Reoon verification, JEV rejection review, communication history, tasks, research runs, and rejections. Hard allocation gates require evidence and human approval; transparent scores rank opportunities but never bypass a hard gate.

## User Stories

1. As a Researcher, I want to create a country/project tracker so that Oman data-centre research is separated from future projects.
2. As a Researcher, I want to record a parcel with coordinates, boundary, area, tenure route, zoning evidence, and capacity so that I can assess its suitability.
3. As a Researcher, I want to exclude parcels below 10 MW IT load so that the pipeline focuses on viable data-centre sites.
4. As a Researcher, I want to record utility, fibre, water, environmental, access, and telecom requirement checks so that missing allocation gates are visible.
5. As an Approver, I want a parcel to require evidence for every hard gate so that no score alone qualifies it.
6. As a Relationship Manager, I want organisations and public professional contacts linked to each parcel so that I know who can move the opportunity forward.
7. As a Relationship Manager, I want each contact qualified by official website, role, source, communication channel, and Reoon result so that outreach starts with credible contacts.
8. As a Researcher, I want every discovered email verified by Reoon, including rejected contacts, so that verification is complete and auditable.
9. As a Relationship Manager, I want to draft and log communications, calls, meetings, LinkedIn messages, WhatsApp messages, tasks, and next actions so that relationship progress is not lost.
10. As an Approver, I want formal approval over external outreach and allocation applications so that the application does not act externally on its own.
11. As a Researcher, I want every source and document preserved with its retrieval date and evidence strength so that conclusions are reviewable.
12. As a Researcher, I want Exa and Firecrawl runs logged with scope and outputs so that research is reproducible; Firecrawl is limited to one request per session.
13. As a Researcher, I want rejected parcels, organisations, and contacts retained with reason and reactivation status so that unsuitable records are not rediscovered repeatedly.
14. As a Relationship Manager, I want a contact-led pipeline so that I can move verified people from discovery to allocation outcome.
15. As a user, I want dashboard metrics, map-based parcel comparison, filters, grids, and detail panels so that I can understand the portfolio quickly.
16. As an administrator, I want Researcher, Relationship Manager, and Approver roles so that research, relationship ownership, and decisions are auditable.
17. As a Relationship Manager, I want every system-rejected contact independently reviewed by JEV so that a viable relationship is not lost to an automated rejection.
18. As a Researcher, I want JEV to record advisory votes at reusable contact, organisation, parcel, evidence, and outreach checkpoints so that automated judgements are traceable without bypassing human control.

## Implementation Decisions

- The tracker is private and authenticated with Neon Auth.
- `cprofile` is the reusable organisation master. Authority, operator, utility, carrier, adviser, landowner, and company roles are represented by classification and project links rather than duplicate organisation tables.
- A project owns country-specific parcels, requirement templates, research runs, evaluations, and CRM opportunities.
- A parcel records at least 10 MW IT load, total connected load, deliverable/firm power, backup generation, expansion capacity, coordinates, optional geometry, area, source accuracy, tenure, and lifecycle stage.
- Hard gates are reusable catalogue entries applied to parcels. Status, evidence, conditions, expiry, owner, and next action are stored per gate.
- Evidence is structured and versioned with a source-strength classification: official authority, signed utility/operator confirmation, provider statement, GIS/public proxy, or analyst inference. Immutable originals are stored in the private Neon bucket.
- Contacts store public professional information only. Every email is submitted to Reoon and its result is stored, even for rejected contacts.
- A system-rejected contact is held as `pending_jev_review`. JEV receives the rejection reason and permitted public evidence, records its outcome and evidence, then either confirms the rejection or reactivates the contact. Reoon verification is retained in both outcomes.
- JEV votes use one append-only ledger for system-rejection validation, duplicate resolution, contact readiness, organisation role classification, parcel screening, evidence classification, and outreach-draft review. A vote is advisory and includes its source snapshot, outcome, confidence, reasons, and timestamp.
- Rejections use one generic register with target type, target identifier, reason, evidence, reviewer, date, JEV review status/outcome, and reactivation status.
- Exa is a discovery source. Firecrawl validates official information and is constrained to one request per session. Neither tool qualifies a hard gate without required evidence.
- The CRM flow is `discovered → verified → ready to connect → contacted → engaged → meeting → proposal/application → allocation outcome`.
- The parcel/allocation flow is `identified → screening → evidence gathering → qualified → allocation-ready → submitted → negotiation → allocated / declined / dormant`.
- The GUI provides Dashboard, Parcels/Map, Requirements, Organisations, Contacts, Evidence, Research Runs, and Rejected views.
- All database mutations use explicitly granted routines/functions. Application reads use views; direct base-table access is not granted to application roles.
- External communication, formal applications, cloud deployment, and production schema application remain approval-controlled.

## Testing Decisions

- Test the API boundary: submitted data produces validated records, lifecycle transitions, views, and audit events.
- Test requirement gates, capacity minimum, evidence-strength restrictions, Reoon-result handling, JEV-review handling for system-rejected contacts, reusable JEV vote recording, rejection retention, role permissions, and no-send outreach behavior.
- Test map/parcel and CRM views against seeded records, including empty-result filtering, rejected records, and reactivated records.
- Test schema routines with transactions and verify that read views expose only intended records.
- Verify the deployed preview/dev flow before any production application.

## Out of Scope

- Automatic external email, LinkedIn, WhatsApp, or allocation-application submission.
- Automatic parcel qualification based solely on score.
- Importing other projects, Drive, CRM, or provider accounts without an explicit user-selected source.
- Production deployment before a development branch, verification, and user-approved plan.

## Further Notes

- The initial project is Oman Data Centre Land Tracker; the model must support future countries.
- Land allocation and regulatory information is research and evaluation material, not legal advice.
- All user-supplied credentials remain local and must not be printed or committed.
