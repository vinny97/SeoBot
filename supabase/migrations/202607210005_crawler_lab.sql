begin;

alter table public.websites add column if not exists official_crawl_run_id uuid references public.crawl_runs(id) on delete set null;

create table public.crawler_lab_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.crawler_lab_admins enable row level security;
revoke all on public.crawler_lab_admins from public, anon, authenticated;
grant all on public.crawler_lab_admins to service_role;

create or replace function public.can_access_crawler_lab(target_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from public.crawler_lab_admins a where a.user_id=auth.uid())
    and public.can_access_project(target_project_id);
$$;
revoke all on function public.can_access_crawler_lab(uuid) from public, anon;
grant execute on function public.can_access_crawler_lab(uuid) to authenticated, service_role;

create table public.crawl_comparison_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  native_crawl_run_id uuid not null unique references public.crawl_runs(id) on delete restrict,
  siteone_crawl_run_id uuid not null unique references public.crawl_runs(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued','running','completed','partially_completed','failed','cancelled')),
  review_result text check (review_result in ('native_more_accurate','siteone_more_accurate','both_similar','needs_investigation')),
  review_notes text check (review_notes is null or char_length(review_notes)<=4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  promoted_crawl_run_id uuid references public.crawl_runs(id) on delete set null,
  promoted_provider text check (promoted_provider is null or promoted_provider in ('native','siteone')),
  promoted_by uuid references auth.users(id) on delete set null,
  promoted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);
create index crawl_comparison_groups_website_created_idx on public.crawl_comparison_groups(website_id,created_at desc);
create index crawl_comparison_groups_project_status_idx on public.crawl_comparison_groups(project_id,status,created_at desc);
alter table public.crawl_comparison_groups enable row level security;
create policy crawler_lab_comparisons_select on public.crawl_comparison_groups for select to authenticated using (public.can_access_crawler_lab(project_id));
revoke insert, update, delete on public.crawl_comparison_groups from authenticated;
grant select on public.crawl_comparison_groups to authenticated;
grant all on public.crawl_comparison_groups to service_role;
create trigger set_crawl_comparison_groups_updated_at before update on public.crawl_comparison_groups for each row execute function public.set_updated_at();

create or replace function public.validate_crawl_comparison_group()
returns trigger language plpgsql set search_path='' as $$
declare native_run public.crawl_runs%rowtype; siteone_run public.crawl_runs%rowtype;
begin
  if new.native_crawl_run_id=new.siteone_crawl_run_id then raise exception 'comparison_runs_must_differ'; end if;
  select * into native_run from public.crawl_runs where id=new.native_crawl_run_id;
  select * into siteone_run from public.crawl_runs where id=new.siteone_crawl_run_id;
  if not found or native_run.provider<>'native' or siteone_run.provider<>'siteone' or native_run.website_id<>new.website_id or siteone_run.website_id<>new.website_id or native_run.project_id<>new.project_id or siteone_run.project_id<>new.project_id then raise exception 'invalid_comparison_run_relationship'; end if;
  return new;
end; $$;
create trigger validate_crawl_comparison_group_before_write before insert or update of native_crawl_run_id,siteone_crawl_run_id,website_id,project_id on public.crawl_comparison_groups for each row execute function public.validate_crawl_comparison_group();

create or replace function public.crawler_lab_comparison_status(native_status text, siteone_status text)
returns text language plpgsql immutable set search_path='' as $$
begin
  if native_status in ('queued') and siteone_status in ('queued') then return 'queued'; end if;
  if native_status in ('running') or siteone_status in ('running') then return 'running'; end if;
  if native_status in ('completed','completed_with_warnings') and siteone_status in ('completed','completed_with_warnings') then return 'completed'; end if;
  if native_status='cancelled' and siteone_status='cancelled' then return 'cancelled'; end if;
  if native_status='failed' and siteone_status='failed' then return 'failed'; end if;
  return 'partially_completed';
end; $$;

create or replace function public.refresh_crawl_comparison_status()
returns trigger language plpgsql security definer set search_path='' as $$
declare native_state text; siteone_state text; next_status text;
begin
  for native_state,siteone_state in
    select n.status,s.status from public.crawl_comparison_groups g
    join public.crawl_runs n on n.id=g.native_crawl_run_id
    join public.crawl_runs s on s.id=g.siteone_crawl_run_id
    where g.native_crawl_run_id=new.id or g.siteone_crawl_run_id=new.id
  loop
    next_status:=public.crawler_lab_comparison_status(native_state,siteone_state);
    update public.crawl_comparison_groups set status=next_status,completed_at=case when next_status in ('completed','partially_completed','failed','cancelled') then coalesce(completed_at,now()) else null end
    where native_crawl_run_id=new.id or siteone_crawl_run_id=new.id;
  end loop;
  return new;
end; $$;
drop trigger if exists refresh_crawl_comparison_status_after_run on public.crawl_runs;
create trigger refresh_crawl_comparison_status_after_run after update of status on public.crawl_runs for each row execute function public.refresh_crawl_comparison_status();

create or replace function public.crawler_lab_worker_availability(target_project_id uuid, stale_after_seconds integer default 60)
returns jsonb language plpgsql security definer set search_path='' as $$
declare native_seen timestamptz; siteone_seen timestamptz; siteone_version text; allowed boolean; threshold integer:=least(greatest(stale_after_seconds,15),900);
begin
  if not public.can_access_crawler_lab(target_project_id) then raise exception 'crawler_lab_access_denied'; end if;
  select max(last_heartbeat_at) into native_seen from public.worker_heartbeats where capabilities @> array['native_crawler']::text[];
  select max(last_heartbeat_at),max(provider_versions->>'siteone') into siteone_seen,siteone_version from public.worker_heartbeats where capabilities @> array['siteone_crawler']::text[];
  select exists(select 1 from public.siteone_allowed_projects where project_id=target_project_id) into allowed;
  return jsonb_build_object('native',jsonb_build_object('available',native_seen is not null and native_seen>=now()-make_interval(secs=>threshold),'lastSeenAt',native_seen),'siteone',jsonb_build_object('available',siteone_seen is not null and siteone_seen>=now()-make_interval(secs=>threshold),'lastSeenAt',siteone_seen,'version',siteone_version,'projectAllowed',allowed));
end; $$;
revoke all on function public.crawler_lab_worker_availability(uuid,integer) from public,anon;
grant execute on function public.crawler_lab_worker_availability(uuid,integer) to authenticated;

create or replace function public.create_crawler_comparison(target_website_id uuid, stale_after_seconds integer default 60)
returns uuid language plpgsql security definer set search_path='' as $$
declare site public.websites%rowtype; settings public.crawl_settings%rowtype; native_run uuid; siteone_run uuid; group_id uuid; availability jsonb; threshold integer:=least(greatest(stale_after_seconds,15),900);
begin
  select * into site from public.websites where id=target_website_id;
  if not found or not public.can_access_crawler_lab(site.project_id) then raise exception 'crawler_lab_access_denied'; end if;
  if site.crawl_authorised_at is null then raise exception 'crawl_authorisation_required'; end if;
  availability:=public.crawler_lab_worker_availability(site.project_id,threshold);
  if not coalesce((availability->'native'->>'available')::boolean,false) then raise exception 'native_worker_unavailable'; end if;
  if not coalesce((availability->'siteone'->>'projectAllowed')::boolean,false) then raise exception 'siteone_project_not_allowed'; end if;
  if not coalesce((availability->'siteone'->>'available')::boolean,false) then raise exception 'siteone_worker_unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(site.id::text,2));
  if exists(select 1 from public.crawl_runs where website_id=site.id and status in ('queued','running')) then raise exception 'crawl_already_active'; end if;
  insert into public.crawl_settings(website_id) values(site.id) on conflict(website_id) do nothing;
  select * into settings from public.crawl_settings where website_id=site.id;
  insert into public.crawl_runs(project_id,website_id,created_by,status,trigger_type,max_pages,max_depth,provider,configuration)
  values(site.project_id,site.id,auth.uid(),'queued','manual',least(settings.max_pages,50),least(settings.max_depth,4),'native',jsonb_build_object('internal_comparison',true,'concurrency',least(settings.concurrency,2),'request_delay_ms',greatest(settings.request_delay_ms,250),'respect_robots',settings.respect_robots,'include_subdomains',false,'query_parameter_policy',settings.query_parameter_policy)) returning id into native_run;
  insert into public.crawl_runs(project_id,website_id,created_by,status,trigger_type,max_pages,max_depth,provider,configuration)
  values(site.project_id,site.id,auth.uid(),'queued','manual',50,4,'siteone',jsonb_build_object('internal_comparison',true)) returning id into siteone_run;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,crawl_run_id,max_attempts,dedupe_key,next_attempt_at,required_capability)
  values(site.project_id,'website_crawl','queued',110,0,jsonb_build_object('website_id',site.id,'crawl_run_id',native_run),native_run,3,'comparison:native:'||native_run::text,now(),'native_crawler'),(site.project_id,'website_crawl','queued',110,0,jsonb_build_object('website_id',site.id,'crawl_run_id',siteone_run),siteone_run,3,'comparison:siteone:'||siteone_run::text,now(),'siteone_crawler');
  insert into public.crawl_comparison_groups(workspace_id,project_id,website_id,native_crawl_run_id,siteone_crawl_run_id,created_by)
  select p.workspace_id,site.project_id,site.id,native_run,siteone_run,auth.uid() from public.projects p where p.id=site.project_id returning id into group_id;
  insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata)
  values(site.project_id,'crawler_comparison_started','Crawler comparison started','Native and SiteOne crawls were queued for internal review.','in_progress','crawl_comparison_group',group_id,jsonb_build_object('native_crawl_run_id',native_run,'siteone_crawl_run_id',siteone_run));
  return group_id;
