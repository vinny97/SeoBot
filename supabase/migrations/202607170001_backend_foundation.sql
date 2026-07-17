begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique (workspace_id,user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active','paused','archived')),
  is_primary boolean not null default false,
  onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started','in_progress','completed')),
  onboarding_step integer not null default 1 check (onboarding_step between 1 and 8),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id,slug)
);

create unique index projects_one_primary_per_workspace on public.projects(workspace_id) where is_primary and status <> 'archived';

create table public.websites (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  url text not null, normalised_url text not null, domain text not null, display_name text,
  is_primary boolean not null default true, title text, meta_description text, favicon_url text,
  robots_txt_status text not null default 'not_checked' check (robots_txt_status in ('not_checked','detected','not_detected','unknown')),
  sitemap_status text not null default 'not_checked' check (sitemap_status in ('not_checked','detected','not_detected','unknown')),
  analysis_status text not null default 'not_started' check (analysis_status in ('not_started','pending','complete','failed')),
  analysis_error text, last_analysed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(project_id,normalised_url)
);
create unique index websites_one_primary_per_project on public.websites(project_id) where is_primary;

create table public.onboarding_progress (
  project_id uuid primary key references public.projects(id) on delete cascade,
  current_step integer not null default 1 check (current_step between 1 and 8),
  draft_data jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_data) = 'object'),
  completed boolean not null default false, last_saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(), project_id uuid not null unique references public.projects(id) on delete cascade,
  business_name text not null, description text, industry text, products_services text[] not null default '{}',
  target_customers text, locations text[] not null default '{}', main_location text, business_model text, brand_tone text,
  primary_conversion text, audience_scope text check (audience_scope in ('local','national','international')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.project_goals (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  goal_type text not null, priority integer check (priority is null or priority between 1 and 10),
  created_at timestamptz not null default now(), unique(project_id,goal_type)
);

create table public.project_settings (
  id uuid primary key default gen_random_uuid(), project_id uuid not null unique references public.projects(id) on delete cascade,
  approval_mode text not null default 'review_important' check (approval_mode in ('review_all','review_important','autonomous_within_rules')),
  timezone text, weekly_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, domain text, url text, notes text,
  status text not null default 'confirmed' check (status in ('confirmed','inactive')),
  source text not null default 'user' check (source in ('user','onboarding_suggestion','future_provider')),
  confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index competitors_unique_domain_per_project on public.competitors(project_id,lower(domain)) where domain is not null;

create table public.opportunities (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, description text not null,
  category text not null check (category in ('content','existing_page','technical','internal_linking','competitor','measurement','local_visibility','conversion')),
  impact text not null check (impact in ('moderate','strong','high_potential')),
  effort text not null check (effort in ('low','medium','high')),
  confidence text not null check (confidence in ('initial_hypothesis','business_profile','needs_performance_data')),
  status text not null default 'new' check (status in ('new','planned','in_progress','waiting_for_approval','completed','dismissed')),
  source text not null check (source in ('onboarding_seed','user')), requires_real_data boolean not null default false,
  related_url text, metadata jsonb not null default '{}'::jsonb, discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index opportunities_seed_idempotency on public.opportunities(project_id,(metadata->>'seed_key')) where source='onboarding_seed';

create table public.keyword_topics (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  topic text not null, intent text, relevance text, status text not null default 'hypothesis', source text not null,
  is_hypothesis boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(project_id,topic)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, content_type text not null, purpose text, target_customer text,
  status text not null default 'idea' check (status in ('idea','planned','dismissed','archived')),
  source text not null check (source in ('onboarding_seed','user')), target_topic_id uuid references public.keyword_topics(id) on delete set null,
  target_url text, brief text, draft text, published_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index content_seed_idempotency on public.content_items(project_id,title) where source='onboarding_seed';

create table public.seo_jobs (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  job_type text not null, status text not null check (status in ('queued','running','waiting_for_input','waiting_for_approval','completed','failed','cancelled')),
  priority integer not null default 0, progress integer check (progress is null or progress between 0 and 100),
  input_payload jsonb not null default '{}'::jsonb, output_payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0), error_message text,
  scheduled_for timestamptz, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(project_id,job_type)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  activity_type text not null, title text not null, description text, status text not null,
  related_entity_type text, related_entity_id uuid, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null, entity_id uuid, status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references auth.users(id) on delete set null,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null check (provider in ('google_search_console','google_analytics','wordpress','webflow','shopify','google_business_profile')),
  status text not null default 'not_connected' check (status in ('not_connected','connected','error','disabled')),
  external_account_id text, configuration jsonb not null default '{}'::jsonb, connected_at timestamptz, last_synced_at timestamptz,
  error_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(project_id,provider)
);

create index workspace_members_user_idx on public.workspace_members(user_id,workspace_id);
create index projects_workspace_status_idx on public.projects(workspace_id,status);
create index websites_project_idx on public.websites(project_id);
create index competitors_project_status_idx on public.competitors(project_id,status);
create index opportunities_project_status_idx on public.opportunities(project_id,status);
create index keyword_topics_project_idx on public.keyword_topics(project_id);
create index content_items_project_status_idx on public.content_items(project_id,status);
create index seo_jobs_project_status_idx on public.seo_jobs(project_id,status);
create index activities_project_created_idx on public.activities(project_id,created_at desc);
create index approvals_project_status_idx on public.approval_requests(project_id,status);

do $$ declare table_name text; begin
  foreach table_name in array array['profiles','workspaces','projects','websites','onboarding_progress','business_profiles','project_settings','competitors','opportunities','keyword_topics','content_items','seo_jobs','approval_requests','integrations']
  loop execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',table_name,table_name); end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name,avatar_url)
  values(new.id,nullif(left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),160),''),nullif(left(coalesce(new.raw_user_meta_data->>'avatar_url',''),2048),''))
  on conflict(id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.workspace_members m where m.workspace_id=target_workspace_id and m.user_id=auth.uid());
$$;
create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.workspace_members m where m.workspace_id=target_workspace_id and m.user_id=auth.uid() and m.role='owner');
$$;
create or replace function public.can_access_project(target_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.projects p join public.workspace_members m on m.workspace_id=p.workspace_id where p.id=target_project_id and m.user_id=auth.uid());
$$;
revoke all on function public.is_workspace_member(uuid),public.is_workspace_owner(uuid),public.can_access_project(uuid) from public,anon;
grant execute on function public.is_workspace_member(uuid),public.is_workspace_owner(uuid),public.can_access_project(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.websites enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.business_profiles enable row level security;
alter table public.project_goals enable row level security;
alter table public.project_settings enable row level security;
alter table public.competitors enable row level security;
alter table public.opportunities enable row level security;
alter table public.keyword_topics enable row level security;
alter table public.content_items enable row level security;
alter table public.seo_jobs enable row level security;
alter table public.activities enable row level security;
alter table public.approval_requests enable row level security;
alter table public.integrations enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id=auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy workspaces_select_member on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_update_owner on public.workspaces for update to authenticated using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));
create policy members_select_member on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
create policy projects_select_member on public.projects for select to authenticated using (public.is_workspace_member(workspace_id));
create policy projects_update_member on public.projects for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create or replace function public.protect_project_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id or new.created_by <> old.created_by then raise exception 'project_ownership_is_immutable'; end if;
  return new;
