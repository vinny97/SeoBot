begin;

create table public.publishing_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('shopify')),
  connection_method text not null check (connection_method in ('composio')),
  status text not null default 'pending' check (status in ('pending','connected','needs_reauthentication','error','disconnected','revoked')),
  composio_user_id text not null,
  composio_connected_account_id text,
  composio_auth_config_id text not null,
  callback_state_hash text,
  external_account_id text,
  external_account_name text,
  external_site_url text,
  is_default boolean not null default false,
  granted_scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  last_connected_at timestamptz,
  last_checked_at timestamptz,
  last_used_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (composio_connected_account_id)
);

create table public.article_publications (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.content_items(id) on delete set null,
  publishing_connection_id uuid not null references public.publishing_connections(id) on delete restrict,
  provider text not null check (provider in ('shopify')),
  publication_kind text not null default 'content' check (publication_kind in ('content','connection_test')),
  remote_article_id text,
  remote_url text,
  remote_admin_url text,
  remote_status text not null default 'creating' check (remote_status in ('creating','draft','published','error','unknown','deleted')),
  idempotency_key text not null,
  content_hash text,
  last_synced_hash text,
  published_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  last_error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((publication_kind = 'connection_test' and content_item_id is null) or (publication_kind = 'content' and content_item_id is not null)),
  unique (publishing_connection_id,idempotency_key)
);

create index publishing_connections_project_provider_idx on public.publishing_connections(project_id,provider,status);
create index publishing_connections_user_idx on public.publishing_connections(user_id,provider,status);
create index article_publications_connection_idx on public.article_publications(publishing_connection_id,created_at desc);
create index article_publications_content_idx on public.article_publications(content_item_id) where content_item_id is not null;

create trigger set_publishing_connections_updated_at before update on public.publishing_connections for each row execute function public.set_updated_at();
create trigger set_article_publications_updated_at before update on public.article_publications for each row execute function public.set_updated_at();

create or replace function public.protect_publishing_connection_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id
    or new.project_id <> old.project_id
    or new.user_id <> old.user_id
    or new.provider <> old.provider
    or new.connection_method <> old.connection_method
    or new.composio_user_id <> old.composio_user_id
  then raise exception 'publishing_connection_identity_is_immutable';
  end if;
  return new;
end; $$;
create trigger protect_publishing_connection_identity before update on public.publishing_connections for each row execute function public.protect_publishing_connection_identity();

alter table public.publishing_connections enable row level security;
alter table public.article_publications enable row level security;

create policy publishing_connections_select on public.publishing_connections for select to authenticated
using (user_id = auth.uid() and public.can_access_project(project_id));
create policy publishing_connections_insert on public.publishing_connections for insert to authenticated
with check (user_id = auth.uid() and composio_user_id = 'searchhand_' || auth.uid()::text and public.can_access_project(project_id));
create policy publishing_connections_update on public.publishing_connections for update to authenticated
using (user_id = auth.uid() and public.can_access_project(project_id))
with check (user_id = auth.uid() and composio_user_id = 'searchhand_' || auth.uid()::text and public.can_access_project(project_id));

create policy article_publications_select on public.article_publications for select to authenticated
using (exists (
  select 1 from public.publishing_connections c
  where c.id = publishing_connection_id
    and c.user_id = auth.uid()
    and public.can_access_project(c.project_id)
));
create policy article_publications_insert on public.article_publications for insert to authenticated
with check (exists (
  select 1 from public.publishing_connections c
  where c.id = publishing_connection_id
    and c.user_id = auth.uid()
    and public.can_access_project(c.project_id)
));
create policy article_publications_update on public.article_publications for update to authenticated
using (exists (
  select 1 from public.publishing_connections c
  where c.id = publishing_connection_id
    and c.user_id = auth.uid()
    and public.can_access_project(c.project_id)
))
with check (exists (
  select 1 from public.publishing_connections c
  where c.id = publishing_connection_id
    and c.user_id = auth.uid()
    and public.can_access_project(c.project_id)
));

-- Sensitive Composio references are intentionally not granted to the browser role.
-- Authenticated customers manage these records through Searchhand server routes,
-- which first verify their normal Supabase project access.
revoke all on public.publishing_connections,public.article_publications from anon,authenticated;

commit;