end; $$;
revoke all on function public.create_crawler_comparison(uuid,integer) from public,anon;
grant execute on function public.create_crawler_comparison(uuid,integer) to authenticated;

create or replace function public.start_crawler_lab_run(target_website_id uuid, selected_provider text, stale_after_seconds integer default 60)
returns uuid language plpgsql security definer set search_path='' as $$
declare site public.websites%rowtype; settings public.crawl_settings%rowtype; run_id uuid; availability jsonb; threshold integer:=least(greatest(stale_after_seconds,15),900);
begin
  select * into site from public.websites where id=target_website_id;
  if not found or not public.can_access_crawler_lab(site.project_id) then raise exception 'crawler_lab_access_denied'; end if;
  if site.crawl_authorised_at is null then raise exception 'crawl_authorisation_required'; end if;
  if selected_provider not in ('native','siteone') then raise exception 'invalid_provider'; end if;
  availability:=public.crawler_lab_worker_availability(site.project_id,threshold);
  if selected_provider='native' and not coalesce((availability->'native'->>'available')::boolean,false) then raise exception 'native_worker_unavailable'; end if;
  if selected_provider='siteone' and not coalesce((availability->'siteone'->>'projectAllowed')::boolean,false) then raise exception 'siteone_project_not_allowed'; end if;
  if selected_provider='siteone' and not coalesce((availability->'siteone'->>'available')::boolean,false) then raise exception 'siteone_worker_unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(site.id::text||selected_provider,2));
  if exists(select 1 from public.crawl_runs where website_id=site.id and provider=selected_provider and status in ('queued','running')) then raise exception 'crawl_already_active'; end if;
  insert into public.crawl_settings(website_id) values(site.id) on conflict(website_id) do nothing;
  select * into settings from public.crawl_settings where website_id=site.id;
  insert into public.crawl_runs(project_id,website_id,created_by,status,trigger_type,max_pages,max_depth,provider,configuration)
  values(site.project_id,site.id,auth.uid(),'queued','manual',case when selected_provider='siteone' then 50 else least(settings.max_pages,50) end,case when selected_provider='siteone' then 4 else least(settings.max_depth,4) end,selected_provider,jsonb_build_object('internal_crawler_lab',true)) returning id into run_id;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,crawl_run_id,max_attempts,dedupe_key,next_attempt_at,required_capability)
  values(site.project_id,'website_crawl','queued',105,0,jsonb_build_object('website_id',site.id,'crawl_run_id',run_id),run_id,3,'crawler_lab:'||selected_provider||':'||run_id::text,now(),case when selected_provider='siteone' then 'siteone_crawler' else 'native_crawler' end);
  return run_id;
