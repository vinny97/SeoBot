begin;

create or replace function public.validate_crawl_comparison_group()
returns trigger language plpgsql set search_path='' as $$
declare native_run public.crawl_runs%rowtype; siteone_run public.crawl_runs%rowtype;
begin
  if new.native_crawl_run_id=new.siteone_crawl_run_id then raise exception 'comparison_runs_must_differ'; end if;
  select * into native_run from public.crawl_runs where id=new.native_crawl_run_id;
  select * into siteone_run from public.crawl_runs where id=new.siteone_crawl_run_id;
  if native_run.id is null or siteone_run.id is null or native_run.provider<>'native' or siteone_run.provider<>'siteone' or native_run.website_id<>new.website_id or siteone_run.website_id<>new.website_id or native_run.project_id<>new.project_id or siteone_run.project_id<>new.project_id then raise exception 'invalid_comparison_run_relationship'; end if;
  return new;
end; $$;
drop trigger if exists validate_crawl_comparison_group_before_write on public.crawl_comparison_groups;
create trigger validate_crawl_comparison_group_before_write before insert or update of native_crawl_run_id,siteone_crawl_run_id,website_id,project_id on public.crawl_comparison_groups for each row execute function public.validate_crawl_comparison_group();

create or replace function public.promote_crawl_run(target_group_id uuid, target_run_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare group_row public.crawl_comparison_groups%rowtype; selected_run public.crawl_runs%rowtype; observation record; partial boolean; changed boolean; observed text[]:=array[]::text[];
begin
  select * into group_row from public.crawl_comparison_groups where id=target_group_id for update;
  if not found or not public.can_access_crawler_lab(group_row.project_id) then raise exception 'crawler_lab_access_denied'; end if;
  if target_run_id not in (group_row.native_crawl_run_id,group_row.siteone_crawl_run_id) then raise exception 'crawl_not_in_comparison'; end if;
  select * into selected_run from public.crawl_runs where id=target_run_id;
  if selected_run.id is null or selected_run.website_id<>group_row.website_id or selected_run.project_id<>group_row.project_id or selected_run.status not in ('completed','completed_with_warnings') then raise exception 'crawl_not_promotable'; end if;
  if not exists(select 1 from public.crawl_page_snapshots where crawl_run_id=target_run_id and http_status between 200 and 399 and content_type ilike 'text/html%') then raise exception 'crawl_has_no_usable_pages'; end if;
  partial:=coalesce(selected_run.completion_reason,'completed') in ('page_limit_reached','time_limit_reached','provider_stopped');
  update public.website_pages p set url=s.requested_url,final_url=s.final_url,latest_http_status=s.http_status,latest_content_type=s.content_type,latest_title=s.title,latest_meta_description=s.meta_description,latest_canonical_url=s.canonical_url,latest_indexable=s.indexable,latest_indexability_reason=s.indexability_reason,latest_h1_count=s.h1_count,latest_h2_count=s.h2_count,latest_word_count=s.word_count,latest_language=s.language,latest_content_hash=s.content_hash,latest_structured_data_types=s.structured_data_types,last_seen_crawl_id=target_run_id,last_seen_at=now() from public.crawl_page_snapshots s where s.crawl_run_id=target_run_id and p.id=s.website_page_id;
  for observation in select * from public.crawl_issue_observations where crawl_run_id=target_run_id loop
    observed:=array_append(observed,observation.fingerprint);
    insert into public.seo_issues(project_id,website_id,website_page_id,crawl_run_id,fingerprint,issue_type,severity,title,description,recommendation,evidence,status,first_seen_at,last_seen_at,resolved_at) values(group_row.project_id,group_row.website_id,observation.website_page_id,target_run_id,observation.fingerprint,observation.issue_type,observation.severity,observation.title,observation.description,observation.recommendation,observation.evidence,'open',now(),now(),null) on conflict(website_id,fingerprint) do update set website_page_id=excluded.website_page_id,crawl_run_id=excluded.crawl_run_id,severity=excluded.severity,title=excluded.title,description=excluded.description,recommendation=excluded.recommendation,evidence=excluded.evidence,status='open',last_seen_at=now(),resolved_at=null;
  end loop;
  if not partial then update public.seo_issues set status='resolved',resolved_at=now() where website_id=group_row.website_id and status='open' and not (fingerprint=any(observed)); end if;
  changed:=group_row.promoted_crawl_run_id is distinct from target_run_id;
  update public.websites set official_crawl_run_id=target_run_id where id=group_row.website_id;
  update public.crawl_comparison_groups set promoted_crawl_run_id=target_run_id,promoted_provider=selected_run.provider,promoted_by=auth.uid(),promoted_at=now() where id=target_group_id;
  if changed then insert into public.activities(project_id,activity_type,title,description,status,related_entity_type,related_entity_id,metadata) values(group_row.project_id,'crawler_result_promoted',case when selected_run.provider='siteone' then 'SiteOne result promoted' else 'Native result promoted' end,case when partial then 'A partial crawl was promoted; absent pages and issues were not resolved.' else 'The selected crawl is now the official website result.' end,'completed','crawl_comparison_group',target_group_id,jsonb_build_object('crawl_run_id',target_run_id,'partial',partial)); end if;
  return true;
end; $$;

commit;
