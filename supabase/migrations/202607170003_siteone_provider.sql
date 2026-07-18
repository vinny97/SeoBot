begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.crawl_runs add column if not exists provider text not null default 'native';
alter table public.crawl_runs add column if not exists provider_version text;
alter table public.crawl_runs add column if not exists provider_metadata jsonb not null default '{}'::jsonb;
alter table public.crawl_runs add column if not exists completion_reason text;
alter table public.crawl_runs add constraint crawl_runs_provider_check check (provider in ('native','siteone'));
alter table public.crawl_runs add constraint crawl_runs_completion_reason_check check (completion_reason is null or completion_reason in ('completed','page_limit_reached','time_limit_reached','provider_stopped','invalid_report'));
drop index if exists public.crawl_runs_one_active_per_website;
create unique index crawl_runs_one_active_per_provider on public.crawl_runs(website_id,provider) where status in ('queued','running');

alter table public.seo_jobs add column if not exists required_capability text not null default 'native_crawler';
alter table public.seo_jobs add constraint seo_jobs_required_capability_check check (required_capability in ('native_crawler','siteone_crawler'));
create index seo_jobs_capability_queue_idx on public.seo_jobs(required_capability,status,next_attempt_at,priority desc,created_at) where job_type='website_crawl';

alter table public.crawl_page_snapshots alter column crawl_depth drop not null;
alter table public.crawl_page_snapshots drop constraint if exists crawl_page_snapshots_crawl_depth_check;
alter table public.crawl_page_snapshots add constraint crawl_page_snapshots_crawl_depth_check check (crawl_depth is null or crawl_depth between 0 and 4);
alter table public.crawl_page_snapshots drop constraint if exists crawl_page_snapshots_source_type_check;
alter table public.crawl_page_snapshots add constraint crawl_page_snapshots_source_type_check check (source_type in ('start_url','sitemap','internal_link','redirect','manual','provider_report'));

alter table public.worker_heartbeats add column if not exists capabilities text[] not null default '{}';
alter table public.worker_heartbeats add column if not exists provider_versions jsonb not null default '{}'::jsonb;
alter table public.worker_heartbeats add column if not exists runtime text;

create table public.crawl_issue_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  crawl_run_id uuid not null references public.crawl_runs(id) on delete cascade,
  website_page_id uuid references public.website_pages(id) on delete set null,
  fingerprint text not null,
  issue_type text not null,
  severity text not null check (severity in ('error','warning','information')),
  title text not null,
  description text not null,
  recommendation text,
  evidence jsonb not null default '{}'::jsonb,
  provider text not null check (provider in ('native','siteone')),
  created_at timestamptz not null default now(),
  unique(crawl_run_id,fingerprint)
);
create index crawl_issue_observations_run_idx on public.crawl_issue_observations(crawl_run_id,severity);
alter table public.crawl_issue_observations enable row level security;
create policy crawl_issue_observations_select on public.crawl_issue_observations for select to authenticated using (public.can_access_project(project_id));
grant select on public.crawl_issue_observations to authenticated;
grant all on public.crawl_issue_observations to service_role;

create table public.crawler_worker_credentials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 3 and 100),
  token_hash text not null unique check (char_length(token_hash)=64),
  capabilities text[] not null check (capabilities <@ array['native_crawler','siteone_crawler']::text[]),
  enabled boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.crawler_worker_credentials enable row level security;
revoke all on public.crawler_worker_credentials from public,anon,authenticated;
grant all on public.crawler_worker_credentials to service_role;

