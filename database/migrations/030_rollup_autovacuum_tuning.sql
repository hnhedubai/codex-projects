begin;

alter table tracker.workspace_rollups set (
  autovacuum_vacuum_threshold = 5,
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_analyze_threshold = 1,
  autovacuum_analyze_scale_factor = 0
);

alter table tracker.discovery_contact_rollups set (
  autovacuum_vacuum_threshold = 5,
  autovacuum_vacuum_scale_factor = 0,
  autovacuum_analyze_threshold = 1,
  autovacuum_analyze_scale_factor = 0
);

commit;
