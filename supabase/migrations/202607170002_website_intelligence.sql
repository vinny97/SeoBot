begin;

alter table public.websites add column if not exists crawl_authorised_at timestamptz;
alter table public.websites drop constraint if exists websites_analysis_status_check;
alter table public.websites add constraint websites_analysis_status_check check (analysis_status in ('not_started','queued','running','completed','completed_with_warnings','failed'));

create table public.crawl_settings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null unique references public.websites(id) on delete cascade,
  max_pages integer not null default 50 check (max_pages between 1 and 50),
  max_depth integer not null default 4 check (max_depth between 0 and 4),
  concurrency integer not null default 2 check (concurrency between 1 and 2),
  request_delay_ms integer not null default 750 check (request_delay_ms between 250 and 10000),
  respect_robots boolean not null default true,
  include_subdomains boolean not null default false check (include_subdomains = false),
  query_parameter_policy text not null default 'strip_tracking' check (query_parameter_policy in ('strip_tracking')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.crawl_runs (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade, created_by uuid references auth.users(id) on delete set null,
  status text not null check (status in ('queued','running','completed','completed_with_warnings','failed','cancelled')),
  trigger_type text not null check (trigger_type in ('onboarding','manual','retry','future_scheduled')),
  max_pages integer not null check (max_pages between 1 and 50), max_depth integer not null check (max_depth between 0 and 4),
  pages_discovered integer not null default 0 check (pages_discovered >= 0), pages_queued integer not null default 0 check (pages_queued >= 0),
  pages_fetched integer not null default 0 check (pages_fetched >= 0), pages_succeeded integer not null default 0 check (pages_succeeded >= 0),
  pages_failed integer not null default 0 check (pages_failed >= 0), pages_skipped integer not null default 0 check (pages_skipped >= 0),
  issues_found integer not null default 0 check (issues_found >= 0), current_url text, heartbeat_at timestamptz, started_at timestamptz,
  completed_at timestamptz, cancel_requested_at timestamptz, error_summary text, configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index crawl_runs_one_active_per_website on public.crawl_runs(website_id) where status in ('queued','running');
create index crawl_runs_website_created_idx on public.crawl_runs(website_id,created_at desc);
create index crawl_runs_project_status_idx on public.crawl_runs(project_id,status);
create index crawl_runs_heartbeat_idx on public.crawl_runs(heartbeat_at) where status='running';

alter table public.seo_jobs add column if not exists crawl_run_id uuid references public.crawl_runs(id) on delete cascade;
alter table public.seo_jobs add column if not exists worker_id text;
alter table public.seo_jobs add column if not exists locked_at timestamptz;
alter table public.seo_jobs add column if not exists lock_expires_at timestamptz;
alter table public.seo_jobs add column if not exists heartbeat_at timestamptz;
alter table public.seo_jobs add column if not exists cancel_requested_at timestamptz;
alter table public.seo_jobs add column if not exists max_attempts integer not null default 3 check (max_attempts between 1 and 10);
alter table public.seo_jobs add column if not exists next_attempt_at timestamptz;
alter table public.seo_jobs add column if not exists dedupe_key text;
alter table public.seo_jobs drop constraint if exists seo_jobs_project_id_job_type_key;
update public.seo_jobs set status='waiting_for_input',progress=null where job_type='prepare_website_review' and status in ('queued','running');
create or replace function public.prevent_placeholder_crawl_progress() returns trigger language plpgsql set search_path='' as $$ begin if new.job_type='prepare_website_review' then new.status:='waiting_for_input';new.progress:=null;end if;return new;end; $$;
create trigger prevent_placeholder_crawl_progress before insert or update on public.seo_jobs for each row execute function public.prevent_placeholder_crawl_progress();
create unique index seo_jobs_crawl_run_unique on public.seo_jobs(crawl_run_id) where crawl_run_id is not null;
create index seo_jobs_crawl_queue_idx on public.seo_jobs(status,next_attempt_at,scheduled_for,priority desc,created_at) where job_type='website_crawl';
create index seo_jobs_stale_lock_idx on public.seo_jobs(lock_expires_at) where status='running' and job_type='website_crawl';

create table public.website_pages (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade, url text not null, normalised_url text not null, final_url text,
  path text, page_type text not null default 'unknown' check (page_type in ('homepage','product','service','pricing','blog_index','blog_article','location','about','contact','legal','login','other','unknown')),
  latest_http_status integer, latest_content_type text, latest_title text, latest_meta_description text, latest_canonical_url text,
  latest_indexable boolean, latest_indexability_reason text, latest_h1_count integer, latest_h2_count integer, latest_word_count integer,
  latest_language text, latest_content_hash text, latest_structured_data_types text[] not null default '{}',
  last_seen_crawl_id uuid references public.crawl_runs(id) on delete set null, first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(website_id,normalised_url)
);
create index website_pages_project_idx on public.website_pages(project_id,website_id);
create index website_pages_search_idx on public.website_pages(website_id,page_type,latest_http_status,latest_indexable);

create table public.crawl_page_snapshots (
  id uuid primary key default gen_random_uuid(), crawl_run_id uuid not null references public.crawl_runs(id) on delete cascade,
  website_page_id uuid references public.website_pages(id) on delete set null, requested_url text not null, normalised_url text not null,
  final_url text, http_status integer, content_type text, response_time_ms integer, response_bytes integer, redirect_count integer not null default 0,
  title text, meta_description text, canonical_url text, robots_meta text[] not null default '{}', x_robots_tag text[] not null default '{}',
  indexable boolean, indexability_reason text, h1_count integer, h2_count integer, word_count integer, language text,
  structured_data_types text[] not null default '{}', content_hash text, fetch_error_code text, fetch_error_message text,
  crawl_depth integer not null check (crawl_depth between 0 and 4), source_type text not null check (source_type in ('start_url','sitemap','internal_link','redirect','manual')),
  created_at timestamptz not null default now(), unique(crawl_run_id,normalised_url)
);
create index crawl_snapshots_run_idx on public.crawl_page_snapshots(crawl_run_id,created_at);
create index crawl_snapshots_page_idx on public.crawl_page_snapshots(website_page_id,created_at desc);

create table public.page_headings (
  id uuid primary key default gen_random_uuid(), crawl_page_snapshot_id uuid not null references public.crawl_page_snapshots(id) on delete cascade,
  website_page_id uuid references public.website_pages(id) on delete set null, heading_level integer not null check (heading_level in (1,2)),
  heading_text text not null check (char_length(heading_text) between 1 and 500), position integer not null check (position between 0 and 99), created_at timestamptz not null default now(),
  unique(crawl_page_snapshot_id,heading_level,position)
);
create index page_headings_snapshot_idx on public.page_headings(crawl_page_snapshot_id);

create table public.page_links (
  id uuid primary key default gen_random_uuid(), crawl_run_id uuid not null references public.crawl_runs(id) on delete cascade,
  crawl_page_snapshot_id uuid not null references public.crawl_page_snapshots(id) on delete cascade,
  source_page_id uuid references public.website_pages(id) on delete set null, target_page_id uuid references public.website_pages(id) on delete set null,
  target_url text not null, normalised_target_url text, link_type text not null check (link_type in ('internal','external','mailto','telephone','fragment','unsupported')),
  anchor_text text check (char_length(anchor_text) <= 500), rel_values text[] not null default '{}', is_followed boolean not null default false,
  created_at timestamptz not null default now(), unique(crawl_page_snapshot_id,target_url,link_type)
);
create index page_links_run_idx on public.page_links(crawl_run_id);
create index page_links_source_idx on public.page_links(source_page_id);
create index page_links_target_idx on public.page_links(target_page_id);
create index page_links_normalised_target_idx on public.page_links(normalised_target_url);

create table public.sitemaps (
  id uuid primary key default gen_random_uuid(), crawl_run_id uuid not null references public.crawl_runs(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade, url text not null,
  sitemap_type text not null default 'unknown' check (sitemap_type in ('index','urlset','unknown')), http_status integer, url_count integer check (url_count is null or url_count >= 0),
  content_hash text, last_modified_max timestamptz, fetch_error_code text, fetch_error_message text, created_at timestamptz not null default now(),
  unique(crawl_run_id,url)
);

create table public.robots_snapshots (
  id uuid primary key default gen_random_uuid(), crawl_run_id uuid not null unique references public.crawl_runs(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade, url text not null, http_status integer, content text check (char_length(content) <= 500000),
  content_hash text, fetch_error_code text, fetch_error_message text, fetched_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table public.robots_rules (
  id uuid primary key default gen_random_uuid(), robots_snapshot_id uuid not null references public.robots_snapshots(id) on delete cascade,
  user_agent text not null check (char_length(user_agent) <= 200), directive text not null check (directive in ('allow','disallow','sitemap','crawl-delay','other')),
  value text check (char_length(value) <= 2000), position integer not null check (position >= 0), created_at timestamptz not null default now(),
  unique(robots_snapshot_id,position)
);

create table public.seo_issues (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade, website_page_id uuid references public.website_pages(id) on delete set null,
  crawl_run_id uuid not null references public.crawl_runs(id) on delete cascade, fingerprint text not null, issue_type text not null,
  severity text not null check (severity in ('error','warning','information')), title text not null, description text not null, recommendation text,
  evidence jsonb not null default '{}'::jsonb, status text not null default 'open' check (status in ('open','resolved','ignored')),
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), resolved_at timestamptz,
  ignored_at timestamptz, ignored_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(website_id,fingerprint)
);
create index seo_issues_project_open_idx on public.seo_issues(project_id,website_id,severity,status);
create index seo_issues_page_idx on public.seo_issues(website_page_id,status);
create index seo_issues_run_idx on public.seo_issues(crawl_run_id);

create table public.worker_heartbeats (
  worker_id text primary key, worker_type text not null check (worker_type='crawler'), status text not null check (status in ('starting','idle','working','stopping','offline')),
  current_job_id uuid references public.seo_jobs(id) on delete set null, last_heartbeat_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$ declare table_name text; begin
  foreach table_name in array array['crawl_settings','crawl_runs','website_pages','seo_issues','worker_heartbeats']
  loop execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',table_name,table_name); end loop;
end $$;

alter table public.crawl_settings enable row level security;
alter table public.crawl_runs enable row level security;
alter table public.website_pages enable row level security;
alter table public.crawl_page_snapshots enable row level security;
alter table public.page_headings enable row level security;
alter table public.page_links enable row level security;
alter table public.sitemaps enable row level security;
alter table public.robots_snapshots enable row level security;
alter table public.robots_rules enable row level security;
alter table public.seo_issues enable row level security;
alter table public.worker_heartbeats enable row level security;

create policy crawl_settings_select on public.crawl_settings for select to authenticated using (exists(select 1 from public.websites w where w.id=website_id and public.can_access_project(w.project_id)));
create policy crawl_settings_update on public.crawl_settings for update to authenticated using (exists(select 1 from public.websites w where w.id=website_id and public.can_access_project(w.project_id))) with check (max_pages<=50 and max_depth<=4 and concurrency<=2 and request_delay_ms>=250 and include_subdomains=false);
create policy crawl_runs_select on public.crawl_runs for select to authenticated using (public.can_access_project(project_id));
create policy website_pages_select on public.website_pages for select to authenticated using (public.can_access_project(project_id));
create policy snapshots_select on public.crawl_page_snapshots for select to authenticated using (exists(select 1 from public.crawl_runs r where r.id=crawl_run_id and public.can_access_project(r.project_id)));
create policy headings_select on public.page_headings for select to authenticated using (exists(select 1 from public.crawl_page_snapshots s join public.crawl_runs r on r.id=s.crawl_run_id where s.id=crawl_page_snapshot_id and public.can_access_project(r.project_id)));
create policy links_select on public.page_links for select to authenticated using (exists(select 1 from public.crawl_runs r where r.id=crawl_run_id and public.can_access_project(r.project_id)));
create policy sitemaps_select on public.sitemaps for select to authenticated using (exists(select 1 from public.crawl_runs r where r.id=crawl_run_id and public.can_access_project(r.project_id)));
create policy robots_snapshots_select on public.robots_snapshots for select to authenticated using (exists(select 1 from public.crawl_runs r where r.id=crawl_run_id and public.can_access_project(r.project_id)));
create policy robots_rules_select on public.robots_rules for select to authenticated using (exists(select 1 from public.robots_snapshots rs join public.crawl_runs r on r.id=rs.crawl_run_id where rs.id=robots_snapshot_id and public.can_access_project(r.project_id)));
create policy seo_issues_select on public.seo_issues for select to authenticated using (public.can_access_project(project_id));

grant select,update on public.crawl_settings to authenticated;
grant select on public.crawl_runs,public.website_pages,public.crawl_page_snapshots,public.page_headings,public.page_links,public.sitemaps,public.robots_snapshots,public.robots_rules,public.seo_issues to authenticated;
revoke insert,update,delete on public.seo_jobs from authenticated;
drop policy if exists seo_jobs_insert on public.seo_jobs;
drop policy if exists seo_jobs_update on public.seo_jobs;
drop policy if exists seo_jobs_delete on public.seo_jobs;
revoke update on public.websites from authenticated;
grant update(url,normalised_url,domain,display_name,crawl_authorised_at) on public.websites to authenticated;
grant all on public.crawl_settings,public.crawl_runs,public.website_pages,public.crawl_page_snapshots,public.page_headings,public.page_links,public.sitemaps,public.robots_snapshots,public.robots_rules,public.seo_issues,public.worker_heartbeats to service_role;

create or replace function public.enqueue_website_crawl(target_website_id uuid, requested_trigger text)
returns uuid language plpgsql security definer set search_path='' as $$
declare w public.websites%rowtype; settings public.crawl_settings%rowtype; run_id uuid; recent_count integer; latest_manual timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into w from public.websites where id=target_website_id;
  if not found or not public.can_access_project(w.project_id) then raise exception 'website_not_found'; end if;
  if w.crawl_authorised_at is null then raise exception 'crawl_authorisation_required'; end if;
  if requested_trigger not in ('onboarding','manual','retry') then raise exception 'invalid_trigger'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_website_id::text,1));
  if exists(select 1 from public.crawl_runs where website_id=target_website_id and status in ('queued','running')) then raise exception 'crawl_already_active'; end if;
  if requested_trigger='manual' then
    select count(*),max(created_at) into recent_count,latest_manual from public.crawl_runs where website_id=target_website_id and trigger_type='manual' and created_at>now()-interval '24 hours';
    if recent_count>=3 then raise exception 'daily_crawl_limit'; end if;
    if latest_manual>now()-interval '10 minutes' then raise exception 'crawl_cooldown'; end if;
  end if;
  insert into public.crawl_settings(website_id) values(target_website_id) on conflict(website_id) do nothing;
  select * into settings from public.crawl_settings where website_id=target_website_id;
  insert into public.crawl_runs(project_id,website_id,created_by,status,trigger_type,max_pages,max_depth,configuration)
  values(w.project_id,w.id,auth.uid(),'queued',requested_trigger,least(settings.max_pages,50),least(settings.max_depth,4),jsonb_build_object('concurrency',least(settings.concurrency,2),'request_delay_ms',greatest(settings.request_delay_ms,250),'respect_robots',settings.respect_robots,'include_subdomains',false,'query_parameter_policy',settings.query_parameter_policy)) returning id into run_id;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,crawl_run_id,max_attempts,dedupe_key,next_attempt_at)
  values(w.project_id,'website_crawl','queued',100,0,jsonb_build_object('website_id',w.id,'crawl_run_id',run_id),run_id,3,'crawl:'||w.id::text,now());
  update public.websites set analysis_status='queued',analysis_error=null where id=w.id;
  insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata)
  values(w.project_id,'crawl_requested','Website analysis requested','A low-rate public website crawl was added to the worker queue.','in_progress','crawl_run',run_id,jsonb_build_object('crawl_run_id',run_id));
  return run_id;
end; $$;
revoke all on function public.enqueue_website_crawl(uuid,text) from public,anon;
grant execute on function public.enqueue_website_crawl(uuid,text) to authenticated;

create or replace function public.request_crawl_cancellation(target_run_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
  select project_id into pid from public.crawl_runs where id=target_run_id;
  if pid is null or not public.can_access_project(pid) then raise exception 'crawl_not_found'; end if;
  update public.crawl_runs set cancel_requested_at=coalesce(cancel_requested_at,now()) where id=target_run_id and status in ('queued','running');
  update public.seo_jobs set cancel_requested_at=coalesce(cancel_requested_at,now()) where crawl_run_id=target_run_id and status in ('queued','running');
  return found;
end; $$;
revoke all on function public.request_crawl_cancellation(uuid) from public,anon;
grant execute on function public.request_crawl_cancellation(uuid) to authenticated;

create or replace function public.set_issue_ignored(target_issue_id uuid, should_ignore boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
  select project_id into pid from public.seo_issues where id=target_issue_id;
  if pid is null or not public.can_access_project(pid) then raise exception 'issue_not_found'; end if;
  update public.seo_issues set status=case when should_ignore then 'ignored' else 'open' end,ignored_at=case when should_ignore then now() else null end,ignored_by=case when should_ignore then auth.uid() else null end where id=target_issue_id;
  return found;
end; $$;
revoke all on function public.set_issue_ignored(uuid,boolean) from public,anon;
grant execute on function public.set_issue_ignored(uuid,boolean) to authenticated;

create or replace function public.claim_next_crawl_job(claiming_worker_id text, lock_minutes integer default 5)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; run public.crawl_runs%rowtype; site public.websites%rowtype; settings public.crawl_settings%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  select * into job from public.seo_jobs where job_type='website_crawl' and attempt_count<max_attempts and coalesce(next_attempt_at,scheduled_for,created_at)<=now() and (status='queued' or (status='running' and lock_expires_at<now())) order by priority desc,created_at for update skip locked limit 1;
  if not found then return null; end if;
  if job.cancel_requested_at is not null then
    update public.seo_jobs set status='cancelled',completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=job.id;
    update public.crawl_runs set status='cancelled',completed_at=now() where id=job.crawl_run_id;
    return null;
  end if;
  update public.seo_jobs set status='running',worker_id=left(claiming_worker_id,200),locked_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15)),heartbeat_at=now(),started_at=coalesce(started_at,now()),attempt_count=attempt_count+1 where id=job.id returning * into job;
  update public.crawl_runs set status='running',started_at=coalesce(started_at,now()),heartbeat_at=now() where id=job.crawl_run_id returning * into run;
  select * into site from public.websites where id=run.website_id;
  select * into settings from public.crawl_settings where website_id=site.id;
  update public.websites set analysis_status='running',analysis_error=null where id=site.id;
  insert into public.worker_heartbeats(worker_id,worker_type,status,current_job_id,last_heartbeat_at) values(left(claiming_worker_id,200),'crawler','working',job.id,now()) on conflict(worker_id) do update set status='working',current_job_id=job.id,last_heartbeat_at=now();
  return jsonb_build_object('job_id',job.id,'crawl_run_id',run.id,'project_id',run.project_id,'website_id',site.id,'url',site.url,'attempt',job.attempt_count,'max_attempts',job.max_attempts,'max_pages',run.max_pages,'max_depth',run.max_depth,'configuration',run.configuration);
end; $$;

create or replace function public.heartbeat_crawl_job(target_job_id uuid, claiming_worker_id text, counters jsonb, active_url text default null, lock_minutes integer default 5)
returns boolean language plpgsql security definer set search_path='' as $$
declare run_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  update public.seo_jobs set heartbeat_at=now(),lock_expires_at=now()+make_interval(mins=>least(greatest(lock_minutes,1),15)),progress=least(99,greatest(0,coalesce((counters->>'progress')::integer,progress))) where id=target_job_id and worker_id=claiming_worker_id and status='running' returning crawl_run_id into run_id;
  if run_id is null then return false; end if;
  update public.crawl_runs set heartbeat_at=now(),current_url=left(active_url,2048),pages_discovered=coalesce((counters->>'pages_discovered')::integer,pages_discovered),pages_queued=coalesce((counters->>'pages_queued')::integer,pages_queued),pages_fetched=coalesce((counters->>'pages_fetched')::integer,pages_fetched),pages_succeeded=coalesce((counters->>'pages_succeeded')::integer,pages_succeeded),pages_failed=coalesce((counters->>'pages_failed')::integer,pages_failed),pages_skipped=coalesce((counters->>'pages_skipped')::integer,pages_skipped),issues_found=coalesce((counters->>'issues_found')::integer,issues_found) where id=run_id;
  update public.worker_heartbeats set status='working',current_job_id=target_job_id,last_heartbeat_at=now() where worker_id=claiming_worker_id;
  return true;
end; $$;

create or replace function public.complete_crawl_job(target_job_id uuid, claiming_worker_id text, final_status text, counters jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare run_id uuid; target_site_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' or final_status not in ('completed','completed_with_warnings','cancelled') then raise exception 'worker_only'; end if;
  update public.seo_jobs set status=case when final_status='cancelled' then 'cancelled' else 'completed' end,progress=case when final_status='cancelled' then progress else 100 end,completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=target_job_id and worker_id=claiming_worker_id and status='running' returning crawl_run_id into run_id;
  if run_id is null then return false; end if;
  update public.crawl_runs set status=final_status,completed_at=now(),heartbeat_at=now(),current_url=null,pages_discovered=coalesce((counters->>'pages_discovered')::integer,pages_discovered),pages_queued=coalesce((counters->>'pages_queued')::integer,pages_queued),pages_fetched=coalesce((counters->>'pages_fetched')::integer,pages_fetched),pages_succeeded=coalesce((counters->>'pages_succeeded')::integer,pages_succeeded),pages_failed=coalesce((counters->>'pages_failed')::integer,pages_failed),pages_skipped=coalesce((counters->>'pages_skipped')::integer,pages_skipped),issues_found=coalesce((counters->>'issues_found')::integer,issues_found) where id=run_id returning website_id into target_site_id;
  update public.websites set analysis_status=case when final_status='cancelled' then 'failed' else final_status end,last_analysed_at=case when final_status in ('completed','completed_with_warnings') then now() else last_analysed_at end,analysis_error=case when final_status='cancelled' then 'Analysis was cancelled.' else null end where id=target_site_id;
  insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata) select project_id,'crawl_'||final_status,case when final_status='cancelled' then 'Website analysis cancelled' else 'Website analysis completed' end,case when final_status='completed_with_warnings' then 'The crawl finished with some pages that could not be fully checked.' when final_status='cancelled' then 'The requested website analysis was stopped.' else 'The website crawl completed successfully.' end,case when final_status='cancelled' then 'needs_attention' else 'completed' end,'crawl_run',id,jsonb_build_object('crawl_run_id',id) from public.crawl_runs where id=run_id and not exists(select 1 from public.activities where related_entity_id=run_id and activity_type='crawl_'||final_status);
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=claiming_worker_id;
  return true;
end; $$;

create or replace function public.fail_crawl_job(target_job_id uuid, claiming_worker_id text, safe_error text, retryable boolean)
returns text language plpgsql security definer set search_path='' as $$
declare job public.seo_jobs%rowtype; target_site_id uuid; new_status text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  select * into job from public.seo_jobs where id=target_job_id and worker_id=claiming_worker_id and status='running' for update;
  if not found then return 'not_owned'; end if;
  new_status:=case when retryable and job.attempt_count<job.max_attempts then 'queued' else 'failed' end;
  update public.seo_jobs set status=new_status,error_message=left(safe_error,1000),next_attempt_at=case when new_status='queued' then now()+make_interval(mins=>power(2,job.attempt_count)::integer) else null end,worker_id=null,locked_at=null,lock_expires_at=null,completed_at=case when new_status='failed' then now() else null end where id=job.id;
  select r.website_id into target_site_id from public.crawl_runs r where r.id=job.crawl_run_id;
  update public.crawl_runs set status=case when new_status='queued' then 'queued' else 'failed' end,error_summary=left(safe_error,1000),completed_at=case when new_status='failed' then now() else null end,current_url=null where id=job.crawl_run_id;
  update public.websites set analysis_status=case when new_status='queued' then 'queued' else 'failed' end,analysis_error=left(safe_error,1000) where id=target_site_id;
  if new_status='failed' then insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata) select project_id,'crawl_failed','Website analysis needs attention',left(safe_error,500),'needs_attention','crawl_run',id,jsonb_build_object('crawl_run_id',id) from public.crawl_runs where id=job.crawl_run_id and not exists(select 1 from public.activities where related_entity_id=job.crawl_run_id and activity_type='crawl_failed'); end if;
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=claiming_worker_id;
  return new_status;
