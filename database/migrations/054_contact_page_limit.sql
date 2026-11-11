begin;

create or replace function tracker_read.list_discovery_contacts(
  p_researcher_id text,
  p_limit integer default 25,
  p_offset integer default 0,
  p_since timestamptz default null,
  p_sort_key text default 'created_at',
  p_sort_direction text default 'asc'
)
returns setof tracker_read.v_discovery_contacts
language plpgsql
stable
security invoker
set search_path = pg_catalog, tracker_read
as $$
declare
  order_column text;
  order_direction text;
begin
  if p_researcher_id is null or length(trim(p_researcher_id)) = 0 then
    raise exception 'A researcher is required for contact retrieval' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 or p_offset > 1000000 then
    raise exception 'Contact page size or offset is outside the allowed range' using errcode = '22023';
  end if;

  order_column := case p_sort_key
    when 'organisation' then 'organisation'
    when 'person_name' then 'person_name'
    when 'role' then 'role'
    when 'department' then 'department'
    when 'email' then 'email'
    when 'phone' then 'phone'
    when 'contact_type' then 'contact_type'
    when 'confidence' then 'confidence'
    when 'verification_status' then 'verification_status'
    when 'email_verification_status' then 'email_verification_status'
    when 'email_verification_score' then 'email_verification_score'
    when 'email_verification_checked_at' then 'email_verification_checked_at'
    when 'email_next_verification_at' then 'email_next_verification_at'
    when 'evidence_excerpt' then 'evidence_excerpt'
    when 'website_url' then 'website_url'
    when 'linkedin_url' then 'linkedin_url'
    when 'source_url' then 'source_url'
    when 'rank' then 'rank'
    when 'created_at' then 'created_at'
    else 'created_at'
  end;
  order_direction := case when lower(p_sort_direction) = 'desc' then 'desc' else 'asc' end;

  return query execute format(
    'select * from tracker_read.v_discovery_contacts
     where researcher_id = $1 and ($2 is null or created_at > $2)
     order by %I %s nulls last, id asc limit $3 offset $4',
    order_column, order_direction
  ) using p_researcher_id, p_since, p_limit, p_offset;
end;
$$;

commit;
