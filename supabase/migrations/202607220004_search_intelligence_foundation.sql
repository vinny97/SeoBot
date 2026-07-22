begin;

-- Rich page evidence remains attached to the immutable crawl snapshot. The
-- promoted website_pages row only carries the small fields needed for lists.
alter table public.crawl_page_snapshots
  add column if not exists main_content text,
  add column if not exists author text,
  add column if not exists published_at timestamptz,
  add column if not exists modified_at timestamptz,
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists incoming_internal_link_count integer not null default 0,
  add column if not exists outgoing_internal_link_count integer not null default 0,
  add column if not exists internal_anchor_texts text[] not null default '{}';

alter table public.page_headings drop constraint if exists page_headings_heading_level_check;
alter table public.page_headings add constraint page_headings_heading_level_check check (heading_level between 1 and 6);

alter table public.website_pages drop constraint if exists website_pages_page_type_check;
alter table public.website_pages add constraint website_pages_page_type_check check (page_type in (
  'homepage','service','product','pricing','location','category','comparison','alternative','feature','use_case',
  'blog_index','blog_article','guide','faq','contact','about','legal','login','application','other','unknown'
));

create or replace function public.set_snapshot_fallback_content_hash()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.content_hash is null and new.content_type ilike 'text/html%' then new.content_hash:=encode(extensions.digest(regexp_replace(coalesce(new.title,'')||' '||coalesce(new.meta_description,'')||' '||coalesce(new.canonical_url,''),'\s+',' ','g'),'sha256'),'hex'); end if;
  return new;
end; $$;
create trigger set_snapshot_fallback_content_hash before insert or update of title,meta_description,canonical_url,content_hash on public.crawl_page_snapshots for each row execute function public.set_snapshot_fallback_content_hash();

create table public.page_intelligence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  website_page_id uuid not null references public.website_pages(id) on delete cascade,
  crawl_run_id uuid references public.crawl_runs(id) on delete set null,
  page_snapshot_id uuid references public.crawl_page_snapshots(id) on delete set null,
  analysis_version text not null,
  content_hash text not null,
  page_type text not null default 'unknown',
  primary_topic text,
  secondary_topics text[] not null default '{}',
  search_intent text not null default 'unknown' check (search_intent in ('informational','commercial','transactional','navigational','local','mixed','unknown')),
  funnel_stage text not null default 'unknown' check (funnel_stage in ('awareness','consideration','decision','retention','unknown')),
  products_services text[] not null default '{}',
  locations text[] not null default '{}',
  audience_types text[] not null default '{}',
  page_purpose_summary text,
  content_quality_score integer check (content_quality_score between 0 and 100),
  content_completeness_score integer check (content_completeness_score between 0 and 100),
  recommended_target_query text,
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  evidence jsonb not null default '{}'::jsonb,
  analysis_status text not null default 'completed' check (analysis_status in ('pending','completed','failed')),
  analysis_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_page_id,content_hash,analysis_version)
);
create index page_intelligence_project_idx on public.page_intelligence(project_id,website_id,created_at desc);
create index page_intelligence_page_idx on public.page_intelligence(website_page_id,created_at desc);
create index page_intelligence_topic_idx on public.page_intelligence(website_id,primary_topic);
create trigger set_page_intelligence_updated_at before update on public.page_intelligence for each row execute function public.set_updated_at();

create table public.gsc_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  google_account_email text,
  property_url text,
  property_type text check (property_type is null or property_type in ('domain','url_prefix')),
  permission_level text,
  encrypted_refresh_token jsonb,
  credential_version integer not null default 1,
  granted_scopes text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','connected','syncing','needs_reauthentication','error','disconnected')),
  last_connected_at timestamptz,
  last_synced_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error_code text,
  last_error_message text,
  sync_cursor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (website_id)
);
create index gsc_connections_project_idx on public.gsc_connections(project_id,status);
create trigger set_gsc_connections_updated_at before update on public.gsc_connections for each row execute function public.set_updated_at();

create table public.gsc_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  code_verifier text not null,
  connection_id uuid references public.gsc_connections(id) on delete cascade,
  available_properties jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index gsc_oauth_sessions_user_idx on public.gsc_oauth_sessions(user_id,expires_at desc);

