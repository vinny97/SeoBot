begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-b@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.workspaces(id,name,created_by) values('a0000000-0000-0000-0000-000000000001','Workspace A','10000000-0000-0000-0000-000000000001');
insert into public.workspace_members(workspace_id,user_id,role) values('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner');
insert into public.projects(id,workspace_id,created_by,name,slug,is_primary) values('aa000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Project A','project-a',true);
insert into public.websites(id,project_id,url,normalised_url,domain) values('ab000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','https://example.test','https://example.test','example.test');
insert into public.gsc_connections(id,workspace_id,project_id,website_id,user_id,status) values('ac000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','ab000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','connected');
insert into public.gsc_daily_metrics(connection_id,date,clicks,impressions,ctr,position) values('ac000000-0000-0000-0000-000000000001',current_date,1,10,.1,4);
insert into public.seo_recommendations(workspace_id,project_id,website_id,recommendation_type,confidence,title,summary,reason,recommended_action,expected_impact,estimated_effort,risk_level,fingerprint) values('a0000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','ab000000-0000-0000-0000-000000000001','improve_existing_page','high','Improve pricing','Measured summary','Measured reason','Update the page','high','medium','low','fingerprint-a');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.projects),1::bigint,'owner A sees project A');
select lives_ok($$insert into public.competitors(project_id,name,domain,status,source) values('aa000000-0000-0000-0000-000000000001','Competitor','competitor.test','confirmed','user')$$,'owner A can write project A');
select throws_ok($$select * from public.publishing_connections$$,'42501',null,'browser roles cannot read publishing credentials even in their own project');
select throws_ok($$select * from public.gsc_connections$$,'42501',null,'browser roles never receive encrypted GSC credentials');
select is((select count(*) from public.gsc_daily_metrics),1::bigint,'owner A sees project A search metrics');
select is((select count(*) from public.seo_recommendations),1::bigint,'owner A sees project A recommendations');

select set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.projects),0::bigint,'owner B cannot see project A');
select throws_ok($$insert into public.competitors(project_id,name,domain,status,source) values('aa000000-0000-0000-0000-000000000001','Intruder','intruder.test','confirmed','user')$$,'42501',null,'owner B cannot write project A');
select throws_ok($$select * from public.article_publications$$,'42501',null,'browser roles cannot read publication records across workspaces');
select is((select count(*) from public.gsc_daily_metrics),0::bigint,'owner B cannot see project A search metrics');
select is((select count(*) from public.seo_recommendations),0::bigint,'owner B cannot see project A recommendations');

select * from finish();
rollback;
