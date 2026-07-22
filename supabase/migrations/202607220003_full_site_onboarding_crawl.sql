begin;

alter table public.crawl_settings drop constraint if exists crawl_settings_max_pages_check;
alter table public.crawl_settings add constraint crawl_settings_max_pages_check check (max_pages between 1 and 50000);
alter table public.crawl_settings drop constraint if exists crawl_settings_max_depth_check;
alter table public.crawl_settings add constraint crawl_settings_max_depth_check check (max_depth between 0 and 20);

alter table public.crawl_runs drop constraint if exists crawl_runs_max_pages_check;
alter table public.crawl_runs add constraint crawl_runs_max_pages_check check (max_pages between 1 and 50000);
alter table public.crawl_runs drop constraint if exists crawl_runs_max_depth_check;
alter table public.crawl_runs add constraint crawl_runs_max_depth_check check (max_depth between 0 and 20);

create or replace function public.enqueue_website_crawl(target_website_id uuid, requested_trigger text)
returns uuid language plpgsql security definer set search_path='' as $$
declare w public.websites%rowtype; settings public.crawl_settings%rowtype; run_id uuid; recent_count integer; latest_manual timestamptz; full_site boolean;
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
  full_site:=requested_trigger='onboarding';
  insert into public.crawl_runs(project_id,website_id,created_by,status,trigger_type,max_pages,max_depth,configuration)
  values(
    w.project_id,
    w.id,
    auth.uid(),
    'queued',
    requested_trigger,
    case when full_site then 50000 else least(settings.max_pages,50) end,
    case when full_site then 20 else least(settings.max_depth,4) end,
    jsonb_build_object(
      'full_site',full_site,
      'concurrency',least(settings.concurrency,2),
      'request_delay_ms',greatest(settings.request_delay_ms,250),
      'respect_robots',settings.respect_robots,
      'include_subdomains',false,
      'query_parameter_policy',settings.query_parameter_policy
    )
  ) returning id into run_id;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress,input_payload,crawl_run_id,max_attempts,dedupe_key,next_attempt_at)
  values(w.project_id,'website_crawl','queued',100,0,jsonb_build_object('website_id',w.id,'crawl_run_id',run_id,'full_site',full_site),run_id,3,'crawl:'||w.id::text,now());
  update public.websites set analysis_status='queued',analysis_error=null where id=w.id;
  insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata)
  values(w.project_id,'crawl_requested',case when full_site then 'Full website analysis requested' else 'Website analysis requested' end,case when full_site then 'Searchhand is discovering and analysing the complete public website after onboarding.' else 'A low-rate public website crawl was added to the worker queue.' end,'in_progress','crawl_run',run_id,jsonb_build_object('crawl_run_id',run_id,'full_site',full_site));
  return run_id;
end; $$;

revoke all on function public.enqueue_website_crawl(uuid,text) from public,anon;
grant execute on function public.enqueue_website_crawl(uuid,text) to authenticated;

commit;