create table public.gsc_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.gsc_connections(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid references public.seo_jobs(id) on delete set null,
  sync_type text not null check (sync_type in ('initial','daily')),
  start_date date not null,
  end_date date not null,
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  rows_imported integer not null default 0,
  cursor jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gsc_sync_runs_connection_idx on public.gsc_sync_runs(connection_id,created_at desc);
create trigger set_gsc_sync_runs_updated_at before update on public.gsc_sync_runs for each row execute function public.set_updated_at();

create table public.gsc_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.gsc_connections(id) on delete cascade,
  date date not null,
  search_type text not null default 'web',
  clicks numeric(16,4) not null default 0,
  impressions numeric(16,4) not null default 0,
  ctr numeric(12,8) not null default 0,
  position numeric(12,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id,date,search_type)
);
create table public.gsc_query_metrics (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.gsc_connections(id) on delete cascade,
  date date not null,
  query text not null,
  clicks numeric(16,4) not null default 0,
  impressions numeric(16,4) not null default 0,
  ctr numeric(12,8) not null default 0,
  position numeric(12,4) not null default 0,
  device text not null default 'all',
  country text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id,date,query,device,country)
);
create table public.gsc_page_metrics (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.gsc_connections(id) on delete cascade,
  date date not null,
  page_url text not null,
  normalised_page_url text not null,
  website_page_id uuid references public.website_pages(id) on delete set null,
  clicks numeric(16,4) not null default 0,
  impressions numeric(16,4) not null default 0,
  ctr numeric(12,8) not null default 0,
  position numeric(12,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id,date,page_url)
);
create table public.gsc_query_page_metrics (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.gsc_connections(id) on delete cascade,
  date date not null,
  query text not null,
  page_url text not null,
  normalised_page_url text not null,
  website_page_id uuid references public.website_pages(id) on delete set null,
  clicks numeric(16,4) not null default 0,
  impressions numeric(16,4) not null default 0,
  ctr numeric(12,8) not null default 0,
  position numeric(12,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id,date,query,page_url)
);
create index gsc_daily_metrics_date_idx on public.gsc_daily_metrics(connection_id,date desc);
create index gsc_query_metrics_query_idx on public.gsc_query_metrics(connection_id,query,date desc);
create index gsc_page_metrics_page_idx on public.gsc_page_metrics(connection_id,website_page_id,date desc);
create index gsc_query_page_metrics_query_idx on public.gsc_query_page_metrics(connection_id,query,website_page_id,date desc);
do $$ declare table_name text; begin
  foreach table_name in array array['gsc_daily_metrics','gsc_query_metrics','gsc_page_metrics','gsc_query_page_metrics'] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',table_name,table_name);
  end loop;
end $$;

create table public.seo_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('technical_fix','improve_existing_page','create_commercial_page','create_supporting_content','merge_pages','add_internal_links','improve_click_through_rate','investigate_page_decline','ignore')),
  status text not null default 'suggested' check (status in ('suggested','approved','rejected','planned','in_progress','ready_for_review','completed','measuring','dismissed','superseded')),
  priority_score numeric(8,4) not null default 0,
  confidence text not null check (confidence in ('low','medium','high')),
  title text not null,
  summary text not null,
  reason text not null,
  recommended_action text not null,
  target_page_id uuid references public.website_pages(id) on delete set null,
  target_url text,
  related_page_ids uuid[] not null default '{}',
  target_queries text[] not null default '{}',
  evidence jsonb not null default '{}'::jsonb,
  score_components jsonb not null default '{}'::jsonb,
  expected_impact text not null check (expected_impact in ('low','medium','high')),
  estimated_effort text not null check (estimated_effort in ('low','medium','high')),
  risk_level text not null check (risk_level in ('low','medium','high')),
  source_versions jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  is_best_next_action boolean not null default false,
  plan_horizon text check (plan_horizon is null or plan_horizon in ('this_week','next','later')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,
  unique(website_id,fingerprint)
);
create index seo_recommendations_work_idx on public.seo_recommendations(project_id,status,priority_score desc);
create unique index seo_recommendations_one_best on public.seo_recommendations(website_id) where is_best_next_action and status not in ('rejected','dismissed','completed','superseded');
create trigger set_seo_recommendations_updated_at before update on public.seo_recommendations for each row execute function public.set_updated_at();