create table public.siteone_allowed_projects (
  project_id uuid primary key references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.siteone_allowed_projects enable row level security;
revoke all on public.siteone_allowed_projects from public,anon,authenticated;
grant all on public.siteone_allowed_projects to service_role;

create or replace function public.crawler_worker_credential_id(worker_token text, required_capability text)
returns uuid language plpgsql security definer set search_path='' as $$
declare credential_id uuid;
begin
  if worker_token is null or char_length(worker_token)<32 then return null; end if;
  select id into credential_id from public.crawler_worker_credentials
  where token_hash=encode(extensions.digest(worker_token,'sha256'),'hex')
    and enabled and revoked_at is null and required_capability=any(capabilities);
  if credential_id is not null then update public.crawler_worker_credentials set last_used_at=now() where id=credential_id; end if;
  return credential_id;
end; $$;
revoke all on function public.crawler_worker_credential_id(text,text) from public,anon,authenticated;

create or replace function public.register_siteone_worker(worker_token text, claiming_worker_id text, siteone_version text, worker_runtime text default 'raspberry_pi')
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  insert into public.worker_heartbeats(worker_id,worker_type,status,current_job_id,last_heartbeat_at,capabilities,provider_versions,runtime)
  values(left(claiming_worker_id,200),'crawler','idle',null,now(),array['siteone_crawler'],jsonb_build_object('siteone',left(siteone_version,100)),left(worker_runtime,100))
  on conflict(worker_id) do update set status='idle',current_job_id=null,last_heartbeat_at=now(),capabilities=excluded.capabilities,provider_versions=excluded.provider_versions,runtime=excluded.runtime;
  return true;
end; $$;

create or replace function public.claim_next_siteone_job(worker_token text, claiming_worker_id text, lock_minutes integer default 10)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; run public.crawl_runs%rowtype; site public.websites%rowtype;
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  select * into job from public.seo_jobs where job_type='website_crawl' and required_capability='siteone_crawler'
    and attempt_count<max_attempts and coalesce(next_attempt_at,scheduled_for,created_at)<=now()
    and (status='queued' or (status='running' and lock_expires_at<now()))
    order by priority desc,created_at for update skip locked limit 1;
  if not found then return null; end if;
  if job.cancel_requested_at is not null then
    update public.seo_jobs set status='cancelled',completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=job.id;
    update public.crawl_runs set status='cancelled',completed_at=now(),completion_reason='provider_stopped' where id=job.crawl_run_id;
    return null;
  end if;
  update public.seo_jobs set status='running',worker_id=left(claiming_worker_id,200),locked_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15)),heartbeat_at=now(),started_at=coalesce(started_at,now()),attempt_count=attempt_count+1 where id=job.id returning * into job;
  update public.crawl_runs set status='running',started_at=coalesce(started_at,now()),heartbeat_at=now() where id=job.crawl_run_id returning * into run;
  if run.provider<>'siteone' or not exists(select 1 from public.siteone_allowed_projects where project_id=run.project_id) then raise exception 'siteone_project_not_allowed'; end if;
  select * into site from public.websites where id=run.website_id;
  update public.worker_heartbeats set status='working',current_job_id=job.id,last_heartbeat_at=now() where worker_id=left(claiming_worker_id,200);
  return jsonb_build_object('job_id',job.id,'crawl_run_id',run.id,'project_id',run.project_id,'website_id',site.id,'url',site.url,'attempt',job.attempt_count,'max_attempts',job.max_attempts,'max_pages',least(run.max_pages,50),'max_depth',least(run.max_depth,4),'configuration',run.configuration);
end; $$;

create or replace function public.heartbeat_siteone_job(worker_token text, target_job_id uuid, claiming_worker_id text, phase text, counters jsonb default '{}'::jsonb, lock_minutes integer default 10)
returns boolean language plpgsql security definer set search_path='' as $$
declare run_id uuid;
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  update public.seo_jobs set heartbeat_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15))
  where id=target_job_id and worker_id=left(claiming_worker_id,200) and status='running' and required_capability='siteone_crawler' returning crawl_run_id into run_id;
  if run_id is null then return false; end if;
  update public.crawl_runs set heartbeat_at=now(),current_url=left(phase,2048),pages_fetched=coalesce((counters->>'pages_fetched')::integer,pages_fetched),pages_succeeded=coalesce((counters->>'pages_succeeded')::integer,pages_succeeded),pages_failed=coalesce((counters->>'pages_failed')::integer,pages_failed),issues_found=coalesce((counters->>'issues_found')::integer,issues_found) where id=run_id;
  update public.worker_heartbeats set status='working',current_job_id=target_job_id,last_heartbeat_at=now() where worker_id=left(claiming_worker_id,200);
  return true;
