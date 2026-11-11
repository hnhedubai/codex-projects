begin;

revoke execute on procedure tracker.reconcile_rollups() from public, tracker_runtime;

alter default privileges in schema tracker
  revoke execute on functions from public;
alter default privileges in schema tracker_read
  revoke execute on functions from public;

commit;