create or replace function public.validate_search_intelligence_scope()
returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.projects p where p.id=new.project_id and p.workspace_id=new.workspace_id) or not exists(select 1 from public.websites w where w.id=new.website_id and w.project_id=new.project_id) then raise exception 'search_intelligence_scope_mismatch'; end if;
  if tg_table_name='gsc_connections' and not exists(select 1 from public.workspace_members m where m.workspace_id=new.workspace_id and m.user_id=(to_jsonb(new)->>'user_id')::uuid) then raise exception 'gsc_user_not_workspace_member'; end if;
  if tg_table_name='page_intelligence' and not exists(select 1 from public.website_pages p where p.id=(to_jsonb(new)->>'website_page_id')::uuid and p.website_id=new.website_id and p.project_id=new.project_id) then raise exception 'page_intelligence_page_mismatch'; end if;
  return new;
end; $$;
create trigger validate_page_intelligence_scope before insert or update of workspace_id,project_id,website_id,website_page_id on public.page_intelligence for each row execute function public.validate_search_intelligence_scope();
create trigger validate_gsc_connection_scope before insert or update of workspace_id,project_id,website_id,user_id on public.gsc_connections for each row execute function public.validate_search_intelligence_scope();
create trigger validate_gsc_oauth_scope before insert or update of workspace_id,project_id,website_id on public.gsc_oauth_sessions for each row execute function public.validate_search_intelligence_scope();
create trigger validate_seo_recommendation_scope before insert or update of workspace_id,project_id,website_id on public.seo_recommendations for each row execute function public.validate_search_intelligence_scope();

-- Search-intelligence jobs share the proven queue, locking and heartbeat model.
alter table public.seo_jobs drop constraint if exists seo_jobs_required_capability_check;
alter table public.seo_jobs add constraint seo_jobs_required_capability_check check (required_capability in ('native_crawler','siteone_crawler','search_intelligence'));
create unique index seo_jobs_active_dedupe_idx on public.seo_jobs(dedupe_key) where dedupe_key is not null and status in ('queued','running','waiting_for_input','waiting_for_approval');
create index seo_jobs_intelligence_queue_idx on public.seo_jobs(status,next_attempt_at,priority desc,created_at) where required_capability='search_intelligence';

alter table public.page_intelligence enable row level security;
alter table public.gsc_connections enable row level security;
alter table public.gsc_oauth_sessions enable row level security;
alter table public.gsc_sync_runs enable row level security;
alter table public.gsc_daily_metrics enable row level security;
alter table public.gsc_query_metrics enable row level security;
alter table public.gsc_page_metrics enable row level security;
alter table public.gsc_query_page_metrics enable row level security;
alter table public.seo_recommendations enable row level security;

create policy page_intelligence_select on public.page_intelligence for select to authenticated using (public.can_access_project(project_id));
create policy gsc_sync_runs_select on public.gsc_sync_runs for select to authenticated using (public.can_access_project(project_id));
create policy seo_recommendations_select on public.seo_recommendations for select to authenticated using (public.can_access_project(project_id));
create policy gsc_daily_metrics_select on public.gsc_daily_metrics for select to authenticated using (exists(select 1 from public.gsc_connections c where c.id=connection_id and public.can_access_project(c.project_id)));
create policy gsc_query_metrics_select on public.gsc_query_metrics for select to authenticated using (exists(select 1 from public.gsc_connections c where c.id=connection_id and public.can_access_project(c.project_id)));
create policy gsc_page_metrics_select on public.gsc_page_metrics for select to authenticated using (exists(select 1 from public.gsc_connections c where c.id=connection_id and public.can_access_project(c.project_id)));
create policy gsc_query_page_metrics_select on public.gsc_query_page_metrics for select to authenticated using (exists(select 1 from public.gsc_connections c where c.id=connection_id and public.can_access_project(c.project_id)));

