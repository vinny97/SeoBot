begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-a@example.test','',now(),'{}','{}',now(),now(),'','','',''),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-b@example.test','',now(),'{}','{}',now(),now(),'','','','');
insert into public.workspaces(id,name,created_by) values('a0000000-0000-0000-0000-000000000001','Workspace A','10000000-0000-0000-0000-000000000001');
insert into public.workspace_members(workspace_id,user_id,role) values('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner');
insert into public.projects(id,workspace_id,created_by,name,slug,is_primary) values('aa000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Project A','project-a',true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.projects),1::bigint,'owner A sees project A');
select lives_ok($$insert into public.competitors(project_id,name,domain,status,source) values('aa000000-0000-0000-0000-000000000001','Competitor','competitor.test','confirmed','user')$$,'owner A can write project A');
select throws_ok($$select * from public.publishing_connections$$,'42501',null,'browser roles cannot read publishing credentials even in their own project');

select set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.projects),0::bigint,'owner B cannot see project A');
select throws_ok($$insert into public.competitors(project_id,name,domain,status,source) values('aa000000-0000-0000-0000-000000000001','Intruder','intruder.test','confirmed','user')$$,'42501',null,'owner B cannot write project A');
select throws_ok($$select * from public.article_publications$$,'42501',null,'browser roles cannot read publication records across workspaces');

select * from finish();
rollback;
