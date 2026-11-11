begin;

revoke usage on schema tracker from public;
revoke usage on schema tracker_read from public;
revoke execute on all functions in schema tracker from public;
revoke execute on all functions in schema tracker_read from public;
revoke execute on procedure tracker.refresh_routine_catalog() from public;
revoke execute on procedure tracker.refresh_discovery_contact_rollups() from public;

alter default privileges in schema tracker
  revoke execute on functions from public;
alter default privileges in schema tracker_read
  revoke execute on functions from public;

commit;
