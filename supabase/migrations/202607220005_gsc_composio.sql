-- Google Search Console credentials are managed by Composio. Searchhand keeps
-- only scoped connected-account references and normalized metric data.
alter table public.gsc_connections
  add column if not exists connection_method text not null default 'composio',
  add column if not exists composio_user_id text,
  add column if not exists composio_connected_account_id text,
  add column if not exists composio_auth_config_id text;

alter table public.gsc_connections
  drop constraint if exists gsc_connections_connection_method_check;
alter table public.gsc_connections
  add constraint gsc_connections_connection_method_check
  check (connection_method = 'composio');

create unique index if not exists gsc_connections_composio_account_idx
  on public.gsc_connections(composio_connected_account_id)
  where composio_connected_account_id is not null;

alter table public.gsc_oauth_sessions
  add column if not exists composio_user_id text,
  add column if not exists composio_connected_account_id text,
  add column if not exists composio_auth_config_id text,
  add column if not exists previous_connected_account_id text;

create index if not exists gsc_oauth_sessions_composio_account_idx
  on public.gsc_oauth_sessions(composio_connected_account_id)
  where composio_connected_account_id is not null;

comment on column public.gsc_connections.encrypted_refresh_token is
  'Legacy direct-OAuth field. Must remain null for Composio-managed GSC connections.';
comment on column public.gsc_connections.composio_connected_account_id is
  'Opaque Composio account reference. OAuth access and refresh tokens remain in Composio.';
