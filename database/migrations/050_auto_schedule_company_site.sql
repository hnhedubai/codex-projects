begin;

create or replace function tracker.create_cprofile(
  p_canonical_name text,
  p_legal_name text default null,
  p_display_name text default null,
  p_country_of_registration char(2) default null,
  p_website_url text default null,
  p_primary_domain text default null,
  p_actor text default 'system'
)
returns setof tracker_read.v_cprofiles
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
declare
  created tracker.cprofiles;
begin
  if nullif(trim(p_canonical_name), '') is null then
    raise exception 'A canonical company name is required' using errcode = '22023';
  end if;
  insert into tracker.cprofiles (
    canonical_name, legal_name, display_name, country_of_registration,
    website_url, primary_domain, first_seen_at, last_seen_at
  ) values (
    trim(p_canonical_name), nullif(trim(p_legal_name), ''),
    nullif(trim(p_display_name), ''), upper(nullif(trim(p_country_of_registration), '')),
    nullif(trim(p_website_url), ''), lower(nullif(trim(p_primary_domain), '')), now(), now()
  ) returning * into created;
  if created.website_url is not null then
    perform tracker.schedule_cprofile_firecrawl(created.id, created.website_url, created.website_url, 30);
  end if;
  insert into tracker.audit_events (entity_type, entity_id, event_type, payload)
  values ('organisation', created.id, 'cprofile_created', jsonb_build_object('actor', p_actor, 'canonicalName', created.canonical_name, 'firecrawlScheduled', created.website_url is not null));
  return query select * from tracker_read.v_cprofiles where id = created.id;
end;
$$;

update tracker.routine_catalog
set source_migration = '050_auto_schedule_company_site.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'create_cprofile'
  and routine_kind = 'function';

commit;
