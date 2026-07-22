begin;

alter table public.publishing_connections
  drop constraint publishing_connections_provider_check,
  drop constraint publishing_connections_connection_method_check;

alter table public.publishing_connections
  alter column composio_user_id drop not null,
  alter column composio_auth_config_id drop not null,
  add column encrypted_credentials jsonb,
  add column credential_version integer,
  add column credential_key_id text;

alter table public.publishing_connections
  add constraint publishing_connections_provider_check
    check (provider in ('shopify','wix','wordpress')),
  add constraint publishing_connections_connection_method_check
    check (connection_method in ('composio','application_password')),
  add constraint publishing_connections_provider_method_check
    check (
      (provider in ('shopify','wix') and connection_method = 'composio' and composio_user_id is not null and composio_auth_config_id is not null)
      or
      (provider = 'wordpress' and connection_method = 'application_password' and composio_user_id is null and composio_auth_config_id is null and composio_connected_account_id is null)
    ),
  add constraint publishing_connections_encrypted_credentials_check
    check (
      (provider <> 'wordpress' and encrypted_credentials is null and credential_version is null and credential_key_id is null)
      or
      (provider = 'wordpress' and ((encrypted_credentials is null and credential_version is null) or (encrypted_credentials is not null and credential_version is not null)))
    );

alter table public.article_publications
  drop constraint article_publications_provider_check;
alter table public.article_publications
  add constraint article_publications_provider_check
  check (provider in ('shopify','wix','wordpress'));

create or replace function public.protect_publishing_connection_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id
    or new.project_id is distinct from old.project_id
    or new.user_id is distinct from old.user_id
    or new.provider is distinct from old.provider
    or new.connection_method is distinct from old.connection_method
    or new.composio_user_id is distinct from old.composio_user_id
  then raise exception 'publishing_connection_identity_is_immutable';
  end if;
  return new;
end; $$;

-- The service-role-only publishing routes are the sole credential boundary.
-- Browser roles retain no table privileges, even though RLS remains enabled.
revoke all on public.publishing_connections,public.article_publications from anon,authenticated;

commit;
