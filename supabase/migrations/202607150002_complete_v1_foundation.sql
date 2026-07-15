-- Complete the V1 workflow schema. No credentials or provider tokens belong in these tables.
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  content_type text not null,
  status text not null default 'idea',
  source text not null,
  target_topic_id uuid references public.keyword_topics(id) on delete set null,
  target_url text,
  brief jsonb,
  draft text,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  approval_mode text not null default 'review_important',
  timezone text not null default 'UTC',
  weekly_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integrations add column external_account_id text;
alter table public.integrations add column last_synced_at timestamptz;
alter table public.integrations add column error_message text;
alter table public.seo_jobs rename column scheduled_at to scheduled_for;

create index projects_workspace_id_idx on public.projects(workspace_id);
create index websites_project_id_idx on public.websites(project_id);
create index opportunities_project_status_idx on public.opportunities(project_id,status);
create index seo_jobs_project_status_idx on public.seo_jobs(project_id,status);
create index activities_project_created_idx on public.activities(project_id,created_at desc);
create index content_items_project_status_idx on public.content_items(project_id,status);
create index approval_requests_project_status_idx on public.approval_requests(project_id,status);

alter table public.content_items enable row level security;
alter table public.approval_requests enable row level security;
alter table public.project_settings enable row level security;

create policy "members manage content items" on public.content_items for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));
create policy "members manage approval requests" on public.approval_requests for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));
create policy "members manage project settings" on public.project_settings for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

-- Resolved approvals may only name the signed-in user as resolver.
create or replace function public.validate_approval_resolver()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.resolved_by is not null and new.resolved_by <> auth.uid() then
    raise exception 'Approval resolver must be the signed-in user';
  end if;
  return new;
end;
$$;
create trigger approval_resolver_guard before insert or update on public.approval_requests
for each row execute procedure public.validate_approval_resolver();
