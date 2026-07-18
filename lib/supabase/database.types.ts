export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          project_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          project_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status: string
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          project_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          notes: string | null
          project_id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          notes?: string | null
          project_id: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          notes?: string | null
          project_id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          audience_scope: string | null
          brand_tone: string | null
          business_model: string | null
          business_name: string
          created_at: string
          description: string | null
          id: string
          industry: string | null
          locations: string[]
          main_location: string | null
          primary_conversion: string | null
          products_services: string[]
          project_id: string
          target_customers: string | null
          updated_at: string
        }
        Insert: {
          audience_scope?: string | null
          brand_tone?: string | null
          business_model?: string | null
          business_name: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          locations?: string[]
          main_location?: string | null
          primary_conversion?: string | null
          products_services?: string[]
          project_id: string
          target_customers?: string | null
          updated_at?: string
        }
        Update: {
          audience_scope?: string | null
          brand_tone?: string | null
          business_model?: string | null
          business_name?: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          locations?: string[]
          main_location?: string | null
          primary_conversion?: string | null
          products_services?: string[]
          project_id?: string
          target_customers?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          confirmed_at: string | null
          created_at: string
          domain: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          source: string
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          source?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          source?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          brief: string | null
          content_type: string
          created_at: string
          draft: string | null
          id: string
          project_id: string
          published_url: string | null
          purpose: string | null
          source: string
          status: string
          target_customer: string | null
          target_topic_id: string | null
          target_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brief?: string | null
          content_type: string
          created_at?: string
          draft?: string | null
          id?: string
          project_id: string
          published_url?: string | null
          purpose?: string | null
          source: string
          status?: string
          target_customer?: string | null
          target_topic_id?: string | null
          target_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brief?: string | null
          content_type?: string
          created_at?: string
          draft?: string | null
          id?: string
          project_id?: string
          published_url?: string | null
          purpose?: string | null
          source?: string
          status?: string
          target_customer?: string | null
          target_topic_id?: string | null
          target_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_target_topic_id_fkey"
            columns: ["target_topic_id"]
            isOneToOne: false
            referencedRelation: "keyword_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_issue_observations: {
        Row: {
          crawl_run_id: string
          created_at: string
          description: string
          evidence: Json
          fingerprint: string
          id: string
          issue_type: string
          project_id: string
          provider: string
          recommendation: string | null
          severity: string
          title: string
          website_id: string
          website_page_id: string | null
        }
        Insert: {
          crawl_run_id: string
          created_at?: string
          description: string
          evidence?: Json
          fingerprint: string
          id?: string
          issue_type: string
          project_id: string
          provider: string
          recommendation?: string | null
          severity: string
          title: string
          website_id: string
          website_page_id?: string | null
        }
        Update: {
          crawl_run_id?: string
          created_at?: string
          description?: string
          evidence?: Json
          fingerprint?: string
          id?: string
          issue_type?: string
          project_id?: string
          provider?: string
          recommendation?: string | null
          severity?: string
          title?: string
          website_id?: string
          website_page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_issue_observations_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_issue_observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_issue_observations_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_issue_observations_website_page_id_fkey"
            columns: ["website_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_page_snapshots: {
        Row: {
          canonical_url: string | null
          content_hash: string | null
          content_type: string | null
          crawl_depth: number | null
          crawl_run_id: string
          created_at: string
          fetch_error_code: string | null
          fetch_error_message: string | null
          final_url: string | null
          h1_count: number | null
          h2_count: number | null
          http_status: number | null
          id: string
          indexability_reason: string | null
          indexable: boolean | null
          language: string | null
          meta_description: string | null
          normalised_url: string
          redirect_count: number
          requested_url: string
          response_bytes: number | null
          response_time_ms: number | null
          robots_meta: string[]
          source_type: string
          structured_data_types: string[]
          title: string | null
          website_page_id: string | null
          word_count: number | null
          x_robots_tag: string[]
        }
        Insert: {
          canonical_url?: string | null
          content_hash?: string | null
          content_type?: string | null
          crawl_depth?: number | null
          crawl_run_id: string
          created_at?: string
          fetch_error_code?: string | null
          fetch_error_message?: string | null
          final_url?: string | null
          h1_count?: number | null
          h2_count?: number | null
          http_status?: number | null
          id?: string
          indexability_reason?: string | null
          indexable?: boolean | null
          language?: string | null
          meta_description?: string | null
          normalised_url: string
          redirect_count?: number
          requested_url: string
          response_bytes?: number | null
          response_time_ms?: number | null
          robots_meta?: string[]
          source_type: string
          structured_data_types?: string[]
          title?: string | null
          website_page_id?: string | null
          word_count?: number | null
          x_robots_tag?: string[]
        }
        Update: {
          canonical_url?: string | null
          content_hash?: string | null
          content_type?: string | null
          crawl_depth?: number | null
          crawl_run_id?: string
          created_at?: string
          fetch_error_code?: string | null
          fetch_error_message?: string | null
          final_url?: string | null
          h1_count?: number | null
          h2_count?: number | null
          http_status?: number | null
          id?: string
          indexability_reason?: string | null
          indexable?: boolean | null
          language?: string | null
          meta_description?: string | null
          normalised_url?: string
          redirect_count?: number
          requested_url?: string
          response_bytes?: number | null
          response_time_ms?: number | null
          robots_meta?: string[]
          source_type?: string
          structured_data_types?: string[]
          title?: string | null
          website_page_id?: string | null
          word_count?: number | null
          x_robots_tag?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "crawl_page_snapshots_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_page_snapshots_website_page_id_fkey"
            columns: ["website_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_runs: {
        Row: {
          cancel_requested_at: string | null
          completed_at: string | null
          completion_reason: string | null
          configuration: Json
          created_at: string
          created_by: string | null
          current_url: string | null
          error_summary: string | null
          heartbeat_at: string | null
          id: string
          issues_found: number
          max_depth: number
          max_pages: number
          pages_discovered: number
          pages_failed: number
          pages_fetched: number
          pages_queued: number
          pages_skipped: number
          pages_succeeded: number
          project_id: string
          provider: string
          provider_metadata: Json
          provider_version: string | null
          started_at: string | null
          status: string
          trigger_type: string
          updated_at: string
          website_id: string
        }
        Insert: {
          cancel_requested_at?: string | null
          completed_at?: string | null
          completion_reason?: string | null
          configuration?: Json
          created_at?: string
          created_by?: string | null
          current_url?: string | null
          error_summary?: string | null
          heartbeat_at?: string | null
          id?: string
          issues_found?: number
          max_depth: number
          max_pages: number
          pages_discovered?: number
          pages_failed?: number
          pages_fetched?: number
          pages_queued?: number
          pages_skipped?: number
          pages_succeeded?: number
          project_id: string
          provider?: string
          provider_metadata?: Json
          provider_version?: string | null
          started_at?: string | null
          status: string
          trigger_type: string
          updated_at?: string
          website_id: string
        }
        Update: {
          cancel_requested_at?: string | null
          completed_at?: string | null
          completion_reason?: string | null
          configuration?: Json
          created_at?: string
          created_by?: string | null
          current_url?: string | null
          error_summary?: string | null
          heartbeat_at?: string | null
          id?: string
          issues_found?: number
          max_depth?: number
          max_pages?: number
          pages_discovered?: number
          pages_failed?: number
          pages_fetched?: number
          pages_queued?: number
          pages_skipped?: number
          pages_succeeded?: number
          project_id?: string
          provider?: string
          provider_metadata?: Json
          provider_version?: string | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_runs_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_settings: {
        Row: {
          concurrency: number
          created_at: string
          id: string
          include_subdomains: boolean
          max_depth: number
          max_pages: number
          query_parameter_policy: string
          request_delay_ms: number
          respect_robots: boolean
          updated_at: string
          website_id: string
        }
        Insert: {
          concurrency?: number
          created_at?: string
          id?: string
          include_subdomains?: boolean
          max_depth?: number
          max_pages?: number
          query_parameter_policy?: string
          request_delay_ms?: number
          respect_robots?: boolean
          updated_at?: string
          website_id: string
        }
        Update: {
          concurrency?: number
          created_at?: string
          id?: string
          include_subdomains?: boolean
          max_depth?: number
          max_pages?: number
          query_parameter_policy?: string
          request_delay_ms?: number
          respect_robots?: boolean
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_settings_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: true
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      crawler_worker_credentials: {
        Row: {
          capabilities: string[]
          created_at: string
          enabled: boolean
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          capabilities: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          configuration: Json
          connected_at: string | null
          created_at: string
          error_message: string | null
          external_account_id: string | null
          id: string
          last_synced_at: string | null
          project_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          external_account_id?: string | null
          id?: string
          last_synced_at?: string | null
          project_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          external_account_id?: string | null
          id?: string
          last_synced_at?: string | null
          project_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_topics: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          is_hypothesis: boolean
          project_id: string
          relevance: string | null
          source: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          is_hypothesis?: boolean
          project_id: string
          relevance?: string | null
          source: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          is_hypothesis?: boolean
          project_id?: string
          relevance?: string | null
          source?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_topics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          created_at: string
          current_step: number
          draft_data: Json
          last_saved_at: string
          project_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_step?: number
          draft_data?: Json
          last_saved_at?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_step?: number
          draft_data?: Json
          last_saved_at?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          category: string
          confidence: string
          created_at: string
          description: string
          discovered_at: string
          effort: string
          id: string
          impact: string
          metadata: Json
          project_id: string
          related_url: string | null
          requires_real_data: boolean
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          confidence: string
          created_at?: string
          description: string
          discovered_at?: string
          effort: string
          id?: string
          impact: string
          metadata?: Json
          project_id: string
          related_url?: string | null
          requires_real_data?: boolean
          source: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          confidence?: string
          created_at?: string
          description?: string
          discovered_at?: string
          effort?: string
          id?: string
          impact?: string
          metadata?: Json
          project_id?: string
          related_url?: string | null
          requires_real_data?: boolean
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      page_headings: {
        Row: {
          crawl_page_snapshot_id: string
          created_at: string
          heading_level: number
          heading_text: string
          id: string
          position: number
          website_page_id: string | null
        }
        Insert: {
          crawl_page_snapshot_id: string
          created_at?: string
          heading_level: number
          heading_text: string
          id?: string
          position: number
          website_page_id?: string | null
        }
        Update: {
          crawl_page_snapshot_id?: string
          created_at?: string
          heading_level?: number
          heading_text?: string
          id?: string
          position?: number
          website_page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_headings_crawl_page_snapshot_id_fkey"
            columns: ["crawl_page_snapshot_id"]
            isOneToOne: false
            referencedRelation: "crawl_page_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_headings_website_page_id_fkey"
            columns: ["website_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_links: {
        Row: {
          anchor_text: string | null
          crawl_page_snapshot_id: string
          crawl_run_id: string
          created_at: string
          id: string
          is_followed: boolean
          link_type: string
          normalised_target_url: string | null
          rel_values: string[]
          source_page_id: string | null
          target_page_id: string | null
          target_url: string
        }
        Insert: {
          anchor_text?: string | null
          crawl_page_snapshot_id: string
          crawl_run_id: string
          created_at?: string
          id?: string
          is_followed?: boolean
          link_type: string
          normalised_target_url?: string | null
          rel_values?: string[]
          source_page_id?: string | null
          target_page_id?: string | null
          target_url: string
        }
        Update: {
          anchor_text?: string | null
          crawl_page_snapshot_id?: string
          crawl_run_id?: string
          created_at?: string
          id?: string
          is_followed?: boolean
          link_type?: string
          normalised_target_url?: string | null
          rel_values?: string[]
          source_page_id?: string | null
          target_page_id?: string | null
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_links_crawl_page_snapshot_id_fkey"
            columns: ["crawl_page_snapshot_id"]
            isOneToOne: false
            referencedRelation: "crawl_page_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_links_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_links_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_links_target_page_id_fkey"
            columns: ["target_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          priority: number | null
          project_id: string
        }
        Insert: {
          created_at?: string
          goal_type: string
          id?: string
          priority?: number | null
          project_id: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          priority?: number | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          approval_mode: string
          created_at: string
          id: string
          project_id: string
          timezone: string | null
          updated_at: string
          weekly_summary_enabled: boolean
        }
        Insert: {
          approval_mode?: string
          created_at?: string
          id?: string
          project_id: string
          timezone?: string | null
          updated_at?: string
          weekly_summary_enabled?: boolean
        }
        Update: {
          approval_mode?: string
          created_at?: string
          id?: string
          project_id?: string
          timezone?: string | null
          updated_at?: string
          weekly_summary_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_primary: boolean
          name: string
          onboarding_completed_at: string | null
          onboarding_status: string
          onboarding_step: number
          slug: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_primary?: boolean
          name: string
          onboarding_completed_at?: string | null
          onboarding_status?: string
          onboarding_step?: number
          slug: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_primary?: boolean
          name?: string
          onboarding_completed_at?: string | null
          onboarding_status?: string
          onboarding_step?: number
          slug?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      robots_rules: {
        Row: {
          created_at: string
          directive: string
          id: string
          position: number
          robots_snapshot_id: string
          user_agent: string
          value: string | null
        }
        Insert: {
          created_at?: string
          directive: string
          id?: string
          position: number
          robots_snapshot_id: string
          user_agent: string
          value?: string | null
        }
        Update: {
          created_at?: string
          directive?: string
          id?: string
          position?: number
          robots_snapshot_id?: string
          user_agent?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "robots_rules_robots_snapshot_id_fkey"
            columns: ["robots_snapshot_id"]
            isOneToOne: false
            referencedRelation: "robots_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      robots_snapshots: {
        Row: {
          content: string | null
          content_hash: string | null
          crawl_run_id: string
          created_at: string
          fetch_error_code: string | null
          fetch_error_message: string | null
          fetched_at: string
          http_status: number | null
          id: string
          url: string
          website_id: string
        }
        Insert: {
          content?: string | null
          content_hash?: string | null
          crawl_run_id: string
          created_at?: string
          fetch_error_code?: string | null
          fetch_error_message?: string | null
          fetched_at?: string
          http_status?: number | null
          id?: string
          url: string
          website_id: string
        }
        Update: {
          content?: string | null
          content_hash?: string | null
          crawl_run_id?: string
          created_at?: string
          fetch_error_code?: string | null
          fetch_error_message?: string | null
          fetched_at?: string
          http_status?: number | null
          id?: string
          url?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "robots_snapshots_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: true
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robots_snapshots_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_issues: {
        Row: {
          crawl_run_id: string
          created_at: string
          description: string
          evidence: Json
          fingerprint: string
          first_seen_at: string
          id: string
          ignored_at: string | null
          ignored_by: string | null
          issue_type: string
          last_seen_at: string
          project_id: string
          recommendation: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          website_id: string
          website_page_id: string | null
        }
        Insert: {
          crawl_run_id: string
          created_at?: string
          description: string
          evidence?: Json
          fingerprint: string
          first_seen_at?: string
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          issue_type: string
          last_seen_at?: string
          project_id: string
          recommendation?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
          website_id: string
          website_page_id?: string | null
        }
        Update: {
          crawl_run_id?: string
          created_at?: string
          description?: string
          evidence?: Json
          fingerprint?: string
          first_seen_at?: string
          id?: string
          ignored_at?: string | null
          ignored_by?: string | null
          issue_type?: string
          last_seen_at?: string
          project_id?: string
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          website_id?: string
          website_page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_issues_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_issues_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_issues_website_page_id_fkey"
            columns: ["website_page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_jobs: {
        Row: {
          attempt_count: number
          cancel_requested_at: string | null
          completed_at: string | null
          crawl_run_id: string | null
          created_at: string
          dedupe_key: string | null
          error_message: string | null
          heartbeat_at: string | null
          id: string
          input_payload: Json
          job_type: string
          lock_expires_at: string | null
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string | null
          output_payload: Json
          priority: number
          progress: number | null
          project_id: string
          required_capability: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          attempt_count?: number
          cancel_requested_at?: string | null
          completed_at?: string | null
          crawl_run_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          error_message?: string | null
          heartbeat_at?: string | null
          id?: string
          input_payload?: Json
          job_type: string
          lock_expires_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          output_payload?: Json
          priority?: number
          progress?: number | null
          project_id: string
          required_capability?: string
          scheduled_for?: string | null
          started_at?: string | null
          status: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          attempt_count?: number
          cancel_requested_at?: string | null
          completed_at?: string | null
          crawl_run_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          error_message?: string | null
          heartbeat_at?: string | null
          id?: string
          input_payload?: Json
          job_type?: string
          lock_expires_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          output_payload?: Json
          priority?: number
          progress?: number | null
          project_id?: string
          required_capability?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_jobs_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemaps: {
        Row: {
          content_hash: string | null
          crawl_run_id: string
          created_at: string
          fetch_error_code: string | null
          fetch_error_message: string | null
          http_status: number | null
          id: string
          last_modified_max: string | null
          sitemap_type: string
          url: string
          url_count: number | null
          website_id: string
        }
        Insert: {
          content_hash?: string | null
          crawl_run_id: string
          created_at?: string
          fetch_error_code?: string | null
          fetch_error_message?: string | null
          http_status?: number | null
          id?: string
          last_modified_max?: string | null
          sitemap_type?: string
          url: string
          url_count?: number | null
          website_id: string
        }
        Update: {
          content_hash?: string | null
          crawl_run_id?: string
          created_at?: string
          fetch_error_code?: string | null
          fetch_error_message?: string | null
          http_status?: number | null
          id?: string
          last_modified_max?: string | null
          sitemap_type?: string
          url?: string
          url_count?: number | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitemaps_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitemaps_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      siteone_allowed_projects: {
        Row: {
          created_at: string
          project_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siteone_allowed_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pages: {
        Row: {
          created_at: string
          final_url: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          last_seen_crawl_id: string | null
          latest_canonical_url: string | null
          latest_content_hash: string | null
          latest_content_type: string | null
          latest_h1_count: number | null
          latest_h2_count: number | null
          latest_http_status: number | null
          latest_indexability_reason: string | null
          latest_indexable: boolean | null
          latest_language: string | null
          latest_meta_description: string | null
          latest_structured_data_types: string[]
          latest_title: string | null
          latest_word_count: number | null
          normalised_url: string
          page_type: string
          path: string | null
          project_id: string
          updated_at: string
          url: string
          website_id: string
        }
        Insert: {
          created_at?: string
          final_url?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          last_seen_crawl_id?: string | null
          latest_canonical_url?: string | null
          latest_content_hash?: string | null
          latest_content_type?: string | null
          latest_h1_count?: number | null
          latest_h2_count?: number | null
          latest_http_status?: number | null
          latest_indexability_reason?: string | null
          latest_indexable?: boolean | null
          latest_language?: string | null
          latest_meta_description?: string | null
          latest_structured_data_types?: string[]
          latest_title?: string | null
          latest_word_count?: number | null
          normalised_url: string
          page_type?: string
          path?: string | null
          project_id: string
          updated_at?: string
          url: string
          website_id: string
        }
        Update: {
          created_at?: string
          final_url?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          last_seen_crawl_id?: string | null
          latest_canonical_url?: string | null
          latest_content_hash?: string | null
          latest_content_type?: string | null
          latest_h1_count?: number | null
          latest_h2_count?: number | null
          latest_http_status?: number | null
          latest_indexability_reason?: string | null
          latest_indexable?: boolean | null
          latest_language?: string | null
          latest_meta_description?: string | null
          latest_structured_data_types?: string[]
          latest_title?: string | null
          latest_word_count?: number | null
          normalised_url?: string
          page_type?: string
          path?: string | null
          project_id?: string
          updated_at?: string
          url?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_last_seen_crawl_id_fkey"
            columns: ["last_seen_crawl_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          analysis_error: string | null
          analysis_status: string
          crawl_authorised_at: string | null
          created_at: string
          display_name: string | null
          domain: string
          favicon_url: string | null
          id: string
          is_primary: boolean
          last_analysed_at: string | null
          meta_description: string | null
          normalised_url: string
          project_id: string
          robots_txt_status: string
          sitemap_status: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?: string
          crawl_authorised_at?: string | null
          created_at?: string
          display_name?: string | null
          domain: string
          favicon_url?: string | null
          id?: string
          is_primary?: boolean
          last_analysed_at?: string | null
          meta_description?: string | null
          normalised_url: string
          project_id: string
          robots_txt_status?: string
          sitemap_status?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          analysis_error?: string | null
          analysis_status?: string
          crawl_authorised_at?: string | null
          created_at?: string
          display_name?: string | null
          domain?: string
          favicon_url?: string | null
          id?: string
          is_primary?: boolean
          last_analysed_at?: string | null
          meta_description?: string | null
          normalised_url?: string
          project_id?: string
          robots_txt_status?: string
          sitemap_status?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "websites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_heartbeats: {
        Row: {
          capabilities: string[]
          created_at: string
          current_job_id: string | null
          last_heartbeat_at: string
          metadata: Json
          provider_versions: Json
          runtime: string | null
          status: string
          updated_at: string
          worker_id: string
          worker_type: string
        }
        Insert: {
          capabilities?: string[]
          created_at?: string
          current_job_id?: string | null
          last_heartbeat_at?: string
          metadata?: Json
          provider_versions?: Json
          runtime?: string | null
          status: string
          updated_at?: string
          worker_id: string
          worker_type: string
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          current_job_id?: string | null
          last_heartbeat_at?: string
          metadata?: Json
          provider_versions?: Json
          runtime?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_heartbeats_current_job_id_fkey"
            columns: ["current_job_id"]
            isOneToOne: false
            referencedRelation: "seo_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      claim_next_crawl_job: {
        Args: { claiming_worker_id: string; lock_minutes?: number }
        Returns: Json
      }
      claim_next_siteone_job: {
        Args: {
          claiming_worker_id: string
          lock_minutes?: number
          worker_token: string
        }
        Returns: Json
      }
      complete_crawl_job: {
        Args: {
          claiming_worker_id: string
          counters: Json
          final_status: string
          target_job_id: string
        }
        Returns: boolean
      }
      complete_project_onboarding: {
        Args: { payload: Json; target_project_id: string }
        Returns: string
      }
      complete_siteone_job: {
        Args: {
          claiming_worker_id: string
          final_status: string
          metadata?: Json
          reason: string
          siteone_version: string
          target_job_id: string
          worker_token: string
        }
        Returns: boolean
      }
      crawler_worker_credential_id: {
        Args: { required_capability: string; worker_token: string }
        Returns: string
      }
      create_initial_project: {
        Args: {
          draft?: Json
          project_name: string
          project_slug: string
          website_domain: string
          website_url: string
          workspace_name: string
        }
        Returns: Database["public"]["CompositeTypes"]["initial_project_result"]
        SetofOptions: {
          from: "*"
          to: "initial_project_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enqueue_internal_siteone_crawl: {
        Args: { target_website_id: string }
        Returns: string
      }
      enqueue_website_crawl: {
        Args: { requested_trigger: string; target_website_id: string }
        Returns: string
      }
      fail_crawl_job: {
        Args: {
          claiming_worker_id: string
          retryable: boolean
          safe_error: string
          target_job_id: string
        }
        Returns: string
      }
      fail_siteone_job: {
        Args: {
          claiming_worker_id: string
          retryable: boolean
          safe_error: string
          target_job_id: string
          worker_token: string
        }
        Returns: string
      }
      heartbeat_crawl_job: {
        Args: {
          active_url?: string
          claiming_worker_id: string
          counters: Json
          lock_minutes?: number
          target_job_id: string
        }
        Returns: boolean
      }
      heartbeat_siteone_job: {
        Args: {
          claiming_worker_id: string
          counters?: Json
          lock_minutes?: number
          phase: string
          target_job_id: string
          worker_token: string
        }
        Returns: boolean
      }
      import_siteone_batch: {
        Args: {
          claiming_worker_id: string
          issue_batch?: Json
          page_batch: Json
          target_job_id: string
          worker_token: string
        }
        Returns: Json
      }
      is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      register_siteone_worker: {
        Args: {
          claiming_worker_id: string
          siteone_version: string
          worker_runtime?: string
          worker_token: string
        }
        Returns: boolean
      }
      request_crawl_cancellation: {
        Args: { target_run_id: string }
        Returns: boolean
      }
      requeue_stale_crawl_jobs: { Args: never; Returns: number }
      set_issue_ignored: {
        Args: { should_ignore: boolean; target_issue_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      initial_project_result: {
        workspace_id: string | null
        project_id: string | null
        website_id: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