end; $$;
revoke all on function public.start_crawler_lab_run(uuid,text,integer) from public,anon;
grant execute on function public.start_crawler_lab_run(uuid,text,integer) to authenticated;

create or replace function public.review_crawler_comparison(target_group_id uuid, review text, notes text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare group_row public.crawl_comparison_groups%rowtype;
begin
  select * into group_row from public.crawl_comparison_groups where id=target_group_id;
  if not found or not public.can_access_crawler_lab(group_row.project_id) then raise exception 'crawler_lab_access_denied'; end if;
  if review not in ('native_more_accurate','siteone_more_accurate','both_similar','needs_investigation') then raise exception 'invalid_review'; end if;
  update public.crawl_comparison_groups set review_result=review,review_notes=nullif(left(coalesce(notes,''),4000),''),reviewed_by=auth.uid(),reviewed_at=now() where id=target_group_id;
  insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata)
  values(group_row.project_id,'crawler_comparison_reviewed','Crawler comparison reviewed','An internal reviewer recorded a comparison outcome.','completed','crawl_comparison_group',target_group_id,jsonb_build_object('review_result',review));
  return true;
end; $$;
revoke all on function public.review_crawler_comparison(uuid,text,text) from public,anon;
grant execute on function public.review_crawler_comparison(uuid,text,text) to authenticated;

