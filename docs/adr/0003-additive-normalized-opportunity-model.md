# Additive normalized opportunity model

**Status:** accepted

## Decision

The tracker keeps `tracker.cprofiles` as the canonical company/account master
and `tracker.discovery_contacts` as the existing contact-profile master. New
business facts and opportunity state are added in purpose-built child tables;
neither master is widened or repurposed.

The additive model has four boundaries:

- `cprofile_date_facts` stores source-backed dates such as establishment year.
- `cprofile_relationships` stores directed, evidence-backed company-to-company
  relationships.
- `intent_company_candidates` stores the fact that a company is being assessed
  for a specific research intent and role.
- `intent_company_candidate_evidence` stores the Exa, Firecrawl,
  official-source, or analyst observations supporting that assessment.

`tracker_read` views are the application read boundary. Controlled tracker
functions perform inserts, deduplication, status transitions, and audit events.
An Exa result may populate an establishment year only when the source states it
explicitly; otherwise the value remains unknown rather than being inferred.

## Consequences

- One company can participate in many projects and intents without duplicate
  company rows.
- Candidate qualification and engagement status are not confused with a
  company's global role or company type.
- Evidence can be retained and reviewed without overwriting the source fact.
- The Accounts and Contacts UI can consume stable read views while the source
  tables remain normalized.
- Existing PCompany and contact-profile records remain untouched.

## Rejected alternatives

- Adding `established_year`, buyer readiness, or project-specific status to
  `tracker.cprofiles` would mix canonical identity with contextual observations.
- Storing company relationships or candidate evidence in JSON columns would
  weaken foreign keys, deduplication, and targeted retrieval.
- Duplicating `discovery_contacts` for each intent would break the shared
  contact and email-verification model.
