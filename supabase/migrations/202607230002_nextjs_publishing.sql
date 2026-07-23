begin;

alter table public.publishing_connections
  drop constraint publishing_connections_provider_check,
  drop constraint publishing_connections_connection_method_check,
  drop constraint publishing_connections_provider_method_check,
  drop constraint publishing_connections_encrypted_credentials_check;

alter table public.publishing_connections
  add constraint publishing_connections_provider_check check (provider in ('shopify','wix','wordpress','nextjs')),
  add constraint publishing_connections_connection_method_check check (connection_method in ('composio','application_password','api_token')),
  add constraint publishing_connections_provider_method_check check (
    (provider in ('shopify','wix') and connection_method = 'composio' and composio_user_id is not null and composio_auth_config_id is not null)
    or (provider = 'wordpress' and connection_method = 'application_password' and composio_user_id is null and composio_auth_config_id is null and composio_connected_account_id is null)
    or (provider = 'nextjs' and connection_method = 'api_token' and composio_user_id is null and composio_auth_config_id is null and composio_connected_account_id is null)
  ),
  add constraint publishing_connections_encrypted_credentials_check check (
    (provider in ('shopify','wix') and encrypted_credentials is null and credential_version is null and credential_key_id is null)
    or (provider in ('wordpress','nextjs') and ((encrypted_credentials is null and credential_version is null) or (encrypted_credentials is not null and credential_version is not null)))
  );

alter table public.article_publications drop constraint article_publications_provider_check;
alter table public.article_publications add constraint article_publications_provider_check check (provider in ('shopify','wix','wordpress','nextjs'));

revoke all on public.publishing_connections,public.article_publications from anon,authenticated;

commit;