create or replace function public.promote_crawl_run(target_group_id uuid, target_run_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare group_row public.crawl_comparison_groups%rowtype; run_row public.crawl_runs%rowtype; observation record; partial boolean; changed boolean:=false; observed text[]:=array[]::text[];
begin
  select * into group_row from public.crawl_comparison_groups where id=target_group_id for update;
  if not found or not public.can_access_crawler_lab(group_row.project_id) then raise exception 'crawler_lab_access_denied'; end if;
  if target_run_id not in (group_row.native_crawl_run_id,group_row.siteone_crawl_run_id) then raise exception 'crawl_not_in_comparison'; end if;
  select * into run_row from public.crawl_runs where id=target_run_id;
  if not found or run_row.website_id<>group_row.website_id or run_row.project_id<>group_row.project_id or run_row.status not in ('completed','completed_with_warnings') then raise exception 'crawl_not_promotable'; end if;
  if not exists(select 1 from public.crawl_page_snapshots where crawl_run_id=target_run_id and http_status between 200 and 399 and content_type ilike 'text/html%') then raise exception 'crawl_has_no_usable_pages'; end if;
  partial:=coalesce(run_row.completion_reason,'completed') in ('page_limit_reached','time_limit_reached','provider_stopped');
  update public.website_pages p set url=s.requested_url,final_url=s.final_url,latest_http_status=s.http_status,latest_content_type=s.content_type,latest_title=s.title,latest_meta_description=s.meta_description,latest_canonical_url=s.canonical_url,latest_indexable=s.indexable,latest_indexability_reason=s.indexability_reason,latest_h1_count=s.h1_count,latest_h2_count=s.h2_count,latest_word_count=s.word_count,latest_language=s.language,latest_content_hash=s.content_hash,latest_structured_data_types=s.structured_data_types,last_seen_crawl_id=target_run_id,last_seen_at=now()
  from public.crawl_page_snapshots s where s.crawl_run_id=target_run_id and p.id=s.website_page_id;
  for observation in select * from public.crawl_issue_observations where crawl_run_id=target_run_id loop
    observed:=array_append(observed,observation.fingerprint);
    insert into public.seo_issues(project_id,website_id,website_page_id,crawl_run_id,fingerprint,issue_type,severity,title,description,recommendation,evidence,status,first_seen_at,last_seen_at,resolved_at)
    values(group_row.project_id,group_row.website_id,observation.website_page_id,target_run_id,observation.fingerprint,observation.issue_type,observation.severity,observation.title,observation.description,observation.recommendation,observation.evidence,'open',now(),now(),null)
    on conflict(website_id,fingerprint) do update set website_page_id=excluded.website_page_id,crawl_run_id=excluded.crawl_run_id,severity=excluded.severity,title=excluded.title,description=excluded.description,recommendation=excluded.recommendation,evidence=excluded.evidence,status='open',last_seen_at=now(),resolved_at=null;
  end loop;
  if not partial then update public.seo_issues set status='resolved',resolved_at=now() where website_id=group_row.website_id and status='open' and not (fingerprint=any(observed)); end if;
  changed:=group_row.promoted_crawl_run_id is distinct from target_run_id;
  update public.websites set official_crawl_run_id=target_run_id where id=group_row.website_id;
  update public.crawl_comparison_groups set promoted_crawl_run_id=target_run_id,promoted_provider=(select provider from public.crawl_runs where id=target_run_id),promoted_by=auth.uid(),promoted_at=now() where id=target_group_id;
  if changed then insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata)
  values(group_row.project_id,'crawler_result_promoted',case when (select provider from public.crawl_runs where id=target_run_id)='siteone' then 'SiteOne result promoted' else 'Native result promoted' end,case when partial then 'A partial crawl was promoted; absent pages and issues were not resolved.' else 'The selected crawl is now the official website result.' end,'completed','crawl_comparison_group',target_group_id,jsonb_build_object('crawl_run_id',target_run_id,'partial',partial)); end if;
  return true;
end; $$;
revoke all on function public.promote_crawl_run(uuid,uuid) from public,anon;
grant execute on function public.promote_crawl_run(uuid,uuid) to authenticated;

commit;
