begin;
alter table public.gsc_connections drop constraint if exists gsc_connections_connection_method_check;
alter table public.gsc_connections add constraint gsc_connections_connection_method_check check (connection_method in ('direct_oauth','composio'));
comment on column public.gsc_connections.encrypted_refresh_token is 'AES-256-GCM encrypted direct Google OAuth refresh token; service-role only.';
commit;
