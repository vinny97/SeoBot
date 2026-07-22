begin;

alter table public.publishing_connections
  drop constraint publishing_connections_provider_check;
alter table public.publishing_connections
  add constraint publishing_connections_provider_check
  check (provider in ('shopify','wix'));

alter table public.article_publications
  drop constraint article_publications_provider_check;
alter table public.article_publications
  add constraint article_publications_provider_check
  check (provider in ('shopify','wix'));

commit;