end; $$;

create or replace function public.requeue_stale_crawl_jobs()
returns integer language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'worker_only'; end if;
  update public.seo_jobs set status=case when attempt_count<max_attempts then 'queued' else 'failed' end,worker_id=null,locked_at=null,lock_expires_at=null,next_attempt_at=case when attempt_count<max_attempts then now() else null end,error_message=case when attempt_count>=max_attempts then 'Crawler stopped after repeated worker interruptions.' else error_message end where job_type='website_crawl' and status='running' and lock_expires_at<now();
  get diagnostics changed=row_count;
  update public.crawl_runs r set status=case when j.status='failed' then 'failed' else 'queued' end,error_summary=case when j.status='failed' then j.error_message else r.error_summary end from public.seo_jobs j where j.crawl_run_id=r.id and j.job_type='website_crawl' and r.status='running' and j.status in ('queued','failed');
  return changed;
end; $$;

revoke all on function public.claim_next_crawl_job(text,integer),public.heartbeat_crawl_job(uuid,text,jsonb,text,integer),public.complete_crawl_job(uuid,text,text,jsonb),public.fail_crawl_job(uuid,text,text,boolean),public.requeue_stale_crawl_jobs() from public,anon,authenticated;
grant execute on function public.claim_next_crawl_job(text,integer),public.heartbeat_crawl_job(uuid,text,jsonb,text,integer),public.complete_crawl_job(uuid,text,text,jsonb),public.fail_crawl_job(uuid,text,text,boolean),public.requeue_stale_crawl_jobs() to service_role;

commit;
