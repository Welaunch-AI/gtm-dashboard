export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          id: string; org_id: string | null; org_name: string | null
          user_id: string | null; user_name: string | null; user_role: string | null
          event_type: string; description: string; target_label: string | null; created_at: string
        }
        Insert: {
          id?: string; org_id?: string | null; org_name?: string | null
          user_id?: string | null; user_name?: string | null; user_role?: string | null
          event_type: string; description: string; target_label?: string | null; created_at?: string
        }
        Update: {
          id?: string; org_id?: string | null; org_name?: string | null
          user_id?: string | null; user_name?: string | null; user_role?: string | null
          event_type?: string; description?: string; target_label?: string | null; created_at?: string
        }
        Relationships: []
      }
      marketing_dump_files: {
        Row: {
          id: string; uploader_name: string | null; uploader_role: string | null
          file_name: string; file_type: string | null; file_size: number | null
          url: string; note: string | null; created_at: string
        }
        Insert: {
          id?: string; uploader_name?: string | null; uploader_role?: string | null
          file_name: string; file_type?: string | null; file_size?: number | null
          url: string; note?: string | null; created_at?: string
        }
        Update: {
          id?: string; uploader_name?: string | null; uploader_role?: string | null
          file_name?: string; file_type?: string | null; file_size?: number | null
          url?: string; note?: string | null; created_at?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          id: string; org_id: string | null; record_type: string
          company: string | null; contact_name: string | null; phone: string | null; email: string | null
          status: string | null; lead_source: string | null; tags: string[] | null
          industry: string | null; deal_size: string | null
          scheduled_at: string | null; demo_status: string | null; remarks: string | null
          last_activity_at: string | null; created_by: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; org_id?: string | null; record_type?: string
          company?: string | null; contact_name?: string | null; phone?: string | null; email?: string | null
          status?: string | null; lead_source?: string | null; tags?: string[] | null
          industry?: string | null; deal_size?: string | null
          scheduled_at?: string | null; demo_status?: string | null; remarks?: string | null
          last_activity_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; org_id?: string | null; record_type?: string
          company?: string | null; contact_name?: string | null; phone?: string | null; email?: string | null
          status?: string | null; lead_source?: string | null; tags?: string[] | null
          industry?: string | null; deal_size?: string | null
          scheduled_at?: string | null; demo_status?: string | null; remarks?: string | null
          last_activity_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      crm_notes: {
        Row: { id: string; contact_id: string; author_name: string | null; author_role: string | null; content: string; created_at: string }
        Insert: { id?: string; contact_id: string; author_name?: string | null; author_role?: string | null; content: string; created_at?: string }
        Update: { id?: string; contact_id?: string; author_name?: string | null; author_role?: string | null; content?: string; created_at?: string }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string; org_id: string | null; subject: string; description: string | null
          status: "Open" | "In Progress" | "Resolved" | "Closed"
          priority: "Low" | "Normal" | "High" | "Urgent"
          created_by: string | null; created_by_name: string | null; created_by_role: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; org_id?: string | null; subject: string; description?: string | null
          status?: "Open" | "In Progress" | "Resolved" | "Closed"
          priority?: "Low" | "Normal" | "High" | "Urgent"
          created_by?: string | null; created_by_name?: string | null; created_by_role?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; org_id?: string | null; subject?: string; description?: string | null
          status?: "Open" | "In Progress" | "Resolved" | "Closed"
          priority?: "Low" | "Normal" | "High" | "Urgent"
          created_by?: string | null; created_by_name?: string | null; created_by_role?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          id: string; ticket_id: string; author_id: string | null
          author_name: string | null; author_role: string | null
          content: string; created_at: string
        }
        Insert: {
          id?: string; ticket_id: string; author_id?: string | null
          author_name?: string | null; author_role?: string | null
          content: string; created_at?: string
        }
        Update: {
          id?: string; ticket_id?: string; author_id?: string | null
          author_name?: string | null; author_role?: string | null
          content?: string; created_at?: string
        }
        Relationships: []
      }
      org_voice_agents: {
        Row: {
          org_id: string
          agent_id: string
        }
        Insert: {
          org_id: string
          agent_id: string
        }
        Update: {
          org_id?: string
          agent_id?: string
        }
        Relationships: []
      }
      voice_call_tags: {
        Row: {
          conversation_id: string
          org_id: string | null
          outcome: string | null
          admin_note: string | null
          tagged_at: string
        }
        Insert: {
          conversation_id: string
          org_id?: string | null
          outcome?: string | null
          admin_note?: string | null
          tagged_at?: string
        }
        Update: {
          conversation_id?: string
          org_id?: string | null
          outcome?: string | null
          admin_note?: string | null
          tagged_at?: string
        }
        Relationships: []
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
      cal_post_media: {
        Row: { id: string; post_id: string; url: string; file_name: string | null; file_type: string | null; file_size: number | null; created_at: string }
        Insert: { id?: string; post_id: string; url: string; file_name?: string | null; file_type?: string | null; file_size?: number | null; created_at?: string }
        Update: { id?: string; post_id?: string; url?: string; file_name?: string | null; file_type?: string | null; file_size?: number | null; created_at?: string }
        Relationships: []
      }
      cal_assets: {
        Row: { id: string; org_id: string | null; url: string; file_name: string | null; file_type: string | null; created_at: string }
        Insert: { id?: string; org_id?: string | null; url: string; file_name?: string | null; file_type?: string | null; created_at?: string }
        Update: { id?: string; org_id?: string | null; url?: string; file_name?: string | null; file_type?: string | null; created_at?: string }
        Relationships: []
      }
      cal_post_feedback: {
        Row: { id: string; post_id: string; author: string; content: string; created_at: string }
        Insert: { id?: string; post_id: string; author?: string; content: string; created_at?: string }
        Update: { id?: string; post_id?: string; author?: string; content?: string; created_at?: string }
        Relationships: []
      }
      cal_posts: {
        Row: {
          id: string; org_id: string | null; title: string; caption: string | null
          platform: "LinkedIn" | "Instagram" | "X" | "TikTok" | "Facebook" | "YouTube"
          persona: string | null; scheduled_date: string; scheduled_time: string | null
          status: "pending" | "approved" | "changes_requested"; created_by: string | null; created_at: string
        }
        Insert: {
          id?: string; org_id?: string | null; title: string; caption?: string | null
          platform?: "LinkedIn" | "Instagram" | "X" | "TikTok" | "Facebook" | "YouTube"
          persona?: string | null; scheduled_date: string; scheduled_time?: string | null
          status?: "pending" | "approved" | "changes_requested"; created_by?: string | null; created_at?: string
        }
        Update: {
          id?: string; org_id?: string | null; title?: string; caption?: string | null
          platform?: "LinkedIn" | "Instagram" | "X" | "TikTok" | "Facebook" | "YouTube"
          persona?: string | null; scheduled_date?: string; scheduled_time?: string | null
          status?: "pending" | "approved" | "changes_requested"; created_by?: string | null; created_at?: string
        }
        Relationships: []
      }
      kb_credentials: {
        Row: {
          id: string; folder_id: string; org_id: string | null
          site_name: string; username: string | null; password: string | null
          notes: string | null; is_admin_only: boolean; created_at: string
        }
        Insert: {
          id?: string; folder_id: string; org_id?: string | null
          site_name: string; username?: string | null; password?: string | null
          notes?: string | null; is_admin_only?: boolean; created_at?: string
        }
        Update: {
          id?: string; folder_id?: string; org_id?: string | null
          site_name?: string; username?: string | null; password?: string | null
          notes?: string | null; is_admin_only?: boolean; created_at?: string
        }
        Relationships: []
      }
      kb_folders: {
        Row: {
          id: string; org_id: string | null; name: string
          is_credentials_vault: boolean; is_admin_only: boolean; created_at: string
        }
        Insert: {
          id?: string; org_id?: string | null; name: string
          is_credentials_vault?: boolean; is_admin_only?: boolean; created_at?: string
        }
        Update: {
          id?: string; org_id?: string | null; name?: string
          is_credentials_vault?: boolean; is_admin_only?: boolean; created_at?: string
        }
        Relationships: []
      }
      kb_items: {
        Row: {
          id: string; folder_id: string; org_id: string | null; type: "link" | "note" | "file"
          name: string; url: string | null; content: string | null; file_name: string | null
          is_admin_only: boolean; created_at: string
        }
        Insert: {
          id?: string; folder_id: string; org_id?: string | null; type?: "link" | "note" | "file"
          name: string; url?: string | null; content?: string | null; file_name?: string | null
          is_admin_only?: boolean; created_at?: string
        }
        Update: {
          id?: string; folder_id?: string; org_id?: string | null; type?: "link" | "note" | "file"
          name?: string; url?: string | null; content?: string | null; file_name?: string | null
          is_admin_only?: boolean; created_at?: string
        }
        Relationships: []
      }
      kb_vault_settings: {
        Row: { id: string; org_id: string | null; pin_hash: string; created_at: string }
        Insert: { id?: string; org_id?: string | null; pin_hash: string; created_at?: string }
        Update: { id?: string; org_id?: string | null; pin_hash?: string; created_at?: string }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          org_id: string | null
          title: string
          period: "week" | "month"
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          title: string
          period?: "week" | "month"
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          title?: string
          period?: "week" | "month"
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string | null
          author: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id?: string | null
          author?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string | null
          author?: string | null
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          org_id: string | null
          title: string
          description: string | null
          status: "To Do" | "In Progress" | "In Review" | "Done"
          priority: "Low" | "Medium" | "High"
          section: string | null
          owner_name: string | null
          due_date: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          title: string
          description?: string | null
          status?: "To Do" | "In Progress" | "In Review" | "Done"
          priority?: "Low" | "Medium" | "High"
          section?: string | null
          owner_name?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          title?: string
          description?: string | null
          status?: "To Do" | "In Progress" | "In Review" | "Done"
          priority?: "Low" | "Medium" | "High"
          section?: string | null
          owner_name?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gtm_channels: {
        Row: {
          id: string; org_id: string; channel_type: string; enabled: boolean; created_at: string
        }
        Insert: {
          id?: string; org_id: string; channel_type: string; enabled?: boolean; created_at?: string
        }
        Update: {
          id?: string; org_id?: string; channel_type?: string; enabled?: boolean; created_at?: string
        }
        Relationships: []
      }
      gtm_campaigns: {
        Row: {
          id: string; channel_id: string; org_id: string; name: string; status: string; created_at: string
        }
        Insert: {
          id?: string; channel_id: string; org_id: string; name: string; status?: string; created_at?: string
        }
        Update: {
          id?: string; channel_id?: string; org_id?: string; name?: string; status?: string; created_at?: string
        }
        Relationships: []
      }
      gtm_campaign_metrics: {
        Row: {
          id: string; campaign_id: string; org_id: string
          connections_made: number; replies: number; meetings_booked: number
          spend: number; leads: number; cost_per_lead: number; ctr: number
          sends: number; open_rate: number; reply_rate: number
          sent: number; calls_made: number; connect_rate: number
          warmup_done: boolean; domain_healthy: boolean; sender_reputation: number
          connections_sent: number; inmails_sent: number; connections_accepted: number; message_replies: number
          total_leads_contacted: number; responded: number; not_responded: number; do_not_disturb: number
          meetings_scheduled: number; meetings_completed: number; no_shows: number
          meetings_rescheduled: number; pending_update: number; future_calls_scheduled: number
          updated_at: string
        }
        Insert: {
          id?: string; campaign_id: string; org_id: string
          connections_made?: number; replies?: number; meetings_booked?: number
          spend?: number; leads?: number; cost_per_lead?: number; ctr?: number
          sends?: number; open_rate?: number; reply_rate?: number
          sent?: number; calls_made?: number; connect_rate?: number
          warmup_done?: boolean; domain_healthy?: boolean; sender_reputation?: number
          connections_sent?: number; inmails_sent?: number; connections_accepted?: number; message_replies?: number
          total_leads_contacted?: number; responded?: number; not_responded?: number; do_not_disturb?: number
          meetings_scheduled?: number; meetings_completed?: number; no_shows?: number
          meetings_rescheduled?: number; pending_update?: number; future_calls_scheduled?: number
          updated_at?: string
        }
        Update: {
          id?: string; campaign_id?: string; org_id?: string
          connections_made?: number; replies?: number; meetings_booked?: number
          spend?: number; leads?: number; cost_per_lead?: number; ctr?: number
          sends?: number; open_rate?: number; reply_rate?: number
          sent?: number; calls_made?: number; connect_rate?: number
          warmup_done?: boolean; domain_healthy?: boolean; sender_reputation?: number
          connections_sent?: number; inmails_sent?: number; connections_accepted?: number; message_replies?: number
          total_leads_contacted?: number; responded?: number; not_responded?: number; do_not_disturb?: number
          meetings_scheduled?: number; meetings_completed?: number; no_shows?: number
          meetings_rescheduled?: number; pending_update?: number; future_calls_scheduled?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          id: string; token: string; email: string; full_name: string | null
          org_id: string | null; role: string; created_by: string | null
          created_at: string; expires_at: string; used_at: string | null
        }
        Insert: {
          id?: string; token?: string; email: string; full_name?: string | null
          org_id?: string | null; role?: string; created_by?: string | null
          created_at?: string; expires_at?: string; used_at?: string | null
        }
        Update: {
          id?: string; token?: string; email?: string; full_name?: string | null
          org_id?: string | null; role?: string; created_by?: string | null
          created_at?: string; expires_at?: string; used_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Organisation = Database["public"]["Tables"]["organisations"]["Row"]
export type UserRole = "admin" | "client"
