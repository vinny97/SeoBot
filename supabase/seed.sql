-- Deterministic local demonstration data. Run only in an explicit demo/local Supabase project.
-- Password for the local seed user: northstar-demo (never use this account in production).
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values (
  '00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','demo@northstar.local',crypt('northstar-demo',gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}','{"full_name":"Demo Owner"}',now(),now(),'','','',''
) on conflict (id) do nothing;
insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
values ('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','{"sub":"10000000-0000-4000-8000-000000000001","email":"demo@northstar.local"}','email',now(),now(),now())
on conflict(id) do nothing;

insert into public.profiles(id,full_name) values ('10000000-0000-4000-8000-000000000001','Demo Owner') on conflict(id) do nothing;
insert into public.workspaces(id,name,created_by) values ('20000000-0000-4000-8000-000000000001','Acme Advisory workspace','10000000-0000-4000-8000-000000000001') on conflict(id) do nothing;
insert into public.workspace_members(id,workspace_id,user_id,role) values ('21000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner') on conflict(id) do nothing;
insert into public.projects(id,workspace_id,name,slug,status,onboarding_status,onboarding_step,onboarding_completed_at,approval_preference)
values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Acme Advisory','acme-advisory','active','completed',8,now(),'review_important') on conflict(id) do nothing;
insert into public.websites(id,project_id,url,normalised_url,domain,display_name,title,meta_description,robots_txt_status,sitemap_status,last_analysed_at,analysis_status)
values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','https://example.com','https://example.com','example.com','Acme Advisory','Acme Advisory','Practical growth advice for independent companies.','detected','detected',now(),'complete') on conflict(id) do nothing;
insert into public.business_profiles(id,project_id,business_name,description,industry,products_services,target_customers,locations,business_model,tone,primary_conversion,audience_scope)
values ('41000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Acme Advisory','Practical growth advice for independent companies.','Business consulting',array['Growth strategy','Financial planning'],'Independent business owners',array['Bristol, UK'],'Service business','Clear and helpful','Book a call','national') on conflict(id) do nothing;
insert into public.project_settings(id,project_id,approval_mode,timezone,weekly_summary_enabled)
values ('42000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','review_important','Europe/London',true) on conflict(id) do nothing;

insert into public.project_goals(id,project_id,goal_type,priority) values
('43000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Get more qualified leads',1),
('43000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Build authority in the industry',2)
on conflict(id) do nothing;
insert into public.competitors(id,project_id,name,domain,url,notes,status,source,confirmed_at) values
('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','North & Co','north.example','https://north.example','Confirmed comparison business','confirmed','user',now()),
('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Clear Strategy','clear.example','https://clear.example','Confirmed comparison business','confirmed','user',now()),
('50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Growth Works','growth.example','https://growth.example','Confirmed comparison business','confirmed','user',now())
on conflict(id) do nothing;
insert into public.keyword_topics(id,project_id,keyword,intent,relevance,status,source,is_hypothesis) values
('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','growth strategy','commercial','high','hypothesis','business_profile',true),
('60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','financial planning for independent businesses','commercial','high','hypothesis','business_profile',true),
('60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','how to plan sustainable growth','informational','to_confirm','hypothesis','initial_hypothesis',true)
on conflict(id) do nothing;
insert into public.opportunities(id,project_id,title,description,category,impact,effort,confidence,status,source,requires_real_data,metadata) values
('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Clarify the main service on the homepage','Make the primary offer easier to understand.','existing_page','strong','medium','moderate','new','business_profile',false,'{"why":"A focused homepage can attract better-fit visitors."}'),
('70000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Create a page for independent business owners','Answer one priority audience directly.','content','moderate','medium','early_hypothesis','planned','business_profile',false,'{"why":"A dedicated page can match a specific customer need."}'),
('70000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Connect Search Console','Replace hypotheses with measured search performance.','measurement','needs_data_connection','low','high','new','system',true,'{"why":"First-party data makes prioritisation more reliable."}'),
('70000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','Review links between core pages','Create clearer paths between related services.','internal_linking','moderate','low','early_hypothesis','new','initial_plan',false,'{"why":"Clear paths help people and search engines understand the site."}')
on conflict(id) do nothing;
insert into public.content_items(id,project_id,title,content_type,status,source,target_topic_id,target_url,brief,draft) values
('80000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','A practical guide to sustainable growth','article','idea','initial_hypothesis','60000000-0000-4000-8000-000000000003',null,'{"summary":"Initial idea only; no article has been generated."}',null),
('80000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Growth strategy for independent businesses','landing_page','idea','business_profile','60000000-0000-4000-8000-000000000001',null,'{"summary":"Initial idea only; needs validation with real search data."}',null),
('80000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Financial planning questions answered','article','idea','business_profile','60000000-0000-4000-8000-000000000002',null,'{"summary":"Initial idea only; no draft exists in V1."}',null)
on conflict(id) do nothing;
insert into public.seo_jobs(id,project_id,job_type,title,status,priority,progress,input_payload,output_payload,attempt_count,scheduled_for,started_at,completed_at) values
('90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','website_review','Reviewing website structure','running',1,64,'{"description":"Mapping the pages and signals already available."}','{}',1,null,now()-interval '12 minutes',null),
('90000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','content_plan','Preparing topic opportunities','queued',2,null,'{"description":"Turning business priorities into starting hypotheses."}','{}',0,now()+interval '45 minutes',null,null),
('90000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','metadata_analysis','Website details collected','completed',1,100,'{"description":"Read public homepage details."}','{"source":"website"}',1,null,now()-interval '20 minutes',now()-interval '15 minutes')
on conflict(id) do nothing;
insert into public.activities(id,project_id,activity_type,title,description,status,created_at) values
('a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','plan_created','Initial SEO plan prepared','Created a starting plan from confirmed business details.','completed',now()-interval '4 minutes'),
('a0000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','opportunity_discovered','Four opportunities identified','Added transparent qualitative hypotheses.','completed',now()-interval '6 minutes'),
('a0000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','profile_updated','Business profile confirmed','Saved goals, audience and approval preference.','completed',now()-interval '10 minutes'),
('a0000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','project_created','Website added','example.com is the primary website.','completed',now()-interval '18 minutes')
on conflict(id) do nothing;
-- approval_requests intentionally remains empty for the V1 empty state.
