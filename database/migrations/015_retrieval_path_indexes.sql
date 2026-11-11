begin;

create index if not exists research_projects_created_idx
  on tracker.research_projects (created_at desc);

create index if not exists parcels_created_idx
  on tracker.parcels (created_at desc);

create index if not exists parcels_project_created_idx
  on tracker.parcels (research_project_id, created_at desc);

create index if not exists discovery_runs_project_researcher_created_idx
  on tracker.discovery_runs (research_project_id, researcher_id, created_at desc);

create index if not exists discovery_runs_researcher_status_idx
  on tracker.discovery_runs (researcher_id, status, created_at desc);

create index if not exists discovery_promotions_project_researcher_created_idx
  on tracker.discovery_promotions (research_project_id, researcher_id, created_at desc);

create index if not exists audit_events_entity_occurred_idx
  on tracker.audit_events (entity_type, entity_id, occurred_at desc);

commit;
