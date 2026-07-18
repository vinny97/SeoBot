begin;

create or replace function public.complete_siteone_job(worker_token text, target_job_id uuid, claiming_worker_id text, final_status text, reason text, siteone_version text, metadata jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare run_id uuid;
begin
  if public.crawler_worker_credential_id(worker_token,'siteone_crawler') is null then raise exception 'invalid_worker_credential'; end if;
  if final_status not in ('completed','completed_with_warnings') or reason not in ('completed','page_limit_reached','time_limit_reached','provider_stopped','invalid_report') then raise exception 'invalid_completion'; end if;
  update public.seo_jobs set status='completed',progress=100,completed_at=now(),worker_id=null,locked_at=null,lock_expires_at=null where id=target_job_id and worker_id=left(claiming_worker_id,200) and status='running' and required_capability='siteone_crawler' returning crawl_run_id into run_id;
  if run_id is null then return false; end if;
  update public.crawl_runs set status=final_status,completion_reason=reason,provider_version=left(siteone_version,100),provider_metadata=coalesce(metadata,'{}'::jsonb),completed_at=now(),heartbeat_at=now(),current_url=null where id=run_id;
  update public.worker_heartbeats set status='idle',current_job_id=null,last_heartbeat_at=now() where worker_id=left(claiming_worker_id,200);
  return true;
end; $$;

commit;
