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
      activity_log: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          org_id: string | null
          org_name: string | null
          target_label: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          org_id?: string | null
          org_name?: string | null
          target_label?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          org_id?: string | null
          org_name?: string | null
          target_label?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      cal_assets: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          id: string
          org_id: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          org_id?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          org_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      cal_post_feedback: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author?: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_post_feedback_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cal_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cal_post_media: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          post_id: string
          url: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          post_id: string
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          post_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cal_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cal_posts: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string | null
          persona: string | null
          platform: string
          scheduled_date: string
          scheduled_time: string | null
          status: string
          title: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string | null
          persona?: string | null
          platform?: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          title: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string | null
          persona?: string | null
          platform?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cal_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          ai_memory: string | null
          call_taken_by: string | null
          campaign: string | null
          comments: string | null
          company: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json
          deal_size: string | null
          demo_status: string | null
          email: string | null
          id: string
          industry: string | null
          last_activity_at: string | null
          lead_source: string | null
          org_id: string | null
          phone: string | null
          record_type: string
          remarks: string | null
          scheduled_at: string | null
          scheduled_label: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          ai_memory?: string | null
          call_taken_by?: string | null
          campaign?: string | null
          comments?: string | null
          company?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json
          deal_size?: string | null
          demo_status?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          lead_source?: string | null
          org_id?: string | null
          phone?: string | null
          record_type?: string
          remarks?: string | null
          scheduled_at?: string | null
          scheduled_label?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ai_memory?: string | null
          call_taken_by?: string | null
          campaign?: string | null
          comments?: string | null
          company?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json
          deal_size?: string | null
          demo_status?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          lead_source?: string | null
          org_id?: string | null
          phone?: string | null
          record_type?: string
          remarks?: string | null
          scheduled_at?: string | null
          scheduled_label?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_field_defs: {
        Row: {
          created_at: string
          field_type: string
          id: string
          mode: string
          name: string
          options: string[] | null
          org_id: string | null
          position: number
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          mode: string
          name: string
          options?: string[] | null
          org_id?: string | null
          position?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          mode?: string
          name?: string
          options?: string[] | null
          org_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_field_defs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          author_name: string | null
          author_role: string | null
          contact_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_name?: string | null
          author_role?: string | null
          contact_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_name?: string | null
          author_role?: string | null
          contact_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          org_id: string | null
          period: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          org_id?: string | null
          period?: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          org_id?: string | null
          period?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_campaign_metrics: {
        Row: {
          calls_made: number
          campaign_id: string
          connect_rate: number
          connections_accepted: number
          connections_made: number
          connections_sent: number
          cost_per_lead: number
          ctr: number
          do_not_disturb: number
          domain_healthy: boolean
          domains_warmed: number
          future_calls_scheduled: number
          id: string
          inmails_sent: number
          leads: number
          meetings_booked: number
          meetings_completed: number
          meetings_rescheduled: number
          meetings_scheduled: number
          message_replies: number
          no_shows: number
          not_responded: number
          open_rate: number
          org_id: string
          pending_update: number
          replies: number
          reply_rate: number
          responded: number
          sender_reputation: number
          sends: number
          sent: number
          spend: number
          total_leads_contacted: number
          updated_at: string | null
          warmup_done: boolean
        }
        Insert: {
          calls_made?: number
          campaign_id: string
          connect_rate?: number
          connections_accepted?: number
          connections_made?: number
          connections_sent?: number
          cost_per_lead?: number
          ctr?: number
          do_not_disturb?: number
          domain_healthy?: boolean
          domains_warmed?: number
          future_calls_scheduled?: number
          id?: string
          inmails_sent?: number
          leads?: number
          meetings_booked?: number
          meetings_completed?: number
          meetings_rescheduled?: number
          meetings_scheduled?: number
          message_replies?: number
          no_shows?: number
          not_responded?: number
          open_rate?: number
          org_id: string
          pending_update?: number
          replies?: number
          reply_rate?: number
          responded?: number
          sender_reputation?: number
          sends?: number
          sent?: number
          spend?: number
          total_leads_contacted?: number
          updated_at?: string | null
          warmup_done?: boolean
        }
        Update: {
          calls_made?: number
          campaign_id?: string
          connect_rate?: number
          connections_accepted?: number
          connections_made?: number
          connections_sent?: number
          cost_per_lead?: number
          ctr?: number
          do_not_disturb?: number
          domain_healthy?: boolean
          domains_warmed?: number
          future_calls_scheduled?: number
          id?: string
          inmails_sent?: number
          leads?: number
          meetings_booked?: number
          meetings_completed?: number
          meetings_rescheduled?: number
          meetings_scheduled?: number
          message_replies?: number
          no_shows?: number
          not_responded?: number
          open_rate?: number
          org_id?: string
          pending_update?: number
          replies?: number
          reply_rate?: number
          responded?: number
          sender_reputation?: number
          sends?: number
          sent?: number
          spend?: number
          total_leads_contacted?: number
          updated_at?: string | null
          warmup_done?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gtm_campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "gtm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_campaign_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_campaigns: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          name: string
          org_id: string
          status: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          status?: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_campaigns_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "gtm_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_channels: {
        Row: {
          channel_type: string
          created_at: string | null
          enabled: boolean
          id: string
          org_id: string
        }
        Insert: {
          channel_type: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          org_id: string
        }
        Update: {
          channel_type?: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_credentials: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          is_admin_only: boolean
          notes: string | null
          org_id: string | null
          password: string | null
          site_name: string
          username: string | null
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          is_admin_only?: boolean
          notes?: string | null
          org_id?: string | null
          password?: string | null
          site_name: string
          username?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          is_admin_only?: boolean
          notes?: string | null
          org_id?: string | null
          password?: string | null
          site_name?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_credentials_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "kb_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_credentials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_folders: {
        Row: {
          created_at: string
          id: string
          is_admin_only: boolean
          is_credentials_vault: boolean
          name: string
          org_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_only?: boolean
          is_credentials_vault?: boolean
          name: string
          org_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_only?: boolean
          is_credentials_vault?: boolean
          name?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_items: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          folder_id: string
          id: string
          is_admin_only: boolean
          name: string
          org_id: string | null
          type: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          folder_id: string
          id?: string
          is_admin_only?: boolean
          name: string
          org_id?: string | null
          type?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          folder_id?: string
          id?: string
          is_admin_only?: boolean
          name?: string
          org_id?: string | null
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "kb_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_vault_settings: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          pin_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          pin_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_vault_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_dump_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          note: string | null
          uploader_name: string | null
          uploader_role: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          note?: string | null
          uploader_name?: string | null
          uploader_role?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          note?: string | null
          uploader_name?: string | null
          uploader_role?: string | null
          url?: string
        }
        Relationships: []
      }
      org_voice_agents: {
        Row: {
          agent_id: string
          org_id: string
        }
        Insert: {
          agent_id: string
          org_id: string
        }
        Update: {
          agent_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_voice_agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          org_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author: string | null
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          org_id: string | null
          owner_name: string | null
          priority: string
          section: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string | null
          owner_name?: string | null
          priority?: string
          section?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string | null
          owner_name?: string | null
          priority?: string
          section?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          author_role: string | null
          content: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          content: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          created_by_role: string | null
          description: string | null
          id: string
          org_id: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          org_id: string | null
          role: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_call_tags: {
        Row: {
          admin_note: string | null
          conversation_id: string
          org_id: string | null
          outcome: string | null
          tagged_at: string | null
        }
        Insert: {
          admin_note?: string | null
          conversation_id: string
          org_id?: string | null
          outcome?: string | null
          tagged_at?: string | null
        }
        Update: {
          admin_note?: string | null
          conversation_id?: string
          org_id?: string | null
          outcome?: string | null
          tagged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