end; $$;

create or replace function public.import_siteone_batch(worker_token text, target_job_id uuid, claiming_worker_id text, page_batch jsonb, issue_batch jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; run public.crawl_runs%rowtype; item jsonb; page_id uuid; snapshot_id uuid; imported_pages integer:=0; imported_issues integer:=0;
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  if jsonb_typeof(page_batch)<>'array' or jsonb_array_length(page_batch)>10 or jsonb_typeof(issue_batch)<>'array' or jsonb_array_length(issue_batch)>100 then raise exception 'invalid_import_batch'; end if;
  select * into job from public.seo_jobs where id=target_job_id and worker_id=left(claiming_worker_id,200) and status='running' and required_capability='siteone_crawler';
  if not found then raise exception 'job_not_owned'; end if;
  select * into run from public.crawl_runs where id=job.crawl_run_id and provider='siteone';
  for item in select value from jsonb_array_elements(page_batch) loop
    if char_length(coalesce(item->>'normalised_url',''))>2048 or coalesce(item->>'normalised_url','')='' then raise exception 'invalid_page_url'; end if;
    insert into public.website_pages(project_id,website_id,url,normalised_url,path,page_type,last_seen_crawl_id,last_seen_at)
    values(run.project_id,run.website_id,left(coalesce(item->>'requested_url',item->>'normalised_url'),2048),left(item->>'normalised_url',2048),left(coalesce(item->>'path','/'),2048),coalesce(item->>'page_type','unknown'),run.id,now())
    on conflict(website_id,normalised_url) do nothing returning id into page_id;
    if page_id is null then select id into page_id from public.website_pages where website_id=run.website_id and normalised_url=item->>'normalised_url'; end if;
    insert into public.crawl_page_snapshots(crawl_run_id,website_page_id,requested_url,normalised_url,final_url,http_status,content_type,response_time_ms,response_bytes,redirect_count,title,meta_description,canonical_url,robots_meta,x_robots_tag,indexable,indexability_reason,h1_count,h2_count,word_count,language,structured_data_types,fetch_error_code,fetch_error_message,crawl_depth,source_type)
    values(run.id,page_id,left(coalesce(item->>'requested_url',item->>'normalised_url'),2048),left(item->>'normalised_url',2048),left(item->>'final_url',2048),(item->>'http_status')::integer,left(item->>'content_type',200),(item->>'response_time_ms')::integer,(item->>'response_bytes')::integer,coalesce((item->>'redirect_count')::integer,0),left(item->>'title',1000),left(item->>'meta_description',2000),left(item->>'canonical_url',2048),coalesce(array(select jsonb_array_elements_text(item->'robots_meta')),'{}'),coalesce(array(select jsonb_array_elements_text(item->'x_robots_tag')),'{}'),(item->>'indexable')::boolean,left(item->>'indexability_reason',500),(item->>'h1_count')::integer,(item->>'h2_count')::integer,(item->>'word_count')::integer,left(item->>'language',50),coalesce(array(select jsonb_array_elements_text(item->'structured_data_types')),'{}'),left(item->>'fetch_error_code',200),left(item->>'fetch_error_message',1000),null,'provider_report')
    on conflict(crawl_run_id,normalised_url) do update set website_page_id=excluded.website_page_id,final_url=excluded.final_url,http_status=excluded.http_status,content_type=excluded.content_type,response_time_ms=excluded.response_time_ms,response_bytes=excluded.response_bytes,redirect_count=excluded.redirect_count,title=excluded.title,meta_description=excluded.meta_description,canonical_url=excluded.canonical_url,robots_meta=excluded.robots_meta,x_robots_tag=excluded.x_robots_tag,indexable=excluded.indexable,indexability_reason=excluded.indexability_reason,h1_count=excluded.h1_count,h2_count=excluded.h2_count,word_count=excluded.word_count,language=excluded.language,structured_data_types=excluded.structured_data_types,fetch_error_code=excluded.fetch_error_code,fetch_error_message=excluded.fetch_error_message returning id into snapshot_id;
    delete from public.page_headings where crawl_page_snapshot_id=snapshot_id;
    insert into public.page_headings(crawl_page_snapshot_id,website_page_id,heading_level,heading_text,position)
    select snapshot_id,page_id,(h->>'level')::integer,left(h->>'text',500),ordinality-1 from jsonb_array_elements(coalesce(item->'headings','[]'::jsonb)) with ordinality as heading(h,ordinality) where (h->>'level')::integer in (1,2) limit 100;
    imported_pages:=imported_pages+1;
  end loop;
  for item in select value from jsonb_array_elements(issue_batch) loop
    insert into public.crawl_issue_observations(project_id,website_id,crawl_run_id,fingerprint,issue_type,severity,title,description,recommendation,evidence,provider)
    values(run.project_id,run.website_id,run.id,left(item->>'fingerprint',64),left(item->>'issue_type',200),coalesce(item->>'severity','warning'),left(item->>'title',500),left(item->>'description',2000),left(item->>'recommendation',2000),coalesce(item->'evidence','{}'::jsonb),'siteone')
    on conflict(crawl_run_id,fingerprint) do update set severity=excluded.severity,title=excluded.title,description=excluded.description,recommendation=excluded.recommendation,evidence=excluded.evidence;
    imported_issues:=imported_issues+1;
  end loop;
  update public.crawl_runs set pages_fetched=(select count(*) from public.crawl_page_snapshots where crawl_run_id=run.id),pages_succeeded=(select count(*) from public.crawl_page_snapshots where crawl_run_id=run.id and http_status between 200 and 399 and fetch_error_code is null),pages_failed=(select count(*) from public.crawl_page_snapshots where crawl_run_id=run.id and (http_status>=400 or fetch_error_code is not null)),issues_found=(select count(*) from public.crawl_issue_observations where crawl_run_id=run.id),heartbeat_at=now() where id=run.id;
  return jsonb_build_object('pages',imported_pages,'issues',imported_issues);
end; $$;

create or replace function public.complete_siteone_job(worker_token text, target_job_id uuid, claiming_worker_id text, final_status text, reason text, siteone_version text, metadata jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare run_id uuid; site_id uuid;
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  if final_status not in ('completed','completed_with_warnings') or reason not in ('completed','page_limit_reached','time_limit_reached','provider_stopped','invalid_report') then raise exception 'invalid_completion'; end if;
  update public.seo_jobs set status='completed',progress=100,completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=target_job_id and worker_id=left(claiming_worker_id,200) and status='running' and required_capability='siteone_crawler' returning crawl_run_id into run_id;
  if run_id is null then return false; end if;
  update public.crawl_runs set status=final_status,completion_reason=reason,provider_version=left(siteone_version,100),provider_metadata=coalesce(metadata,'{}'::jsonb),completed_at=now(),heartbeat_at=now(),current_url=null where id=run_id returning website_id into site_id;
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=left(claiming_worker_id,200);
  return true;
end; $$;

create or replace function public.fail_siteone_job(worker_token text, target_job_id uuid, claiming_worker_id text, safe_error text, retryable boolean)
returns text language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; new_status text;
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  select * into job from public.seo_jobs where id=target_job_id and worker_id=left(claiming_worker_id,200) and status='running' and required_capability='siteone_crawler' for update;
  if not found then return 'not_owned'; end if;
  new_status:=case when retryable and job.attempt_count<job.max_attempts then 'queued' else 'failed' end;
  update public.seo_jobs set status=new_status,error_message=left(safe_error,1000),next_attempt_at=case when new_status='queued' then now()+make_interval(mins=>power(2,attempt_count)::integer) else null end,worker_id=null,locked_at=null,lock_expires_at=null,completed_at=case when new_status='failed' then now() else null end where id=job.id;
  update public.crawl_runs set status=new_status,error_summary=left(safe_error,1000),completion_reason=case when new_status='failed' then 'provider_stopped' else null end,completed_at=case when new_status='failed' then now() else null end,current_url=null where id=job.crawl_run_id;
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=left(claiming_worker_id,200);
  return new_status;
end; $$;

create or replace function public.enqueue_internal_siteone_crawl(target_website_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare site public.websites%rowtype; run_id uuid;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service_role_required'; end if;
  select * into site from public.websites where id=target_website_id;
  if not found or site.crawl_authorised_at is null or not exists(select 1 from public.siteone_allowed_projects where project_id=site.project_id) then raise exception 'siteone_project_not_allowed'; end if;
  if exists(select 1 from public.crawl_runs where website_id=site.id and provider='siteone' and status in ('queued','running')) then raise exception 'crawl_already_active'; end if;
  insert into public.crawl_runs(project_id,website_id,status,trigger_type,max_pages,max_depth,provider,configuration)
  values(site.project_id,site.id,'queued','manual',50,4,'siteone',jsonb_build_object('internal_only',true)) returning id into run_id;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,crawl_run_id,max_attempts,dedupe_key,next_attempt_at,required_capability)
  values(site.project_id,'website_crawl','queued',90,0,jsonb_build_object('website_id',site.id,'crawl_run_id',run_id),run_id,3,'siteone:'||site.id::text,now(),'siteone_crawler');
  return run_id;
end; $$;

create or replace function public.claim_next_crawl_job(claiming_worker_id text, lock_minutes integer default 5)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; run public.crawl_runs%rowtype; site public.websites%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  select * into job from public.seo_jobs where job_type='website_crawl' and required_capability='native_crawler' and attempt_count<max_attempts and coalesce(next_attempt_at,scheduled_for,created_at)<=now() and (status='queued' or (status='running' and lock_expires_at<now())) order by priority desc,created_at for update skip locked limit 1;
  if not found then return null; end if;
  if job.cancel_requested_at is not null then update public.seo_jobs set status='cancelled',completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=job.id;update public.crawl_runs set status='cancelled',completed_at=now(),completion_reason='provider_stopped' where id=job.crawl_run_id;return null;end if;
  update public.seo_jobs set status='running',worker_id=left(claiming_worker_id,200),locked_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15)),heartbeat_at=now(),started_at=coalesce(started_at,now()),attempt_count=attempt_count+1 where id=job.id returning * into job;
  update public.crawl_runs set status='running',started_at=coalesce(started_at,now()),heartbeat_at=now() where id=job.crawl_run_id returning * into run;
  select * into site from public.websites where id=run.website_id;
  update public.websites set analysis_status='running',analysis_error=null where id=site.id;
  insert into public.worker_heartbeats(worker_id,worker_type,status,current_job_id,last_heartbeat_at,capabilities,runtime) values(left(claiming_worker_id,200),'crawler','working',job.id,now(),array['native_crawler'],'render') on conflict(worker_id) do update set status='working',current_job_id=job.id,last_heartbeat_at=now(),capabilities=excluded.capabilities,runtime=excluded.runtime;
  return jsonb_build_object('job_id',job.id,'crawl_run_id',run.id,'project_id',run.project_id,'website_id',site.id,'url',site.url,'attempt',job.attempt_count,'max_attempts',job.max_attempts,'max_pages',run.max_pages,'max_depth',run.max_depth,'configuration',run.configuration);
end; $$;

revoke all on function public.register_siteone_worker(text,text,text,text),public.claim_next_siteone_job(text,text,integer),public.heartbeat_siteone_job(text,uuid,text,text,jsonb,integer),public.import_siteone_batch(text,uuid,text,jsonb,jsonb),public.complete_siteone_job(text,uuid,text,text,text,text,jsonb),public.fail_siteone_job(text,uuid,text,text,boolean) from public,authenticated;
grant execute on function public.register_siteone_worker(text,text,text,text),public.claim_next_siteone_job(text,text,integer),public.heartbeat_siteone_job(text,uuid,text,text,jsonb,integer),public.import_siteone_batch(text,uuid,text,jsonb,jsonb),public.complete_siteone_job(text,uuid,text,text,text,text,jsonb),public.fail_siteone_job(text,uuid,text,text,boolean) to anon,service_role;
revoke all on function public.enqueue_internal_siteone_crawl(uuid) from public,anon,authenticated;
grant execute on function public.enqueue_internal_siteone_crawl(uuid) to service_role;

commit;