end; $$;
create trigger protect_project_ownership before update on public.projects for each row execute function public.protect_project_ownership();

do $$ declare table_name text; begin
  foreach table_name in array array['websites','onboarding_progress','business_profiles','project_goals','project_settings','competitors','opportunities','keyword_topics','content_items','seo_jobs','activities','approval_requests','integrations']
  loop
    execute format('create policy %I_select on public.%I for select to authenticated using (public.can_access_project(project_id))',table_name,table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.can_access_project(project_id))',table_name,table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.can_access_project(project_id)) with check (public.can_access_project(project_id))',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.can_access_project(project_id))',table_name,table_name);
  end loop;
end $$;

grant select,update on public.profiles to authenticated;
grant select,update on public.workspaces,public.projects to authenticated;
grant select on public.workspace_members to authenticated;
grant select,insert,update,delete on public.websites,public.onboarding_progress,public.business_profiles,public.project_goals,public.project_settings,public.competitors,public.opportunities,public.keyword_topics,public.content_items,public.seo_jobs,public.activities,public.approval_requests,public.integrations to authenticated;

create type public.initial_project_result as (workspace_id uuid,project_id uuid,website_id uuid);
create or replace function public.create_initial_project(workspace_name text,project_name text,project_slug text,website_url text,website_domain text,draft jsonb default '{}'::jsonb)
returns public.initial_project_result language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); wid uuid; pid uuid; webid uuid; existing record;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if nullif(trim(workspace_name),'') is null or nullif(trim(project_name),'') is null or nullif(trim(website_url),'') is null or nullif(trim(website_domain),'') is null then raise exception 'invalid_project_input'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select p.workspace_id as workspace_id,p.id as project_id,w.id as website_id into existing from public.projects p left join public.websites w on w.project_id=p.id and w.is_primary where p.created_by=uid and p.status='active' order by p.is_primary desc,p.created_at limit 1;
  if found then return (existing.workspace_id,existing.project_id,existing.website_id)::public.initial_project_result; end if;
  insert into public.workspaces(name,created_by) values(left(trim(workspace_name),120),uid) returning id into wid;
  insert into public.workspace_members(workspace_id,user_id,role) values(wid,uid,'owner');
  insert into public.projects(workspace_id,created_by,name,slug,is_primary,onboarding_status,onboarding_step) values(wid,uid,left(trim(project_name),160),project_slug,true,'in_progress',1) returning id into pid;
  insert into public.websites(project_id,url,normalised_url,domain,display_name) values(pid,website_url,website_url,lower(website_domain),left(trim(project_name),160)) returning id into webid;
  insert into public.onboarding_progress(project_id,current_step,draft_data) values(pid,1,coalesce(draft,'{}'::jsonb));
  return (wid,pid,webid)::public.initial_project_result;
