export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row,Insert=Partial<Row>,Update=Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type Timestamps = { created_at:string; updated_at:string };
type ProjectChild = { id:string; project_id:string; created_at:string };

export type Database = { public: {
  Tables: {
    profiles: Table<{id:string;full_name:string|null;avatar_url:string|null}&Timestamps>;
    workspaces: Table<{id:string;name:string;created_by:string}&Timestamps>;
    workspace_members: Table<{id:string;workspace_id:string;user_id:string;role:"owner"|"member";created_at:string}>;
    projects: Table<{id:string;workspace_id:string;created_by:string;name:string;slug:string;status:"active"|"paused"|"archived";is_primary:boolean;onboarding_status:"not_started"|"in_progress"|"completed";onboarding_step:number;onboarding_completed_at:string|null}&Timestamps>;
    websites: Table<ProjectChild&{url:string;normalised_url:string;domain:string;display_name:string|null;is_primary:boolean;title:string|null;meta_description:string|null;favicon_url:string|null;robots_txt_status:string;sitemap_status:string;analysis_status:string;analysis_error:string|null;last_analysed_at:string|null;updated_at:string}>;
    onboarding_progress: Table<{project_id:string;current_step:number;draft_data:Json;completed:boolean;last_saved_at:string}&Timestamps>;
    business_profiles: Table<ProjectChild&{business_name:string;description:string|null;industry:string|null;products_services:string[];target_customers:string|null;locations:string[];main_location:string|null;business_model:string|null;brand_tone:string|null;primary_conversion:string|null;audience_scope:"local"|"national"|"international"|null;updated_at:string}>;
    project_goals: Table<ProjectChild&{goal_type:string;priority:number|null}>;
    project_settings: Table<ProjectChild&{approval_mode:"review_all"|"review_important"|"autonomous_within_rules";timezone:string|null;weekly_summary_enabled:boolean;updated_at:string}>;
    competitors: Table<ProjectChild&{name:string;domain:string|null;url:string|null;notes:string|null;status:"confirmed"|"inactive";source:"user"|"onboarding_suggestion"|"future_provider";confirmed_at:string|null;updated_at:string}>;
    opportunities: Table<ProjectChild&{title:string;description:string;category:string;impact:string;effort:string;confidence:string;status:"new"|"planned"|"in_progress"|"waiting_for_approval"|"completed"|"dismissed";source:"onboarding_seed"|"user";requires_real_data:boolean;related_url:string|null;metadata:Json;discovered_at:string;updated_at:string}>;
    keyword_topics: Table<ProjectChild&{topic:string;intent:string|null;relevance:string|null;status:string;source:string;is_hypothesis:boolean;updated_at:string}>;
    content_items: Table<ProjectChild&{title:string;content_type:string;purpose:string|null;target_customer:string|null;status:"idea"|"planned"|"dismissed"|"archived";source:"onboarding_seed"|"user";target_topic_id:string|null;target_url:string|null;brief:string|null;draft:string|null;published_url:string|null;updated_at:string}>;
    seo_jobs: Table<ProjectChild&{job_type:string;status:string;priority:number;progress:number|null;input_payload:Json;output_payload:Json;attempt_count:number;error_message:string|null;scheduled_for:string|null;started_at:string|null;completed_at:string|null;updated_at:string}>;
    activities: Table<ProjectChild&{activity_type:string;title:string;description:string|null;status:string;related_entity_type:string|null;related_entity_id:string|null;metadata:Json}>;
    approval_requests: Table<ProjectChild&{entity_type:string;entity_id:string|null;status:string;requested_at:string;resolved_at:string|null;resolved_by:string|null;notes:string|null;updated_at:string}>;
    integrations: Table<ProjectChild&{provider:string;status:string;external_account_id:string|null;configuration:Json;connected_at:string|null;last_synced_at:string|null;error_message:string|null;updated_at:string}>;
  };
  Views: Record<string,never>;
  Functions: {
    is_workspace_member:{Args:{target_workspace_id:string};Returns:boolean};
    is_workspace_owner:{Args:{target_workspace_id:string};Returns:boolean};
    can_access_project:{Args:{target_project_id:string};Returns:boolean};
    create_initial_project:{Args:{workspace_name:string;project_name:string;project_slug:string;website_url:string;website_domain:string;draft?:Json};Returns:{workspace_id:string;project_id:string;website_id:string}[]};
    complete_project_onboarding:{Args:{target_project_id:string;payload:Json};Returns:string};
  };
  Enums: Record<string,never>;
  CompositeTypes: { initial_project_result:{workspace_id:string;project_id:string;website_id:string} };
}};
