begin;

create or replace function tracker.link_cprofile_contact(
  p_company_id uuid,
  p_contact_id uuid,
  p_relationship_type text default 'professional_contact',
  p_source_url text default null,
  p_evidence_excerpt text default null
)
returns table (company_id uuid, contact_id uuid, relationship_type text, source_url text, evidence_excerpt text, linked_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, tracker
as $$
begin
  if not exists (select 1 from tracker.cprofiles where id = p_company_id) then
    raise exception 'Company profile was not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from tracker.discovery_contacts where id = p_contact_id) then
    raise exception 'Contact was not found' using errcode = 'P0002';
  end if;
  insert into tracker.cprofile_contacts (company_id, contact_id, relationship_type, source_url, evidence_excerpt)
  values (p_company_id, p_contact_id, coalesce(p_relationship_type, 'professional_contact'), nullif(trim(p_source_url), ''), nullif(trim(p_evidence_excerpt), ''))
  on conflict on constraint cprofile_contacts_contact_id_key do update set
    company_id = excluded.company_id,
    relationship_type = excluded.relationship_type,
    source_url = excluded.source_url,
    evidence_excerpt = excluded.evidence_excerpt,
    linked_at = now();
  return query select link.company_id, link.contact_id, link.relationship_type, link.source_url, link.evidence_excerpt, link.linked_at
  from tracker.cprofile_contacts link where link.company_id = p_company_id and link.contact_id = p_contact_id;
end;
$$;

update tracker.routine_catalog
set source_migration = '043_fix_cprofile_contact_link.sql', updated_at = now()
where routine_schema = 'tracker'
  and routine_name = 'link_cprofile_contact'
  and routine_kind = 'function';

commit;