end; $$;
revoke all on function public.create_initial_project(text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.create_initial_project(text,text,text,text,text,jsonb) to authenticated;

create or replace function public.complete_project_onboarding(target_project_id uuid,payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare service text:=coalesce(payload->'services'->>0,'main service'); business text:=nullif(payload->>'businessName',''); project_row public.projects%rowtype; item jsonb; idx integer:=0;
begin
  if auth.uid() is null or not public.can_access_project(target_project_id) then raise exception 'project_access_denied'; end if;
  select * into project_row from public.projects where id=target_project_id for update;
  if project_row.onboarding_status='completed' then return target_project_id; end if;
  if business is null or nullif(payload->>'websiteUrl','') is null then raise exception 'invalid_onboarding_payload'; end if;
  update public.websites set url=payload->>'websiteUrl',normalised_url=payload->>'websiteUrl',domain=lower(payload->>'domain'),display_name=business where project_id=target_project_id and is_primary;
  insert into public.business_profiles(project_id,business_name,description,industry,products_services,target_customers,locations,main_location,brand_tone,primary_conversion,audience_scope)
  values(target_project_id,business,payload->>'businessDescription',payload->>'industry',array(select jsonb_array_elements_text(coalesce(payload->'services','[]'::jsonb))),payload->>'targetCustomer',case when nullif(payload->>'location','') is null then '{}'::text[] else array[payload->>'location'] end,payload->>'location',payload->>'brandTone',payload->>'primaryConversion',payload->>'audienceScope')
  on conflict(project_id) do update set business_name=excluded.business_name,description=excluded.description,industry=excluded.industry,products_services=excluded.products_services,target_customers=excluded.target_customers,locations=excluded.locations,main_location=excluded.main_location,brand_tone=excluded.brand_tone,primary_conversion=excluded.primary_conversion,audience_scope=excluded.audience_scope;
  delete from public.project_goals where project_id=target_project_id;
  for item in select * from jsonb_array_elements(coalesce(payload->'selectedGoals','[]'::jsonb)) loop idx:=idx+1; insert into public.project_goals(project_id,goal_type,priority) values(target_project_id,item#>>'{}',idx); end loop;
  insert into public.project_settings(project_id,approval_mode) values(target_project_id,case payload->>'approvalPreference' when 'agreed_rules' then 'autonomous_within_rules' else payload->>'approvalPreference' end) on conflict(project_id) do update set approval_mode=excluded.approval_mode;
  delete from public.competitors where project_id=target_project_id and source in ('onboarding_suggestion','user');
  for item in select * from jsonb_array_elements(coalesce(payload->'competitors','[]'::jsonb)) loop insert into public.competitors(project_id,name,domain,url,notes,status,source,confirmed_at) values(target_project_id,item->>'name',lower(item->>'domain'),item->>'websiteUrl',item->>'note','confirmed',case when (item->>'id') like 'suggestion-%' then 'onboarding_suggestion' else 'user' end,now()) on conflict do nothing; end loop;
  insert into public.opportunities(project_id,title,description,category,impact,effort,confidence,status,source,requires_real_data,metadata) values
    (target_project_id,'Create a dedicated page for '||service,'Give an important service a clear explanation and next step.','content','high_potential','medium','business_profile','new','onboarding_seed',false,jsonb_build_object('seed_key','service-page')),
    (target_project_id,'Improve how the homepage explains the main offer','Make the offer easier for customers and search engines to understand.','existing_page','strong','low','initial_hypothesis','new','onboarding_seed',false,jsonb_build_object('seed_key','homepage')),
    (target_project_id,'Connect Search Console for real customer-search data','Replace early hypotheses with genuine performance data.','measurement','strong','low','needs_performance_data','new','onboarding_seed',true,jsonb_build_object('seed_key','measurement'))
  on conflict do nothing;
  insert into public.keyword_topics(project_id,topic,intent,relevance,status,source) values
    (target_project_id,service,'service_research','high','hypothesis','business_profile'),(target_project_id,service||' advice','informational','promising','hypothesis','onboarding_seed'),(target_project_id,service||' for '||coalesce(nullif(payload->>'targetCustomer',''),'priority customers'),'commercial','to_confirm','needs_real_data','onboarding_seed') on conflict do nothing;
  insert into public.content_items(project_id,title,content_type,purpose,target_customer,status,source) values
    (target_project_id,'A practical guide to choosing '||service,'service_guide','Answer early customer questions.',payload->>'targetCustomer','idea','onboarding_seed'),(target_project_id,'How '||service||' works from start to finish','customer_question','Make the process clear and trustworthy.',payload->>'targetCustomer','idea','onboarding_seed'),(target_project_id,service||' in '||coalesce(nullif(payload->>'location',''),'your service area'),'location_page','Explore a page for an important location.','Local customers','idea','onboarding_seed') on conflict do nothing;
  insert into public.seo_jobs(project_id,job_type,status,priority,progress) values
    (target_project_id,'prepare_website_review','running',100,64),(target_project_id,'prepare_topic_hypotheses','running',90,38),(target_project_id,'organise_competitors','queued',70,null),(target_project_id,'search_console_setup','waiting_for_input',60,null),(target_project_id,'prepare_content_plan','queued',50,null) on conflict do nothing;
  insert into public.activities(project_id,activity_type,title,description,status,metadata) values
    (target_project_id,'workspace_created','Workspace created','Your private workspace was prepared.','completed',jsonb_build_object('seed_key','workspace')),(target_project_id,'website_added','Website added','The primary website was confirmed by you.','completed',jsonb_build_object('seed_key','website')),(target_project_id,'profile_confirmed','Business profile confirmed','Business context was saved.','completed',jsonb_build_object('seed_key','profile')),(target_project_id,'plan_prepared','Initial plan prepared','Deterministic starting work was created from onboarding.','completed',jsonb_build_object('seed_key','plan'));
  insert into public.integrations(project_id,provider,status) select target_project_id,p,'not_connected' from unnest(array['google_search_console','google_analytics','wordpress','webflow','shopify','google_business_profile']) p on conflict do nothing;
  update public.onboarding_progress set current_step=8,draft_data=payload,completed=true,last_saved_at=now() where project_id=target_project_id;
  update public.projects set name=business,onboarding_status='completed',onboarding_step=8,onboarding_completed_at=now() where id=target_project_id;
  return target_project_id;
end; $$;
revoke all on function public.complete_project_onboarding(uuid,jsonb) from public,anon;
grant execute on function public.complete_project_onboarding(uuid,jsonb) to authenticated;

commit;
