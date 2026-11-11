begin;

do $$
begin
  execute format('alter default privileges for role %I in schema tracker revoke execute on functions from public', current_user);
  execute format('alter default privileges for role %I in schema tracker revoke execute on functions from tracker_runtime', current_user);
  execute format('alter default privileges for role %I in schema tracker_read revoke execute on functions from public', current_user);
  execute format('alter default privileges for role %I in schema tracker_read grant execute on functions to tracker_runtime', current_user);
end;
$$;

commit;