-- Tokens and transient OAuth material are service-role only. Browser-facing code
-- receives an explicit safe projection from server routes.
revoke all on public.gsc_connections,public.gsc_oauth_sessions from authenticated,anon;
grant select on public.page_intelligence,public.gsc_sync_runs,public.gsc_daily_metrics,public.gsc_query_metrics,public.gsc_page_metrics,public.gsc_query_page_metrics,public.seo_recommendations to authenticated;
grant all on public.page_intelligence,public.gsc_connections,public.gsc_oauth_sessions,public.gsc_sync_runs,public.gsc_daily_metrics,public.gsc_query_metrics,public.gsc_page_metrics,public.gsc_query_page_metrics,public.seo_recommendations to service_role;

create or replace function public.set_recommendation_decision(target_recommendation_id uuid, decision text)
returns boolean language plpgsql security definer set search_path='' as $$
declare rec public.seo_recommendations%rowtype; next_status text;
begin
  select * into rec from public.seo_recommendations where id=target_recommendation_id for update;
  if not found or not public.can_access_project(rec.project_id) then raise exception 'recommendation_not_found'; end if;
  if decision not in ('approve','reject','not_relevant','review_later') then raise exception 'invalid_recommendation_decision'; end if;
  next_status:=case decision when 'approve' then 'approved' when 'review_later' then 'suggested' when 'reject' then 'rejected' else 'dismissed' end;
  update public.seo_recommendations set status=next_status,reviewed_at=now(),dismissed_at=case when next_status='dismissed' then now() else null end,is_best_next_action=case when next_status in ('rejected','dismissed') then false else is_best_next_action end where id=rec.id;
  insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata)
  values(rec.project_id,case when next_status='approved' then 'recommendation_approved' else 'recommendation_rejected' end,case when next_status='approved' then 'Recommended work approved' else 'Recommended work reviewed' end,rec.title,'completed','seo_recommendation',rec.id,jsonb_build_object('decision',decision));
  return true;
end; $$;
revoke all on function public.set_recommendation_decision(uuid,text) from public,anon;
grant execute on function public.set_recommendation_decision(uuid,text) to authenticated;

create or replace function public.claim_next_intelligence_job(claiming_worker_id text, lock_minutes integer default 5)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  select * into job from public.seo_jobs where required_capability='search_intelligence' and attempt_count<max_attempts and coalesce(next_attempt_at,scheduled_for,created_at)<=now() and (status='queued' or (status='running' and lock_expires_at<now())) order by priority desc,created_at for update skip locked limit 1;
  if not found then return null; end if;
  if job.cancel_requested_at is not null then update public.seo_jobs set status='cancelled',completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=job.id; return null; end if;
  update public.seo_jobs set status='running',worker_id=left(claiming_worker_id,200),locked_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15)),heartbeat_at=now(),started_at=coalesce(started_at,now()),attempt_count=attempt_count+1 where id=job.id returning * into job;
  update public.worker_heartbeats set status='working',current_job_id=job.id,last_heartbeat_at=now() where worker_id=claiming_worker_id;
  return jsonb_build_object('job_id',job.id,'project_id',job.project_id,'job_type',job.job_type,'input_payload',job.input_payload,'attempt',job.attempt_count,'max_attempts',job.max_attempts);
end; $$;

create or replace function public.heartbeat_intelligence_job(target_job_id uuid, claiming_worker_id text, job_progress integer, output jsonb default null, lock_minutes integer default 5)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  update public.seo_jobs set heartbeat_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15)),progress=least(99,greatest(0,job_progress)),output_payload=case when output is null then output_payload else output end where id=target_job_id and worker_id=claiming_worker_id and status='running';
  return found;
end; $$;

