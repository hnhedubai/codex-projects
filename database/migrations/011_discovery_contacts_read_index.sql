begin;

create index if not exists discovery_contacts_researcher_created_idx
  on tracker.discovery_contacts (researcher_id, created_at desc);

commit;
