# Company profile and provider-task boundary

**Status:** accepted

The tracker uses `tracker.cprofiles` as the canonical company master, with
separate tables for company type, sector/business-line classifications, roles,
activities, people, external links, highlights, and source snapshots. Exa,
Firecrawl, and Reoon are called only by application agents/workers over HTTPS;
controlled SQL routines own durable writes, deduplication, leases, schedules,
and audit history. Firecrawl work is serialized through a schedule and task
queue because the current provider mode is limited; provider calls never run
inside a database transaction or while a company row is held locked. Reoon
continues to use its separate shared-email identity lock because its invariant
is one verification per normalized email, not one company task at a time.