create or replace function public.complete_intelligence_job(target_job_id uuid, claiming_worker_id text, output jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  update public.seo_jobs set status='completed',progress=100,output_payload=coalesce(output,'{}'::jsonb),completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=target_job_id and worker_id=claiming_worker_id and status='running';
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=claiming_worker_id;
  return found;
end; $$;

create or replace function public.fail_intelligence_job(target_job_id uuid, claiming_worker_id text, safe_error text, retryable boolean)
returns text language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; next_status text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  select * into job from public.seo_jobs where id=target_job_id and worker_id=claiming_worker_id and status='running' for update;
  if not found then return 'not_owned'; end if;
  next_status:=case when retryable and job.attempt_count<job.max_attempts then 'queued' else 'failed' end;
  update public.seo_jobs set status=next_status,error_message=left(safe_error,1000),next_attempt_at=case when next_status='queued' then now()+make_interval(mins=>power(2,job.attempt_count)::integer) else null end,worker_id=null,locked_at=null,lock_expires_at=null,completed_at=case when next_status='failed' then now() else null end where id=job.id;
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=claiming_worker_id;
  return next_status;
end; $$;
revoke all on function public.claim_next_intelligence_job(text,integer),public.heartbeat_intelligence_job(uuid,text,integer,jsonb,integer),public.complete_intelligence_job(uuid,text,jsonb),public.fail_intelligence_job(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_next_intelligence_job(text,integer),public.heartbeat_intelligence_job(uuid,text,integer,jsonb,integer),public.complete_intelligence_job(uuid,text,jsonb),public.fail_intelligence_job(uuid,text,text,boolean) to service_role;

create or replace function public.enqueue_due_gsc_syncs()
returns integer language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,max_attempts,dedupe_key,next_attempt_at,required_capability)
  select c.project_id,'gsc_daily_sync','queued',75,0,jsonb_build_object('connection_id',c.id,'website_id',c.website_id),5,'gsc-daily:'||c.id::text||':'||current_date::text,now(),'search_intelligence'
  from public.gsc_connections c where c.status='connected' and (c.last_successful_sync_at is null or c.last_successful_sync_at<now()-interval '20 hours')
  on conflict do nothing;
  get diagnostics changed=row_count;
  return changed;
end; $$;
revoke all on function public.enqueue_due_gsc_syncs() from public,anon,authenticated;
grant execute on function public.enqueue_due_gsc_syncs() to service_role;

create or replace function public.enqueue_intelligence_after_crawl()
returns trigger language plpgsql security definer set search_path='' as $$
declare source_hash text;
begin
  if new.status in ('completed','completed_with_warnings') and old.status is distinct from new.status and not coalesce((new.configuration->>'internal_comparison')::boolean,false) and not coalesce((new.configuration->>'internal_crawler_lab')::boolean,false) then
    select encode(extensions.digest(coalesce(string_agg(coalesce(content_hash,''),'' order by normalised_url),''),'sha256'),'hex') into source_hash from public.crawl_page_snapshots where crawl_run_id=new.id;
    insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,max_attempts,dedupe_key,next_attempt_at,required_capability)
    values(new.project_id,'page_intelligence_analysis','queued',90,0,jsonb_build_object('website_id',new.website_id,'crawl_run_id',new.id,'source_hash',source_hash),3,'page-intelligence:'||new.id::text||':'||coalesce(source_hash,''),now(),'search_intelligence') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger enqueue_intelligence_after_crawl after update of status on public.crawl_runs for each row execute function public.enqueue_intelligence_after_crawl();

create or replace function public.enqueue_intelligence_after_promotion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.official_crawl_run_id is not null and new.official_crawl_run_id is distinct from old.official_crawl_run_id then
    insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,max_attempts,dedupe_key,next_attempt_at,required_capability)
    values(new.project_id,'page_intelligence_analysis','queued',92,0,jsonb_build_object('website_id',new.id,'crawl_run_id',new.official_crawl_run_id,'source','crawler_lab_promotion'),3,'page-intelligence:promotion:'||new.official_crawl_run_id::text,now(),'search_intelligence') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger enqueue_intelligence_after_promotion after update of official_crawl_run_id on public.websites for each row execute function public.enqueue_intelligence_after_promotion();

insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,max_attempts,dedupe_key,next_attempt_at,required_capability)
select w.project_id,'page_intelligence_analysis','queued',60,0,jsonb_build_object('website_id',w.id,'crawl_run_id',coalesce(w.official_crawl_run_id,r.id),'source','migration_backfill'),3,'page-intelligence:backfill:'||coalesce(w.official_crawl_run_id,r.id)::text,now(),'search_intelligence'
from public.websites w left join lateral(select id from public.crawl_runs where website_id=w.id and status in ('completed','completed_with_warnings') order by completed_at desc nulls last,created_at desc limit 1) r on true
where coalesce(w.official_crawl_run_id,r.id) is not null on conflict do nothing;

commit;
