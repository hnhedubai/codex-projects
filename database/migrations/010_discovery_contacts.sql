begin;

create table if not exists tracker.discovery_contacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references tracker.discovery_runs(id),
  result_index integer not null check (result_index between 0 and 7),
  researcher_id text not null check (length(trim(researcher_id)) > 0),
  contact_type text not null default 'authority_route',
  organisation text,
  department text,
  person_name text,
  role text,
  email text,
  phone text,
  website_url text not null,
  linkedin_url text,
  source_url text not null,
  evidence_excerpt text,
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  verification_status text not null default 'official_source_observation',
  rank integer not null,
  created_at timestamptz not null default now(),
  unique (run_id, result_index, website_url, email, phone)
);

create or replace view tracker_read.v_discovery_contacts as
select id, run_id, result_index, researcher_id, contact_type, organisation,
       department, person_name, role, email, phone, website_url, linkedin_url,
       source_url, evidence_excerpt, confidence, verification_status, rank, created_at
from tracker.discovery_contacts;

create or replace function tracker.record_discovery_contact(
  p_run uuid, p_index integer, p_researcher text, p_contact_type text,
  p_organisation text, p_department text, p_person_name text, p_role text,
  p_email text, p_phone text, p_website_url text, p_linkedin_url text,
  p_source_url text, p_evidence_excerpt text, p_confidence numeric,
  p_verification_status text, p_rank integer
)
returns setof tracker_read.v_discovery_contacts
language plpgsql
as $$
declare v_id uuid;
begin
  if not exists (select 1 from tracker.discovery_runs where id=p_run and researcher_id=p_researcher and status='completed') then
    raise exception 'Select a completed discovery run owned by the researcher' using errcode='22023';
  end if;
  insert into tracker.discovery_contacts(
    run_id,result_index,researcher_id,contact_type,organisation,department,person_name,role,
    email,phone,website_url,linkedin_url,source_url,evidence_excerpt,confidence,verification_status,rank
  ) values (
    p_run,p_index,p_researcher,coalesce(nullif(trim(p_contact_type),''),'authority_route'),
    nullif(trim(p_organisation),''),nullif(trim(p_department),''),nullif(trim(p_person_name),''),nullif(trim(p_role),''),
    nullif(trim(p_email),''),nullif(trim(p_phone),''),trim(p_website_url),nullif(trim(p_linkedin_url),''),trim(p_source_url),
    nullif(trim(p_evidence_excerpt),''),least(greatest(coalesce(p_confidence,.5),0),1),coalesce(nullif(trim(p_verification_status),''),'official_source_observation'),p_rank
  ) on conflict (run_id,result_index,website_url,email,phone) do update set
    organisation=excluded.organisation, department=excluded.department, person_name=excluded.person_name,
    role=excluded.role, source_url=excluded.source_url, evidence_excerpt=excluded.evidence_excerpt,
    confidence=excluded.confidence, verification_status=excluded.verification_status, rank=excluded.rank, created_at=now()
  returning id into v_id;
  insert into tracker.audit_events(entity_type,entity_id,event_type,payload)
  values ('research_run',p_run,'authority_contact_discovered',jsonb_build_object('index',p_index,'sourceUrl',p_source_url,'researcherId',p_researcher,'rank',p_rank));
  return query select * from tracker_read.v_discovery_contacts where id=v_id;
end $$;

commit;
